using System.Collections.Generic;

namespace Auto_Wash.DTOs.Booking
{
    public class CreateBookingDto
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string MainServiceName { get; set; } = string.Empty;
        public List<string> AddonServiceNames { get; set; } = new();
        public string BookingDate { get; set; } = string.Empty;
        public string BookingTime { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
