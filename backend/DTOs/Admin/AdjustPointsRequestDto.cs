using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Admin
{
    public class AdjustPointsRequestDto
    {
        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int PointsChange { get; set; } // Positive to add, negative to subtract

        [Required]
        [MaxLength(300)]
        public string Reason { get; set; } = string.Empty;
    }
}
