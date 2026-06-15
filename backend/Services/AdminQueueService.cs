using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class AdminQueueService
    {
        private readonly AutoWashDbContext _context;

        public AdminQueueService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<List<QueueListItem>> GetTodayQueueAsync()
        {
            var today = DateTime.Today;

            // 1. Get real queues for today
            var realQueues = await _context.Queues
                .Include(q => q.Tier)
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.BookingServices)
                        .ThenInclude(bs => bs.Service)
                .Where(q => q.CheckInAt.Date == today && q.Status != QueueStatus.Cancelled)
                .ToListAsync();

            // 2. Get unchecked bookings for today
            var uncheckedBookings = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.ScheduledAt.Date == today 
                         && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                         && !_context.Queues.Any(q => q.BookingId == b.BookingId && q.Status != QueueStatus.Cancelled))
                .ToListAsync();

            var list = new List<QueueListItem>();

            // Map real queues
            foreach (var q in realQueues)
            {
                var services = (q.Booking?.BookingServices ?? new List<Auto_Wash.Data.Entities.BookingService>())
                    .Select(bs => new QueueServiceItem
                    {
                        Name = bs.Service.ServiceName,
                        Price = bs.PriceSnapshot
                    })
                    .ToList();

                if (services.Count == 0)
                {
                    services.Add(new QueueServiceItem { Name = "Rửa Basic", Price = 50000 });
                }

                list.Add(new QueueListItem
                {
                    QueueId = q.QueueId,
                    BookingId = q.BookingId,
                    LicensePlate = q.LicensePlate,
                    CustomerName = q.CustomerName ?? "Khách vãng lai",
                    TierName = q.Tier?.TierName ?? "Member",
                    TierId = q.TierId ?? 1,
                    Status = q.Status.ToString(),
                    Position = q.Position,
                    CheckInAt = q.CheckInAt,
                    StartedAt = q.StartedAt,
                    CompletedAt = q.CompletedAt,
                    StaffNote = q.StaffNote ?? string.Empty,
                    FinalPrice = q.Booking?.FinalPrice ?? (services.Sum(s => s.Price)),
                    PointsEarned = q.Booking?.PointsEarned ?? 0,
                    Services = services,
                    QueuePriority = q.Tier?.QueuePriority ?? 0
                });
            }

            // Map synthetic bookings
            foreach (var b in uncheckedBookings)
            {
                var services = b.BookingServices
                    .Select(bs => new QueueServiceItem
                    {
                        Name = bs.Service.ServiceName,
                        Price = bs.PriceSnapshot
                    })
                    .ToList();

                list.Add(new QueueListItem
                {
                    QueueId = -b.BookingId, // Negative ID for synthetic booking
                    BookingId = b.BookingId,
                    LicensePlate = b.Vehicle?.LicensePlate ?? string.Empty,
                    CustomerName = b.Customer?.Account?.FullName ?? "Khách vãng lai",
                    TierName = b.Customer?.Tier?.TierName ?? "Member",
                    TierId = b.Customer?.TierId ?? 1,
                    Status = QueueStatus.Waiting.ToString(),
                    Position = 0,
                    CheckInAt = b.ScheduledAt, // scheduled time is the check-in time equivalent
                    StartedAt = null,
                    CompletedAt = null,
                    StaffNote = b.Notes ?? string.Empty,
                    FinalPrice = b.FinalPrice,
                    PointsEarned = b.PointsEarned,
                    Services = services,
                    QueuePriority = b.Customer?.Tier?.QueuePriority ?? 0
                });
            }

            // Sort consolidated list
            var sortedList = list
                .OrderByDescending(item => item.QueuePriority)
                .ThenBy(item => item.CheckInAt)
                .ToList();

            // Set positions
            for (int i = 0; i < sortedList.Count; i++)
            {
                sortedList[i].Position = i + 1;
            }

            return sortedList;
        }

        public async Task<(bool success, string message, string newStatus)> AdvanceQueueAsync(int id)
        {
            if (id < 0)
            {
                // Booking Check-in
                int bookingId = -id;
                var booking = await _context.Bookings
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Account)
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Tier)
                    .Include(b => b.Vehicle)
                    .FirstOrDefaultAsync(b => b.BookingId == bookingId);

                if (booking == null)
                {
                    return (false, "Không tìm thấy lịch đặt!", null!);
                }

                // Enforce: Do not check-in Cancelled or Completed bookings
                if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Completed)
                {
                    return (false, "Không thể check-in lịch đặt đã bị hủy hoặc đã hoàn thành!", null!);
                }

                var existingQueue = await _context.Queues
                    .FirstOrDefaultAsync(q => q.BookingId == booking.BookingId && q.Status != QueueStatus.Cancelled);
                if (existingQueue != null)
                {
                    return (false, "Lịch đặt này đã được check-in vào hàng đợi rồi!", null!);
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
                    Status = QueueStatus.LPR_Scan,
                    Position = lastPos + 1,
                    CheckInAt = DateTime.Now,
                    StartedAt = DateTime.Now,
                    StaffNote = booking.Notes ?? string.Empty
                };

                booking.Status = BookingStatus.CheckedIn; // CheckedIn / InProgress

                _context.Queues.Add(newQueue);
                await _context.SaveChangesAsync();

                return (true, "Check-in thành công!", QueueStatus.LPR_Scan.ToString());
            }
            else
            {
                // Real Queue advance
                var q = await _context.Queues.FindAsync(id);
                if (q == null)
                {
                    return (false, "Không tìm thấy xe trong hàng đợi!", null!);
                }

                QueueStatus? nextStatus = q.Status switch
                {
                    QueueStatus.Waiting => QueueStatus.LPR_Scan,
                    QueueStatus.LPR_Scan => QueueStatus.Washing,
                    QueueStatus.Washing => QueueStatus.Addon_Processing,
                    QueueStatus.Addon_Processing => QueueStatus.Drying,
                    QueueStatus.Drying => QueueStatus.Completed,
                    _ => (QueueStatus?)null
                };

                if (nextStatus == null)
                {
                    return (false, $"Không thể chuyển tiếp từ trạng thái '{q.Status}'!", null!);
                }

                q.Status = nextStatus.Value;
                if (q.StartedAt == null && nextStatus != QueueStatus.Waiting)
                {
                    q.StartedAt = DateTime.Now;
                }
                if (nextStatus == QueueStatus.Completed)
                {
                    q.CompletedAt ??= DateTime.Now;
                }

                await _context.SaveChangesAsync();
                return (true, "Cập nhật trạng thái thành công!", nextStatus.Value.ToString());
            }
        }

        public async Task<(bool success, string message)> UpdateQueueAsync(int id, string? status, string? staffNote)
        {
            QueueStatus? parsedStatus = null;
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<QueueStatus>(status, true, out var parsed))
                parsedStatus = parsed;
            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Account)
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Tier)
                    .Include(b => b.Vehicle)
                    .FirstOrDefaultAsync(b => b.BookingId == bookingId);

                if (booking == null)
                {
                    return (false, "Không tìm thấy lịch đặt!");
                }

                // If only updating notes or status is still Waiting, don't create real queue
                if (string.IsNullOrEmpty(status) || status == QueueStatus.Waiting.ToString())
                {
                    if (staffNote != null)
                    {
                        booking.Notes = staffNote;
                    }
                    await _context.SaveChangesAsync();
                    return (true, "Cập nhật ghi chú lịch đặt thành công!");
                }

                // Perform check-in and set requested status
                var q = await _context.Queues
                    .FirstOrDefaultAsync(que => que.BookingId == booking.BookingId && que.Status != QueueStatus.Cancelled);
                if (q == null)
                {
                    var today = DateTime.Today;
                    var lastPos = await _context.Queues
                        .Where(que => que.CheckInAt.Date == today && que.Status != QueueStatus.Cancelled)
                        .Select(que => (int?)que.Position)
                        .MaxAsync() ?? 0;

                    q = new Queue
                    {
                        BookingId = booking.BookingId,
                        VehicleId = booking.VehicleId,
                        CustomerId = booking.CustomerId,
                        LicensePlate = booking.Vehicle?.LicensePlate?.ToUpper()?.Trim() ?? string.Empty,
                        CustomerName = booking.Customer?.Account?.FullName ?? "Khách vãng lai",
                        TierId = booking.Customer?.TierId ?? 1,
                        Status = parsedStatus ?? QueueStatus.Waiting,
                        Position = lastPos + 1,
                        CheckInAt = DateTime.Now,
                        StartedAt = DateTime.Now,
                        StaffNote = staffNote ?? booking.Notes ?? string.Empty
                    };
                    booking.Status = BookingStatus.CheckedIn; // CheckedIn / InProgress
                    _context.Queues.Add(q);
                }
                else
                {
                    if (parsedStatus.HasValue) q.Status = parsedStatus.Value;
                    if (staffNote != null) q.StaffNote = staffNote;
                    if (q.StartedAt == null && q.Status != QueueStatus.Waiting) q.StartedAt = DateTime.Now;
                }

                await _context.SaveChangesAsync();
                return (true, "Cập nhật hàng đợi thành công!");
            }
            else
            {
                var q = await _context.Queues.FindAsync(id);
                if (q == null)
                {
                    return (false, "Không tìm thấy xe trong hàng đợi!");
                }

                if (parsedStatus.HasValue) q.Status = parsedStatus.Value;
                if (staffNote != null) q.StaffNote = staffNote;
                if (q.StartedAt == null && q.Status != QueueStatus.Waiting) q.StartedAt = DateTime.Now;
                if (q.Status == QueueStatus.Completed) q.CompletedAt ??= DateTime.Now;

                await _context.SaveChangesAsync();
                return (true, "Cập nhật hàng đợi thành công!");
            }
        }

        public async Task<(bool success, string message)> CancelQueueAsync(int id)
        {
            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings.FindAsync(bookingId);
                if (booking == null)
                {
                    return (false, "Không tìm thấy lịch đặt!");
                }

                booking.Status = BookingStatus.Cancelled; // Cancelled
                await _context.SaveChangesAsync();
                return (true, "Hủy lịch đặt thành công!");
            }
            else
            {
                var q = await _context.Queues.Include(qu => qu.Booking).FirstOrDefaultAsync(qu => qu.QueueId == id);
                if (q == null)
                {
                    return (false, "Không tìm thấy xe trong hàng đợi!");
                }

                q.Status = QueueStatus.Cancelled;
                if (q.Booking != null)
                {
                    q.Booking.Status = BookingStatus.Cancelled; // Cancelled
                }

                await _context.SaveChangesAsync();
                return (true, "Hủy hàng đợi thành công!");
            }
        }

        public async Task<(bool success, string message, int finalPrice, int pointsEarned)> CheckoutQueueAsync(int id)
        {
            if (id < 0)
            {
                return (false, "Lịch đặt chưa được check-in vào hàng đợi. Vui lòng check-in trước khi thanh toán!", 0, 0);
            }

            var q = await _context.Queues
                .Include(qu => qu.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Account)
                .FirstOrDefaultAsync(qu => qu.QueueId == id);

            if (q == null)
            {
                return (false, "Không tìm thấy xe trong hàng đợi!", 0, 0);
            }

            if (q.Status == QueueStatus.Completed)
            {
                return (false, "Xe này đã được thanh toán và checkout trước đó!", 0, 0);
            }

            var now = DateTime.Now;
            q.Status = QueueStatus.Completed;
            q.CompletedAt ??= now;

            int finalPrice = 0;
            int pointsEarned = 0;

            if (q.Booking != null)
            {
                finalPrice = q.Booking.FinalPrice;
                pointsEarned = q.Booking.PointsEarned;

                if (q.Booking.Status != BookingStatus.Completed)
                {
                    q.Booking.Status = BookingStatus.Completed; // Completed
                    q.Booking.PaidAt ??= now;

                    var customer = q.Booking.Customer;
                    if (customer != null)
                    {
                        customer.TotalVisits += 1;
                        customer.TotalSpend += q.Booking.FinalPrice;
                        customer.RankingBalance += q.Booking.FinalPrice;
                        customer.PointBalance += q.Booking.PointsEarned;
                        customer.LifetimePoints += q.Booking.PointsEarned;
                        customer.LastVisitAt = now;
                    }

                    _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                    {
                        CustomerId = q.Booking.CustomerId,
                        Points = q.Booking.PointsEarned,
                        TransactionType = "EARN",
                        BookingId = q.BookingId,
                        Note = $"Tích điểm dịch vụ rửa xe {q.LicensePlate}",
                        CreatedAt = now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = q.Booking.CustomerId,
                        Title = "Rửa xe hoàn tất!",
                        Message = $"Xe {q.LicensePlate} hoàn tất dịch vụ. Bạn nhận +{q.Booking.PointsEarned} điểm!",
                        Type = "Booking",
                        IsRead = false,
                        CreatedAt = now
                    });
                }
            }

            await _context.SaveChangesAsync();
            return (true, "Thanh toán & checkout thành công!", finalPrice, pointsEarned);
        }

        public async Task<(bool success, string message, int queueId, string customerName, string tierName, bool hasBooking, string bookingServices)> AddWalkInAsync(string licensePlate, string? customerName)
        {
            int? tierId = 1;
            int? customerId = null;
            int? vehicleId = null;
            string finalCustomerName = customerName ?? "Khách vãng lai";

            var normPlate = LicensePlateHelper.Normalize(licensePlate);
            var vehicle = await _context.Vehicles
                .Include(v => v.Customer).ThenInclude(c => c.Account)
                .Include(v => v.Customer).ThenInclude(c => c.Tier)
                .FirstOrDefaultAsync(v => v.LicensePlate == normPlate);

            if (vehicle?.Customer != null)
            {
                tierId = vehicle.Customer.TierId;
                customerId = vehicle.Customer.CustomerId;
                vehicleId = vehicle.VehicleId;
                if (string.IsNullOrEmpty(customerName))
                {
                    finalCustomerName = vehicle.Customer.Account?.FullName ?? "Khách vãng lai";
                }
            }

            var today = DateTime.Today;
            var lastPos = await _context.Queues
                .Where(q => q.CheckInAt.Date == today && q.Status != QueueStatus.Cancelled)
                .Select(q => (int?)q.Position)
                .MaxAsync() ?? 0;

            var tier = await _context.Tiers.FindAsync(tierId ?? 1);
            string tierName = tier?.TierName ?? "Member";

            int? bookingId = null;
            string bookingSvcs = string.Empty;

            if (vehicleId.HasValue)
            {
                var booking = await _context.Bookings
                    .Include(b => b.BookingServices)
                        .ThenInclude(bs => bs.Service)
                    .FirstOrDefaultAsync(b => b.VehicleId == vehicleId.Value
                                           && b.ScheduledAt.Date == today
                                           && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed));
                if (booking != null)
                {
                    bookingId = booking.BookingId;
                    booking.Status = BookingStatus.CheckedIn; // CheckedIn
                    bookingSvcs = string.Join(", ", booking.BookingServices.Select(bs => bs.Service.ServiceName));
                }
            }

            var entry = new Queue
            {
                LicensePlate = normPlate,
                CustomerName = finalCustomerName,
                TierId = tierId,
                CustomerId = customerId,
                VehicleId = vehicleId,
                BookingId = bookingId,
                Status = QueueStatus.Waiting,
                Position = lastPos + 1,
                CheckInAt = DateTime.Now
            };

            _context.Queues.Add(entry);
            await _context.SaveChangesAsync();

            return (true, "Thêm xe vào hàng đợi thành công!", entry.QueueId, entry.CustomerName, tierName, bookingId.HasValue, bookingSvcs);
        }
    }

    public class QueueListItem
    {
        public int QueueId { get; set; }
        public int? BookingId { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string TierName { get; set; } = string.Empty;
        public int TierId { get; set; }
        public string Status { get; set; } = "Waiting";
        public int Position { get; set; }
        public DateTime CheckInAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string StaffNote { get; set; } = string.Empty;
        public int FinalPrice { get; set; }
        public int PointsEarned { get; set; }
        public List<QueueServiceItem> Services { get; set; } = new();
        internal int QueuePriority { get; set; }
    }

    public class QueueServiceItem
    {
        public string Name { get; set; } = string.Empty;
        public int Price { get; set; }
    }
}
