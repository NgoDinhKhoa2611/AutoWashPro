using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Single source of truth for membership tier ranking.
    /// Ranking is based on the customer's spend within a rolling window
    /// (RankingWindowMonths). Spend older than the window ages out automatically,
    /// so a customer must keep spending to retain a higher tier — no hard reset job.
    /// </summary>
    public static class TierHelper
    {
        // Rolling window for ranking spend. Could be promoted to LoyaltyConfig later.
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

        /// <summary>
        /// Recomputes the customer's tier from their windowed spend and updates
        /// TierId (up or down) if it changed, logging a tier transaction +
        /// notification. Does NOT call SaveChanges — the caller persists.
        /// Returns the windowed spend used for the decision.
        /// </summary>
        public static async Task<int> RecalculateTierAsync(AutoWashDbContext ctx, Customer customer, DateTime now)
        {
            int windowedSpend = await GetWindowedSpendAsync(ctx, customer.CustomerId, now);

            var tiers = await ctx.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (tiers.Count == 0) return windowedSpend;

            var newTier = tiers
                .Where(t => t.MinRankingBalance <= windowedSpend)
                .OrderByDescending(t => t.MinRankingBalance)
                .FirstOrDefault() ?? tiers.First();

            if (newTier.TierId == customer.TierId) return windowedSpend;

            bool isUp = newTier.TierId > customer.TierId;
            ctx.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customer.CustomerId,
                Points = 0,
                TransactionType = isUp ? "TIER_UPGRADE" : "TIER_DOWNGRADE",
                FromTierId = customer.TierId,
                ToTierId = newTier.TierId,
                Note = $"Đánh giá hạng theo chi tiêu {RankingWindowMonths} tháng gần nhất: {windowedSpend:N0}đ",
                CreatedAt = now
            });
            ctx.Notifications.Add(new Notification
            {
                CustomerId = customer.CustomerId,
                Title = "Thay đổi hạng thành viên",
                Message = isUp
                    ? $"Chúc mừng! Bạn đã được nâng lên hạng {newTier.TierName}."
                    : $"Hạng thành viên của bạn được điều chỉnh xuống {newTier.TierName} (xét theo chi tiêu {RankingWindowMonths} tháng gần nhất).",
                Type = "Tier",
                IsRead = false,
                CreatedAt = now
            });
            customer.TierId = newTier.TierId;
            return windowedSpend;
        }
    }
}
