using System.Threading.Tasks;
using Auto_Wash.DTOs;

namespace Auto_Wash.Services
{
    public interface IPaymentService
    {
        Task<PaymentDto> CreatePendingPaymentAsync(int bookingId, int amount, string ipAddress);
        Task<string> CreatePaymentLinkAsync(int bookingId);
        Task<PaymentDto> UpdatePaymentStatusAsync(string txnRef, int status, string? transactionNo, string? responseCode);
        Task<PaymentDto?> GetPaymentByTxnRefAsync(string txnRef);
        Task<PaymentDto?> GetPaymentByBookingIdAsync(int bookingId);

        /// <summary>
        /// Returns the current payment for a booking, actively reconciling its
        /// status with PayOS when still Pending. This lets the browser-return /
        /// polling path confirm payments without relying on the async webhook
        /// (which requires a public tunnel during local development).
        /// </summary>
        Task<PaymentReconcileResult> ReconcilePaymentAsync(int bookingId);
    }
}
