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
                .Include(b => b.Queues)
                .Where(b => b.CustomerId == customerId)
                .OrderByDescending(b => b.ScheduledAt)
                .ToListAsync();
        }

        public async Task<Booking?> GetActiveBookingAsync(int customerId)
        {
            var tenMinutesAgo = DateTime.Now.AddMinutes(-10);
            var bookings = await _context.Bookings
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Include(b => b.Queues)
                .Where(b => b.CustomerId == customerId 
                    && (b.Status == BookingStatus.Pending 
                        || b.Status == BookingStatus.Confirmed 
                        || b.Status == BookingStatus.CheckedIn
                        || (b.Status == BookingStatus.Completed && b.PaidAt >= tenMinutesAgo)))
                .ToListAsync();

            if (!bookings.Any()) return null;

            return bookings
                .OrderBy(b => {
                    var queue = b.Queues.FirstOrDefault();
                    if (queue != null && queue.Status != QueueStatus.Completed && queue.Status != QueueStatus.Cancelled)
                        return 1; // Priority 1: Active in Queue
                    if (b.Status == BookingStatus.CheckedIn)
                        return 2; // Priority 2: Checked In
                    if (b.Status == BookingStatus.Confirmed)
                        return 3; // Priority 3: Confirmed
                    if (b.Status == BookingStatus.Pending)
                        return 4; // Priority 4: Pending / Future
                    return 5; // Priority 5: Completed (in the last 10 mins)
                })
                .ThenBy(b => b.ScheduledAt)
                .FirstOrDefault();
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

            // Wrap in execution strategy to support retries with user-initiated transaction
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
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

                    // Create Notification
                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = customer.CustomerId,
                        Title = "Đặt lịch thành công!",
                        Message = $"Lịch hẹn #{booking.BookingId} cho xe {vehicle.LicensePlate} đã được tạo thành công.",
                        Type = "Booking",
                        IsRead = false,
                        CreatedAt = DateTime.Now
                    });

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

                    var isUniqueViolation = false;
                    var currentEx = ex;
                    while (currentEx != null)
                    {
                        if (currentEx is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
                        {
                            isUniqueViolation = true;
                            break;
                        }
                        currentEx = currentEx.InnerException;
                    }

                    if (isUniqueViolation || ex.ToString().Contains("23505") || ex.ToString().Contains("uq_bookings_vehicle_scheduledat_active"))
                    {
                        return (false, "Bạn đã có lịch hẹn ở khung giờ này.", 0);
                    }

                    return (false, $"Đã xảy ra lỗi hệ thống: {ex.Message}", 0);
                }
            });
        }

        public async Task<object?> GetBookingDetailAsync(int customerId, int bookingId)
        {
            var b = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Include(b => b.AppliedRedemption)
                    .ThenInclude(r => r!.Reward)
                .Include(b => b.Queues)
                .FirstOrDefaultAsync(x => x.BookingId == bookingId && x.CustomerId == customerId);

            if (b == null) return null;

            var mainService = b.BookingServices
                .Where(bs => !bs.Service.IsAddOn)
                .Select(bs => new {
                    serviceId = bs.Service.ServiceId,
                    serviceName = bs.Service.ServiceName,
                    price = bs.PriceSnapshot
                })
                .FirstOrDefault();

            var addons = b.BookingServices
                .Where(bs => bs.Service.IsAddOn)
                .Select(bs => new {
                    serviceId = bs.Service.ServiceId,
                    serviceName = bs.Service.ServiceName,
                    price = bs.PriceSnapshot
                })
                .ToList();

            var voucher = b.AppliedRedemption != null ? new {
                rewardId = b.AppliedRedemption.Reward.RewardId,
                rewardName = b.AppliedRedemption.Reward.RewardName,
                discountValue = b.PromoDiscount,
                description = b.AppliedRedemption.Reward.Description
            } : null;

            var hasReview = await _context.Reviews.AnyAsync(r => r.BookingId == b.BookingId);

            return new {
                bookingId = b.BookingId,
                customer = new {
                    fullName = b.Customer?.Account?.FullName ?? "Khách hàng",
                    phone = b.Customer?.Account?.Phone ?? "",
                    email = b.Customer?.Account?.Email ?? ""
                },
                vehicle = new {
                    licensePlate = b.Vehicle?.LicensePlate ?? "",
                    brand = b.Vehicle?.Brand ?? "",
                    model = b.Vehicle?.Model ?? "",
                    vehicleClass = b.Vehicle?.VehicleClass ?? ""
                },
                mainService = mainService,
                addons = addons,
                voucher = voucher,
                notes = b.Notes ?? "",
                scheduledAt = b.ScheduledAt,
                basePrice = b.BasePrice,
                promoDiscount = b.PromoDiscount,
                finalPrice = b.FinalPrice,
                pointsEarned = b.PointsEarned,
                status = b.Status.ToString(),
                queueStatus = b.Queues.FirstOrDefault()?.Status.ToString(),
                cancelReason = b.CancelReason,
                cancelledBy = b.CancelledBy,
                cancelledAt = b.CancelledAt,
                hasReview = hasReview,
                rating = b.Stars,
                reviewText = b.ReviewText,
                paidAt = b.PaidAt,
                createdAt = b.CreatedAt
            };
        }

        public async Task<(bool success, string message)> CancelBookingAsync(int customerId, int bookingId, string reason)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                .Include(b => b.Vehicle)
                .Include(b => b.AppliedRedemption)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.CustomerId == customerId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch hoặc bạn không có quyền hủy.");
            }

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            {
                return (false, "Chỉ đơn đặt lịch ở trạng thái 'Chờ xác nhận' hoặc 'Đã xác nhận' mới có thể hủy.");
            }

            booking.Status = BookingStatus.Cancelled;
            booking.CancelReason = reason;
            booking.CancelledBy = "Customer";
            booking.CancelledAt = DateTime.Now;

            // Restore the voucher (applied redemption) if one was used
            if (booking.AppliedRedemption != null)
            {
                booking.AppliedRedemption.Status = RedemptionStatus.Active;
                booking.AppliedRedemption.UsedAt = null;
                booking.AppliedRedemption.BookingId = null;
            }

            // Create notification for customer
            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Lịch hẹn đã hủy",
                Message = $"Bạn đã hủy lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate}. Lý do: {reason}",
                Type = "Booking",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return (true, "Hủy đơn đặt lịch thành công!");
        }
    }
}
