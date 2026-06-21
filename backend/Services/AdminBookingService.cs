using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class AdminBookingService
    {
        private readonly AutoWashDbContext _context;
        private readonly BookingNotificationService _bookingNotificationService;

        public AdminBookingService(AutoWashDbContext context, BookingNotificationService bookingNotificationService)
        {
            _context = context;
            _bookingNotificationService = bookingNotificationService;
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
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Include(b => b.AppliedRedemption)
                    .ThenInclude(r => r!.Reward)
                .FirstOrDefaultAsync(x => x.BookingId == bookingId);

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
                addons = addons,
                voucher = voucher,
                notes = b.Notes ?? "",
                scheduledAt = b.ScheduledAt,
                basePrice = b.BasePrice,
                finalPrice = b.FinalPrice,
                pointsEarned = b.PointsEarned,
                status = b.Status.ToString(),
                cancelReason = b.CancelReason,
                createdAt = b.CreatedAt
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
        }
    }
}
