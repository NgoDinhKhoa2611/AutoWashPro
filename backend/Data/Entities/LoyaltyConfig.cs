using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("loyaltyconfig")]
    public class LoyaltyConfig
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int ConfigId { get; set; } = 1;

        public int PointsPerThousandVND { get; set; } = 1;

        public int PointExpiryMonths { get; set; } = 12;

        public int TierReviewDayOfMonth { get; set; } = 1;

        public int RankingWindowYears { get; set; } = 2;

        public DateTime? UpdatedAt { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        [ForeignKey("UpdatedBy")]
        public virtual Account? UpdatedByAccount { get; set; }
    }
}
