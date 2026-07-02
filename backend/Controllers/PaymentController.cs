using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PayOS;
using PayOS.Models.Webhooks;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.DTOs;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly AutoWashDbContext _context;
        private readonly PayOSClient _payOSClient;
        private readonly PayOSSettings _payOSSettings;
        private readonly BookingNotificationService _notificationService;
        private readonly AuthContextService _authContextService;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(
            IPaymentService paymentService,
            AutoWashDbContext context,
            PayOSClient payOSClient,
            IOptions<PayOSSettings> payOSSettings,
            BookingNotificationService notificationService,
            AuthContextService authContextService,
            ILogger<PaymentController> logger)
        {
            _paymentService = paymentService;
            _context = context;
            _payOSClient = payOSClient;
            _payOSSettings = payOSSettings.Value;
            _notificationService = notificationService;
            _authContextService = authContextService;
            _logger = logger;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Transaction history for the currently signed-in customer (issue #50).
        /// Returns the customer's own payments only, newest first.
        /// </summary>
        [HttpGet]
        [Route("history/me")]
        public async Task<IActionResult> GetMyTransactions()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var transactions = await _paymentService.GetCustomerTransactionsAsync(customer.CustomerId);
                return Ok(new { success = true, transactions });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyTransactions: Error loading transactions for CustomerId {CustomerId}", customer.CustomerId);
                return StatusCode(500, new { success = false, message = "Lỗi truy vấn lịch sử giao dịch." });
            }
        }

        /// <summary>
        /// Transaction history across all customers for the admin page (issue #50),
        /// with optional status / method / date-range filters.
        /// </summary>
        [HttpGet]
        [Route("history")]
        public async Task<IActionResult> GetAllTransactions(
            [FromQuery] int? status,
            [FromQuery] int? method,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });
            }

            try
            {
                var transactions = await _paymentService.GetAllTransactionsAsync(status, method, fromDate, toDate);
                return Ok(new { success = true, transactions });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllTransactions: Error loading admin transaction history.");
                return StatusCode(500, new { success = false, message = "Lỗi truy vấn lịch sử giao dịch." });
            }
        }

        /// <summary>
        /// Revenue statistics for the admin transactions page (issue #51):
        /// gross revenue, deductions (voucher / tier / points / free) and net
        /// revenue over Paid transactions, optionally date-filtered by PaidAt.
        /// </summary>
        [HttpGet]
        [Route("revenue-stats")]
        public async Task<IActionResult> GetRevenueStats(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });
            }

            try
            {
                var stats = await _paymentService.GetRevenueStatsAsync(fromDate, toDate);
                return Ok(new { success = true, stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetRevenueStats: Error computing revenue statistics.");
                return StatusCode(500, new { success = false, message = "Lỗi truy vấn thống kê doanh thu." });
            }
        }

        public class CreatePaymentRequest
        {
            public int BookingId { get; set; }
        }

        [HttpPost]
        [Route("create")]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
        {
            if (request == null || request.BookingId <= 0)
            {
                _logger.LogWarning("CreatePayment: Received invalid request payload.");
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ." });
            }

            try
            {
                _logger.LogInformation("CreatePayment: Creating payment link for BookingId: {BookingId}", request.BookingId);
                var paymentUrl = await _paymentService.CreatePaymentLinkAsync(request.BookingId);
                
                _logger.LogInformation("CreatePayment: Successfully generated payment link for BookingId: {BookingId}", request.BookingId);
                return Ok(new { success = true, paymentUrl });
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "CreatePayment: Booking not found. BookingId: {BookingId}", request.BookingId);
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "CreatePayment: Validation failed. BookingId: {BookingId}", request.BookingId);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreatePayment: System error creating payment link for BookingId: {BookingId}", request.BookingId);
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống khi tạo link thanh toán." });
            }
        }

        [HttpGet]
        [Route("return")]
        public async Task<IActionResult> PaymentReturn()
        {
            _logger.LogInformation("PaymentReturn: Received redirect callback query: {Query}", Request.QueryString.Value);

            try
            {
                string code = Request.Query["code"].ToString();
                string id = Request.Query["id"].ToString();
                string cancel = Request.Query["cancel"].ToString();
                string status = Request.Query["status"].ToString();
                string orderCodeStr = Request.Query["orderCode"].ToString();

                _logger.LogInformation("PaymentReturn: Parsed redirect parameters - orderCode: {OrderCode}, status: {Status}, cancel: {Cancel}", orderCodeStr, status, cancel);

                var payment = await _paymentService.GetPaymentByTxnRefAsync(orderCodeStr);
                if (payment == null)
                {
                    _logger.LogWarning("PaymentReturn: Mapped payment record not found for OrderCode: {OrderCode}", orderCodeStr);
                    return Redirect("/payment/result?payment=error&message=OrderNotFound");
                }

                string redirectUrl;
                if (cancel == "true" || status == "CANCELLED")
                {
                    _logger.LogInformation("PaymentReturn: Customer/Admin cancelled checkout flow for BookingId: {BookingId}", payment.BookingId);
                    redirectUrl = $"/payment/result?payment=cancel&bookingId={payment.BookingId}";
                }
                else
                {
                    _logger.LogInformation("PaymentReturn: Customer/Admin completed redirect checkout flow successfully for BookingId: {BookingId}", payment.BookingId);
                    redirectUrl = $"/payment/result?payment=success&bookingId={payment.BookingId}";
                }

                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PaymentReturn: Exception occurred during processing redirect.");
                return Redirect("/payment/result?payment=error&message=SystemError");
            }
        }

        [HttpPost]
        [Route("webhook")]
        public async Task<IActionResult> PaymentWebhook([FromBody] Webhook webhookBody)
        {
            _logger.LogInformation("========== PAYOS WEBHOOK HIT ==========");
            _logger.LogInformation("Request Method: {Method}", Request.Method);
            _logger.LogInformation("Content-Type: {ContentType}", Request.ContentType);
            _logger.LogInformation("PaymentWebhook: Received webhook notification payload. Webhook received.");

            try
            {
                // 1. Mandatory checksum verification
                var verifiedData = await _payOSClient.Webhooks.VerifyAsync(webhookBody);
                _logger.LogInformation("========== VERIFY SUCCESS ==========");
                _logger.LogInformation("OrderCode: {OrderCode}", verifiedData.OrderCode);
                _logger.LogInformation("Code: {Code}", verifiedData.Code);
                _logger.LogInformation("Reference: {Reference}", verifiedData.Reference);
                _logger.LogInformation("Amount: {Amount}", verifiedData.Amount);
                _logger.LogInformation("PaymentWebhook: Signature checksum verified successfully. Signature verified.");

                string txnRef = verifiedData.OrderCode.ToString();
                string responseCode = verifiedData.Code;
                string transactionNo = verifiedData.Reference;
                long amount = verifiedData.Amount;

                // 2. Fetch payment record
                var payment = await _paymentService.GetPaymentByTxnRefAsync(txnRef);
                _logger.LogInformation("Payment found: {Found}", payment != null);
                if (payment == null)
                {
                    _logger.LogWarning("PaymentWebhook: Payment record not found for OrderCode: {OrderCode}", txnRef);
                    return Ok(new { success = false, message = "Order not found" });
                }

                // 3. Amount check
                if (payment.Amount != amount)
                {
                    _logger.LogWarning("PaymentWebhook: Amount mismatch. Expected: {Expected}, Received: {Received}", payment.Amount, amount);
                    return Ok(new { success = false, message = "Invalid amount" });
                }

                // 4. Idempotency & duplicate callback protection
                if (payment.Status == (int)PaymentStatus.Paid)
                {
                    _logger.LogInformation("PaymentWebhook: Duplicate webhook received. Payment for OrderCode {OrderCode} is already Paid. Skipping update (Idempotent).", txnRef);
                    return Ok(new { success = true, message = "Order already confirmed" });
                }

                // 5. Update payment status
                int targetStatus = (responseCode == "00") ? (int)PaymentStatus.Paid : (int)PaymentStatus.Failed;
                var updatedPaymentDto = await _paymentService.UpdatePaymentStatusAsync(txnRef, targetStatus, transactionNo, responseCode);
                _logger.LogInformation("Payment updated: PaymentId={PaymentId}, TxnRef={TxnRef}, Status={Status}", updatedPaymentDto.PaymentId, txnRef, targetStatus);

                if (targetStatus == (int)PaymentStatus.Paid)
                {
                    await SendPaymentSuccessEmailAsync(updatedPaymentDto, transactionNo);
                }

                _logger.LogInformation("PaymentWebhook: Webhook processed successfully for OrderCode: {OrderCode}. Status updated to {Status}", txnRef, targetStatus);
                return Ok(new { success = true, message = "Confirm success" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PaymentWebhook: Webhook validation failed. Exception: {StackTrace}", ex.ToString());
                return BadRequest(new { success = false, message = "Invalid signature or data" });
            }
        }

        [HttpGet]
        [Route("{bookingId}")]
        public async Task<IActionResult> GetPaymentStatus(int bookingId)
        {
            try
            {
                // Reconcile against PayOS on read so the client poll can confirm a
                // payment even when the async webhook hasn't been delivered (e.g.
                // local development without a public webhook tunnel).
                var result = await _paymentService.ReconcilePaymentAsync(bookingId);

                if (result.JustConfirmed && result.Payment != null)
                {
                    await SendPaymentSuccessEmailAsync(result.Payment, result.Payment.TransactionNo);
                }

                return Ok(new { success = true, payment = result.Payment });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetPaymentStatus: Error querying payment status for BookingId: {BookingId}", bookingId);
                return StatusCode(500, new { success = false, message = "Lỗi truy vấn thông tin thanh toán." });
            }
        }

        /// <summary>
        /// Reloads the booking with customer/tier/vehicle context and queues the
        /// payment-success invoice email in the background. Shared by the webhook
        /// and the reconcile-on-read path so the email is sent exactly once, on
        /// the transition to Paid.
        /// </summary>
        private async Task SendPaymentSuccessEmailAsync(PaymentDto payment, string? transactionNo)
        {
            var booking = await _context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Vehicle)
                .FirstOrDefaultAsync(b => b.BookingId == payment.BookingId);

            if (booking?.Customer?.Account == null)
            {
                return;
            }

            var email = booking.Customer.Account.Email;
            if (string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var invoiceNumber = $"INV-{booking.BookingId}-{payment.PaymentId}";
            var tierName = booking.Customer.Tier?.TierName ?? "Standard";
            _notificationService.SendPaymentSuccessEmailInBackground(
                email,
                booking.Customer.Account.FullName,
                booking.Vehicle.LicensePlate,
                booking.BookingId,
                payment.Amount,
                invoiceNumber,
                transactionNo ?? "PayOS-Online",
                payment.PaidAt ?? DateTime.Now,
                booking.PointsEarned,
                tierName
            );
            _logger.LogInformation("Payment success email queued: BookingId={BookingId}, Email={Email}", booking.BookingId, email);
        }
    }
}
