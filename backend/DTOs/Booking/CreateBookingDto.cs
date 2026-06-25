using System.Collections.Generic;

namespace Auto_Wash.DTOs.Booking
{
    public class CreateBookingDto
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string MainServiceName { get; set; } = string.Empty;

        public string BookingDate { get; set; } = string.Empty;
        public string BookingTime { get; set; } = string.Empty;
        public int? AppliedRedemptionId { get; set; }
        public string? Notes { get; set; }

        public int? VehicleId { get; set; }
        public string? ScheduledAt { get; set; }
        public string? VoucherCode { get; set; }
    }
}
