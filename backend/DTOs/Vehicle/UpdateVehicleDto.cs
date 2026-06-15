using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Vehicle
{
    public class UpdateVehicleDto
    {
        [Required]
        [MaxLength(50)]
        public string Brand { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Model { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string VehicleClass { get; set; } = string.Empty;
    }
}
