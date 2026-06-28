using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class AdminBookingService
    {
        private readonly AutoWashDbContext _context;
        private readonly BookingNotificationService _bookingNotificationService;
        private readonly IConfiguration _configuration;

        public AdminBookingService(AutoWashDbContext context, BookingNotificationService bookingNotificationService, IConfiguration configuration)
        {
            _context = context;
            _bookingNotificationService = bookingNotificationService;
            _configuration = configuration;
        }

        public async Task<List<object>> GetAdminBookingsAsync()
        {
            var list = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .OrderByDescending(b => b.ScheduledAt)
                .ToListAsync();

            return list.Select(b => new {
                bookingId = b.BookingId,
                customerName = b.Customer?.Account?.FullName ?? "Khách vãng lai",
                phone = b.Customer?.Account?.Phone ?? "",
                licensePlate = b.Vehicle?.LicensePlate ?? "",
                scheduledAt = b.ScheduledAt,
                finalPrice = b.FinalPrice,
                status = b.Status.ToString()
            }).Cast<object>().ToList();
        }

        public async Task<object?> GetBookingDetailAsync(int bookingId)
        {
            var b = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Vehicle)
                .Include(b => b.AppliedRedemption)
                    .ThenInclude(r => r!.Reward)
                .FirstOrDefaultAsync(x => x.BookingId == bookingId);

            if (b == null) return null;

            var bookingServices = await _context.BookingServices
                .AsNoTracking()
                .Include(bs => bs.Service)
                .Where(bs => bs.BookingId == bookingId)
                .ToListAsync();

            var mainService = bookingServices
                .Where(bs => !bs.Service.IsAddOn)
                .Select(bs => new {
                    serviceId = bs.Service.ServiceId,
                    serviceName = bs.Service.ServiceName,
                    price = bs.PriceSnapshot
                })
                .FirstOrDefault();



            var voucher = b.AppliedRedemption != null ? new {
                rewardId = b.AppliedRedemption.Reward.RewardId,
                rewardName = b.AppliedRedemption.Reward.RewardName,
                discountValue = b.PromoDiscount,
                description = b.AppliedRedemption.Reward.Description
            } : null;

            var timeline = await _context.BookingAuditLogs
                .AsNoTracking()
                .Where(al => al.BookingId == bookingId)
                .OrderBy(al => al.CreatedAt)
                .Select(al => new {
                    id = al.Id,
                    action = al.Action,
                    description = al.Description ?? "",
                    performedBy = al.PerformedBy,
                    createdAt = al.CreatedAt
                })
                .ToListAsync();

            var reschedules = await _context.BookingRescheduleHistories
                .AsNoTracking()
                .Where(rh => rh.BookingId == bookingId)
                .OrderBy(rh => rh.CreatedAt)
                .Select(rh => new {
                    id = rh.Id,
                    oldScheduledAt = rh.OldScheduledAt,
                    newScheduledAt = rh.NewScheduledAt,
                    changedBy = rh.ChangedBy,
                    reason = rh.Reason ?? "",
                    createdAt = rh.CreatedAt
                })
                .ToListAsync();

            return new {
                bookingId = b.BookingId,
                customer = new {
                    customerId = b.Customer.CustomerId,
                    fullName = b.Customer.Account?.FullName ?? "Khách vãng lai",
                    phone = b.Customer.Account?.Phone ?? "",
                    email = b.Customer.Account?.Email ?? "",
                    membershipCode = b.Customer.MembershipCode,
                    pointBalance = b.Customer.PointBalance,
                    lifetimePoints = b.Customer.LifetimePoints,
                    tierName = b.Customer.Tier?.TierName ?? "Member"
                },
                vehicle = new {
                    vehicleId = b.Vehicle.VehicleId,
                    licensePlate = b.Vehicle.LicensePlate,
                    brand = b.Vehicle.Brand,
                    model = b.Vehicle.Model,
                    vehicleClass = b.Vehicle.VehicleClass
                },
                mainService = mainService,
                voucher = voucher,
                notes = b.Notes ?? "",
                scheduledAt = b.ScheduledAt,
                basePrice = b.BasePrice,
                finalPrice = b.FinalPrice,
                pointsEarned = b.PointsEarned,
                status = b.Status.ToString(),
                cancelReason = b.CancelReason,
                createdAt = b.CreatedAt,
                timeline = timeline,
                reschedules = reschedules
            };
        }

        public async Task<(bool success, string message)> ConfirmBookingAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch.");
            }

            if (booking.Status != BookingStatus.Pending)
            {
                return (false, "Chỉ đơn đặt lịch đang ở trạng thái 'Chờ xác nhận' mới có thể được xác nhận.");
            }

            booking.Status = BookingStatus.Confirmed;

            // Create notification for customer
            _context.Notifications.Add(new Notification
            {
                CustomerId = booking.CustomerId,
                Title = "Lịch hẹn được xác nhận",
                Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} đã được xác nhận.",
                Type = "Booking",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            // Load main service name
            var mainService = booking.BookingServices
                .Where(bs => !bs.Service.IsAddOn)
                .Select(bs => bs.Service.ServiceName)
                .FirstOrDefault() ?? "Dịch vụ rửa xe";

            // Trigger background email
            var emailModel = new BookingEmailModel
            {
                BookingId = booking.BookingId,
                CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                Email = booking.Customer?.Account?.Email ?? "",
                LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                ScheduledAt = booking.ScheduledAt,
                FinalPrice = booking.FinalPrice,
                ServiceName = mainService
            };

            if (!string.IsNullOrWhiteSpace(emailModel.Email))
            {
                _bookingNotificationService.SendBookingConfirmedEmailInBackground(emailModel);
            }

            return (true, "Đã xác nhận đơn đặt lịch thành công!");
        }

        public async Task<(bool success, string message)> CancelBookingAsync(int bookingId, string reason)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Include(b => b.AppliedRedemption)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch.");
            }

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            {
                return (false, "Chỉ đơn đặt lịch ở trạng thái 'Chờ xác nhận' hoặc 'Đã xác nhận' mới có thể hủy.");
            }

            booking.Status = BookingStatus.Cancelled;
            booking.CancelReason = reason;

            booking.CancelledBy = "Admin";
            booking.CancelledAt = DateTime.Now;

            // Restore the voucher (applied redemption) if one was used
            if (booking.AppliedRedemption != null)
            {
                booking.AppliedRedemption.Status = RedemptionStatus.Active;
                booking.AppliedRedemption.UsedAt = null;
                booking.AppliedRedemption.BookingId = null;
            }

            // Create Audit Log
            _context.BookingAuditLogs.Add(new BookingAuditLog
            {
                BookingId = booking.BookingId,
                Action = "Cancelled",
                Description = $"Hủy lịch hẹn bởi Quản trị viên. Lý do: {reason}",
                PerformedBy = "Admin",
                CreatedAt = DateTime.Now
            });

            // Create notification for customer
            _context.Notifications.Add(new Notification
            {
                CustomerId = booking.CustomerId,
                Title = "Lịch hẹn đã hủy",
                Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} đã bị hủy bởi quản trị viên. Lý do: {reason}",
                Type = "Booking",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            // Load main service name
            var mainService = booking.BookingServices
                .Where(bs => !bs.Service.IsAddOn)
                .Select(bs => bs.Service.ServiceName)
                .FirstOrDefault() ?? "Dịch vụ rửa xe";

            // Trigger background email
            var emailModel = new BookingEmailModel
            {
                BookingId = booking.BookingId,
                CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                Email = booking.Customer?.Account?.Email ?? "",
                LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                ScheduledAt = booking.ScheduledAt,
                FinalPrice = booking.FinalPrice,
                ServiceName = mainService,
                CancelReason = reason
            };

            if (!string.IsNullOrWhiteSpace(emailModel.Email))
            {
                _bookingNotificationService.SendBookingCancelledEmailInBackground(emailModel);
            }

            return (true, "Hủy đơn đặt lịch thành công!");
        }

        public async Task<(bool success, string message, int queueId)> CheckInBookingAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Vehicle)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch.", 0);
            }

            // Check-in window validation
            var now = DateTime.Now;
            int checkInWindowMinutes = _configuration.GetValue<int>("BookingCapacityConfig:CheckInWindowMinutes", 15);
            var earliestAllowed = booking.ScheduledAt.AddMinutes(-checkInWindowMinutes);
            var latestAllowed = booking.ScheduledAt.AddMinutes(checkInWindowMinutes);

            if (now < earliestAllowed)
            {
                return (false, $"Chưa đến thời gian check-in! Bạn chỉ có thể check-in sớm tối đa {checkInWindowMinutes} phút (từ {earliestAllowed:HH:mm}).", 0);
            }
            if (now > latestAllowed)
            {
                return (false, $"Đã quá giờ check-in! Bạn chỉ có thể check-in trễ tối đa {checkInWindowMinutes} phút (trước {latestAllowed:HH:mm}).", 0);
            }

            if (booking.Status == BookingStatus.NoShow || booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Completed || booking.Status == BookingStatus.WaitingCheckout)
            {
                return (false, $"Không thể check-in lịch đặt đã {(booking.Status == BookingStatus.NoShow ? "quá hạn (No-Show)" : booking.Status == BookingStatus.Cancelled ? "bị hủy" : booking.Status == BookingStatus.WaitingCheckout ? "chờ thanh toán" : "hoàn thành")}.", 0);
            }

            if (booking.Status != BookingStatus.Confirmed)
            {
                return (false, "Chỉ đơn đặt lịch đang ở trạng thái 'Đã xác nhận' mới có thể thực hiện check-in.", 0);
            }

            if (booking.ScheduledAt.Date > DateTime.Today)
            {
                return (
                    false,
                    "Chưa đến ngày hẹn, không thể check-in.",
                    0
                );
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(2410);");

                    // Check if queue record already exists
                    var existingQueue = await _context.Queues
                        .FirstOrDefaultAsync(q => q.BookingId == booking.BookingId && q.Status != QueueStatus.Cancelled);
                    if (existingQueue != null)
                    {
                        booking.Status = BookingStatus.CheckedIn;
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                        return (true, "Đơn đặt lịch đã được check-in vào hàng đợi.", existingQueue.QueueId);
                    }

                    var today = DateTime.Today;
                    var lastPos = await _context.Queues
                        .Where(q => q.CheckInAt.Date == today && q.Status != QueueStatus.Cancelled)
                        .Select(q => (int?)q.Position)
                        .MaxAsync() ?? 0;

                    var newQueue = new Queue
                    {
                        BookingId = booking.BookingId,
                        VehicleId = booking.VehicleId,
                        CustomerId = booking.CustomerId,
                        LicensePlate = booking.Vehicle?.LicensePlate?.ToUpper()?.Trim() ?? string.Empty,
                        CustomerName = booking.Customer?.Account?.FullName ?? "Khách vãng lai",
                        TierId = booking.Customer?.TierId ?? 1,
                        Status = QueueStatus.Waiting, // Initial status is Waiting
                        Position = lastPos + 1,
                        CheckInAt = DateTime.Now,
                        StaffNote = booking.Notes ?? string.Empty
                    };

                    booking.Status = BookingStatus.CheckedIn;

                    _context.Queues.Add(newQueue);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return (true, "Check-in thành công! Xe đã được thêm vào hàng đợi.", newQueue.QueueId);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<(bool success, string message)> RescheduleBookingAsync(int bookingId, DateTime newScheduledAt, string reason)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch.");
            }

            if (booking.Status == BookingStatus.NoShow || booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Completed || booking.Status == BookingStatus.WaitingCheckout)
            {
                return (false, $"Không thể đổi lịch hẹn đã {(booking.Status == BookingStatus.NoShow ? "quá hạn (No-Show)" : booking.Status == BookingStatus.Cancelled ? "bị hủy" : booking.Status == BookingStatus.WaitingCheckout ? "chờ thanh toán" : "hoàn thành")}.");
            }

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            {
                return (false, "Chỉ lịch hẹn ở trạng thái 'Chờ xác nhận' hoặc 'Đã xác nhận' mới có thể đổi lịch.");
            }

            var now = DateTime.Now;
            if (newScheduledAt < now)
            {
                return (false, "Không thể đặt lịch ở thời gian đã qua.");
            }

            // Validate that the rescheduled time matches one of the generated operating slots
            int startHour = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHour = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            var allowedSlots = new HashSet<string>();
            for (int h = startHour; h <= endHour; h++)
            {
                allowedSlots.Add($"{h:D2}:00");
            }
            string scheduledTimeStr = newScheduledAt.ToString("HH:mm");
            if (!allowedSlots.Contains(scheduledTimeStr))
            {
                return (false, "Thời gian đặt lịch không hợp lệ. Vui lòng chọn đúng khung giờ hoạt động.");
            }

            var customerWithTier = await _context.Customers
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.CustomerId == booking.CustomerId);
            
            int bookingWindowDays = customerWithTier?.Tier?.BookingWindowDays ?? 7;

            if (newScheduledAt.Date > DateTime.Today.AddDays(bookingWindowDays))
            {
                return (false, $"Hạng thành viên của khách hàng chỉ được đặt trước tối đa {bookingWindowDays} ngày.");
            }

            var oldScheduledAt = booking.ScheduledAt;

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    int lockKey1 = newScheduledAt.Year * 10000 + newScheduledAt.Month * 100 + newScheduledAt.Day;
                    int lockKey2 = newScheduledAt.Hour;
                    await _context.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_xact_lock({lockKey1}, {lockKey2});");

                    int maxVehicles = _configuration.GetValue<int>("BookingCapacityConfig:MaxVehiclesPerSlot", 3);
                    var slotCount = await _context.Bookings
                        .CountAsync(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                                      && b.ScheduledAt.Date == newScheduledAt.Date
                                      && b.ScheduledAt.Hour == newScheduledAt.Hour
                                      && b.BookingId != bookingId);
                    if (slotCount >= maxVehicles)
                    {
                        return (false, "Khung giờ này đã đầy. Vui lòng chọn khung giờ khác.");
                    }

                    var hasDuplicate = await _context.Bookings
                        .AnyAsync(b => b.VehicleId == booking.VehicleId
                                    && b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                                    && b.ScheduledAt.Date == newScheduledAt.Date
                                    && b.ScheduledAt.Hour == newScheduledAt.Hour
                                    && b.BookingId != bookingId);
                    if (hasDuplicate)
                    {
                        return (false, "Phương tiện này đã có lịch hẹn trong khung giờ đã chọn.");
                    }

                    booking.ScheduledAt = newScheduledAt;
                    booking.Status = BookingStatus.Confirmed; 
                    booking.Reminder1Sent = false;
                    booking.Reminder2Sent = false;

                    _context.BookingRescheduleHistories.Add(new BookingRescheduleHistory
                    {
                        BookingId = booking.BookingId,
                        OldScheduledAt = oldScheduledAt,
                        NewScheduledAt = newScheduledAt,
                        ChangedBy = "Staff",
                        Reason = reason,
                        CreatedAt = DateTime.Now
                    });

                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = booking.BookingId,
                        Action = "Rescheduled",
                        Description = $"Đổi lịch hẹn từ {oldScheduledAt:dd/MM/yyyy HH:mm} thành {newScheduledAt:dd/MM/yyyy HH:mm}. Lý do: {reason}",
                        PerformedBy = "Staff",
                        CreatedAt = DateTime.Now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = booking.CustomerId,
                        Title = "Lịch hẹn của bạn đã được cập nhật bởi quản trị viên.",
                        Message = $"Thời gian thay đổi: từ {oldScheduledAt:dd/MM/yyyy HH:mm} sang {newScheduledAt:dd/MM/yyyy HH:mm}. Lý do: {reason}",
                        Type = "Booking",
                        IsRead = false,
                        CreatedAt = DateTime.Now
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Send rescheduled email immediately
                    var mainService = booking.BookingServices
                        .Where(bs => !bs.Service.IsAddOn)
                        .Select(bs => bs.Service.ServiceName)
                        .FirstOrDefault() ?? "Dịch vụ rửa xe";

                    var emailModel = new BookingRescheduleEmailModel
                    {
                        BookingId = booking.BookingId,
                        CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                        Email = booking.Customer?.Account?.Email ?? "",
                        LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                        OldScheduledAt = oldScheduledAt,
                        NewScheduledAt = newScheduledAt,
                        ServiceName = mainService,
                        UpdatedByStaff = true
                    };

                    if (!string.IsNullOrWhiteSpace(emailModel.Email))
                    {
                        _bookingNotificationService.SendBookingRescheduledEmailInBackground(emailModel);
                    }

                    return (true, "Đổi lịch hẹn thành công.");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return (false, $"Đã xảy ra lỗi: {ex.Message}");
                }
            });
        }
    }
}
