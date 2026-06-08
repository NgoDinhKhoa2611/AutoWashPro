using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs.Admin;

namespace Auto_Wash.Services
{
    public class AdminService
    {
        private readonly AutoWashDbContext _context;

        public AdminService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetDashboardStatsAsync()
        {
            var today = DateTime.Today;
            var startDate = today.AddDays(-6);
            var prevStart = today.AddDays(-13);

            // 1. Total Customers
            var totalCustomers = await _context.Customers.CountAsync();

            // 2. Total Bookings
            var totalBookings = await _context.Bookings.CountAsync();

            // 3. Revenue
            var completedBookingsGrouped = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue && b.PaidAt.Value >= startDate)
                .GroupBy(b => b.PaidAt!.Value.Date)
                .Select(g => new { Date = g.Key, Total = g.Sum(b => b.FinalPrice) })
                .ToListAsync();

            var completedBookingsDict = completedBookingsGrouped.ToDictionary(x => x.Date, x => x.Total);

            var revenue7Days = Enumerable.Range(0, 7)
                .Select(i => {
                    var day = startDate.AddDays(i);
                    return completedBookingsDict.TryGetValue(day, out var val) ? (long)val : 0L;
                }).ToArray();

            var totalRevenue = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue && b.PaidAt.Value >= startDate)
                .SumAsync(b => (long)b.FinalPrice);

