using System;
using System.Collections.Generic;
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

        /// <summary>
        /// Payment transaction history for a single customer (their own bookings),
        /// newest first. Used by the customer "Lịch sử giao dịch" tab (issue #50).
        /// </summary>
        Task<List<TransactionHistoryDto>> GetCustomerTransactionsAsync(int customerId);

        /// <summary>
        /// Payment transaction history across all customers for the admin page,
        /// newest first, with optional status / method / date-range filters
        /// (issue #50). Null filter arguments are ignored.
        /// </summary>
        Task<List<TransactionHistoryDto>> GetAllTransactionsAsync(int? status, int? method, DateTime? fromDate, DateTime? toDate);
    }
}
