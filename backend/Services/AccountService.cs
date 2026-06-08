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
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => (a.Email == identifier.Trim() || a.Phone == identifier.Trim())
                                          && a.IsActive);

            if (account == null) return null;

            bool isValid = PasswordHelper.VerifyPassword(password, account.PasswordHash ?? string.Empty);
            if (!isValid) return null;

            // Soft Migration: If the stored hash is a legacy SHA256 hash, upgrade it to BCrypt on successful login!
            if (PasswordHelper.IsLegacyHash(account.PasswordHash ?? string.Empty))
            {
                account.PasswordHash = PasswordHelper.HashPassword(password);
                await _context.SaveChangesAsync();
            }

            return account;
        }

        public async Task<Account?> FindByEmailAsync(string email)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
        }

        public async Task<Account?> FindByPhoneAsync(string phone)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == phone.Trim());
        }

        public async Task<Account?> FindByGoogleIdAsync(string googleId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.GoogleId == googleId.Trim());
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

        public async Task<Account?> GetAccountByIdAsync(int accountId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.AccountId == accountId);
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
                catch (Exception ex)
                {
                    Console.WriteLine($"[WELCOME_REWARD_ERROR] CustomerId={customer.CustomerId}, Error={ex.Message}");
                }
            }

            return customer;
        }

        public async Task<Account> CompleteGoogleSignupAsync(CompleteGoogleSignupRequestDto request)
        {
            var emailTrimmed = request.Email.Trim();
            var googleIdTrimmed = request.GoogleId.Trim();
            var phoneTrimmed = request.Phone.Trim();

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == emailTrimmed);
            if (account == null)
            {
                account = new Account
                {
                    Email = emailTrimmed,
                    FullName = request.FullName.Trim(),
                    GoogleId = googleIdTrimmed,
                    Phone = phoneTrimmed,
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
                if (!string.IsNullOrEmpty(account.GoogleId) && account.GoogleId != googleIdTrimmed)
                {
                    throw new InvalidOperationException("Tài khoản này đã được liên kết với một tài khoản Google khác!");
                }

                if (string.IsNullOrEmpty(account.GoogleId))
                {
                    account.GoogleId = googleIdTrimmed;
                }

                if (string.IsNullOrEmpty(account.Phone))
                {
                    var existingPhone = await FindByPhoneAsync(phoneTrimmed);
                    if (existingPhone != null && existingPhone.AccountId != account.AccountId)
                    {
                        throw new InvalidOperationException("Số điện thoại này đã được sử dụng bởi một tài khoản khác!");
                    }
                    account.Phone = phoneTrimmed;
                }

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
            var emailTrimmed = request.Email.Trim();
            var phoneTrimmed = request.Phone.Trim();

            if (await FindByEmailAsync(emailTrimmed) != null)
                throw new InvalidOperationException("Email này đã được sử dụng!");

            if (await FindByPhoneAsync(phoneTrimmed) != null)
                throw new InvalidOperationException("Số điện thoại này đã được sử dụng!");

            var account = new Account
            {
                Email = emailTrimmed,
                FullName = request.FullName.Trim(),
                Phone = phoneTrimmed,
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