            var prevTotalRevenue = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue
                         && b.PaidAt.Value >= prevStart && b.PaidAt.Value < startDate)
                .SumAsync(b => (long)b.FinalPrice);

            // 4. Monthly Revenue (last 30 days)
            var monthlyRevenue = await _context.Bookings
                .Where(b => b.Status == 4 && b.PaidAt.HasValue && b.PaidAt.Value >= today.AddDays(-30))
                .SumAsync(b => (long)b.FinalPrice);

            // 5. Active Queue
            var activeQueue = await _context.Queues
                .CountAsync(q => q.Status == "Waiting" || q.Status == "In Progress");

            // 6. Average Wash Duration
            double avgMinutesVal = 0;
            var completedQueueCount = await _context.Queues
                .CountAsync(q => q.StartedAt.HasValue && q.CompletedAt.HasValue);
            if (completedQueueCount > 0)
            {
                avgMinutesVal = await _context.Queues
                    .Where(q => q.StartedAt.HasValue && q.CompletedAt.HasValue)
                    .AverageAsync(q => (q.CompletedAt!.Value - q.StartedAt!.Value).TotalMinutes);
            }
            var avgMinutes = (int)Math.Round(avgMinutesVal);

            // 7. Average Rating
            var avgStarsNullable = await _context.Bookings
                .Where(b => b.Stars.HasValue)
                .AverageAsync(b => (double?)b.Stars);
            var avgStars = avgStarsNullable.HasValue ? Math.Round(avgStarsNullable.Value, 1) : 0.0;

            // 8. Tier Distribution
            var tierDistributionData = await _context.Customers
                .GroupBy(c => c.Tier.TierName)
                .Select(g => new { TierName = g.Key, Count = g.Count() })
                .ToListAsync();

            var tierDist = new Dictionary<string, int> { { "Platinum", 0 }, { "Gold", 0 }, { "Silver", 0 }, { "Member", 0 } };
            foreach (var item in tierDistributionData)
            {
                var name = item.TierName;
                if (name.Contains("Platinum", StringComparison.OrdinalIgnoreCase)) tierDist["Platinum"] = item.Count;
                else if (name.Contains("Gold", StringComparison.OrdinalIgnoreCase)) tierDist["Gold"] = item.Count;
                else if (name.Contains("Silver", StringComparison.OrdinalIgnoreCase)) tierDist["Silver"] = item.Count;
                else tierDist["Member"] = item.Count;
            }

            // 9. Booking Status Count
            var bookingStatusCount = await _context.Bookings
                .GroupBy(b => b.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            // 10. Service Usage Statistics
            var serviceUsageStats = await _context.BookingServices
                .GroupBy(bs => bs.Service.ServiceName)
                .Select(g => new { ServiceName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ServiceName, x => x.Count);

            var dayLabels = Enumerable.Range(0, 7)
                .Select(i => startDate.AddDays(i).ToString("ddd", new System.Globalization.CultureInfo("vi-VN")))
                .ToArray();

            return new
            {
                totalCustomers,
                totalBookings,
                revenue7Days,
                totalRevenue,
                prevTotalRevenue,
                monthlyRevenue,
                activeQueue,
                avgMinutes,
                avgStars,
                tierDistribution = tierDist,
                bookingStatusCount,
                serviceUsageStats,
                dayLabels
            };
        }

        public async Task<object> GetLoyaltyConfigAsync()
        {
            var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync() ?? new LoyaltyConfig();
            var tiers = await _context.Tiers.OrderBy(t => t.SortOrder).ToListAsync();

            return new
            {
                pointsPerThousandVND = config.PointsPerThousandVND,
                pointExpiryMonths = config.PointExpiryMonths,
                tierReviewDayOfMonth = config.TierReviewDayOfMonth,
                rankingWindowYears = config.RankingWindowYears,
                tiers = tiers.Select(t => new {
                    tierId = t.TierId,
                    tierName = t.TierName,
                    minRankingBalance = t.MinRankingBalance,
                    pointMultiplier = t.PointMultiplier,
                    discountPercent = t.DiscountPercent,
                    bookingWindowDays = t.BookingWindowDays
                })
            };
        }

        public async Task<bool> SaveLoyaltyConfigAsync(SaveLoyaltyConfigRequestDto request, int? updatedByAccountId)
        {
            var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new LoyaltyConfig { ConfigId = 1 };
                _context.LoyaltyConfigs.Add(config);
            }
            config.PointsPerThousandVND = request.PointsPerThousandVND;
            config.PointExpiryMonths = request.PointExpiryMonths;
            config.TierReviewDayOfMonth = request.TierReviewDayOfMonth;
            config.RankingWindowYears = request.RankingWindowYears;
            config.UpdatedAt = DateTime.Now;
            config.UpdatedBy = updatedByAccountId;

            if (request.TierUpdates != null)
            {
                foreach (var tu in request.TierUpdates)
                {
                    var tier = await _context.Tiers.FindAsync(tu.TierId);
                    if (tier != null)
                    {
                        tier.PointMultiplier = tu.PointMultiplier;
                        tier.DiscountPercent = tu.DiscountPercent;
                        tier.BookingWindowDays = tu.BookingWindowDays;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<object>> GetTierReviewAsync()
        {
            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (!tiers.Any()) return new List<object>();

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
                    name = c.Account.FullName,
                    currentTier = c.Tier.TierName,
                    rankingBalance = pts,
                    predictedTier = newTier.TierName,
                    direction = dir,
                    reason
                };
            })
            .OrderBy(r => r.direction == "stable" ? 1 : 0)
            .ThenBy(r => r.name)
            .Cast<object>()
            .ToList();

            return results;
        }

        public async Task<(int upgrades, int downgrades)> RunTierReviewAsync()
        {
            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (!tiers.Any()) return (0, 0);

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
                    CustomerId = c.CustomerId,
                    Points = 0,
                    TransactionType = "TierChange",
                    FromTierId = c.TierId,
                    ToTierId = newTier.TierId,
                    Note = "Monthly Tier Review",
                    CreatedAt = now
                });

                _context.Notifications.Add(new Notification
                {
                    CustomerId = c.CustomerId,
                    Title = "Thay đổi hạng thành viên",
                    Message = isUp
                        ? $"Chúc mừng! Bạn đã được nâng lên hạng {newTier.TierName}."
                        : $"Hạng thành viên của bạn đã được điều chỉnh xuống {newTier.TierName}.",
                    Type = "Tier",
                    IsRead = false,
                    CreatedAt = now
                });

                c.TierId = newTier.TierId;
            }

            await _context.SaveChangesAsync();
            return (upgrades, downgrades);
        }

        // ── Service Management API ─────────────────────────────────────

        public async Task<List<object>> GetAdminServicesAsync()
        {
            var list = await _context.Services.OrderBy(s => s.ServiceId).ToListAsync();
            return list.Select(s => new {
                id = s.ServiceId.ToString(),
                name = s.ServiceName,
                description = s.Description ?? "",
                category = s.IsAddOn ? "Dịch vụ đi kèm" : "Dịch vụ chính",
                price = s.BasePrice,
                estimatedMinutes = s.EstimatedMinutes,
                isActive = s.IsActive,
                isFeatured = s.IsFeatured,
                status = s.IsActive ? "Active" : "Inactive"
            }).Cast<object>().ToList();
        }

        public async Task<bool> SaveServiceAsync(SaveServiceRequestDto dto)
        {
            Service? service = null;
            if (!string.IsNullOrEmpty(dto.Id) && int.TryParse(dto.Id, out int id))
            {
                service = await _context.Services.FindAsync(id);
            }

            bool isNew = false;
            if (service == null)
            {
                service = new Service();
                isNew = true;
            }

            service.ServiceName = dto.Name.Trim();
            service.Description = dto.Description?.Trim();
            service.IsAddOn = dto.Category == "Dịch vụ đi kèm";
            service.Category = service.IsAddOn ? 4 : 1; 
            service.BasePrice = dto.Price;
            service.EstimatedMinutes = dto.EstimatedMinutes;
            service.IsActive = dto.IsActive;
            service.IsFeatured = dto.IsFeatured;

            if (isNew)
            {
                _context.Services.Add(service);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleServiceStatusAsync(int serviceId)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return false;

            service.IsActive = !service.IsActive;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteServiceAsync(int serviceId)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return false;

            var isUsed = await _context.BookingServices.AnyAsync(bs => bs.ServiceId == serviceId);
            if (isUsed)
            {
                throw new InvalidOperationException("Không thể xóa dịch vụ này vì đã có lịch đặt sử dụng dịch vụ. Bạn có thể chọn ẩn dịch vụ đi thay thế.");
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Customer Management API ────────────────────────────────────

        public async Task<List<object>> GetCustomersAsync(string? search = null)
        {
            var query = _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTrim = search.Trim().ToLower();
                query = query.Where(c => c.Account.FullName.ToLower().Contains(searchTrim) 
                                      || (c.Account.Phone != null && c.Account.Phone.Contains(searchTrim))
                                      || (c.Account.Email != null && c.Account.Email.ToLower().Contains(searchTrim))
                                      || c.MembershipCode.ToLower().Contains(searchTrim));
            }

            var list = await query.ToListAsync();

            var activeVouchersCounts = await _context.RewardRedemptions
                .Where(r => r.Status == "Active")
                .GroupBy(r => r.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CustomerId, x => x.Count);

            return list.Select(c => {
                activeVouchersCounts.TryGetValue(c.CustomerId, out int activeVouchersCount);
                return new {
                    id = c.CustomerId.ToString(),
                    name = c.Account.FullName,
                    phone = c.Account.Phone ?? "",
                    email = c.Account.Email ?? "",
                    tier = c.Tier.TierName,
                    points = c.PointBalance,
                    joined = c.JoinedAt.ToString("dd/MM/yyyy"),
                    spend = c.TotalSpend,
                    totalWashes = c.TotalVisits,
                    activeVouchersCount = activeVouchersCount,
                    lastActive = c.LastVisitAt.HasValue ? c.LastVisitAt.Value.ToString("dd/MM/yyyy") : "Chưa có"
                };
            }).Cast<object>().ToList();
        }

        public async Task<object?> GetCustomerDetailAsync(int customerId)
        {
            var c = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(x => x.CustomerId == customerId);
            if (c == null) return null;

            var vehicles = await _context.Vehicles
                .Where(v => v.CustomerId == customerId)
                .Select(v => new {
                    plate = v.LicensePlate,
                    type = string.IsNullOrEmpty(v.Name) ? v.Brand : $"{v.Brand} {v.Name}"
                })
                .ToListAsync();

            var history = await _context.Bookings
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.CustomerId == customerId)
                .OrderByDescending(b => b.ScheduledAt)
                .Select(b => new {
                    date = b.ScheduledAt.ToString("dd/MM/yyyy"),
                    service = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Rửa xe",
                    price = b.FinalPrice,
                    status = b.Status == 4 ? "Completed" : b.Status == 5 ? "Cancelled" : "In Progress"
                })
                .ToListAsync();

            var vouchers = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .Where(r => r.CustomerId == customerId && r.Status == "Active")
                .Select(r => new {
                    code = r.Reward.RewardId.ToString(),
                    title = r.Reward.RewardName,
                    status = r.Status
                })
                .ToListAsync();

            return new {
                id = c.CustomerId.ToString(),
                name = c.Account.FullName,
                phone = c.Account.Phone ?? "",
                email = c.Account.Email ?? "",
                tier = c.Tier.TierName,
                points = c.PointBalance,
                joined = c.JoinedAt.ToString("dd/MM/yyyy"),
                spend = c.TotalSpend,
                totalWashes = c.TotalVisits,
                activeVouchersCount = vouchers.Count,
                lastActive = c.LastVisitAt.HasValue ? c.LastVisitAt.Value.ToString("dd/MM/yyyy") : "Chưa có",
                vehicles,
                history,
                vouchers
            };
        }

        public async Task<bool> AdjustCustomerPointsAsync(int customerId, int pointsChange, string reason, int? staffAccountId)
        {
            var customer = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);
            if (customer == null) return false;

            customer.PointBalance = Math.Max(0, customer.PointBalance + pointsChange);
            if (pointsChange > 0)
            {
                customer.LifetimePoints += pointsChange;
            }

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customerId,
                Points = pointsChange,
                TransactionType = "Adjusted",
                Note = reason.Trim(),
                CreatedAt = DateTime.Now
            });

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Thay đổi số dư điểm",
                Message = $"Tài khoản của bạn đã được {(pointsChange > 0 ? "cộng" : "trừ")} {Math.Abs(pointsChange)} điểm Loyalty. Lý do: {reason.Trim()}",
                Type = "Points",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<object>> GetAvailableVouchersAsync()
        {
            var list = await _context.Rewards.Where(r => r.IsActive).ToListAsync();
            return list.Select(r => new {
                code = r.RewardId.ToString(),
                title = r.RewardName
            }).Cast<object>().ToList();
        }

        public async Task<bool> AssignVoucherAsync(int customerId, int rewardId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            var reward = await _context.Rewards.FindAsync(rewardId);
            if (customer == null || reward == null) return false;

            var redemption = new RewardRedemption
            {
                CustomerId = customerId,
                RewardId = rewardId,
                Status = "Active",
                ExpiresAt = DateTime.Now.AddDays(reward.ValidDays),
                RedeemedAt = DateTime.Now
            };

            _context.RewardRedemptions.Add(redemption);

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Bạn nhận được voucher mới",
                Message = $"Admin đã gán tặng cho bạn voucher: {reward.RewardName}.",
                Type = "Voucher",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return true;
        }

        // ── Campaign / Promotion Management API ───────────────────────

        public async Task<List<object>> GetPromotionsAsync()
        {
            var list = await _context.Campaigns
                .Include(c => c.TargetTierMin)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return list.Select(c => {
                string status = "Stopped";
                if (c.Status == 1)
                {
                    status = c.EndDate < DateTime.Today ? "Expired" : "Active";
                }
                
                return new {
                    id = c.CampaignId.ToString(),
                    name = c.CampaignName,
                    description = c.Description ?? "",
                    status = status,
                    target = c.TargetTierMin != null ? c.TargetTierMin.TierName : "All Customers",
                    redemptions = c.UsedCount,
                    maxRedemptions = c.UsageLimit ?? 500
                };
            }).Cast<object>().ToList();
        }

        public async Task<object?> GetPromotionByIdAsync(int id)
        {
            var c = await _context.Campaigns
                .Include(c => c.TargetTierMin)
                .FirstOrDefaultAsync(x => x.CampaignId == id);
            
            if (c == null) return null;

            string status = "Stopped";
            if (c.Status == 1)
            {
                status = c.EndDate < DateTime.Today ? "Expired" : "Active";
            }

            return new {
                id = c.CampaignId.ToString(),
                name = c.CampaignName,
                description = c.Description ?? "",
                status = status,
                target = c.TargetTierMin != null ? c.TargetTierMin.TierName : "All Customers",
                redemptions = c.UsedCount,
                maxRedemptions = c.UsageLimit ?? 500
            };
        }

        public async Task<Campaign> CreatePromotionAsync(CampaignRequestDto dto, int createdBy)
        {
            int? targetTierId = null;
            if (!string.IsNullOrEmpty(dto.Target) && !dto.Target.Equals("All Customers", StringComparison.OrdinalIgnoreCase))
            {
                var tier = await _context.Tiers.FirstOrDefaultAsync(t => t.TierName.ToLower().Contains(dto.Target.ToLower()));
                if (tier != null)
                {
                    targetTierId = tier.TierId;
                }
            }

            var campaign = new Campaign
            {
                CampaignName = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                TargetTierMinId = targetTierId,
                StartDate = DateTime.Today,
                EndDate = DateTime.Today.AddYears(1), // Default to 1 year
                Status = 1, // Active
                PromoCode = "CAMPAIGN_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                DiscountValue = 10,
                MinSpendValue = 0,
                UsageLimit = dto.MaxRedemptions,
                UsedCount = 0,
                CreatedBy = createdBy,
                CreatedAt = DateTime.Now
            };

            _context.Campaigns.Add(campaign);
            await _context.SaveChangesAsync();
            return campaign;
        }

        public async Task<bool> UpdatePromotionAsync(int id, CampaignRequestDto dto)
        {
            var campaign = await _context.Campaigns.FindAsync(id);
            if (campaign == null) return false;

            int? targetTierId = null;
            if (!string.IsNullOrEmpty(dto.Target) && !dto.Target.Equals("All Customers", StringComparison.OrdinalIgnoreCase))
            {
                var tier = await _context.Tiers.FirstOrDefaultAsync(t => t.TierName.ToLower().Contains(dto.Target.ToLower()));
                if (tier != null)
                {
                    targetTierId = tier.TierId;
                }
            }

            campaign.CampaignName = dto.Name.Trim();
            campaign.Description = dto.Description?.Trim();
            campaign.TargetTierMinId = targetTierId;
            campaign.UsageLimit = dto.MaxRedemptions;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> TogglePromotionStatusAsync(int id)
        {
            var campaign = await _context.Campaigns.FindAsync(id);
            if (campaign == null) return false;

            campaign.Status = (campaign.Status == 1) ? 0 : 1;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeletePromotionAsync(int id)
        {
            var campaign = await _context.Campaigns.FindAsync(id);
            if (campaign == null) return false;

            var isUsed = await _context.Bookings.AnyAsync(b => b.PromoCodeId == id);
            if (isUsed)
            {
                throw new InvalidOperationException("Không thể xóa chiến dịch này vì đã được áp dụng trong lịch đặt. Bạn có thể tạm dừng chiến dịch đi thay thế.");
            }

            _context.Campaigns.Remove(campaign);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
