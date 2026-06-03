using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        private readonly AutoWashDbContext _context;

        public AdminController(AutoWashDbContext context)
        {
            _context = context;
        }

        private IActionResult? CheckAdminSession()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (string.IsNullOrEmpty(role) || (role != "admin" && role != "staff"))
                return Redirect("/login");
            return null;
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
        // Xếp hạng dựa theo Customer.RankingBalance (cửa sổ trượt N năm)
        // so với Tier.MinRankingBalance

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
        // ── Queue Status Progression ──────────────────────────────────
        private static readonly Dictionary<string, string> _queueFlow = new()
        {
            ["Waiting"]          = "LPR_Scan",
            ["LPR_Scan"]         = "Washing",
            ["Washing"]          = "Addon_Processing",
            ["Addon_Processing"] = "Drying",
            ["Drying"]           = "Completed"
        };

        // ── Queue Management API ──────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetQueue()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            var today = DateTime.Today;

            // 1. Fetch today's actual Queue entries
            var items = await _context.Queues
                .Include(q => q.Tier)
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.BookingServices)
                        .ThenInclude(bs => bs.Service)
                .Where(q => q.CheckInAt.Date == today && q.Status != "Cancelled")
                .OrderByDescending(q => q.Tier != null ? q.Tier.QueuePriority : 0)
                .ThenBy(q => q.CheckInAt)
                .ToListAsync();

            // Get the list of BookingIds that already have Queue entries today
            var existingBookingIds = items
                .Where(q => q.BookingId.HasValue)
                .Select(q => q.BookingId!.Value)
                .ToHashSet();

            // 2. Fetch today's Bookings (status 1 = Pending, 2 = Confirmed) that DO NOT have a Queue entry
            var pendingBookings = await _context.Bookings
                .Include(b => b.Vehicle)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Tier)
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.ScheduledAt.Date == today 
                         && (b.Status == 1 || b.Status == 2)
                         && !existingBookingIds.Contains(b.BookingId))
                .OrderByDescending(b => b.Customer.Tier != null ? b.Customer.Tier.QueuePriority : 0)
                .ThenBy(b => b.ScheduledAt)
                .ToListAsync();

            // 3. Map both and merge them
            var mergedResult = new List<object>();

            // Map existing queue entries
            foreach (var q in items)
            {
                mergedResult.Add(new {
                    queueId      = q.QueueId,
                    bookingId    = q.BookingId,
                    licensePlate = q.LicensePlate,
                    customerName = q.CustomerName ?? "Khách vãng lai",
                    tierName     = q.Tier?.TierName ?? "Member",
                    tierId       = q.TierId ?? 1,
                    status       = q.Status,
                    position     = q.Position,
                    checkInAt    = q.CheckInAt,
                    startedAt    = q.StartedAt,
                    completedAt  = q.CompletedAt,
                    staffNote    = q.StaffNote,
                    finalPrice   = q.Booking?.FinalPrice ?? 0,
                    pointsEarned = q.Booking?.PointsEarned ?? 0,
                    services     = (q.Booking?.BookingServices ?? new List<BookingService>())
                        .Select(bs => new { name = bs.Service.ServiceName, price = bs.PriceSnapshot })
                        .ToList()
                });
            }

            // Map pending bookings to synthetic queue entries
            int positionOffset = items.Count > 0 ? items.Max(q => q.Position) : 0;
            int idx = 1;
            foreach (var b in pendingBookings)
            {
                mergedResult.Add(new {
                    queueId      = -b.BookingId, // Synthetic ID
                    bookingId    = b.BookingId,
                    licensePlate = b.Vehicle.LicensePlate,
                    customerName = b.Customer.Account?.FullName ?? "Khách hàng",
                    tierName     = b.Customer.Tier?.TierName ?? "Member",
                    tierId       = b.Customer.TierId,
                    status       = "Waiting", // Pending booking shows in "Chờ check-in"
                    position     = positionOffset + idx,
                    checkInAt    = b.ScheduledAt,
                    startedAt    = (DateTime?)null,
                    completedAt  = (DateTime?)null,
                    staffNote    = b.Notes,
                    finalPrice   = b.FinalPrice,
                    pointsEarned = b.PointsEarned,
                    services     = b.BookingServices
                        .Select(bs => new { name = bs.Service.ServiceName, price = bs.PriceSnapshot })
                        .ToList()
                });
                idx++;
            }

            return Ok(mergedResult);
        }

        [HttpPost]
        public async Task<IActionResult> AdvanceQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            Queue? q = null;
            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Account)
                    .FirstOrDefaultAsync(b => b.BookingId == bookingId);

                if (booking == null) return NotFound(new { success = false, message = "Không tìm thấy đặt lịch!" });

                q = await _context.Queues.FirstOrDefaultAsync(w => w.BookingId == bookingId);
                if (q == null)
                {
                    var today = DateTime.Today;
                    var lastPos = await _context.Queues
                        .Where(w => w.CheckInAt.Date == today && w.Status != "Cancelled")
                        .MaxAsync(w => (int?)w.Position) ?? 0;

                    q = new Queue
                    {
                        BookingId = booking.BookingId,
                        VehicleId = booking.VehicleId,
                        CustomerId = booking.CustomerId,
                        LicensePlate = booking.Vehicle.LicensePlate,
                        CustomerName = booking.Customer.Account?.FullName ?? "Khách hàng",
                        TierId = booking.Customer.TierId,
                        Status = "LPR_Scan", // Advance from Waiting to LPR_Scan
                        Position = lastPos + 1,
                        CheckInAt = DateTime.Now,
                        StartedAt = DateTime.Now
                    };

                    booking.Status = 3; // InProgress
                    _context.Queues.Add(q);
                    await _context.SaveChangesAsync();

                    return Ok(new { success = true, newStatus = "LPR_Scan" });
                }
            }
            else
            {
                q = await _context.Queues.FindAsync(id);
            }

            if (q == null) return NotFound(new { success = false, message = "Không tìm thấy xe!" });

            if (!_queueFlow.TryGetValue(q.Status, out var nextStatus))
                return BadRequest(new { success = false, message = $"Không thể chuyển từ trạng thái '{q.Status}'!" });

            q.Status = nextStatus;
            q.StartedAt ??= DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, newStatus = nextStatus });
        }

        [HttpPost]
        public async Task<IActionResult> UpdateQueue(int id, [FromBody] UpdateQueueRequest request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            Queue? q = null;
            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.Customer)
                        .ThenInclude(c => c.Account)
                    .FirstOrDefaultAsync(b => b.BookingId == bookingId);

                if (booking != null)
                {
                    q = await _context.Queues.FirstOrDefaultAsync(w => w.BookingId == bookingId);
                    if (q == null)
                    {
                        var today = DateTime.Today;
                        var lastPos = await _context.Queues
                            .Where(w => w.CheckInAt.Date == today && w.Status != "Cancelled")
                            .MaxAsync(w => (int?)w.Position) ?? 0;

                        q = new Queue
                        {
                            BookingId = booking.BookingId,
                            VehicleId = booking.VehicleId,
                            CustomerId = booking.CustomerId,
                            LicensePlate = booking.Vehicle.LicensePlate,
                            CustomerName = booking.Customer.Account?.FullName ?? "Khách hàng",
                            TierId = booking.Customer.TierId,
                            Status = "Waiting",
                            Position = lastPos + 1,
                            CheckInAt = DateTime.Now
                        };

                        booking.Status = 3; // InProgress
                        _context.Queues.Add(q);
                        await _context.SaveChangesAsync();
                    }
                }
            }
            else
            {
                q = await _context.Queues.FindAsync(id);
            }

            if (q == null) return NotFound(new { success = false });

            if (!string.IsNullOrEmpty(request.Status))  q.Status    = request.Status;
            if (request.StaffNote != null)               q.StaffNote = request.StaffNote;
            if (q.StartedAt == null && q.Status != "Waiting") q.StartedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost]
        public async Task<IActionResult> CheckoutQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                Queue? q = null;
                if (id < 0)
                {
                    int bookingId = -id;
                    q = await _context.Queues
                        .Include(w => w.Booking)
                            .ThenInclude(b => b!.Customer)
                        .FirstOrDefaultAsync(w => w.BookingId == bookingId);
                }
                else
                {
                    q = await _context.Queues
                        .Include(w => w.Booking)
                            .ThenInclude(b => b!.Customer)
                        .FirstOrDefaultAsync(w => w.QueueId == id);
                }

                if (q == null) return NotFound(new { success = false, message = "Không tìm thấy!" });

                var now = DateTime.Now;
                q.Status      = "Completed";
                q.CompletedAt ??= now;

                if (q.Booking != null && q.Booking.Status != 4)
                {
                    q.Booking.Status = 4;
                    q.Booking.PaidAt ??= now;

                    var customer = q.Booking.Customer;
                    if (customer != null)
                    {
                        customer.TotalVisits    += 1;
                        customer.TotalSpend     += q.Booking.FinalPrice;
                        customer.RankingBalance += q.Booking.FinalPrice;
                        customer.PointBalance   += q.Booking.PointsEarned;
                        customer.LifetimePoints += q.Booking.PointsEarned;
                        customer.LastVisitAt     = now;
                    }

                    _context.LoyaltyTransactions.Add(new LoyaltyTransaction
                    {
                        CustomerId      = q.Booking.CustomerId,
                        Points          = q.Booking.PointsEarned,
                        TransactionType = "Earned",
                        BookingId       = q.BookingId,
                        Note            = $"Tích điểm dịch vụ rửa xe {q.LicensePlate}",
                        CreatedAt       = now
                    });

                    _context.Notifications.Add(new Notification
                    {
                        CustomerId = q.Booking.CustomerId,
                        Title      = "Rửa xe hoàn tất!",
                        Message    = $"Xe {q.LicensePlate} hoàn tất dịch vụ. Bạn nhận +{q.Booking.PointsEarned} điểm!",
                        Type       = "Booking",
                        IsRead     = false,
                        CreatedAt  = now
                    });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, finalPrice = q.Booking?.FinalPrice ?? 0, pointsEarned = q.Booking?.PointsEarned ?? 0 });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CancelQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            if (id < 0)
            {
                int bookingId = -id;
                var booking = await _context.Bookings.FindAsync(bookingId);
                if (booking == null) return NotFound(new { success = false });

                booking.Status = 5; // Cancelled
                await _context.SaveChangesAsync();
                return Ok(new { success = true });
            }

            var q = await _context.Queues.FindAsync(id);
            if (q == null) return NotFound(new { success = false });

            q.Status = "Cancelled";
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost]
        public async Task<IActionResult> AddWalkIn([FromBody] WalkInRequest request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                int? tierId = 1, customerId = null, vehicleId = null;
                string customerName = request.CustomerName ?? "Khách vãng lai";

                var normPlate = request.LicensePlate.Replace("-", "").Replace(" ", "").ToUpper();
                var vehicle = await _context.Vehicles
                    .Include(v => v.Customer).ThenInclude(c => c!.Account)
                    .Include(v => v.Customer).ThenInclude(c => c!.Tier)
                    .FirstOrDefaultAsync(v =>
                        v.LicensePlate.Replace("-", "").Replace(" ", "").ToUpper() == normPlate);

                if (vehicle?.Customer != null)
                {
                    tierId       = vehicle.Customer.TierId;
                    customerId   = vehicle.Customer.CustomerId;
                    vehicleId    = vehicle.VehicleId;
                    if (string.IsNullOrEmpty(request.CustomerName))
                        customerName = vehicle.Customer.Account.FullName;
                }

                var today   = DateTime.Today;
                var lastPos = await _context.Queues
                    .Where(q => q.CheckInAt.Date == today && q.Status != "Cancelled")
                    .MaxAsync(q => (int?)q.Position) ?? 0;

                var tierName = (await _context.Tiers.FindAsync(tierId ?? 1))?.TierName ?? "Member";

                // Tìm booking confirmed/pending hôm nay cho xe này
                int? bookingId      = null;
                string? bookingSvcs = null;
                if (vehicleId.HasValue)
                {
                    var booking = await _context.Bookings
                        .Include(b => b.BookingServices)
                            .ThenInclude(bs => bs.Service)
                        .FirstOrDefaultAsync(b =>
                            b.VehicleId    == vehicleId.Value
                            && (b.Status == 1 || b.Status == 2) // Pending or Confirmed
                            && b.ScheduledAt.Date == today);

                    if (booking != null)
                    {
                        bookingId      = booking.BookingId;
                        booking.Status = 3;            // InProgress
                        bookingSvcs    = string.Join(", ", booking.BookingServices
                            .Select(bs => bs.Service.ServiceName));
                    }
                }

                var entry = new Auto_Wash.Data.Entities.Queue
                {
                    LicensePlate = request.LicensePlate.ToUpper().Trim(),
                    CustomerName = customerName,
                    TierId       = tierId,
                    CustomerId   = customerId,
                    VehicleId    = vehicleId,
                    BookingId    = bookingId,
                    Status       = "Waiting",
                    Position     = lastPos + 1,
                    CheckInAt    = DateTime.Now
                };

                _context.Queues.Add(entry);
                await _context.SaveChangesAsync();

                return Ok(new {
                    success         = true,
                    queueId         = entry.QueueId,
                    customerName    = entry.CustomerName,
                    tierName,
                    hasBooking      = bookingId.HasValue,
                    bookingServices = bookingSvcs
                });
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

    public class WalkInRequest
    {
        public string  LicensePlate { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
    }

    public class UpdateQueueRequest
    {
        public string? Status    { get; set; }
        public string? StaffNote { get; set; }
    }
}
