using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("accounts")]
    public class Account
    {
        [Key]
        public int AccountId { get; set; }

        [MaxLength(100)]
        public string? GoogleId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [MaxLength(10)]
        public string? Phone { get; set; }

        [MaxLength(256)]
        public string? PasswordHash { get; set; }

        public int Role { get; set; } = 3; // 1=Admin | 2=Staff | 3=Customer

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        public virtual Customer? Customer { get; set; }
        public virtual ICollection<LoyaltyConfig> UpdatedLoyaltyConfigs { get; set; } = new List<LoyaltyConfig>();
        public virtual ICollection<Campaign> CreatedCampaigns { get; set; } = new List<Campaign>();
    }
}
