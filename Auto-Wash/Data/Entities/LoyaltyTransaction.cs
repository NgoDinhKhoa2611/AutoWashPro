using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("LoyaltyTransactions")]
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

        public DateTime? ExpiryDate { get; set; }

        public bool IsExpired { get; set; } = false;

        public int? FromTierId { get; set; }

        public int? ToTierId { get; set; }

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
