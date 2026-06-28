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

        public RedemptionStatus Status { get; set; } = RedemptionStatus.Active;

        public DateTime ExpiresAt { get; set; }

        public DateTime RedeemedAt { get; set; } = DateTime.Now;

        public DateTime? UsedAt { get; set; }

        /// <summary>Unique voucher identifier presented at checkout, format "AW-RED-{RedemptionId}" (doc §6.2, §10).</summary>
        [MaxLength(50)]
        public string? VoucherCode { get; set; }

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
