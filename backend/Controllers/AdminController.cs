using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        private readonly AutoWashDbContext _context;

        // TODO: Refactor direct DbContext querying in AdminController actions into a service class.
        public AdminController(AutoWashDbContext context)
        {
            _context = context;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return role == "admin" || role == "staff";
        }

        // ── Dashboard Stats API ───────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> DashboardStats()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            var today = DateTime.Today;
            var startDate = today.AddDays(-6);
            var prevStart = today.AddDays(-13);
            var prevEnd   = today.AddDays(-7);

            // Revenue last 7 days (Status 4 = Completed)
            var completedBookings = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue && b.PaidAt.Value >= startDate)
                .Select(b => new { Date = b.PaidAt!.Value.Date, b.FinalPrice })
                .ToListAsync();

            // Revenue previous 7-day period (for % change)
            var prevBookings = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue
                         && b.PaidAt.Value >= prevStart && b.PaidAt.Value < startDate)
                .Select(b => b.FinalPrice)
                .ToListAsync();

            var revenue7Days    = Enumerable.Range(0, 7)
                .Select(i => {
                    var day = startDate.AddDays(i);
                    return (long)completedBookings.Where(b => b.Date == day).Sum(b => b.FinalPrice);
                }).ToArray();

            var totalRevenue    = (long)completedBookings.Sum(b => b.FinalPrice);
            var prevTotalRevenue = (long)prevBookings.Sum(b => (long)b);

            var activeQueue = await _context.Queues
                .CountAsync(q => q.Status == "Waiting" || q.Status == "In Progress");

            var washTimes = await _context.Queues
                .Where(q => q.StartedAt.HasValue && q.CompletedAt.HasValue)
                .Select(q => new { q.StartedAt, q.CompletedAt })
                .ToListAsync();
            var avgMinutes = washTimes.Count > 0
                ? (int)washTimes.Average(q => (q.CompletedAt! - q.StartedAt!).Value.TotalMinutes)
                : 0;

            var ratings = await _context.Bookings
                .Where(b => b.Stars.HasValue)
                .Select(b => (double)b.Stars!.Value)
                .ToListAsync();
            var avgStars = ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : 0.0;

            var tierNames = await _context.Customers
                .Include(c => c.Tier)
                .Select(c => c.Tier.TierName)
                .ToListAsync();

            var tierDist = new Dictionary<string, int> { { "Platinum", 0 }, { "Gold", 0 }, { "Silver", 0 }, { "Member", 0 } };
            foreach (var name in tierNames)
            {
                if (name.Contains("Platinum", StringComparison.OrdinalIgnoreCase)) tierDist["Platinum"]++;
                else if (name.Contains("Gold", StringComparison.OrdinalIgnoreCase)) tierDist["Gold"]++;
                else if (name.Contains("Silver", StringComparison.OrdinalIgnoreCase)) tierDist["Silver"]++;
                else tierDist["Member"]++;
            }

            var dayLabels = Enumerable.Range(0, 7)
                .Select(i => startDate.AddDays(i).ToString("ddd", new System.Globalization.CultureInfo("vi-VN")))
                .ToArray();

            return Ok(new { revenue7Days, totalRevenue, prevTotalRevenue, activeQueue, avgMinutes, avgStars, tierDistribution = tierDist, dayLabels });
        }

        // ── Loyalty Config API ────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetLoyaltyConfig()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync() ?? new LoyaltyConfig();
            var tiers = await _context.Tiers.OrderBy(t => t.SortOrder).ToListAsync();

            return Ok(new {
                pointsPerThousandVND  = config.PointsPerThousandVND,
                pointExpiryMonths     = config.PointExpiryMonths,
                tierReviewDayOfMonth  = config.TierReviewDayOfMonth,
                rankingWindowYears    = config.RankingWindowYears,
                tiers = tiers.Select(t => new {
                    tierId            = t.TierId,
                    tierName          = t.TierName,
                    minRankingBalance = t.MinRankingBalance,
                    pointMultiplier   = t.PointMultiplier,
                    discountPercent   = t.DiscountPercent,
                    bookingWindowDays = t.BookingWindowDays
                })
            });
        }

        [HttpPost]
        public async Task<IActionResult> SaveLoyaltyConfig([FromBody] SaveLoyaltyConfigRequest request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var accountId = HttpContext.Session.GetInt32("AccountId");

                var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
                if (config == null)
                {
                    config = new LoyaltyConfig { ConfigId = 1 };
                    _context.LoyaltyConfigs.Add(config);
                }
                config.PointsPerThousandVND = request.PointsPerThousandVND;
                config.PointExpiryMonths    = request.PointExpiryMonths;
                config.TierReviewDayOfMonth = request.TierReviewDayOfMonth;
                config.RankingWindowYears   = request.RankingWindowYears;
                config.UpdatedAt            = DateTime.Now;
                config.UpdatedBy            = accountId;

                if (request.TierUpdates != null)
                {
                    foreach (var tu in request.TierUpdates)
                    {
                        var tier = await _context.Tiers.FindAsync(tu.TierId);
                        if (tier != null)
                        {
                            tier.PointMultiplier   = tu.PointMultiplier;
                            tier.DiscountPercent   = tu.DiscountPercent;
                            tier.BookingWindowDays = tu.BookingWindowDays;
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Monthly Tier Review API ───────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> TierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (!tiers.Any()) return Ok(Array.Empty<object>());

            var customers = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .Take(100)
                .ToListAsync();

            var results = customers.Select(c => {
                var pts = c.RankingBalance;
                var newTier = tiers.Where(t => t.MinRankingBalance <= pts)
                    .OrderByDescending(t => t.MinRankingBalance)
                    .FirstOrDefault() ?? tiers.First();

                var dir = newTier.TierId > c.TierId ? "up"
                        : newTier.TierId < c.TierId ? "down"
                        : "stable";

                var reason = dir == "up"
                    ? $"Đạt ngưỡng {newTier.MinRankingBalance:N0} VNĐ tích lũy"
                    : dir == "down"
                    ? $"Dưới ngưỡng {c.Tier.MinRankingBalance:N0} VNĐ tích lũy"
                    : "Đang trong ngưỡng hạng hiện tại";

                return new {
                    name           = c.Account.FullName,
                    currentTier    = c.Tier.TierName,
                    rankingBalance = pts,
                    predictedTier  = newTier.TierName,
                    direction      = dir,
                    reason
                };
            })
            .OrderBy(r => r.direction == "stable" ? 1 : 0)
            .ThenBy(r => r.name)
            .ToList();

            return Ok(results);
        }

        // ── Run Tier Review (Apply) API ───────────────────────────────

        [HttpPost]
        public async Task<IActionResult> RunTierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
                if (!tiers.Any()) return Ok(new { success = true, upgrades = 0, downgrades = 0 });

                var customers = await _context.Customers
                    .Include(c => c.Account)
                    .Include(c => c.Tier)
                    .ToListAsync();

                int upgrades = 0, downgrades = 0;
                var now = DateTime.Now;

                foreach (var c in customers)
                {
                    var newTier = tiers.Where(t => t.MinRankingBalance <= c.RankingBalance)
                        .OrderByDescending(t => t.MinRankingBalance)
                        .FirstOrDefault() ?? tiers.First();

                    if (newTier.TierId == c.TierId) continue;

                    var isUp = newTier.TierId > c.TierId;
                    if (isUp) upgrades++; else downgrades++;

                    _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                    {
                        CustomerId      = c.CustomerId,
                        Points          = 0,
                        TransactionType = "TierChange",
                        FromTierId      = c.TierId,
                        ToTierId        = newTier.TierId,
                        Note            = "Monthly Tier Review",
                        CreatedAt       = now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = c.CustomerId,
                        Title      = "Thay đổi hạng thành viên",
                        Message    = isUp
                            ? $"Chúc mừng! Bạn đã được nâng lên hạng {newTier.TierName}."
                            : $"Hạng thành viên của bạn đã được điều chỉnh xuống {newTier.TierName}.",
                        Type      = "Tier",
                        IsRead    = false,
                        CreatedAt = now
                    });

                    c.TierId = newTier.TierId;
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, upgrades, downgrades });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class SaveLoyaltyConfigRequest
    {
        public int PointsPerThousandVND { get; set; }
        public int PointExpiryMonths    { get; set; }
        public int TierReviewDayOfMonth { get; set; } = 1;
        public int RankingWindowYears   { get; set; } = 2;
        public List<TierUpdateItem> TierUpdates { get; set; } = new();
    }

    public class TierUpdateItem
    {
        public int     TierId            { get; set; }
        public decimal PointMultiplier   { get; set; }
        public decimal DiscountPercent   { get; set; }
        public int     BookingWindowDays { get; set; }
    }
}
