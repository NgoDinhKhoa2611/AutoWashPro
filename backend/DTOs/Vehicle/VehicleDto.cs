using System;

namespace Auto_Wash.DTOs.Vehicle
{
    public class VehicleDto
    {
        public int VehicleId { get; set; }
        public int CustomerId { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string VehicleClass { get; set; } = string.Empty;
        public DateTime RegisteredAt { get; set; }
    }
}
