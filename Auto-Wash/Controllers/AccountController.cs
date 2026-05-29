using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class AccountController : Controller
    {
        private readonly AutoWashDbContext _context;

        public AccountController(AutoWashDbContext context)
        {
            _context = context;
        }

        public IActionResult Login()
        {
            ViewBag.PageTitle = "Đăng nhập";
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] PhoneLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ thông tin!" });

            try
            {
                var hash = HashSHA256(request.Password);
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a =>
                        (a.Email == request.Identifier.Trim() || a.Phone == request.Identifier.Trim())
                        && a.PasswordHash == hash
                        && a.IsActive);

                if (account == null)
                    return Ok(new { success = false, message = "Tài khoản hoặc mật khẩu không đúng!" });

                var roleStr = account.Role == 1 ? "admin" : account.Role == 2 ? "staff" : "customer";
                HttpContext.Session.SetString("UserRole", roleStr);
                HttpContext.Session.SetString("UserName", account.FullName);
                HttpContext.Session.SetString("UserEmail", account.Email);
                HttpContext.Session.SetInt32("AccountId", account.AccountId);

                string? tier = null;
                int? points = null;
                if (account.Role == 3)
                {
                    var customer = await _context.Customers
                        .Include(c => c.Tier)
                        .FirstOrDefaultAsync(c => c.AccountId == account.AccountId);
                    if (customer != null)
                    {
                        tier = customer.Tier?.TierName;
                        points = customer.PointBalance;
                    }
                }

                return Ok(new
                {
                    success = true,
                    role = roleStr,
                    name = account.FullName,
                    email = account.Email,
                    phone = account.Phone,
                    tier,
                    points
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Account");
        }

        [HttpPost]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email không hợp lệ!" });
            }

            try
            {
                // 1. Check if account already exists in Accounts table
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Email == request.Email.Trim());

                if (account == null)
                {
                    // 2. Account doesn't exist, create a new Account record
                    account = new Account
                    {
                        Email = request.Email.Trim(),
                        FullName = request.FullName.Trim(),
                        GoogleId = request.GoogleId?.Trim(),
                        Role = 3, // 3 = Customer
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    };

                    _context.Accounts.Add(account);
                    await _context.SaveChangesAsync();

                    // 3. Create a corresponding Customer profile linked to default Member Tier (TierId = 1)
                    var customer = new Customer
                    {
                        AccountId = account.AccountId,
                        MembershipCode = "MEM" + DateTime.Now.ToString("yyMMddHHmmss"),
                        TierId = 1, // Default Tier: Member
                        PointBalance = 0,
                        LifetimePoints = 0,
                        RankingBalance = 0,
                        TotalVisits = 0,
                        TotalSpend = 0,
                        JoinedAt = DateTime.Now
                    };

                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // If account exists but GoogleId is not set, set it now
                    if (string.IsNullOrEmpty(account.GoogleId))
                    {
                        account.GoogleId = request.GoogleId?.Trim();
                        await _context.SaveChangesAsync();
                    }
                    else if (account.GoogleId != request.GoogleId?.Trim())
                    {
                        return BadRequest(new { success = false, message = "Tài khoản này đã được liên kết với một tài khoản Google khác!" });
                    }
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static string HashSHA256(string input)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLower();
        }
    }

    public class GoogleLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string GoogleId { get; set; } = string.Empty;
    }

    public class PhoneLoginRequest
    {
        public string Identifier { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
