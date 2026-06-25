using System;

namespace Auto_Wash.DTOs.Booking
{
    public class BookingRescheduleEmailModel
    {
        public int BookingId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LicensePlate { get; set; } = string.Empty;
        public DateTime OldScheduledAt { get; set; }
        public DateTime NewScheduledAt { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public bool UpdatedByStaff { get; set; }
    }
}
