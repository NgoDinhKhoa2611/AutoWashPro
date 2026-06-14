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

        private static readonly Service[] DefaultMotorcycleAddOns =
        {
            new Service
            {
                ServiceName = "Vệ sinh sên xích",
                Description = "Làm sạch bùn đất, bụi dầu bám trên sên xích xe gắn máy.",
                Category = ServiceCategory.AddOn,
                BasePrice = 15000,
                EstimatedMinutes = 8,
                IsAddOn = true,
                IsActive = true
            },
            new Service
            {
                ServiceName = "Bôi trơn sên",
                Description = "Tra dung dịch bôi trơn chuyên dụng giúp sên vận hành êm hơn.",
                Category = ServiceCategory.AddOn,
                BasePrice = 10000,
                EstimatedMinutes = 5,
                IsAddOn = true,
                IsActive = true
            },
            new Service
            {
                ServiceName = "Rửa mâm xe máy",
                Description = "Vệ sinh mâm, nan hoa và khu vực bánh xe gắn máy.",
                Category = ServiceCategory.AddOn,
                BasePrice = 12000,
                EstimatedMinutes = 6,
                IsAddOn = true,
                IsActive = true
            },
            new Service
            {
                ServiceName = "Dưỡng nhựa nhám xe máy",
                Description = "Phục hồi độ sạch và màu nhựa nhám trên dàn áo xe gắn máy.",
                Category = ServiceCategory.AddOn,
                BasePrice = 20000,
                EstimatedMinutes = 10,
                IsAddOn = true,
                IsActive = true
            }
        };

        public async Task<List<Service>> GetServicesAsync()
        {
            await EnsureDefaultMotorcycleAddOnsAsync();

            return await _context.Services
                .Where(s => s.IsActive)
                .ToListAsync();
        }

        private async Task EnsureDefaultMotorcycleAddOnsAsync()
        {
            var existingNames = await _context.Services
                .Where(s => s.IsAddOn)
                .Select(s => s.ServiceName)
                .ToListAsync();

            var missingServices = DefaultMotorcycleAddOns
                .Where(s => !existingNames.Contains(s.ServiceName))
                .Select(s => new Service
                {
                    ServiceName = s.ServiceName,
                    Description = s.Description,
                    Category = s.Category,
                    BasePrice = s.BasePrice,
                    EstimatedMinutes = s.EstimatedMinutes,
                    IsAddOn = s.IsAddOn,
                    IsActive = s.IsActive,
                    IsFeatured = s.IsFeatured
                })
                .ToList();

            if (missingServices.Count == 0) return;

            _context.Services.AddRange(missingServices);
            await _context.SaveChangesAsync();
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
                    && (b.Status == BookingStatus.Pending 
                        || b.Status == BookingStatus.Confirmed 
                        || b.Status == BookingStatus.CheckedIn))
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
                                && b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled
                                && b.ScheduledAt.Date == scheduledAt.Date
                                && b.ScheduledAt.Hour == scheduledAt.Hour);
                if (hasDuplicate)
                {
                    return (false, "Phương tiện này đã có lịch hẹn trong khung giờ đã chọn.", 0);
                }

                // 6. Capacity constraints: max 3 bookings per hour slot
                var slotCount = await _context.Bookings
                    .CountAsync(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled
                                  && b.ScheduledAt.Date == scheduledAt.Date
                                  && b.ScheduledAt.Hour == scheduledAt.Hour);
                if (slotCount >= 3)
                {
                    return (false, "Khung giờ này đã đầy, vui lòng chọn khung giờ khác.", 0);
                }

                // 7. Validate services and fetch DB prices (enforce IsActive = true)
                await EnsureDefaultMotorcycleAddOnsAsync();

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
                int promoDiscount = 0;
                RewardRedemption? redemption = null;

                if (request.AppliedRedemptionId.HasValue)
                {
                    redemption = await _context.RewardRedemptions
                        .Include(r => r.Reward)
                        .FirstOrDefaultAsync(r => r.RedemptionId == request.AppliedRedemptionId.Value 
                                               && r.CustomerId == customer.CustomerId 
                                               && r.Status == RedemptionStatus.Active);
                    if (redemption != null)
                    {
                        if (redemption.Reward.RewardType == "DiscountPercent")
                        {
                            promoDiscount = (int)(calculatedBasePrice * (redemption.Reward.DiscountValue ?? 0) / 100);
                        }
                        else
                        {
                            promoDiscount = (int)(redemption.Reward.DiscountValue ?? 0);
                        }

                        if (promoDiscount > calculatedBasePrice)
                        {
                            promoDiscount = calculatedBasePrice;
                        }

                        finalPrice = calculatedBasePrice - promoDiscount;
                        Console.WriteLine($"\n==============================================");
                        Console.WriteLine($"[VOUCHER APPLIED] RedemptionId: {redemption.RedemptionId}");
                        Console.WriteLine($"Voucher Name: '{redemption.Reward.RewardName}'");
                        Console.WriteLine($"Discount: -{promoDiscount:N0} VND");
                        Console.WriteLine($"Base Price: {calculatedBasePrice:N0} VND | Final Price: {finalPrice:N0} VND");
                        Console.WriteLine("==============================================\n");
                    }
                }

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
                    Status = BookingStatus.Pending,
                    BasePrice = calculatedBasePrice,
                    PromoDiscount = promoDiscount,
                    FinalPrice = finalPrice,
                    PointsEarned = pointsEarned,
                    RedemptionId = redemption?.RedemptionId,
                    Notes = request.Notes,
                    CreatedAt = DateTime.Now
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                if (redemption != null)
                {
                    redemption.Status = RedemptionStatus.Used;
                    redemption.UsedAt = DateTime.Now;
                    redemption.BookingId = booking.BookingId;
                }

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
