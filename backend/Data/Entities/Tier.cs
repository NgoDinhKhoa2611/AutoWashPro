using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("tiers")]
    public class Tier
    {
        [Key]
        public int TierId { get; set; }

        [Required]
        [MaxLength(20)]
        public string TierName { get; set; } = string.Empty;

        public int MinRankingBalance { get; set; } = 0;

        public int BookingWindowDays { get; set; }

        public int QueuePriority { get; set; }

        [Column(TypeName = "decimal(4,2)")]
        public decimal PointMultiplier { get; set; } = 1.00m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DiscountPercent { get; set; } = 0.00m;

        public int? BadgeColor { get; set; }

        public int SortOrder { get; set; } = 0;

        // Navigation properties
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
        public virtual ICollection<TierPerk> TierPerks { get; set; } = new List<TierPerk>();
    }
}
