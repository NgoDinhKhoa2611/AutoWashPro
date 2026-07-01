using System;

namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Single source of truth for the loyalty earn-point formula (doc §3.2).
    ///   BasePoint   = floor(FinalPrice / 10,000)
    ///   EarnedPoint = floor(BasePoint * TierMultiplier)
    /// Floor is applied at both steps to avoid fractional points.
    /// </summary>
    public static class LoyaltyPointsHelper
    {
        /// <summary>VNĐ that converts to one base point. Business rule: 10.000 VNĐ = 1 base point.</summary>
        public const int VndPerBasePoint = 10_000;

        public static int ComputeEarnedPoints(int finalPrice, decimal tierMultiplier)
        {
            if (finalPrice <= 0) return 0;
            int basePoints = finalPrice / VndPerBasePoint;
            return (int)Math.Floor(basePoints * tierMultiplier);
        }
    }
}
