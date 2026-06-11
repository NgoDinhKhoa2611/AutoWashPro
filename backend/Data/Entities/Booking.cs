using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("bookings")]
    public class Booking
    {
        [Key]
        public int BookingId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int VehicleId { get; set; }

        public DateTime ScheduledAt { get; set; }

        public BookingStatus Status { get; set; } = BookingStatus.Pending;

        public int BasePrice { get; set; }

        public int TierDiscount { get; set; } = 0;

        public int PromoDiscount { get; set; } = 0;

        public int PointsDiscount { get; set; } = 0;

        public int FinalPrice { get; set; }

        public int PointsEarned { get; set; } = 0;

        public int PointsRedeemed { get; set; } = 0;

        public int? PromoCodeId { get; set; }

        public int? RedemptionId { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Payment (nullable, filled on payment)
        public int PaymentMethod { get; set; } = 1;

        public int? CashAmount { get; set; }

        public int? PointsUsed { get; set; }

        public int? PointsValueVND { get; set; }

        public DateTime? PaidAt { get; set; }

        // Rating (nullable, filled after completion)
        public byte? Stars { get; set; }

        [MaxLength(1000)]
        public string? ReviewText { get; set; }

        [MaxLength(200)]
        public string? RatingTags { get; set; }

        public int? RatingBonusPoints { get; set; }

        // Navigation properties
        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("PromoCodeId")]
        public virtual Campaign? PromoCodeCampaign { get; set; }

        [ForeignKey("RedemptionId")]
        public virtual RewardRedemption? AppliedRedemption { get; set; }

        public virtual ICollection<BookingService> BookingServices { get; set; } = new List<BookingService>();
        public virtual ICollection<LoyaltyTransaction> LoyaltyTransactions { get; set; } = new List<LoyaltyTransaction>();
        public virtual ICollection<Queue> Queues { get; set; } = new List<Queue>();
        
        [InverseProperty("Booking")]
        public virtual ICollection<RewardRedemption> RelatedRedemptions { get; set; } = new List<RewardRedemption>();
    }
}
