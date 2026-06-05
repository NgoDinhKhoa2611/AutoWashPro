using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("otpverifications")]
    public class OtpVerification
    {
        [Key]
        public int OtpId { get; set; }

        [MaxLength(10)]
        public string? Phone { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [Required]
        [MaxLength(6)]
        public string Code { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public bool IsUsed { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
