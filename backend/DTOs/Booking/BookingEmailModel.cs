using System;

namespace Auto_Wash.DTOs.Booking
{
    public class BookingEmailModel
    {
        public int BookingId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LicensePlate { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public decimal FinalPrice { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? CancelReason { get; set; }
    }
}
