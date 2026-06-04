namespace Auto_Wash.DTOs.Vehicle
{
    public class CreateVehicleDto
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string? Type { get; set; }
    }
}
