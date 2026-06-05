using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("rewards")]
    public class Reward
    {
        [Key]
        public int RewardId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RewardName { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        public int PointCost { get; set; }

        [Required]
        [MaxLength(30)]
        public string RewardType { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal? DiscountValue { get; set; }

        public int? ServiceId { get; set; }

        public int? MinTierId { get; set; }

        public int ValidDays { get; set; } = 30;

        public int? StockLimit { get; set; }

        public int RedeemedCount { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("ServiceId")]
        public virtual Service? Service { get; set; }

        [ForeignKey("MinTierId")]
        public virtual Tier? MinTier { get; set; }

        public virtual ICollection<RewardRedemption> RewardRedemptions { get; set; } = new List<RewardRedemption>();
    }
}
