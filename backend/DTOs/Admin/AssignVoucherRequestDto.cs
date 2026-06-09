using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Admin
{
    public class AssignVoucherRequestDto
    {
        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int RewardId { get; set; }
    }
}
