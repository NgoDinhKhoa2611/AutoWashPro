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

        public int? RedemptionId { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? CheckInAt { get; set; }

        public DateTime? ConfirmedAt { get; set; }

        public DateTime? WashingAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime? NoShowAt { get; set; }

        public int FixedDurationMinutes { get; set; } = 60;

        // Payment Discount details (filled when booking is created)
        public int? PointsUsed { get; set; }

        public int? PointsValueVND { get; set; }

        // One-to-One Payment relationship
        public virtual Payment? Payment { get; set; }

        // Rating (nullable, filled after completion)
        public byte? Stars { get; set; }

        [MaxLength(1000)]
        public string? ReviewText { get; set; }

        [MaxLength(200)]
        public string? RatingTags { get; set; }

        public int? RatingBonusPoints { get; set; }

        [MaxLength(500)]
        public string? CancelReason { get; set; }

        [MaxLength(100)]
        public string? CancelledBy { get; set; }

        public DateTime? CancelledAt { get; set; }

        public bool Reminder1Sent { get; set; } = false;
        public bool Reminder2Sent { get; set; } = false;
        public bool NoShowEmailSent { get; set; } = false;
        public bool WaitingCheckoutEmailSent { get; set; } = false;

        public DateTime? CheckedOutAt { get; set; }

        [MaxLength(100)]
        public string? CheckedOutBy { get; set; }

        // Navigation properties
        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("RedemptionId")]
        public virtual RewardRedemption? AppliedRedemption { get; set; }

        public virtual ICollection<BookingService> BookingServices { get; set; } = new List<BookingService>();
        public virtual ICollection<LoyaltyTransaction> LoyaltyTransactions { get; set; } = new List<LoyaltyTransaction>();
        public virtual ICollection<Queue> Queues { get; set; } = new List<Queue>();
        
        [InverseProperty("Booking")]
        public virtual ICollection<RewardRedemption> RelatedRedemptions { get; set; } = new List<RewardRedemption>();
    }
}
