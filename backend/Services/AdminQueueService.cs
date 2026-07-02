using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs;

namespace Auto_Wash.Services
{
    public class AdminQueueService
    {
        private readonly AutoWashDbContext _context;
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, DateTime> _lastAdvanceTimes = new();
        private static readonly System.Threading.SemaphoreSlim _positionSemaphore = new(1, 1);

        public AdminQueueService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<GroupedQueueList> GetTodayQueueAsync()
        {
            var today = DateTime.Today;

            // 1. Get real queues for today
            var realQueues = await _context.Queues
                .AsNoTracking()
                .Include(q => q.Tier)
                .Include(q => q.Customer)
                    .ThenInclude(c => c!.Account)
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.BookingServices)
                        .ThenInclude(bs => bs.Service)
                .Where(q => q.CheckInAt.Date == today && q.Status != QueueStatus.Cancelled)
                .ToListAsync();

            // 2. Get bookings scheduled for today that are Confirmed
            var bookingsForCheckIn = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Customer)
                    .ThenInclude(c => c!.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c!.Tier)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.ScheduledAt.Date == today && b.Status == BookingStatus.Confirmed)
                .ToListAsync();

            var checkedInBookingIds = realQueues
                .Where(q => q.BookingId.HasValue)
                .Select(q => q.BookingId.GetValueOrDefault())
                .ToHashSet();

            var grouped = new GroupedQueueList();

            // SECTION 1: Waiting for Check-In
            var waitingList = bookingsForCheckIn
                .Where(b => !checkedInBookingIds.Contains(b.BookingId))
                .Select(b => {
                    var services = b.BookingServices
                        .Select(bs => new QueueServiceItem
                        {
                            Name = bs.Service.ServiceName,
                            Price = bs.PriceSnapshot
                        })
                        .ToList();

                    if (services.Count == 0)
                    {
                        services.Add(new QueueServiceItem { Name = "Standard Car Wash", Price = 250000 });
                    }

                    return new QueueListItem
                    {
                        QueueId = -b.BookingId,
                        BookingId = b.BookingId,
                        LicensePlate = b.Vehicle?.LicensePlate ?? string.Empty,
                        CustomerName = b.Customer?.Account?.FullName ?? "Khách vãng lai",
                        Phone = b.Customer?.Account?.Phone ?? string.Empty,
                        Email = b.Customer?.Account?.Email ?? string.Empty,
                        TierName = b.Customer?.Tier?.TierName ?? "Member",
                        TierId = b.Customer?.TierId ?? 1,
                        Status = "Waiting",
                        Position = 0,
                        CheckInAt = b.ScheduledAt,
                        StaffNote = b.Notes ?? string.Empty,
                        FinalPrice = b.FinalPrice,
                        PointsEarned = b.PointsEarned,
                        Services = services,
                        QueuePriority = b.Customer?.Tier?.QueuePriority ?? 0,
                        BookingTime = b.ScheduledAt.ToString("HH:mm"),
                        EstimatedStart = b.ScheduledAt.ToString("HH:mm:ss"),
                        EtaCompletion = b.ScheduledAt.AddSeconds(BookingWorkflowConfig.TotalDurationSeconds).ToString("HH:mm:ss"),
                        CurrentStage = "CheckIn",
                        Progress = 0,
                        RemainingSeconds = BookingWorkflowConfig.TotalDurationSeconds,
                        ProgressTracking = BookingWorkflowConfig.GetProgressForBooking(b, null),
                        BookingStatus = b.Status.ToString()
                    };
                })
                .OrderBy(item => item.CheckInAt)
                .ToList();

            grouped.WaitingForCheckIn = waitingList;

            var currentlyProcessing = new List<QueueListItem>();
            var completedToday = new List<QueueListItem>();

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
                    services.Add(new QueueServiceItem { Name = "Standard Car Wash", Price = 250000 });
                }

                var item = new QueueListItem
                {
                    QueueId = q.QueueId,
                    BookingId = q.BookingId,
                    LicensePlate = q.LicensePlate,
                    CustomerName = q.CustomerName ?? q.Customer?.Account?.FullName ?? "Khách vãng lai",
                    Phone = q.Customer?.Account?.Phone ?? string.Empty,
                    Email = q.Customer?.Account?.Email ?? string.Empty,
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
                    QueuePriority = q.Tier?.QueuePriority ?? 0,
                    BookingStatus = q.Booking != null ? q.Booking.Status.ToString() : string.Empty
                };

                if (q.Status == QueueStatus.Archived || q.Status == QueueStatus.Completed)
                {
                    item.BookingTime = q.Booking != null ? q.Booking.ScheduledAt.ToString("HH:mm") : "Walk-in";
                    item.CheckInTime = q.CheckInAt.ToString("HH:mm:ss");
                    item.CompletedTime = (q.CompletedAt ?? q.CheckInAt).ToString("HH:mm:ss");
                    item.ProgressTracking = BookingWorkflowConfig.GetProgressForBooking(q.Booking, q);
                    item.CurrentStage = item.ProgressTracking.CurrentStage;
                    item.Progress = item.ProgressTracking.Progress;
                    item.RemainingSeconds = item.ProgressTracking.RemainingSeconds;
                    completedToday.Add(item);
                }
                else
                {
                    item.BookingTime = q.Booking != null ? q.Booking.ScheduledAt.ToString("HH:mm") : "Walk-in";
                    item.CheckInTime = q.CheckInAt.ToString("HH:mm:ss");
                    
                    // Calculate estimated start and ETA based on workflow config
                    var estStart = q.CheckInAt;
                    item.EstimatedStart = estStart.ToString("HH:mm:ss");
                    item.EtaCompletion = estStart.AddSeconds(BookingWorkflowConfig.TotalDurationSeconds).ToString("HH:mm:ss");

                    item.ProgressTracking = BookingWorkflowConfig.GetProgressForBooking(q.Booking, q);
                    item.CurrentStage = item.ProgressTracking.CurrentStage;
                    item.Progress = item.ProgressTracking.Progress;
                    item.RemainingSeconds = item.ProgressTracking.RemainingSeconds;
                    currentlyProcessing.Add(item);
                }
            }

            // Sort consolidated lists
            grouped.CurrentlyProcessing = currentlyProcessing
                .OrderByDescending(item => item.QueuePriority)
                .ThenBy(item => item.CheckInAt)
                .ToList();

            for (int i = 0; i < grouped.CurrentlyProcessing.Count; i++)
            {
                grouped.CurrentlyProcessing[i].Position = i + 1;
            }

            grouped.CompletedToday = completedToday
                .OrderByDescending(item => item.CompletedAt ?? item.CheckInAt)
                .ToList();

            return grouped;
        }

        public async Task<(bool success, string message, string newStatus)> AdvanceQueueAsync(int id)
        {
            var now = DateTime.Now;
            if (_lastAdvanceTimes.TryGetValue(id, out var lastTime) && (now - lastTime).TotalMilliseconds < 1000)
            {
                return (false, "Thao tác quá nhanh! Vui lòng thử lại sau giây lát.", null!);
            }
            _lastAdvanceTimes[id] = now;

            if (id < 0)
            {
                // Booking Check-in
                int bookingId = -id;
                var strategy = _context.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(2410);");

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

                        // Check-in window validation (±15 minutes)
                        var now = DateTime.Now;
                        var earliestAllowed = booking.ScheduledAt.AddMinutes(-15);
                        var latestAllowed = booking.ScheduledAt.AddMinutes(15);

                        if (now < earliestAllowed)
                        {
                            return (false, $"Chưa đến thời gian check-in! Bạn chỉ có thể check-in sớm tối đa 15 phút (từ {earliestAllowed:HH:mm}).", null!);
                        }
                        if (now > latestAllowed)
                        {
                            return (false, $"Đã quá giờ check-in! Bạn chỉ có thể check-in trễ tối đa 15 phút (trước {latestAllowed:HH:mm}).", null!);
                        }

                        // Enforce: Do not check-in Cancelled, Completed, or NoShow bookings
                        if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Completed || booking.Status == BookingStatus.NoShow || booking.Status == BookingStatus.WaitingCheckout)
                        {
                            return (false, $"Không thể check-in lịch đặt đã {(booking.Status == BookingStatus.NoShow ? "quá hạn (No-Show)" : booking.Status == BookingStatus.Cancelled ? "bị hủy" : booking.Status == BookingStatus.WaitingCheckout ? "chờ thanh toán" : "hoàn thành")}!", null!);
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
                            Status = QueueStatus.Waiting,
                            Position = lastPos + 1,
                            CheckInAt = DateTime.Now,
                            StaffNote = booking.Notes ?? string.Empty
                        };

                        booking.Status = BookingStatus.CheckedIn; // CheckedIn / InProgress

                        _context.Queues.Add(newQueue);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        return (true, "Check-in thành công!", QueueStatus.Waiting.ToString());
                    }
                    catch (Exception)
                    {
                        await transaction.RollbackAsync();
                        throw;
                    }
                });
            }
            else
            {
                // Manual stage advance is disabled when auto-advance is active
                return (false, "Chuyển tiếp thủ công bị vô hiệu hóa khi chế độ tự động đang hoạt động!", null!);
            }
        }

        public async Task<(bool success, string message, int queueId)> UpdateQueueAsync(int id, string? status, string? staffNote)
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
                    return (false, "Không tìm thấy lịch đặt!", 0);
                }

                if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Completed || booking.Status == BookingStatus.NoShow || booking.Status == BookingStatus.WaitingCheckout)
                {
                    return (false, $"Không thể thao tác trên lịch hẹn đã {(booking.Status == BookingStatus.NoShow ? "quá hạn (No-Show)" : booking.Status == BookingStatus.Cancelled ? "bị hủy" : booking.Status == BookingStatus.WaitingCheckout ? "chờ thanh toán" : "hoàn thành")}!", 0);
                }

                // If only updating notes or status is still Waiting, don't create real queue
                if (string.IsNullOrEmpty(status) || status == QueueStatus.Waiting.ToString())
                {
                    if (staffNote != null)
                    {
                        booking.Notes = staffNote;
                    }
                    await _context.SaveChangesAsync();
                    return (true, "Cập nhật ghi chú lịch đặt thành công!", id);
                }

                var strategy = _context.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(2410);");

                        var q = await _context.Queues
                            .FirstOrDefaultAsync(que => que.BookingId == booking.BookingId && que.Status != QueueStatus.Cancelled);
                        
                        if (q != null && q.Status == QueueStatus.Archived && parsedStatus.HasValue && parsedStatus.Value != QueueStatus.Archived)
                        {
                            return (false, "Xe này đã được checkout, không thể thay đổi trạng thái!", 0);
                        }

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
                                Status = QueueStatus.Waiting,
                                Position = lastPos + 1,
                                CheckInAt = DateTime.Now,
                                StaffNote = staffNote ?? booking.Notes ?? string.Empty,
                                CurrentStage = "CheckIn"
                            };
                            booking.Status = BookingStatus.CheckedIn; // CheckedIn / InProgress
                            _context.Queues.Add(q);
                        }
                        else
                        {
                            var oldStatus = q.Status;
                            if (parsedStatus.HasValue) q.Status = parsedStatus.Value;
                            if (staffNote != null) q.StaffNote = staffNote;
                            if (q.StartedAt == null && q.Status != QueueStatus.Waiting) q.StartedAt = DateTime.Now;

                            // Sync current stage
                            if (q.Status == QueueStatus.Waiting)
                                q.CurrentStage = "CheckIn";
                            else if (q.Status == QueueStatus.Washing)
                                q.CurrentStage = "Washing";
                            else if (q.Status == QueueStatus.Drying)
                                q.CurrentStage = "Drying";
                            else if (q.Status == QueueStatus.Completed)
                                q.CurrentStage = "Completed";
                            else if (q.Status == QueueStatus.Archived)
                                q.CurrentStage = "Completed";

                            if (parsedStatus.HasValue && oldStatus != parsedStatus.Value)
                            {
                                await CreateStatusChangeNotificationAndActivityAsync(q, oldStatus, parsedStatus.Value);
                            }
                        }

                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                        return (true, "Cập nhật hàng đợi thành công!", q.QueueId);
                    }
                    catch (Exception)
                    {
                        await transaction.RollbackAsync();
                        throw;
                    }
                });
            }
            else
            {
                var q = await _context.Queues.Include(qu => qu.Booking).FirstOrDefaultAsync(qu => qu.QueueId == id);
                if (q == null)
                {
                    return (false, "Không tìm thấy xe trong hàng đợi!", 0);
                }

                if (q.Status == QueueStatus.Archived && parsedStatus.HasValue && parsedStatus.Value != QueueStatus.Archived)
                {
                    return (false, "Xe này đã được checkout, không thể thay đổi trạng thái!", 0);
                }

                var oldStatus = q.Status;
                if (parsedStatus.HasValue) q.Status = parsedStatus.Value;
                if (staffNote != null) q.StaffNote = staffNote;
                if (q.StartedAt == null && q.Status != QueueStatus.Waiting) q.StartedAt = DateTime.Now;
                if (q.Status == QueueStatus.Completed) q.CompletedAt ??= DateTime.Now;

                // Sync current stage
                if (q.Status == QueueStatus.Waiting)
                    q.CurrentStage = "CheckIn";
                else if (q.Status == QueueStatus.Washing)
                    q.CurrentStage = "Washing";
                else if (q.Status == QueueStatus.Drying)
                    q.CurrentStage = "Drying";
                else if (q.Status == QueueStatus.Completed)
                    q.CurrentStage = "Completed";
                else if (q.Status == QueueStatus.Archived)
                    q.CurrentStage = "Completed";

                // Sync booking status and timestamps
                if (q.Booking != null && parsedStatus.HasValue && oldStatus != parsedStatus.Value)
                {
                    if (parsedStatus.Value == QueueStatus.Washing)
                    {
                        q.Booking.Status = BookingStatus.Washing;
                        q.Booking.WashingAt ??= DateTime.Now;

                        _context.BookingAuditLogs.Add(new BookingAuditLog
                        {
                            BookingId = q.BookingId!.Value,
                            Action = "WashingStarted",
                            Description = "Bắt đầu công đoạn rửa xe.",
                            PerformedBy = "Staff",
                            CreatedAt = DateTime.Now
                        });
                    }
                    else if (parsedStatus.Value == QueueStatus.Completed)
                    {
                        q.Booking.Status = BookingStatus.WaitingCheckout;

                        _context.BookingAuditLogs.Add(new BookingAuditLog
                        {
                            BookingId = q.BookingId!.Value,
                            Action = "WaitingCheckout",
                            Description = "Xe đã hoàn tất các công đoạn dịch vụ, chờ thanh toán.",
                            PerformedBy = "Staff",
                            CreatedAt = DateTime.Now
                        });
                    }
                }

                if (parsedStatus.HasValue && oldStatus != parsedStatus.Value)
                {
                    await CreateStatusChangeNotificationAndActivityAsync(q, oldStatus, parsedStatus.Value);
                }

                await _context.SaveChangesAsync();
                return (true, "Cập nhật hàng đợi thành công!", q.QueueId);
            }
        }

        public async Task<(bool success, string message)> CancelQueueAsync(int id)
        {
            var now = DateTime.Now;
            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings.FindAsync(bookingId);
                if (booking == null)
                {
                    return (false, "Không tìm thấy lịch đặt!");
                }

                booking.Status = BookingStatus.Cancelled; // Cancelled
                booking.CancelledAt = now;
                booking.CancelledBy = "Staff";

                _context.BookingAuditLogs.Add(new BookingAuditLog
                {
                    BookingId = booking.BookingId,
                    Action = "Cancelled",
                    Description = "Hủy lịch đặt xe từ hàng đợi.",
                    PerformedBy = "Staff",
                    CreatedAt = now
                });

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
                q.CurrentStage = "Completed";
                if (q.Booking != null)
                {
                    q.Booking.Status = BookingStatus.Cancelled; // Cancelled
                    q.Booking.CancelledAt = now;
                    q.Booking.CancelledBy = "Staff";

                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = q.BookingId!.Value,
                        Action = "Cancelled",
                        Description = "Hủy lịch đặt xe từ hàng đợi.",
                        PerformedBy = "Staff",
                        CreatedAt = now
                    });
                }

                await _context.SaveChangesAsync();
                return (true, "Hủy hàng đợi thành công!");
            }
        }

        public async Task<(bool success, string message, int finalPrice, int pointsEarned)> CheckoutQueueAsync(int id, string? performerName = null)
        {
            if (id < 0)
            {
                return (false, "Lịch đặt chưa được check-in vào hàng đợi. Vui lòng check-in trước khi thanh toán!", 0, 0);
            }

            var q = await _context.Queues
                .Include(qu => qu.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Account)
                .Include(qu => qu.Booking)
                    .ThenInclude(b => b!.Payment)
                .FirstOrDefaultAsync(qu => qu.QueueId == id);

            if (q == null)
            {
                return (false, "Không tìm thấy xe trong hàng đợi!", 0, 0);
            }

            if (q.Status == QueueStatus.Archived || (q.Booking != null && q.Booking.CheckedOutAt != null))
            {
                return (false, "Xe này đã được thanh toán và checkout trước đó!", 0, 0);
            }

            var now = DateTime.Now;
            q.Status = QueueStatus.Archived;
            q.CompletedAt ??= now;

            int finalPrice = 0;
            int pointsEarned = 0;

            if (q.Booking != null)
            {
                finalPrice = q.Booking.FinalPrice;
                pointsEarned = q.Booking.PointsEarned;

                q.Booking.CheckedOutAt = now;
                q.Booking.CheckedOutBy = performerName ?? "Staff";
                q.Booking.Status = BookingStatus.Completed;
                q.Booking.CompletedAt ??= now;

                // Record the at-counter transaction so cash / free checkouts show up
                // in the payments-based history & revenue stats (issue #51). Online
                // payments never reach here (webhook sets CheckedOutAt first), so a
                // non-Paid record at this point is either absent or an abandoned
                // PayOS attempt that the cash payment supersedes.
                var payment = q.Booking.Payment;
                if (payment == null)
                {
                    payment = new Payment
                    {
                        BookingId = q.Booking.BookingId,
                        CreatedAt = now
                    };
                    _context.Payments.Add(payment);
                }
                if (payment.Status != (int)PaymentStatus.Paid)
                {
                    payment.PaymentMethod = q.Booking.FinalPrice <= 0
                        ? (int)PaymentMethod.Free
                        : (int)PaymentMethod.Cash;
                    payment.Amount = q.Booking.FinalPrice;
                    payment.Status = (int)PaymentStatus.Paid;
                    payment.PaidAt = now;
                }

                // Guard against double-awarding: the background auto-complete service may have
                // already awarded points (it writes an EARN LoyaltyTransaction but never sets PaidAt).
                // Use the same DB-backed check here so points are credited exactly once regardless
                // of which path completes the booking first.
                var alreadyAwarded = await _context.LoyaltyTransactions
                    .AnyAsync(lt => lt.BookingId == q.BookingId && lt.TransactionType == "EARN");

                if (!alreadyAwarded)
                {
                    q.Booking.CompletedAt ??= now;

                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = q.Booking.BookingId,
                        Action = "Completed",
                        Description = $"Thanh toán thành công và checkout xe (Thực hiện bởi: {performerName ?? "Staff"}).",
                        PerformedBy = performerName ?? "Staff",
                        CreatedAt = now
                    });

                    var customer = q.Booking.Customer;

                    // Points are computed authoritatively at checkout using the tier
                    // multiplier in effect right now, and that multiplier + tier are
                    // snapshotted onto the booking for historical accuracy (doc §3, §7, §10).
                    decimal multiplier = 1.0m;
                    if (customer != null)
                    {
                        var tier = await _context.Tiers.FindAsync(customer.TierId);
                        multiplier = tier?.PointMultiplier ?? 1.0m;
                    }
                    pointsEarned = LoyaltyPointsHelper.ComputeEarnedPoints(q.Booking.FinalPrice, multiplier);
                    q.Booking.PointsEarned = pointsEarned;
                    q.Booking.TierIdSnapshot = customer?.TierId;
                    q.Booking.PointMultiplierSnapshot = multiplier;

                    if (customer != null)
                    {
                        customer.TotalVisits += 1;
                        customer.TotalSpend += q.Booking.FinalPrice;
                        customer.RankingBalance += q.Booking.FinalPrice;
                        customer.PointBalance += pointsEarned;
                        customer.LifetimePoints += pointsEarned;
                        customer.LastVisitAt = now;
                    }

                    _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                    {
                        CustomerId = q.Booking.CustomerId,
                        Points = pointsEarned,
                        TransactionType = "EARN",
                        BookingId = q.BookingId,
                        Amount = q.Booking.FinalPrice,
                        Note = $"Tích điểm dịch vụ rửa xe {q.LicensePlate}",
                        CreatedAt = now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = q.Booking.CustomerId,
                        Title = $"Lịch hẹn #{q.BookingId} đã được checkout thành công.",
                        Message = $"Xe của bạn đã hoàn tất thanh toán & checkout. Bạn nhận +{pointsEarned} điểm!",
                        Type = "points",
                        IsRead = false,
                        CreatedAt = now
                    });
                }
                else
                {
                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = q.Booking.BookingId,
                        Action = "Checkout",
                        Description = $"Giao xe và hoàn tất thủ tục checkout (Thực hiện bởi: {performerName ?? "Staff"}).",
                        PerformedBy = performerName ?? "Staff",
                        CreatedAt = now
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Real-time UPGRADE check now that this completed booking counts toward
            // the 6-month ranking window (doc §4). Downgrades are handled only by the
            // monthly maintenance job, never here.
            if (q.Booking?.Customer != null)
            {
                await TierHelper.EvaluateUpgradeAsync(_context, q.Booking.Customer, now);
                await _context.SaveChangesAsync();
            }

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

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(2410);");

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
                    await transaction.CommitAsync();

                    return (true, "Thêm xe vào hàng đợi thành công!", entry.QueueId, entry.CustomerName, tierName, bookingId.HasValue, bookingSvcs);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        private async Task CreateStatusChangeNotificationAndActivityAsync(Queue q, QueueStatus oldStatus, QueueStatus newStatus)
        {
            if (q.CustomerId == null) return;

            string title = "";
            string message = "";

            switch (newStatus)
            {
                case QueueStatus.Waiting:
                    title = "Chờ check-in";
                    message = "Xe của bạn đang chờ check-in vào hàng đợi.";
                    break;
                case QueueStatus.Washing:
                    title = "Đang rửa bọt tuyết";
                    message = "Xe của bạn đã bắt đầu được rửa.";
                    break;
                case QueueStatus.Drying:
                    title = "Đang sấy khô";
                    message = "Xe của bạn đang được sấy khô và kiểm tra cuối.";
                    break;
                case QueueStatus.Completed:
                    title = "Chờ thanh toán";
                    message = "Dịch vụ của bạn đã hoàn tất. Vui lòng đến quầy để thanh toán.";
                    break;
            }

            if (!string.IsNullOrEmpty(title) && !string.IsNullOrEmpty(message))
            {
                var now = DateTime.Now;
                var notification = new Notification
                {
                    CustomerId = q.CustomerId.Value,
                    Title = title,
                    Message = message,
                    Type = "status",
                    IsRead = false,
                    CreatedAt = now
                };
                _context.Notifications.Add(notification);
            }
        }
    }

    public class GroupedQueueList
    {
        public List<QueueListItem> WaitingForCheckIn { get; set; } = new();
        public List<QueueListItem> CurrentlyProcessing { get; set; } = new();
        public List<QueueListItem> CompletedToday { get; set; } = new();
    }

    public class QueueListItem
    {
        public int QueueId { get; set; }
        public int? BookingId { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string TierName { get; set; } = string.Empty;
        public int TierId { get; set; }
        public string Status { get; set; } = "Waiting";
        public string BookingStatus { get; set; } = string.Empty;
        public int Position { get; set; }
        public DateTime CheckInAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string StaffNote { get; set; } = string.Empty;
        public int FinalPrice { get; set; }
        public int PointsEarned { get; set; }
        public List<QueueServiceItem> Services { get; set; } = new();
        internal int QueuePriority { get; set; }

        // Custom workflow estimation fields
        public string EstimatedStart { get; set; } = string.Empty;
        public string EtaCompletion { get; set; } = string.Empty;
        public string BookingTime { get; set; } = string.Empty;
        public string CheckInTime { get; set; } = string.Empty;
        public string CompletedTime { get; set; } = string.Empty;
        public string CurrentStage { get; set; } = string.Empty;
        public int Progress { get; set; } = 0;
        public int RemainingSeconds { get; set; } = 50;
        public BookingProgressDto ProgressTracking { get; set; } = new();
    }

    public class QueueServiceItem
    {
        public string Name { get; set; } = string.Empty;
        public int Price { get; set; }
    }
}
