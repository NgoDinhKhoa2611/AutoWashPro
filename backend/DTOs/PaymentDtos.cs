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
