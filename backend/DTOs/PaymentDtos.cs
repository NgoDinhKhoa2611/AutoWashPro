using System;

namespace Auto_Wash.DTOs
{
    public class PaymentDto
    {
        public int PaymentId { get; set; }
        public int BookingId { get; set; }
        public int PaymentMethod { get; set; }
        public int Amount { get; set; }
        public int Status { get; set; }
        public string? TxnRef { get; set; }
        public string? TransactionNo { get; set; }
        public string? ResponseCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    /// <summary>
    /// A single row of payment transaction history, enriched with booking /
    /// customer / vehicle context for display on the Admin and Customer pages
    /// (issue #50). Customer-facing rows leave the admin-only fields
    /// (<see cref="CustomerName"/>, <see cref="CustomerPhone"/>) null.
    /// </summary>
    public class TransactionHistoryDto
    {
        public int PaymentId { get; set; }
        public int BookingId { get; set; }
        public int Amount { get; set; }

        /// <summary>Original booking price before any deduction (issue #51).</summary>
        public int BasePrice { get; set; }

        /// <summary>Total deducted from BasePrice (voucher / tier / points). 0 when paid in full.</summary>
        public int Discount { get; set; }

        public int PaymentMethod { get; set; }
        public string PaymentMethodName { get; set; } = string.Empty;
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string? TxnRef { get; set; }
        public string? TransactionNo { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string? LicensePlate { get; set; }

        // Admin-only context (null for customer-facing responses)
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
    }

    public class CreatePaymentDto
    {
        public int BookingId { get; set; }
        public int PaymentMethod { get; set; }
        public int Amount { get; set; }
        public string? TxnRef { get; set; }
    }

    public class UpdatePaymentDto
    {
        public int PaymentId { get; set; }
        public int Status { get; set; }
        public string? TransactionNo { get; set; }
        public string? ResponseCode { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    /// <summary>
    /// Revenue statistics over Paid transactions, with the deductions broken out
    /// so the admin can see gross → discounts → net (issue #51).
    /// Net = sum of amounts actually collected (payments.amount).
    /// Gross = sum of the bookings' original base prices.
    /// </summary>
    public class RevenueStatsDto
    {
        public long GrossRevenue { get; set; }
        public long VoucherDiscount { get; set; }
        public long TierDiscount { get; set; }
        public long PointsDiscount { get; set; }
        public long TotalDiscount { get; set; }
        public long NetRevenue { get; set; }

        public int PaidCount { get; set; }
        public int DiscountedCount { get; set; }
        public int FreeCount { get; set; }

        public long CashRevenue { get; set; }
        public long OnlineRevenue { get; set; }
    }

    /// <summary>
    /// Result of reconciling a pending payment against the PayOS gateway.
    /// <see cref="JustConfirmed"/> is true only when this call transitioned the
    /// payment to Paid, so the caller can trigger one-time side effects (email).
    /// </summary>
    public class PaymentReconcileResult
    {
        public PaymentDto? Payment { get; set; }
        public bool JustConfirmed { get; set; }
    }
}
