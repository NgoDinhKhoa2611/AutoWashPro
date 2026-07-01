using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PayOS;
using PayOS.Models.V2.PaymentRequests;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly AutoWashDbContext _context;
        private readonly PayOSClient _payOSClient;
        private readonly PayOSSettings _payOSSettings;
        private readonly ILogger<PaymentService> _logger;

        public PaymentService(
            AutoWashDbContext context,
            PayOSClient payOSClient,
            IOptions<PayOSSettings> payOSSettings,
            ILogger<PaymentService> logger)
        {
            _context = context;
            _payOSClient = payOSClient;
            _payOSSettings = payOSSettings.Value;
            _logger = logger;
        }

        public async Task<PaymentDto> CreatePendingPaymentAsync(int bookingId, int amount, string ipAddress)
        {
            // 1. Fetch booking and verify it exists
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                throw new KeyNotFoundException($"Booking with ID {bookingId} was not found.");
            }

            // Constraint 1: Payment can only be created when Booking.Status == WaitingCheckout
            if (booking.Status != BookingStatus.WaitingCheckout)
            {
                throw new InvalidOperationException($"Lịch đặt này đang có trạng thái {booking.Status} và không ở trạng thái Chờ thanh toán.");
            }

            // 2. Check if a payment already exists
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.BookingId == bookingId);

            // Generate a globally unique numeric OrderCode fitting in Int64
            long orderCode = long.Parse(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() + (bookingId % 100).ToString("D2"));

            if (payment != null)
            {
                // Constraint 2: Payment.Status == Paid must reject any further payment creation
                if (payment.Status == (int)PaymentStatus.Paid)
                {
                    throw new InvalidOperationException("Hóa đơn của lịch đặt này đã được thanh toán thành công trước đó.");
                }

                // Recycle/update existing payment
                payment.TxnRef = orderCode.ToString();
                payment.PaymentMethod = (int)PaymentMethod.PayOS; // Mapped to PayOS (value 3)
                payment.Amount = amount;
                payment.Status = (int)PaymentStatus.Pending;
                payment.CreatedAt = DateTime.Now;
                payment.PaidAt = null;
                payment.TransactionNo = null;
                payment.ResponseCode = null;
                
                _logger.LogInformation("Recycled pending payment for booking ID {BookingId}. New TxnRef (OrderCode): {TxnRef}", bookingId, payment.TxnRef);
            }
            else
            {
                // Create new payment record
                payment = new Payment
                {
                    BookingId = bookingId,
                    PaymentMethod = (int)PaymentMethod.PayOS, // Mapped to PayOS (value 3)
                    Amount = amount,
                    Status = (int)PaymentStatus.Pending,
                    TxnRef = orderCode.ToString(),
                    CreatedAt = DateTime.Now
                };
                
                _context.Payments.Add(payment);
                _logger.LogInformation("Created new pending payment for booking ID {BookingId}. TxnRef (OrderCode): {TxnRef}", bookingId, payment.TxnRef);
            }

            await _context.SaveChangesAsync();

            return MapToDto(payment);
        }

        public async Task<string> CreatePaymentLinkAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                throw new KeyNotFoundException($"Booking with ID {bookingId} was not found.");
            }

            // Gated status check
            if (booking.Status != BookingStatus.WaitingCheckout)
            {
                throw new InvalidOperationException($"Lịch đặt này đang có trạng thái {booking.Status} và không ở trạng thái Chờ thanh toán.");
            }

            var paymentDto = await CreatePendingPaymentAsync(bookingId, booking.FinalPrice, "127.0.0.1");

            long orderCode = long.Parse(paymentDto.TxnRef ?? throw new InvalidOperationException("Transaction reference not generated."));

            var paymentRequest = new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = paymentDto.Amount,
                Description = $"Rua xe don hang #BK-{bookingId}",
                CancelUrl = _payOSSettings.CancelUrl,
                ReturnUrl = _payOSSettings.ReturnUrl,
                Items = new List<PaymentLinkItem>()
            };

            var response = await _payOSClient.PaymentRequests.CreateAsync(paymentRequest);

            _logger.LogInformation("Created PayOS Payment Link for booking {BookingId}. Checkout URL: {CheckoutUrl}", bookingId, response.CheckoutUrl);

            return response.CheckoutUrl;
        }

        public async Task<PaymentDto> UpdatePaymentStatusAsync(string txnRef, int status, string? transactionNo, string? responseCode)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        var payment = await _context.Payments
                            .Include(p => p.Booking)
                                .ThenInclude(b => b.Customer)
                                    .ThenInclude(c => c.Account)
                            .Include(p => p.Booking)
                                .ThenInclude(b => b.Vehicle)
                            .FirstOrDefaultAsync(p => p.TxnRef == txnRef);

                        if (payment == null)
                        {
                            throw new KeyNotFoundException($"Payment with TxnRef {txnRef} was not found.");
                        }

                        // Idempotency: Webhook may arrive multiple times. Repeated callbacks must NEVER do anything again.
                        if (payment.Status == (int)PaymentStatus.Paid)
                        {
                            _logger.LogInformation("UpdatePaymentStatusAsync: Payment for TxnRef {TxnRef} is already Paid. Skipping update.", txnRef);
                            await transaction.CommitAsync();
                            return MapToDto(payment);
                        }

                        payment.Status = status;
                        payment.TransactionNo = transactionNo;
                        payment.ResponseCode = responseCode;

                        if (status == (int)PaymentStatus.Paid)
                        {
                            payment.PaidAt = DateTime.Now;
                            _logger.LogInformation("Payment updated: PaymentId={PaymentId}, Status=Paid, PaidAt={PaidAt}, TransactionNo={TransactionNo}", payment.PaymentId, payment.PaidAt, transactionNo);

                            var booking = payment.Booking;
                            if (booking != null)
                            {
                                booking.Status = BookingStatus.Completed;
                                booking.CompletedAt ??= DateTime.Now;
                                booking.CheckedOutAt ??= DateTime.Now;
                                booking.CheckedOutBy = "Webhook";

                                _context.BookingAuditLogs.Add(new BookingAuditLog
                                {
                                    BookingId = booking.BookingId,
                                    Action = "Completed",
                                    Description = "Thanh toán trực tuyến thành công và hoàn tất lịch đặt qua PayOS.",
                                    PerformedBy = "System",
                                    CreatedAt = DateTime.Now
                                });
                                _logger.LogInformation("Booking updated: BookingId={BookingId}, Status=Completed, CheckedOutAt={CheckedOutAt}", booking.BookingId, booking.CheckedOutAt);

                                var queue = await _context.Queues
                                    .FirstOrDefaultAsync(q => q.BookingId == booking.BookingId && q.Status != QueueStatus.Cancelled);
                                if (queue != null)
                                {
                                    queue.Status = QueueStatus.Archived;
                                    queue.CompletedAt ??= DateTime.Now;
                                    queue.CurrentStage = "Completed";
                                    _logger.LogInformation("Queue updated: QueueId={QueueId}, Status=Archived", queue.QueueId);
                                }

                                var customer = booking.Customer;
                                if (customer != null)
                                {
                                    var loyaltyAlreadyAwarded = await _context.LoyaltyTransactions
                                        .AnyAsync(lt => lt.BookingId == booking.BookingId && lt.TransactionType == "EARN");

                                    if (!loyaltyAlreadyAwarded)
                                    {
                                        var loyaltyConfig = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
                                        int pointsPerThousand = loyaltyConfig?.PointsPerThousandVND ?? 1;

                                        var tier = await _context.Tiers.FirstOrDefaultAsync(t => t.TierId == customer.TierId);
                                        decimal tierMultiplier = tier?.PointMultiplier ?? 1.0m;

                                        int basePoints = (payment.Amount / 1000) * pointsPerThousand;
                                        int pointsEarned = (int)Math.Floor(basePoints * tierMultiplier);

                                        booking.PointsEarned = pointsEarned;
                                        customer.TotalVisits += 1;
                                        customer.TotalSpend += payment.Amount;
                                        customer.RankingBalance += payment.Amount;
                                        customer.PointBalance += pointsEarned;
                                        customer.LifetimePoints += pointsEarned;
                                        customer.LastVisitAt = DateTime.Now;

                                        _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                                        {
                                            CustomerId = customer.CustomerId,
                                            Points = pointsEarned,
                                            TransactionType = "EARN",
                                            BookingId = booking.BookingId,
                                            Note = $"Tích điểm thanh toán trực tuyến PayOS: #{booking.BookingId}",
                                            CreatedAt = DateTime.Now
                                        });

                                        _context.Notifications.Add(new Notification
                                        {
                                            CustomerId = customer.CustomerId,
                                            Title = "Thanh toán thành công",
                                            Message = $"Nhận +{pointsEarned} điểm Loyalty.",
                                            Type = "points",
                                            IsRead = false,
                                            CreatedAt = DateTime.Now
                                        });

                                        _logger.LogInformation("Loyalty awarded: CustomerId={CustomerId}, Points={Points}, TotalSpend={TotalSpend}", customer.CustomerId, pointsEarned, customer.TotalSpend);
                                    }
                                }

                                _logger.LogInformation("Invoice generated: InvoiceNumber=INV-BK{BookingId}, Amount={Amount}, TransactionNo={TransactionNo}", booking.BookingId, payment.Amount, transactionNo);
                            }
                        }

                        await _context.SaveChangesAsync();

                        // Real-time tier UPGRADE now that this paid booking counts as
                        // Completed in the 6-month ranking window (doc §4). Mirrors the
                        // manual checkout path in AdminQueueService; downgrades are left
                        // to the monthly maintenance job. Runs inside the same transaction,
                        // after the save above so the booking is visible to the spend query.
                        if (status == (int)PaymentStatus.Paid && payment.Booking?.Customer != null)
                        {
                            await TierHelper.EvaluateUpgradeAsync(_context, payment.Booking.Customer, DateTime.Now);
                            await _context.SaveChangesAsync();
                        }

                        await transaction.CommitAsync();

                        _logger.LogInformation("UpdatePaymentStatusAsync: Transaction committed successfully for TxnRef {TxnRef}.", txnRef);
                        return MapToDto(payment);
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(ex, "UpdatePaymentStatusAsync: Error updating payment status for TxnRef: {TxnRef}", txnRef);
                        throw;
                    }
                }
            });
        }

        public async Task<PaymentDto?> GetPaymentByTxnRefAsync(string txnRef)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.TxnRef == txnRef);

            return payment == null ? null : MapToDto(payment);
        }

        public async Task<PaymentDto?> GetPaymentByBookingIdAsync(int bookingId)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.BookingId == bookingId);

            return payment == null ? null : MapToDto(payment);
        }

        public async Task<PaymentReconcileResult> ReconcilePaymentAsync(int bookingId)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.BookingId == bookingId);

            if (payment == null)
            {
                return new PaymentReconcileResult { Payment = null, JustConfirmed = false };
            }

            // Already resolved (Paid/Failed): nothing to reconcile.
            if (payment.Status != (int)PaymentStatus.Pending)
            {
                return new PaymentReconcileResult { Payment = MapToDto(payment), JustConfirmed = false };
            }

            if (!long.TryParse(payment.TxnRef, out var orderCode))
            {
                _logger.LogWarning("ReconcilePaymentAsync: Payment {PaymentId} has invalid TxnRef '{TxnRef}'. Cannot query PayOS.", payment.PaymentId, payment.TxnRef);
                return new PaymentReconcileResult { Payment = MapToDto(payment), JustConfirmed = false };
            }

            // Ask PayOS for the authoritative status. The browser-return / polling
            // path always reaches this local backend, so this works without the
            // async webhook being publicly reachable.
            PaymentLink link;
            try
            {
                link = await _payOSClient.PaymentRequests.GetAsync(orderCode);
            }
            catch (Exception ex)
            {
                // Network/gateway error must not break the client's polling loop.
                _logger.LogWarning(ex, "ReconcilePaymentAsync: Failed to query PayOS for OrderCode {OrderCode}. Leaving payment Pending.", orderCode);
                return new PaymentReconcileResult { Payment = MapToDto(payment), JustConfirmed = false };
            }

            switch (link.Status)
            {
                case PaymentLinkStatus.Paid:
                    // Defensive amount check, mirroring the webhook handler.
                    if (link.AmountPaid < payment.Amount)
                    {
                        _logger.LogWarning("ReconcilePaymentAsync: OrderCode {OrderCode} reported Paid but AmountPaid {Paid} < expected {Expected}. Skipping.", orderCode, link.AmountPaid, payment.Amount);
                        return new PaymentReconcileResult { Payment = MapToDto(payment), JustConfirmed = false };
                    }

                    var reference = link.Transactions?.FirstOrDefault()?.Reference;
                    var paidDto = await UpdatePaymentStatusAsync(payment.TxnRef!, (int)PaymentStatus.Paid, reference, "00");
                    _logger.LogInformation("ReconcilePaymentAsync: OrderCode {OrderCode} confirmed Paid via reconciliation.", orderCode);
                    return new PaymentReconcileResult { Payment = paidDto, JustConfirmed = true };

                case PaymentLinkStatus.Cancelled:
                case PaymentLinkStatus.Expired:
                case PaymentLinkStatus.Failed:
                    var failedDto = await UpdatePaymentStatusAsync(payment.TxnRef!, (int)PaymentStatus.Failed, null, link.Status.ToString());
                    _logger.LogInformation("ReconcilePaymentAsync: OrderCode {OrderCode} marked Failed (PayOS status {Status}).", orderCode, link.Status);
                    return new PaymentReconcileResult { Payment = failedDto, JustConfirmed = false };

                default:
                    // Pending / Processing / Underpaid — still in flight, leave as-is.
                    return new PaymentReconcileResult { Payment = MapToDto(payment), JustConfirmed = false };
            }
        }

        public async Task<List<TransactionHistoryDto>> GetCustomerTransactionsAsync(int customerId)
        {
            var payments = await _context.Payments
                .Include(p => p.Booking)
                    .ThenInclude(b => b.Vehicle)
                .Where(p => p.Booking.CustomerId == customerId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(p => MapToHistoryDto(p, includeCustomer: false)).ToList();
        }

        public async Task<List<TransactionHistoryDto>> GetAllTransactionsAsync(int? status, int? method, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Payments
                .Include(p => p.Booking)
                    .ThenInclude(b => b.Vehicle)
                .Include(p => p.Booking)
                    .ThenInclude(b => b.Customer)
                        .ThenInclude(c => c.Account)
                .AsQueryable();

            if (status.HasValue) query = query.Where(p => p.Status == status.Value);
            if (method.HasValue) query = query.Where(p => p.PaymentMethod == method.Value);
            if (fromDate.HasValue) query = query.Where(p => p.CreatedAt >= fromDate.Value);
            if (toDate.HasValue)
            {
                // inclusive of the whole end day
                var end = toDate.Value.Date.AddDays(1);
                query = query.Where(p => p.CreatedAt < end);
            }

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(p => MapToHistoryDto(p, includeCustomer: true)).ToList();
        }

        private static TransactionHistoryDto MapToHistoryDto(Payment p, bool includeCustomer)
        {
            var booking = p.Booking;
            var dto = new TransactionHistoryDto
            {
                PaymentId = p.PaymentId,
                BookingId = p.BookingId,
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod,
                PaymentMethodName = GetMethodName(p.PaymentMethod),
                Status = p.Status,
                StatusName = GetStatusName(p.Status),
                TxnRef = p.TxnRef,
                TransactionNo = p.TransactionNo,
                CreatedAt = p.CreatedAt,
                PaidAt = p.PaidAt,
                InvoiceNumber = $"INV-{p.BookingId}-{p.PaymentId}",
                LicensePlate = booking?.Vehicle?.LicensePlate
            };

            if (includeCustomer)
            {
                dto.CustomerName = booking?.Customer?.Account?.FullName;
                dto.CustomerPhone = booking?.Customer?.Account?.Phone;
            }

            return dto;
        }

        private static string GetMethodName(int method) => method switch
        {
            (int)PaymentMethod.Cash => "Tiền mặt",
            (int)PaymentMethod.VNPay => "VNPay",
            (int)PaymentMethod.PayOS => "PayOS",
            _ => "Khác"
        };

        private static string GetStatusName(int status) => status switch
        {
            (int)PaymentStatus.Pending => "Chờ thanh toán",
            (int)PaymentStatus.Paid => "Đã thanh toán",
            (int)PaymentStatus.Failed => "Thất bại",
            (int)PaymentStatus.Expired => "Hết hạn",
            _ => "Không xác định"
        };

        private static PaymentDto MapToDto(Payment payment)
        {
            return new PaymentDto
            {
                PaymentId = payment.PaymentId,
                BookingId = payment.BookingId,
                PaymentMethod = payment.PaymentMethod,
                Amount = payment.Amount,
                Status = payment.Status,
                TxnRef = payment.TxnRef,
                TransactionNo = payment.TransactionNo,
                ResponseCode = payment.ResponseCode,
                CreatedAt = payment.CreatedAt,
                PaidAt = payment.PaidAt
            };
        }
    }
}
