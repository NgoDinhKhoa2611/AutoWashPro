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

                // Polling interval for queue workflow processing
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
                var elapsedSeconds = (now - q.CheckInAt).TotalSeconds;
                if (elapsedSeconds < 0) elapsedSeconds = 0;

                if (elapsedSeconds < BookingWorkflowConfig.CheckInSeconds)
                {
                    if (q.Status == QueueStatus.Waiting)
                    {
                        q.CurrentStage = "CheckIn";
                    }
                }
                else if (elapsedSeconds < BookingWorkflowConfig.CheckInSeconds + BookingWorkflowConfig.WashingSeconds)
                {
                    if (q.Status == QueueStatus.Waiting || q.Status == QueueStatus.Washing)
                    {
                        q.CurrentStage = "Washing";
                        if (q.Status != QueueStatus.Washing)
                        {
                            q.Status = QueueStatus.Washing;
                            q.StartedAt ??= q.CheckInAt.AddSeconds(BookingWorkflowConfig.CheckInSeconds);
                            changed = true;

                            if (q.Booking != null && q.Booking.Status != BookingStatus.Washing)
                            {
                                q.Booking.Status = BookingStatus.Washing;
                                q.Booking.WashingAt ??= q.StartedAt;

                                context.BookingAuditLogs.Add(new BookingAuditLog
                                {
                                    BookingId = q.BookingId!.Value,
                                    Action = "WashingStarted",
                                    Description = "Tự động bắt đầu công đoạn rửa xe.",
                                    PerformedBy = "System",
                                    CreatedAt = now
                                });
                            }

                            _logger.LogInformation("[AUDIT EVENT] Auto-started washing: QueueId={QueueId}, BookingId={BookingId}, LicensePlate={LicensePlate}, StartedAt={StartedAt}",
                                q.QueueId, q.BookingId, q.LicensePlate, q.StartedAt);
                        }
                    }
                }
                else if (elapsedSeconds < BookingWorkflowConfig.TotalDurationSeconds)
                {
                    if (q.Status == QueueStatus.Washing || q.Status == QueueStatus.Drying)
                    {
                        q.CurrentStage = "Drying";
                        if (q.Status != QueueStatus.Drying)
                        {
                            q.Status = QueueStatus.Drying;
                            changed = true;
                        }
                    }
                }
                else // elapsedSeconds >= BookingWorkflowConfig.TotalDurationSeconds
                {
                    q.CurrentStage = "Completed";
                    if (q.Status != QueueStatus.Completed && q.Status != QueueStatus.Archived)
                    {
                        q.Status = QueueStatus.Completed;
                        q.CompletedAt ??= now;
                        changed = true;

                        if (q.Booking != null && q.Booking.Status != BookingStatus.WaitingCheckout)
                        {
                            q.Booking.Status = BookingStatus.WaitingCheckout;

                            context.BookingAuditLogs.Add(new BookingAuditLog
                            {
                                BookingId = q.BookingId!.Value,
                                Action = "WaitingCheckout",
                                Description = $"Tự động chuyển sang trạng thái chờ thanh toán sau {BookingWorkflowConfig.TotalDurationSeconds} giây.",
                                PerformedBy = "System",
                                CreatedAt = now
                            });

                            context.Notifications.Add(new Notification
                            {
                                CustomerId = q.Booking.CustomerId,
                                Title = "Xe đã hoàn tất dịch vụ",
                                Message = "Xe đã hoàn tất dịch vụ. Vui lòng đến cửa hàng thanh toán.",
                                Type = "Booking",
                                IsRead = false,
                                CreatedAt = now
                            });

                            // Send WaitingCheckout email notification
                            if (!q.Booking.WaitingCheckoutEmailSent)
                            {
                                q.Booking.WaitingCheckoutEmailSent = true;

                                var mainService = await context.BookingServices
                                    .Include(bs => bs.Service)
                                    .Where(bs => bs.BookingId == q.BookingId.Value && !bs.Service.IsAddOn)
                                    .Select(bs => bs.Service.ServiceName)
                                    .FirstOrDefaultAsync() ?? "Dịch vụ rửa xe";

                                var emailModel = new BookingEmailModel
                                {
                                    BookingId = q.BookingId.Value,
                                    CustomerName = q.Booking.Customer?.Account?.FullName ?? "Khách hàng",
                                    Email = q.Booking.Customer?.Account?.Email ?? "",
                                    LicensePlate = q.LicensePlate ?? "",
                                    ScheduledAt = q.Booking.ScheduledAt,
                                    FinalPrice = q.Booking.FinalPrice,
                                    ServiceName = mainService
                                };

                                if (!string.IsNullOrWhiteSpace(emailModel.Email))
                                {
                                    var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                                    notificationService.SendWaitingCheckoutEmailInBackground(emailModel);
                                    _logger.LogInformation("[EMAIL] WaitingCheckout email sent: BookingId={BookingId}, Email={Email}", q.BookingId, emailModel.Email);
                                }
                            }
                        }

                        _logger.LogInformation("[AUDIT EVENT] Auto-waiting-checkout: QueueId={QueueId}, BookingId={BookingId}, LicensePlate={LicensePlate}, CompletedAt={CompletedAt}",
                            q.QueueId, q.BookingId, q.LicensePlate, q.CompletedAt);
                    }
                }
            }

            // 2. Auto NoShow Detection (Threshold configurable)
            int noShowThreshold = _configuration.GetValue<int>("BookingCapacityConfig:CheckInWindowMinutes", 15);
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
                    Description = $"Tự động đánh dấu Không Đến (No-Show) do quá hạn check-in {noShowThreshold} phút.",
                    PerformedBy = "System",
                    CreatedAt = now
                });
 
                // Send notification to customer
                context.Notifications.Add(new Notification
                {
                    CustomerId = booking.CustomerId,
                    Title = "Lịch hẹn quá hạn (No-Show)",
                    Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} lúc {booking.ScheduledAt:HH:mm} đã tự động chuyển thành No-Show do trễ check-in {noShowThreshold} phút.",
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
