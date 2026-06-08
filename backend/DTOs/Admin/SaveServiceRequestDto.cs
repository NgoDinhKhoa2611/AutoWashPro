using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Admin
{
    public class SaveServiceRequestDto
    {
        public string? Id { get; set; } // Can be string (like "service_01" or string representation of int)

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public string Category { get; set; } = "Dịch vụ chính"; // 'Dịch vụ chính' | 'Dịch vụ đi kèm'

        [Range(0, int.MaxValue)]
        public int Price { get; set; }

        [Range(1, int.MaxValue)]
        public int EstimatedMinutes { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsFeatured { get; set; } = false;
    }
}
