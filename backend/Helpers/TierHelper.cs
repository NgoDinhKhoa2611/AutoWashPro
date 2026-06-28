using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Single source of truth for membership tier ranking (doc §4–5, §9).
    ///
    /// Two independent paths, deliberately asymmetric:
    ///   • UPGRADE   — real-time at checkout. A customer is promoted the moment
    ///                 their trailing 6-month spend crosses the next tier's
    ///                 MinRankingBalance. Never demotes here.
    ///   • MAINTAIN  — monthly background job only. A customer is demoted only if
    ///                 their 6-month spend falls below their current tier's
    ///                 (lower) MaintainBalance threshold, giving a grace margin.
    /// </summary>
    public static class TierHelper
    {
        // Rolling window for ranking spend (doc §4.1). Could move to LoyaltyConfig later.
        public const int RankingWindowMonths = 6;

        /// <summary>
        /// Sum of FinalPrice for the customer's Completed bookings within the
        /// trailing RankingWindowMonths.
        /// </summary>
        public static async Task<int> GetWindowedSpendAsync(AutoWashDbContext ctx, int customerId, DateTime now)
        {
            var windowStart = now.AddMonths(-RankingWindowMonths);
            return await ctx.Bookings
                .Where(b => b.CustomerId == customerId
                         && b.Status == BookingStatus.Completed
                         && b.CompletedAt >= windowStart)
                .SumAsync(b => (int?)b.FinalPrice) ?? 0;
        }

        private static string WindowLabel(DateTime now)
            => $"{now.AddMonths(-RankingWindowMonths):dd/MM/yyyy} - {now:dd/MM/yyyy}";

        /// <summary>Highest tier whose MinRankingBalance the spend satisfies.</summary>
        private static Tier ResolveTierForSpend(List<Tier> tiersAsc, int spend)
            => tiersAsc.Where(t => t.MinRankingBalance <= spend)
                       .OrderByDescending(t => t.MinRankingBalance)
                       .FirstOrDefault() ?? tiersAsc.First();

        /// <summary>
        /// Real-time UPGRADE check (doc §4). Promotes the customer if their
        /// windowed spend qualifies for a higher tier. Never demotes.
        /// Does NOT call SaveChanges — the caller persists. Returns windowed spend.
        /// </summary>
        public static async Task<int> EvaluateUpgradeAsync(AutoWashDbContext ctx, Customer customer, DateTime now)
        {
            int windowedSpend = await GetWindowedSpendAsync(ctx, customer.CustomerId, now);

            var tiers = await ctx.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (tiers.Count == 0) return windowedSpend;

            var qualifiedTier = ResolveTierForSpend(tiers, windowedSpend);

            // Upgrade only: ignore if the qualified tier is the same or lower.
            if (qualifiedTier.MinRankingBalance <= (tiers.FirstOrDefault(t => t.TierId == customer.TierId)?.MinRankingBalance ?? 0))
                return windowedSpend;

            ApplyTierChange(ctx, customer, qualifiedTier, isUpgrade: true, windowedSpend, now);
            return windowedSpend;
        }

        /// <summary>
        /// Monthly MAINTAIN/DOWNGRADE check (doc §5, §9). Demotes the customer if
        /// their windowed spend is below the current tier's MaintainBalance.
        /// Always stamps LastTierReviewAt. Does NOT call SaveChanges.
        /// Returns true if the tier changed.
        /// </summary>
        public static async Task<bool> RunMaintenanceAsync(AutoWashDbContext ctx, Customer customer, DateTime now)
        {
            int windowedSpend = await GetWindowedSpendAsync(ctx, customer.CustomerId, now);
            customer.LastTierReviewAt = now;

            var tiers = await ctx.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (tiers.Count == 0) return false;

            var currentTier = tiers.FirstOrDefault(t => t.TierId == customer.TierId);
            if (currentTier == null) return false;

            // Meets the (lower) maintenance threshold → keep the tier.
            if (windowedSpend >= currentTier.MaintainBalance) return false;

            // Below maintenance → drop to the highest tier the spend still qualifies for.
            var newTier = ResolveTierForSpend(tiers, windowedSpend);
            if (newTier.TierId == customer.TierId) return false;

            ApplyTierChange(ctx, customer, newTier, isUpgrade: false, windowedSpend, now);
            return true;
        }

        private static void ApplyTierChange(AutoWashDbContext ctx, Customer customer, Tier newTier,
                                            bool isUpgrade, int windowedSpend, DateTime now)
        {
            ctx.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customer.CustomerId,
                Points = 0,
                TransactionType = isUpgrade ? "TIER_UPGRADE" : "TIER_DOWNGRADE",
                FromTierId = customer.TierId,
                ToTierId = newTier.TierId,
                SpendingWindow = WindowLabel(now),
                Note = isUpgrade
                    ? $"Đánh giá nâng hạng theo chi tiêu {RankingWindowMonths} tháng gần nhất: {windowedSpend:N0}đ"
                    : $"Điều chỉnh giảm hạng do chi tiêu {RankingWindowMonths} tháng không đạt ngưỡng duy trì: {windowedSpend:N0}đ",
                CreatedAt = now
            });
            ctx.Notifications.Add(new Notification
            {
                CustomerId = customer.CustomerId,
                Title = isUpgrade ? "Chúc mừng nâng hạng thành viên!" : "Điều chỉnh hạng thành viên",
                Message = isUpgrade
                    ? $"Chúc mừng! Bạn đã được nâng lên hạng {newTier.TierName}."
                    : $"Hạng thành viên của bạn được điều chỉnh xuống {newTier.TierName} do chi tiêu {RankingWindowMonths} tháng qua là {windowedSpend:N0}đ.",
                Type = "Tier",
                IsRead = false,
                CreatedAt = now
            });
            customer.TierId = newTier.TierId;
        }
    }
}
