using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("rewardredemptions")]
    public class RewardRedemption
    {
        [Key]
        public int RedemptionId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int RewardId { get; set; }

        public int? BookingId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime ExpiresAt { get; set; }

        public DateTime RedeemedAt { get; set; } = DateTime.Now;

        public DateTime? UsedAt { get; set; }

        // Navigation properties
        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("RewardId")]
        public virtual Reward Reward { get; set; } = null!;

        [ForeignKey("BookingId")]
        [InverseProperty("RelatedRedemptions")]
        public virtual Booking? Booking { get; set; }

        [InverseProperty("AppliedRedemption")]
        public virtual ICollection<Booking> AppliedBookings { get; set; } = new List<Booking>();
        
        public virtual ICollection<LoyaltyTransaction> LoyaltyTransactions { get; set; } = new List<LoyaltyTransaction>();
    }
}
