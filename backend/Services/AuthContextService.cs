using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Services
{
    public class AuthContextService
    {
        private readonly AutoWashDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuthContextService(AutoWashDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<Account?> GetCurrentAccountAsync()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            int? accountId = httpContext.Session.GetInt32("AccountId");
            if (accountId.HasValue)
            {
                return await _context.Accounts
                    .FirstOrDefaultAsync(a => a.AccountId == accountId.Value && a.IsActive);
            }

            return null;
        }

        public async Task<Customer?> GetCurrentCustomerAsync()
        {
            var account = await GetCurrentAccountAsync();
            if (account == null || account.Role != 3 || !account.IsActive) return null;

            return await _context.Customers
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.AccountId == account.AccountId);
        }
    }
}
