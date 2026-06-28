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
    }
}
