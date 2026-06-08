using System.Collections.Generic;

namespace Auto_Wash.DTOs.Admin
{
    public class SaveLoyaltyConfigRequestDto
    {
        public int PointsPerThousandVND { get; set; }
        public int PointExpiryMonths { get; set; }
        public int TierReviewDayOfMonth { get; set; } = 1;
        public int RankingWindowYears { get; set; } = 2;
        public List<TierUpdateItemDto> TierUpdates { get; set; } = new();
    }

    public class TierUpdateItemDto
    {
        public int TierId { get; set; }
        public decimal PointMultiplier { get; set; }
        public decimal DiscountPercent { get; set; }
        public int BookingWindowDays { get; set; }
    }
}
