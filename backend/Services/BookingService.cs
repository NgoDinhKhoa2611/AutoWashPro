using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class BookingService
    {
        private readonly AutoWashDbContext _context;

        public BookingService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<List<Service>> GetServicesAsync()
        {
            return await _context.Services
                .Where(s => s.IsActive)
                .ToListAsync();
        }

        public async Task<List<Booking>> GetWashHistoryAsync(int customerId)
        {
            return await _context.Bookings
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.CustomerId == customerId)
                .OrderByDescending(b => b.ScheduledAt)
                .ToListAsync();
        }

        public async Task<Booking?> GetActiveBookingAsync(int customerId)
        {
            return await _context.Bookings
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Include(b => b.Queues)
                .Where(b => b.CustomerId == customerId 
                    && (b.Status == (int)BookingStatus.Pending 
                        || b.Status == (int)BookingStatus.Confirmed 
                        || b.Status == (int)BookingStatus.CheckedIn))
                .OrderByDescending(b => b.ScheduledAt)
                .FirstOrDefaultAsync();
        }

        public async Task<(bool success, string message, int bookingId)> CreateBookingAsync(Customer customer, CreateBookingDto request)
        {
            if (customer == null)
            {
                return (false, "Bạn chưa đăng nhập.", 0);
            }

            if (request == null)
            {
                return (false, "Dữ liệu đặt lịch không hợp lệ.", 0);
            }

            // 1. Validate vehicle ownership (plate belongs to current customer)
            var normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customer.CustomerId 
                                       && v.LicensePlate == normPlate);
            if (vehicle == null)
            {
                return (false, "Phương tiện không tồn tại hoặc không thuộc sở hữu của bạn. Vui lòng kiểm tra lại.", 0);
            }

            // 2. Validate time format
            if (!DateTime.TryParse($"{request.BookingDate} {request.BookingTime}", out var scheduledAt))
            {
                return (false, "Thời gian đặt lịch không hợp lệ.", 0);
            }

            // 3. Validate future time & 15-minute buffer
            var now = DateTime.Now;
            if (scheduledAt < now)
            {
                return (false, "Không thể đặt lịch ở thời gian đã qua.", 0);
            }
            if (scheduledAt < now.AddMinutes(15))
            {
                return (false, "Vui lòng đặt lịch trước ít nhất 15 phút.", 0);
            }

            // 4. Validate booking window based on loyalty tier
            var customerWithTier = await _context.Customers
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.CustomerId == customer.CustomerId);
            
            int bookingWindowDays = customerWithTier?.Tier?.BookingWindowDays ?? 7;
            if (bookingWindowDays == 0)
            {
                string tierName = customerWithTier?.Tier?.TierName ?? "Member";
                if (tierName.Contains("Platinum", StringComparison.OrdinalIgnoreCase)) bookingWindowDays = 14;
                else if (tierName.Contains("Gold", StringComparison.OrdinalIgnoreCase)) bookingWindowDays = 12;
                else if (tierName.Contains("Silver", StringComparison.OrdinalIgnoreCase)) bookingWindowDays = 10;
                else bookingWindowDays = 7;
            }

            if (scheduledAt.Date > DateTime.Today.AddDays(bookingWindowDays))
            {
                return (false, $"Hạng thành viên của bạn chỉ được đặt trước tối đa {bookingWindowDays} ngày.", 0);
            }

            // Wrap in transaction to prevent race conditions on capacity
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 5. Prevent duplicate bookings for the same vehicle in the same hour
                var hasDuplicate = await _context.Bookings
                    .AnyAsync(b => b.VehicleId == vehicle.VehicleId
                                && b.Status != (int)BookingStatus.Completed && b.Status != (int)BookingStatus.Cancelled
                                && b.ScheduledAt.Date == scheduledAt.Date
                                && b.ScheduledAt.Hour == scheduledAt.Hour);
                if (hasDuplicate)
                {
                    return (false, "Phương tiện này đã có lịch hẹn trong khung giờ đã chọn.", 0);
                }

                // 6. Capacity constraints: max 3 bookings per hour slot
                var slotCount = await _context.Bookings
                    .CountAsync(b => b.Status != (int)BookingStatus.Completed && b.Status != (int)BookingStatus.Cancelled
                                  && b.ScheduledAt.Date == scheduledAt.Date
                                  && b.ScheduledAt.Hour == scheduledAt.Hour);
                if (slotCount >= 3)
                {
                    return (false, "Khung giờ này đã đầy, vui lòng chọn khung giờ khác.", 0);
                }

                // 7. Validate services and fetch DB prices (enforce IsActive = true)
                var mainService = await _context.Services
                    .FirstOrDefaultAsync(s => s.ServiceName == request.MainServiceName.Trim() && !s.IsAddOn && s.IsActive);
                if (mainService == null)
                {
                    return (false, "Dịch vụ chính không hợp lệ hoặc đã ngừng hoạt động.", 0);
                }

                var addonsList = new List<Service>();
                if (request.AddonServiceNames != null)
                {
                    foreach (var addonName in request.AddonServiceNames)
                    {
                        if (string.IsNullOrWhiteSpace(addonName)) continue;
                        var addon = await _context.Services
                            .FirstOrDefaultAsync(s => s.ServiceName == addonName.Trim() && s.IsAddOn && s.IsActive);
                        if (addon == null)
                        {
                            return (false, $"Dịch vụ đi kèm '{addonName}' không hợp lệ hoặc đã ngừng hoạt động.", 0);
                        }
                        addonsList.Add(addon);
                    }
                }

                int calculatedBasePrice = mainService.BasePrice + addonsList.Sum(a => a.BasePrice);
                int finalPrice = calculatedBasePrice;

                // Backend loyalty points calculation
                var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
                int pointsPerThousand = config?.PointsPerThousandVND ?? 1;
                int pointsEarned = (finalPrice / 1000) * pointsPerThousand;

                // Create Booking
                var booking = new Booking
                {
                    CustomerId = customer.CustomerId,
                    VehicleId = vehicle.VehicleId,
                    ScheduledAt = scheduledAt,
                    Status = (int)BookingStatus.Pending,
                    BasePrice = calculatedBasePrice,
                    FinalPrice = finalPrice,
                    PointsEarned = pointsEarned,
                    Notes = request.Notes,
                    CreatedAt = DateTime.Now
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                // Save BookingServices with PriceSnapshot
                _context.BookingServices.Add(new Auto_Wash.Data.Entities.BookingService
                {
                    BookingId = booking.BookingId,
                    ServiceId = mainService.ServiceId,
                    PriceSnapshot = mainService.BasePrice
                });

                foreach (var addon in addonsList)
                {
                    _context.BookingServices.Add(new Auto_Wash.Data.Entities.BookingService
                    {
                        BookingId = booking.BookingId,
                        ServiceId = addon.ServiceId,
                        PriceSnapshot = addon.BasePrice
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return (true, "Đặt lịch thành công!", booking.BookingId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, $"Đã xảy ra lỗi hệ thống: {ex.Message}", 0);
            }
        }
    }
}
