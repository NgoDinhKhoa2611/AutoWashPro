using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Microsoft.Extensions.Configuration;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class BookingWorkflowBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BookingWorkflowBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        public BookingWorkflowBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<BookingWorkflowBackgroundService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingWorkflowBackgroundService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessWorkflowAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing BookingWorkflowBackgroundService.");
                }

                // DEMO VALUE - CHANGE BACK TO MINUTES BEFORE FINAL RELEASE
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }

            _logger.LogInformation("BookingWorkflowBackgroundService is stopping.");
        }

        private async Task ProcessWorkflowAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AutoWashDbContext>();
            var now = DateTime.Now;
            var today = DateTime.Today;

            // 1. Fetch active queue items for today that are not completed, cancelled, or archived
            var activeQueues = await context.Queues
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Account)
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Tier)
                .Where(q => q.CheckInAt.Date == today 
                         && q.Status != QueueStatus.Completed 
                         && q.Status != QueueStatus.Cancelled 
                         && q.Status != QueueStatus.Archived)
                .ToListAsync();

            bool changed = false;

            foreach (var q in activeQueues)
            {
                // DEMO VALUE - CHANGE BACK TO MINUTES BEFORE FINAL RELEASE
                var elapsedSeconds = (now - q.CheckInAt).TotalSeconds;
                if (elapsedSeconds < 0) elapsedSeconds = 0;

                if (elapsedSeconds < 10)
                {
                    if (q.Status == QueueStatus.Waiting || q.Status == QueueStatus.LPR_Scan)
                    {
                        q.CurrentStage = "CheckIn";
                    }
                }
                else if (elapsedSeconds < 25)
                {
                    if (q.Status == QueueStatus.Waiting || q.Status == QueueStatus.LPR_Scan || q.Status == QueueStatus.Washing)
                    {
                        q.CurrentStage = "ExteriorWash";
                        if (q.Status != QueueStatus.Washing)
                        {
                            q.Status = QueueStatus.Washing;
                            q.StartedAt ??= q.CheckInAt.AddSeconds(10);
                            changed = true;

                            if (q.Booking != null && q.Booking.Status != BookingStatus.Washing)
                            {
                                q.Booking.Status = BookingStatus.Washing;
                                q.Booking.WashingAt ??= q.StartedAt;

                                context.BookingAuditLogs.Add(new BookingAuditLog
                                {
                                    BookingId = q.BookingId!.Value,
                                    Action = "WashingStarted",
                                    Description = "Tự động bắt đầu công đoạn rửa xe (Rửa ngoại thất).",
                                    PerformedBy = "System",
                                    CreatedAt = now
                                });
                            }

                            _logger.LogInformation("[AUDIT EVENT] Auto-started washing: QueueId={QueueId}, BookingId={BookingId}, LicensePlate={LicensePlate}, StartedAt={StartedAt}",
                                q.QueueId, q.BookingId, q.LicensePlate, q.StartedAt);
                        }
                    }
                }
                else if (elapsedSeconds < 40)
                {
                    if (q.Status == QueueStatus.Washing || q.Status == QueueStatus.Addon_Processing)
                    {
                        q.CurrentStage = "InteriorCleaning";
                        if (q.Status != QueueStatus.Addon_Processing)
                        {
                            q.Status = QueueStatus.Addon_Processing;
                            changed = true;
                        }
                    }
                }
                else if (elapsedSeconds < 50)
                {
                    if (q.Status == QueueStatus.Addon_Processing || q.Status == QueueStatus.Drying)
                    {
                        q.CurrentStage = "FinalInspection";
                        if (q.Status != QueueStatus.Drying)
                        {
                            q.Status = QueueStatus.Drying;
                            changed = true;
                        }
                    }
                }
                else // elapsedSeconds >= 50
                {
                    q.CurrentStage = "Completed";
                    if (q.Status != QueueStatus.Archived)
                    {
                        q.Status = QueueStatus.Archived;
                        q.CompletedAt ??= now;
                        changed = true;

                        if (q.Booking != null && q.Booking.Status != BookingStatus.Completed)
                        {
                            q.Booking.Status = BookingStatus.Completed;
                            q.Booking.CompletedAt ??= now;
                            q.Booking.PaidAt ??= now;

                            context.BookingAuditLogs.Add(new BookingAuditLog
                            {
                                BookingId = q.BookingId!.Value,
                                Action = "Completed",
                                Description = "Tự động hoàn thành dịch vụ sau 50 giây.",
                                PerformedBy = "System",
                                CreatedAt = now
                            });

                            var alreadyAwarded = await context.LoyaltyTransactions
                                .AnyAsync(lt => lt.BookingId == q.BookingId && lt.TransactionType == "EARN");
                            if (!alreadyAwarded)
                            {
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

                                context.LoyaltyTransactions.Add(new LoyaltyTransaction
                                {
                                    CustomerId = q.Booking.CustomerId,
                                    Points = q.Booking.PointsEarned,
                                    TransactionType = "EARN",
                                    BookingId = q.BookingId,
                                    Note = $"Tích điểm dịch vụ rửa xe {q.LicensePlate} (Tự động hoàn thành)",
                                    CreatedAt = now
                                });

                                context.Notifications.Add(new Notification
                                {
                                    CustomerId = q.Booking.CustomerId,
                                    Title = $"Lịch hẹn #{q.BookingId} đã hoàn tất tự động.",
                                    Message = $"Xe của bạn đã hoàn tất dịch vụ. Bạn nhận +{q.Booking.PointsEarned} điểm!",
                                    Type = "points",
                                    IsRead = false,
                                    CreatedAt = now
                                });
                            }
                        }

                        _logger.LogInformation("[AUDIT EVENT] Auto-completed: QueueId={QueueId}, BookingId={BookingId}, LicensePlate={LicensePlate}, CompletedAt={CompletedAt}",
                            q.QueueId, q.BookingId, q.LicensePlate, q.CompletedAt);
                    }
                }
            }

            // 2. Auto NoShow Detection (Threshold: 15 minutes)
            int noShowThreshold = 15; // as per Phase 2 requirements
            var noShowCutoff = now.AddMinutes(-noShowThreshold);
            var overdueBookings = await context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                            && b.ScheduledAt <= noShowCutoff)
                .ToListAsync();
 
            foreach (var booking in overdueBookings)
            {
                booking.Status = BookingStatus.NoShow;
                booking.NoShowAt = now;
                changed = true;
 
                // Remove from active queue if one exists
                var activeQueueItem = await context.Queues
                    .FirstOrDefaultAsync(q => q.BookingId == booking.BookingId && q.Status != QueueStatus.Cancelled && q.Status != QueueStatus.Archived);
                if (activeQueueItem != null)
                {
                    activeQueueItem.Status = QueueStatus.Cancelled;
                }
 
                // Log Audit Event
                context.BookingAuditLogs.Add(new BookingAuditLog
                {
                    BookingId = booking.BookingId,
                    Action = "NoShow",
                    Description = "Tự động đánh dấu Không Đến (No-Show) do quá hạn check-in 15 phút.",
                    PerformedBy = "System",
                    CreatedAt = now
                });
 
                // Send notification to customer
                context.Notifications.Add(new Notification
                {
                    CustomerId = booking.CustomerId,
                    Title = "Lịch hẹn quá hạn (No-Show)",
                    Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} lúc {booking.ScheduledAt:HH:mm} đã tự động chuyển thành No-Show do trễ check-in 15 phút.",
                    Type = "Booking",
                    IsRead = false,
                    CreatedAt = now
                });

                if (!booking.NoShowEmailSent)
                {
                    booking.NoShowEmailSent = true;
                    var mainService = booking.BookingServices
                        .Where(bs => !bs.Service.IsAddOn)
                        .Select(bs => bs.Service.ServiceName)
                        .FirstOrDefault() ?? "Dịch vụ rửa xe";

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
                        var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                        notificationService.SendNoShowEmailInBackground(emailModel);
                    }
                }
 
                _logger.LogInformation("[AUDIT EVENT] Booking NoShow Auto-Triggered: BookingId={BookingId}, ScheduledAt={ScheduledAt}, LicensePlate={LicensePlate}, NoShowAt={NoShowAt}",
                    booking.BookingId, booking.ScheduledAt, booking.Vehicle?.LicensePlate, booking.NoShowAt);
            }

            // 3. Booking Reminder Check
            var reminderConfig = _configuration.GetSection("BookingReminderConfig");
            bool useDemoMode = reminderConfig.GetValue<bool>("UseDemoMode", true);
            double reminder1Threshold = useDemoMode 
                ? reminderConfig.GetValue<double>("Reminder1DemoSeconds", 60) 
                : 3600; // 60 minutes in seconds
            double reminder2Threshold = useDemoMode 
                ? reminderConfig.GetValue<double>("Reminder2DemoSeconds", 30) 
                : 1800; // 30 minutes in seconds

            var upcomingBookings = await context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                            && (!b.Reminder1Sent || !b.Reminder2Sent))
                .ToListAsync();

            foreach (var booking in upcomingBookings)
            {
                var timeToAppointment = (booking.ScheduledAt - now).TotalSeconds;
                if (timeToAppointment > 0)
                {
                    if (!booking.Reminder1Sent && timeToAppointment <= reminder1Threshold)
                    {
                        booking.Reminder1Sent = true;
                        changed = true;

                        var mainService = booking.BookingServices
                            .Where(bs => !bs.Service.IsAddOn)
                            .Select(bs => bs.Service.ServiceName)
                            .FirstOrDefault() ?? "Dịch vụ rửa xe";

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
                            var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                            notificationService.SendBookingReminderEmailInBackground(emailModel, 1, useDemoMode);
                        }
                    }

                    if (!booking.Reminder2Sent && timeToAppointment <= reminder2Threshold)
                    {
                        booking.Reminder2Sent = true;
                        changed = true;

                        var mainService = booking.BookingServices
                            .Where(bs => !bs.Service.IsAddOn)
                            .Select(bs => bs.Service.ServiceName)
                            .FirstOrDefault() ?? "Dịch vụ rửa xe";

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
                            var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                            notificationService.SendBookingReminderEmailInBackground(emailModel, 2, useDemoMode);
                        }
                    }
                }
            }
 
            if (changed)
            {
                await context.SaveChangesAsync();
            }
        }
    }
}
