namespace Auto_Wash.DTOs.Vehicle
{
    public class VerifyVehicleOtpDto
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string? Type { get; set; }
        public string OtpCode { get; set; } = string.Empty;
    }
}
