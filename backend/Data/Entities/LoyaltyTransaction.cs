using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("loyaltytransactions")]
    public class LoyaltyTransaction
    {
        [Key]
        public int TransactionId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        public int Points { get; set; }

        [Required]
        [MaxLength(20)]
        public string TransactionType { get; set; } = string.Empty;

        public int? BookingId { get; set; }

        public int? RedemptionId { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        public bool IsExpired { get; set; } = false;

        public int? FromTierId { get; set; }

        public int? ToTierId { get; set; }

        /// <summary>Actual booking amount (FinalPrice) tied to an EARN transaction, for accounting reconciliation (doc §10).</summary>
        public int? Amount { get; set; }

        /// <summary>The 6-month window scanned when a tier change occurred, e.g. "26/12/2025 - 26/06/2026" (doc §10).</summary>
        [MaxLength(100)]
        public string? SpendingWindow { get; set; }

        [MaxLength(300)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("BookingId")]
        public virtual Booking? Booking { get; set; }

        [ForeignKey("RedemptionId")]
        public virtual RewardRedemption? RewardRedemption { get; set; }

        [ForeignKey("FromTierId")]
        public virtual Tier? FromTier { get; set; }

        [ForeignKey("ToTierId")]
        public virtual Tier? ToTier { get; set; }
    }
}
