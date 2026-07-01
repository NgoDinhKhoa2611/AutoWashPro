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
