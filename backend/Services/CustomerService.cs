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

        public async Task<(bool success, string message)> VerifyEmailAndChangePasswordAsync(string email, string otpCode, string currentPassword, string newPassword, OtpService otpService)
        {
            bool otpValid = await otpService.VerifyOtpAsync(email, otpCode, "ForgotPassword");
            if (!otpValid) return (false, "Mã OTP không hợp lệ hoặc đã hết hạn!");

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
            if (account == null) return (false, "Không tìm thấy tài khoản tương ứng!");

            if (string.IsNullOrEmpty(currentPassword))
            {
                return (false, "Mật khẩu hiện tại không được để trống!");
            }

            if (!PasswordHelper.VerifyPassword(currentPassword.Trim(), account.PasswordHash ?? ""))
            {
                return (false, "Mật khẩu hiện tại không chính xác!");
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
                code = r.Reward.PointCost == 0 ? $"WELCOME10-{customerId}" : $"AW-RED-{r.RedemptionId}",
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
                time = "Vừa xong",
                type = n.Type,
                read = n.IsRead
            }).Cast<object>().ToList();
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
                return (false, $"Bạn không đủ điểm để đổi phần thưởng này (Cần {reward.PointCost} PTS, hiện có {customer.PointBalance} PTS).");
            }

            customer.PointBalance -= reward.PointCost;

            var redemption = new RewardRedemption
            {
                CustomerId = customerId,
                RewardId = rewardId,
                Status = RedemptionStatus.Active,
                ExpiresAt = DateTime.Now.AddDays(reward.ValidDays),
                RedeemedAt = DateTime.Now
            };
            _context.RewardRedemptions.Add(redemption);

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customerId,
                Points = -reward.PointCost,
                TransactionType = "Redeemed",
                Note = $"Đổi điểm nhận quà: {reward.RewardName}",
                CreatedAt = DateTime.Now
            });

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Đổi phần thưởng thành công",
                Message = $"Bạn đã đổi thành công {reward.PointCost} điểm lấy voucher '{reward.RewardName}'.",
                Type = "Voucher",
                IsRead = false,
                CreatedAt = DateTime.Now
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
    }
}
