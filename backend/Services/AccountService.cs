using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Account;

namespace Auto_Wash.Services
{
    public class AccountService
    {
        private readonly AutoWashDbContext _context;
        private readonly WelcomeRewardService _welcomeRewardService;

        public AccountService(AutoWashDbContext context, WelcomeRewardService welcomeRewardService)
        {
            _context = context;
            _welcomeRewardService = welcomeRewardService;
        }

        public async Task<Account?> AuthenticateAsync(string identifier, string password)
        {
            var hash = PasswordHelper.HashPassword(password);
            return await _context.Accounts
                .FirstOrDefaultAsync(a => (a.Email == identifier.Trim() || a.Phone == identifier.Trim())
                                          && a.PasswordHash == hash
                                          && a.IsActive);
        }

        public async Task<Account?> FindByEmailAsync(string email)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
        }

        public async Task<Account?> FindByPhoneAsync(string phone)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == phone.Trim());
        }

        public async Task UpdateGoogleIdAsync(Account account, string googleId)
        {
            account.GoogleId = googleId.Trim();
            await _context.SaveChangesAsync();
        }

        public async Task<Customer?> GetCustomerProfileAsync(int accountId)
        {
            return await _context.Customers
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.AccountId == accountId);
        }

        private async Task<Customer> CreateDefaultCustomerAsync(Account account)
        {
            var customer = new Customer
            {
                AccountId = account.AccountId,
                MembershipCode = MembershipCodeGenerator.Generate(),
                TierId = 1, // Standard Member
                PointBalance = 0,
                LifetimePoints = 0,
                RankingBalance = 0,
                TotalVisits = 0,
                TotalSpend = 0,
                JoinedAt = DateTime.Now
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            // Grant welcome reward if welcome reward service is registered / exists
            if (_welcomeRewardService != null)
            {
                try
                {
                    await _welcomeRewardService.GrantWelcomeRewardAsync(customer.CustomerId);
                }
                catch
                {
                    // Fail-safe to avoid blocking registration if welcome reward fails
                }
            }

            return customer;
        }

        public async Task<Account> CompleteGoogleSignupAsync(CompleteGoogleSignupRequestDto request)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());
            if (account == null)
            {
                account = new Account
                {
                    Email = request.Email.Trim(),
                    FullName = request.FullName.Trim(),
                    GoogleId = request.GoogleId.Trim(),
                    Phone = request.Phone.Trim(),
                    PasswordHash = PasswordHelper.HashPassword(request.Password.Trim()),
                    Role = 3, // Customer
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.Accounts.Add(account);
                await _context.SaveChangesAsync();
            }
            else
            {
                account.Phone = request.Phone.Trim();
                account.GoogleId = request.GoogleId.Trim();
                account.PasswordHash = PasswordHelper.HashPassword(request.Password.Trim());
                await _context.SaveChangesAsync();
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.AccountId == account.AccountId);
            if (customer == null)
            {
                await CreateDefaultCustomerAsync(account);
            }

            return account;
        }

        public async Task<Account> RegisterAccountAsync(RegisterRequestDto request)
        {
            var account = new Account
            {
                Email = request.Email.Trim(),
                FullName = request.FullName.Trim(),
                Phone = request.Phone.Trim(),
                PasswordHash = PasswordHelper.HashPassword(request.Password.Trim()),
                Role = 3, // Customer
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();

            await CreateDefaultCustomerAsync(account);

            return account;
        }
    }
}
