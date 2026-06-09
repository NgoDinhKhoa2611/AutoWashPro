using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Admin
{
    public class CampaignRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Target { get; set; } = "All Customers";

        public int MaxRedemptions { get; set; } = 500;
    }
}
