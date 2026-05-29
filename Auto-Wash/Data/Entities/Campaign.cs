using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("Campaigns")]
    public class Campaign
    {
        [Key]
        public int CampaignId { get; set; }

        [Required]
        [MaxLength(150)]
        public string CampaignName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public int? TargetTierMinId { get; set; }

        [Column(TypeName = "decimal(4,2)")]
        public decimal? BonusPointMultiplier { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public int Status { get; set; } = 0;

        [MaxLength(30)]
        public string? PromoCode { get; set; }

        public int? DiscountValue { get; set; }

        public int MinSpendValue { get; set; } = 0;

        public int? UsageLimit { get; set; }

        public int UsedCount { get; set; } = 0;

        [Required]
        public int CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        [ForeignKey("TargetTierMinId")]
        public virtual Tier? TargetTierMin { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual Account CreatedByAccount { get; set; } = null!;

        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
