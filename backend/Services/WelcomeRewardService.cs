using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Services
{
    public class WelcomeRewardService
    {
        private readonly AutoWashDbContext _context;

        public WelcomeRewardService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task GrantWelcomeRewardAsync(int customerId)
        {
            try
            {
                // 1. Check if welcome reward has already been granted to this customer
                var hasWelcome = await _context.RewardRedemptions
                    .AnyAsync(r => r.CustomerId == customerId && r.Reward.RewardName == "Voucher chào mừng");
                if (hasWelcome)
                {
                    Console.WriteLine($"[WELCOME_REWARD] already exists for CustomerId={customerId}");
                    return;
                }

                // 2. Find or create the welcome Reward template
                var reward = await _context.Rewards
                    .FirstOrDefaultAsync(r => r.RewardName == "Voucher chào mừng" && r.PointCost == 0);
                if (reward == null)
                {
                    reward = new Reward
                    {
                        RewardName = "Voucher chào mừng",
                        Description = "Voucher chào mừng khách hàng mới đăng ký",
                        PointCost = 0,
                        RewardType = "DiscountPercent",
                        DiscountValue = 10,
                        IsActive = true,
                        ValidDays = 30
                    };
                    _context.Rewards.Add(reward);
                    await _context.SaveChangesAsync();
                }

                // 3. Create the RewardRedemption record (Status = Active means Available in standard code)
                var redemption = new RewardRedemption
                {
                    CustomerId = customerId,
                    RewardId = reward.RewardId,
                    Status = RedemptionStatus.Active, 
                    ExpiresAt = DateTime.Now.AddDays(30),
                    RedeemedAt = DateTime.Now
                };
                _context.RewardRedemptions.Add(redemption);

                // 4. Create the Welcome Notification
                var notification = new Notification
                {
                    CustomerId = customerId,
                    Title = "Chào mừng bạn đến với AutoWash Pro",
                    Message = "Bạn đã nhận được voucher giảm giá 10% dành cho khách hàng mới.",
                    Type = "welcome",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);

                await _context.SaveChangesAsync();
                Console.WriteLine($"[WELCOME_REWARD] granted to CustomerId={customerId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WELCOME_REWARD_ERROR] CustomerId={customerId}, Error={ex.Message}");
            }
        }
    }
}
