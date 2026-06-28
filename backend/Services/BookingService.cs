using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class BookingService
    {
        private readonly AutoWashDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BookingService> _logger;
        private readonly BookingNotificationService _bookingNotificationService;

        public BookingService(AutoWashDbContext context, IConfiguration configuration, ILogger<BookingService> logger, BookingNotificationService bookingNotificationService)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _bookingNotificationService = bookingNotificationService;
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
                .Include(b => b.Payment)
                .Where(b => b.CustomerId == customerId 
                    && b.CheckedOutAt == null
                    && b.Status != BookingStatus.Cancelled
                    && b.Status != BookingStatus.NoShow
                    && (b.Status == BookingStatus.Pending 
                        || b.Status == BookingStatus.Confirmed 
                        || b.Status == BookingStatus.CheckedIn
                        || b.Status == BookingStatus.Washing
                        || b.Status == BookingStatus.WaitingCheckout
                        || (b.Status == BookingStatus.Completed && b.Payment != null && b.Payment.PaidAt >= tenMinutesAgo)))
                .ToListAsync();

            if (!bookings.Any()) return null;

            return bookings
                .OrderBy(b => {
                    var queue = b.Queues.FirstOrDefault();
                    if (queue != null && queue.Status != QueueStatus.Completed && queue.Status != QueueStatus.Cancelled && queue.Status != QueueStatus.Archived)
                        return 1; // Priority 1: Active in Queue
                    if (b.Status == BookingStatus.CheckedIn || b.Status == BookingStatus.Washing || b.Status == BookingStatus.WaitingCheckout)
                        return 2; // Priority 2: Checked In / Washing
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

            // 1. Validate vehicle ownership (lookup by VehicleId or LicensePlate)
            Vehicle? vehicle = null;
            if (request.VehicleId.HasValue && request.VehicleId.Value > 0)
            {
                vehicle = await _context.Vehicles
                    .FirstOrDefaultAsync(v => v.CustomerId == customer.CustomerId && v.VehicleId == request.VehicleId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                var normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
                vehicle = await _context.Vehicles
                    .FirstOrDefaultAsync(v => v.CustomerId == customer.CustomerId && v.LicensePlate == normPlate);
            }

            if (vehicle == null)
            {
                return (false, "Phương tiện không tồn tại hoặc không thuộc sở hữu của bạn. Vui lòng kiểm tra lại.", 0);
            }

            // 1b. Validate active booking check
            var hasActiveBooking = await _context.Bookings.AnyAsync(b => b.VehicleId == vehicle.VehicleId
                && b.Status != BookingStatus.Completed
                && b.Status != BookingStatus.Cancelled
                && b.Status != BookingStatus.NoShow);
            if (hasActiveBooking)
            {
                return (false, "This vehicle has an unfinished booking. Please complete or cancel the current booking before creating a new one.", 0);
            }

            // 2. Validate time format
            DateTime scheduledAt;
            bool timeParsed = false;
            if (!string.IsNullOrWhiteSpace(request.ScheduledAt))
            {
                timeParsed = DateTime.TryParse(request.ScheduledAt, out scheduledAt);
            }
            else
            {
                timeParsed = DateTime.TryParse($"{request.BookingDate} {request.BookingTime}", out scheduledAt);
            }

            if (!timeParsed)
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

            // 3b. Validate that the scheduled time matches one of the generated operating slots
            int startHour = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHour = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            var allowedSlots = new HashSet<string>();
            for (int h = startHour; h <= endHour; h++)
            {
                allowedSlots.Add($"{h:D2}:00");
            }
            string scheduledTimeStr = scheduledAt.ToString("HH:mm");
            if (!allowedSlots.Contains(scheduledTimeStr))
            {
                return (false, "Thời gian đặt lịch không hợp lệ. Vui lòng chọn đúng khung giờ hoạt động.", 0);
            }

            // 4. Validate booking window based on loyalty tier
            var customerWithTier = await _context.Customers
                .Include(c => c.Tier)
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.CustomerId == customer.CustomerId);
            
            int bookingWindowDays = customerWithTier?.Tier?.BookingWindowDays ?? 7;

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
                    // Concurrency: advisory lock on Postgres
                    int lockKey1 = scheduledAt.Year * 10000 + scheduledAt.Month * 100 + scheduledAt.Day;
                    int lockKey2 = scheduledAt.Hour;
                    await _context.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_xact_lock({lockKey1}, {lockKey2});");

                    // 5. Prevent duplicate bookings for the same vehicle in the same hour
                    var hasDuplicate = await _context.Bookings
                        .AnyAsync(b => b.VehicleId == vehicle.VehicleId
                                    && b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                                    && b.ScheduledAt.Date == scheduledAt.Date
                                    && b.ScheduledAt.Hour == scheduledAt.Hour);
                    if (hasDuplicate)
                    {
                        return (false, "Phương tiện này đã có lịch hẹn trong khung giờ đã chọn.", 0);
                    }

                    // 6. Configurable Slot Capacity check
                    int maxVehicles = _configuration.GetValue<int>("BookingCapacityConfig:MaxVehiclesPerSlot", 3);
                    var slotCount = await _context.Bookings
                        .CountAsync(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                                      && b.ScheduledAt.Date == scheduledAt.Date
                                      && b.ScheduledAt.Hour == scheduledAt.Hour);
                    if (slotCount >= maxVehicles)
                    {
                        return (false, "Khung giờ này đã đầy. Vui lòng chọn khung giờ khác.", 0);
                    }

                    // 7. Enforce exactly one default Standard Car Wash service (ID 999)
                    var mainService = await _context.Services
                        .FirstOrDefaultAsync(s => s.ServiceId == 999 && s.IsActive);
                    if (mainService == null)
                    {
                        return (false, "Dịch vụ rửa xe tiêu chuẩn không hoạt động hoặc chưa được thiết lập.", 0);
                    }

                    int calculatedBasePrice = mainService.BasePrice;
                    int finalPrice = calculatedBasePrice;
                    int promoDiscount = 0;
                    RewardRedemption? redemption = null;

                    // Support both VoucherCode or AppliedRedemptionId
                    if (!string.IsNullOrWhiteSpace(request.VoucherCode))
                    {
                        var normCode = request.VoucherCode.Trim().ToUpper();
                        if (normCode.StartsWith("AW-RED-"))
                        {
                            if (int.TryParse(normCode.Substring(7), out int parsedRedemptionId))
                            {
                                redemption = await _context.RewardRedemptions
                                    .Include(r => r.Reward)
                                    .FirstOrDefaultAsync(r => r.RedemptionId == parsedRedemptionId
                                                           && r.CustomerId == customer.CustomerId
                                                           && r.Status == RedemptionStatus.Active);
                            }
                        }
                        else if (normCode == $"WELCOME10-{customer.CustomerId}".ToUpper())
                        {
                            redemption = await _context.RewardRedemptions
                                .Include(r => r.Reward)
                                .FirstOrDefaultAsync(r => r.Reward.PointCost == 0
                                                       && r.CustomerId == customer.CustomerId
                                                       && r.Status == RedemptionStatus.Active);
                        }
                    }
                    else if (request.AppliedRedemptionId.HasValue)
                    {
                        redemption = await _context.RewardRedemptions
                            .Include(r => r.Reward)
                            .FirstOrDefaultAsync(r => r.RedemptionId == request.AppliedRedemptionId.Value 
                                                   && r.CustomerId == customer.CustomerId 
                                                   && r.Status == RedemptionStatus.Active);
                    }

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
                    }

                    // Backend loyalty points calculation.
                    // Points are multiplied by the customer's tier PointMultiplier
                    // (e.g. Silver x1.2, Gold x1.5, Platinum x2.0), using the tier at booking time.
                    var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
                    int pointsPerThousand = config?.PointsPerThousandVND ?? 1;
                    decimal tierMultiplier = customerWithTier?.Tier?.PointMultiplier ?? 1.0m;
                    int basePoints = (finalPrice / 1000) * pointsPerThousand;
                    int pointsEarned = (int)Math.Floor(basePoints * tierMultiplier);

                    // Create Booking
                    var booking = new Booking
                    {
                        CustomerId = customer.CustomerId,
                        VehicleId = vehicle.VehicleId,
                        ScheduledAt = scheduledAt,
                        Status = BookingStatus.Confirmed,
                        BasePrice = calculatedBasePrice,
                        PromoDiscount = promoDiscount,
                        FinalPrice = finalPrice,
                        PointsEarned = pointsEarned,
                        RedemptionId = redemption?.RedemptionId,
                        Notes = request.Notes,
                        CreatedAt = DateTime.Now,
                        FixedDurationMinutes = 60
                    };

                    _context.Bookings.Add(booking);
                    await _context.SaveChangesAsync();

                    // Create Audit Log
                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = booking.BookingId,
                        Action = "Created",
                        Description = $"Tạo lịch đặt mới bởi Khách hàng cho xe {vehicle.LicensePlate} lúc {booking.ScheduledAt:dd/MM/yyyy HH:mm}.",
                        PerformedBy = "Customer",
                        CreatedAt = DateTime.Now
                    });
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

                    // Save BookingServices with PriceSnapshot for Standard Car Wash
                    _context.BookingServices.Add(new Auto_Wash.Data.Entities.BookingService
                    {
                        BookingId = booking.BookingId,
                        ServiceId = mainService.ServiceId,
                        PriceSnapshot = mainService.BasePrice
                    });

                    // No selected addons

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Trigger confirmation email immediately
                    var emailModel = new BookingEmailModel
                    {
                        BookingId = booking.BookingId,
                        CustomerName = customerWithTier?.Account?.FullName ?? "Khách hàng",
                        Email = customerWithTier?.Account?.Email ?? "",
                        LicensePlate = vehicle.LicensePlate,
                        ScheduledAt = booking.ScheduledAt,
                        FinalPrice = booking.FinalPrice,
                        ServiceName = mainService.ServiceName
                    };

                    if (!string.IsNullOrWhiteSpace(emailModel.Email))
                    {
                        _bookingNotificationService.SendBookingConfirmedEmailInBackground(emailModel);
                    }

                    // Audit Event Logging
                    _logger.LogInformation("[AUDIT EVENT] Booking Created: BookingId={BookingId}, CustomerId={CustomerId}, VehicleId={VehicleId}, ScheduledAt={ScheduledAt}, FinalPrice={FinalPrice}",
                        booking.BookingId, booking.CustomerId, booking.VehicleId, booking.ScheduledAt, booking.FinalPrice);

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
                .AsNoTracking()
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.AppliedRedemption)
                    .ThenInclude(r => r!.Reward)
                .Include(b => b.Queues)
                .Include(b => b.Payment)
                .FirstOrDefaultAsync(x => x.BookingId == bookingId && x.CustomerId == customerId);

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

            var hasReview = await _context.Reviews.AnyAsync(r => r.BookingId == b.BookingId);

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

            var queue = b.Queues.FirstOrDefault();
            var progressTracking = BookingWorkflowConfig.GetProgressForBooking(b, queue);

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
                paidAt = b.Payment?.PaidAt,
                paymentMethod = b.Payment != null ? ((PaymentMethod)b.Payment.PaymentMethod).ToString() : null,
                transactionNo = b.Payment?.TransactionNo,
                paymentStatus = b.Payment != null ? ((PaymentStatus)b.Payment.Status).ToString() : null,
                invoice = b.Payment != null && b.Payment.Status == (int)PaymentStatus.Paid ? new { invoiceNumber = $"INV-{b.BookingId}-{b.Payment.PaymentId}", amount = b.Payment.Amount, createdAt = b.Payment.PaidAt ?? b.Payment.CreatedAt } : null,
                createdAt = b.CreatedAt,
                timeline = timeline,
                reschedules = reschedules,
                progressTracking = progressTracking
            };
        }

        public async Task<(bool success, string message)> CancelBookingAsync(int customerId, int bookingId, string reason)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.AppliedRedemption)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.CustomerId == customerId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch hoặc bạn không có quyền hủy.");
            }

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            {
                return (false, "Chỉ đơn đặt lịch ở trạng thái 'Chờ xác nhận' hoặc 'Đã xác nhận' mới có thể hủy.");
            }

            var now = DateTime.Now;
            if (booking.ScheduledAt < now)
            {
                return (false, "Lịch hẹn đã qua, không thể hủy.");
            }
            if ((booking.ScheduledAt - now).TotalMinutes < 60)
            {
                return (false, "Không thể hủy lịch hẹn trong vòng 60 phút trước giờ hẹn.");
            }

            booking.Status = BookingStatus.Cancelled;
            booking.CancelReason = reason;
            booking.CancelledBy = "Customer";
            booking.CancelledAt = now;

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
                Description = $"Hủy lịch hẹn bởi Khách hàng. Lý do: {reason}",
                PerformedBy = "Customer",
                CreatedAt = now
            });

            // Create notification for customer
            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Lịch hẹn đã hủy",
                Message = $"Bạn đã hủy lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate}. Lý do: {reason}",
                Type = "Booking",
                IsRead = false,
                CreatedAt = now
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

        public async Task<(bool success, string message)> RescheduleBookingAsync(int customerId, int bookingId, DateTime newScheduledAt, string reason)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.CustomerId == customerId);

            if (booking == null)
            {
                return (false, "Không tìm thấy đơn đặt lịch hoặc bạn không có quyền đổi lịch.");
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
            if (booking.ScheduledAt < now)
            {
                return (false, "Lịch hẹn đã qua, không thể đổi lịch.");
            }

            if (newScheduledAt < now)
            {
                return (false, "Không thể đặt lịch ở thời gian đã qua.");
            }
            if (newScheduledAt < now.AddMinutes(15))
            {
                return (false, "Vui lòng đặt lịch trước ít nhất 15 phút.");
            }

            // Validate that the rescheduled time matches one of the generated operating slots
            int startHourResched = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHourResched = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            var allowedSlotsResched = new HashSet<string>();
            for (int h = startHourResched; h <= endHourResched; h++)
            {
                allowedSlotsResched.Add($"{h:D2}:00");
            }
            string scheduledTimeStrResched = newScheduledAt.ToString("HH:mm");
            if (!allowedSlotsResched.Contains(scheduledTimeStrResched))
            {
                return (false, "Thời gian đặt lịch không hợp lệ. Vui lòng chọn đúng khung giờ hoạt động.");
            }

            var customerWithTier = await _context.Customers
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);
            
            int bookingWindowDays = customerWithTier?.Tier?.BookingWindowDays ?? 7;

            if (newScheduledAt.Date > DateTime.Today.AddDays(bookingWindowDays))
            {
                return (false, $"Hạng thành viên của bạn chỉ được đặt trước tối đa {bookingWindowDays} ngày.");
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
                        ChangedBy = "Customer",
                        Reason = reason,
                        CreatedAt = DateTime.Now
                    });

                    _context.BookingAuditLogs.Add(new BookingAuditLog
                    {
                        BookingId = booking.BookingId,
                        Action = "Rescheduled",
                        Description = $"Đổi lịch hẹn từ {oldScheduledAt:dd/MM/yyyy HH:mm} sang {newScheduledAt:dd/MM/yyyy HH:mm} bởi Khách hàng. Lý do: {reason}",
                        PerformedBy = "Customer",
                        CreatedAt = DateTime.Now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = customerId,
                        Title = "Đổi lịch hẹn thành công",
                        Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} đã được đổi sang {newScheduledAt:dd/MM/yyyy HH:mm}.",
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
                        UpdatedByStaff = false
                    };

                    if (!string.IsNullOrWhiteSpace(emailModel.Email))
                    {
                        _bookingNotificationService.SendBookingRescheduledEmailInBackground(emailModel);
                    }

                    return (true, "Đổi lịch hẹn thành công!");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return (false, $"Lỗi đổi lịch hẹn: {ex.Message}");
                }
            });
        }
    }
}
