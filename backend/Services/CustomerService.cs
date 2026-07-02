using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class CustomerService
    {
        private readonly AutoWashDbContext _context;

        public CustomerService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<bool> UpdateProfileAsync(int accountId, string fullName, string? phone)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountId == accountId);
            if (account == null) return false;

            account.FullName = fullName.Trim();
            account.Phone = phone?.Trim() ?? string.Empty;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Accounts.AnyAsync(a => a.Email == email.Trim());
        }

        public async Task<(bool success, string message)> VerifyEmailAndChangePasswordAsync(string email, string otpCode, string currentPassword, string newPassword, OtpService otpService)
        {
            bool otpValid = await otpService.VerifyOtpAsync(email, otpCode, "ForgotPassword");
            if (!otpValid) return (false, "Mã OTP không hợp lệ hoặc đã hết hạn!");

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
            if (account == null) return (false, "Không tìm thấy tài khoản tương ứng!");

            // currentPassword is only required when changing password from profile (not forgot password flow)
            if (!string.IsNullOrEmpty(currentPassword))
            {
                if (!PasswordHelper.VerifyPassword(currentPassword.Trim(), account.PasswordHash ?? ""))
                {
                    return (false, "Mật khẩu hiện tại không chính xác!");
                }
            }

            account.PasswordHash = PasswordHelper.HashPassword(newPassword.Trim());
            await _context.SaveChangesAsync();
            return (true, "Thay đổi mật khẩu thành công!");
        }

        public async Task<List<object>> GetVouchersAsync(int customerId)
        {
            var redemptions = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .Where(r => r.CustomerId == customerId)
                .OrderByDescending(r => r.RedeemedAt)
                .ToListAsync();

            return redemptions.Select(r => new
            {
                redemptionId = r.RedemptionId,
                title = r.Reward.RewardName,
                code = !string.IsNullOrEmpty(r.VoucherCode)
                    ? r.VoucherCode
                    : (r.Reward.PointCost == 0 ? $"WELCOME10-{customerId}" : $"AW-RED-{r.RedemptionId}"),
                rewardType = r.Reward.RewardType,
                rewardValue = r.Reward.DiscountValue,
                status = r.Status == RedemptionStatus.Active ? 1 : 2, // 1 = Available, 2 = Used
                redeemedAt = r.RedeemedAt.ToString("dd/MM/yyyy"),
                expiredAt = r.ExpiresAt.ToString("dd/MM/yyyy")
            }).Cast<object>().ToList();
        }

        public async Task<List<object>> GetNotificationsAsync(int customerId)
        {
            var list = await _context.Notifications
                .Where(n => n.CustomerId == customerId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return list.Select(n => new
            {
                id = n.NotificationId.ToString(),
                title = n.Title,
                body = n.Message,
                time = GetRelativeTime(n.CreatedAt),
                sentAt = n.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                type = n.Type,
                read = n.IsRead
            }).Cast<object>().ToList();
        }

        private static string GetRelativeTime(DateTime dateTime)
        {
            var span = DateTime.Now - dateTime;
            if (span.TotalMinutes < 1) return "Vừa xong";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} phút trước";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours} giờ trước";
            if (span.TotalDays < 7) return $"{(int)span.TotalDays} ngày trước";
            return dateTime.ToString("dd/MM/yyyy HH:mm");
        }

        public async Task<bool> MarkNotificationAsReadAsync(int customerId, int notifId)
        {
            var notif = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notifId && n.CustomerId == customerId);
            if (notif == null) return false;

            notif.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(bool success, string message)> RedeemRewardAsync(int customerId, int rewardId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null) return (false, "Không tìm thấy thông tin khách hàng.");

            var reward = await _context.Rewards.FindAsync(rewardId);
            if (reward == null || !reward.IsActive) return (false, "Phần thưởng không tồn tại hoặc đã ngừng áp dụng.");

            if (customer.PointBalance < reward.PointCost)
            {
                return (false, $"Bạn không đủ điểm để đổi phần thưởng này (Cần {reward.PointCost}đ, hiện có {customer.PointBalance}đ).");
            }

            var now = DateTime.Now;
            customer.PointBalance -= reward.PointCost;

            var redemption = new RewardRedemption
            {
                CustomerId = customerId,
                RewardId = rewardId,
                Status = RedemptionStatus.Active,
                ExpiresAt = now.AddDays(reward.ValidDays),
                RedeemedAt = now
            };
            _context.RewardRedemptions.Add(redemption);
            await _context.SaveChangesAsync(); // assigns RedemptionId

            // Persist the unique voucher code "AW-RED-{id}" (doc §6.2).
            redemption.VoucherCode = $"AW-RED-{redemption.RedemptionId}";

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customerId,
                Points = -reward.PointCost,
                TransactionType = "REDEEM",
                RedemptionId = redemption.RedemptionId,
                Note = $"Đổi điểm nhận quà: {reward.RewardName}",
                CreatedAt = now
            });

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Đổi phần thưởng thành công",
                Message = $"Bạn đã đổi thành công {reward.PointCost} điểm lấy voucher '{reward.RewardName}'.",
                Type = "Voucher",
                IsRead = false,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();
            return (true, "Đổi phần thưởng thành công!");
        }

        public async Task<List<object>> GetRewardsAsync()
        {
            var list = await _context.Rewards.Where(r => r.IsActive).ToListAsync();
            return list.Select(r => new
            {
                rewardId = r.RewardId,
                rewardName = r.RewardName,
                description = r.Description ?? "",
                pointsRequired = r.PointCost,
                rewardType = r.RewardType,
                rewardValue = r.DiscountValue,
                isActive = r.IsActive ? 1 : 0,
                icon = r.RewardType == "DiscountPercent" ? "fa-percent" : r.RewardType == "Free_Wash" ? "fa-soap" : "fa-gift"
            }).Cast<object>().ToList();
        }

        /// <summary>
        /// Loyalty status for the member card: redemption points plus rolling
        /// ranking-window spend and progress toward the next tier. Lazily
        /// re-evaluates the customer's tier from their windowed spend.
        /// </summary>
        public async Task<object?> GetLoyaltyStatusAsync(int customerId)
        {
            var now = DateTime.Now;
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == customerId);
            if (customer == null) return null;

            int windowedSpend = await TierHelper.EvaluateUpgradeAsync(_context, customer, now);
            await _context.SaveChangesAsync();

            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            var current = tiers.FirstOrDefault(t => t.TierId == customer.TierId) ?? tiers.First();
            var next = tiers
                .Where(t => t.MinRankingBalance > current.MinRankingBalance)
                .OrderBy(t => t.MinRankingBalance)
                .FirstOrDefault();

            return new
            {
                points = customer.PointBalance,
                lifetimePoints = customer.LifetimePoints,
                totalVisits = customer.TotalVisits,
                tierName = current.TierName,
                bookingWindowDays = current.BookingWindowDays,
                multiplier = current.PointMultiplier,
                discountPercent = current.DiscountPercent,
                windowMonths = TierHelper.RankingWindowMonths,
                windowedSpend = windowedSpend,
                currentTierMin = current.MinRankingBalance,
                nextTierName = next?.TierName,
                nextTierMin = next?.MinRankingBalance,
                amountToNextTier = next != null ? Math.Max(0, next.MinRankingBalance - windowedSpend) : 0,
                // Full tier ladder so the UI can compute the spend-to-rank-up gap
                // for any tier the user previews (ascending by threshold).
                tiers = tiers.Select(t => new
                {
                    tierId = t.TierId,
                    name = t.TierName,
                    minRankingBalance = t.MinRankingBalance,
                    bookingWindowDays = t.BookingWindowDays
                }).ToList()
            };
        }
    }
}
