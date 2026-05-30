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
                    // Account doesn't exist, this is a new Google user.
                    // We defer database writing until they verify their phone number on the next screen.
                    return Ok(new { success = true, isNewUser = true });
                }
                else
                {
                    // Account exists. If phone is missing, it is an incomplete registration!
                    if (string.IsNullOrEmpty(account.Phone))
                    {
                        return Ok(new { success = true, isNewUser = true });
                    }

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

                // Set cookies for returning users
                Response.Cookies.Append("UserEmail", account.Email, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });
                Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });

                return Ok(new { success = true, isNewUser = false });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CompleteGoogleSignup([FromBody] CompleteGoogleSignupRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, message = "Dữ liệu hoàn thành đăng ký không hợp lệ!" });
            }

            try
            {
                // Check unique phone constraints
                var existingPhone = await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == request.Phone.Trim());
                if (existingPhone != null)
                {
                    return BadRequest(new { success = false, message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
                }

                // Check if account already exists by email
                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());

                if (account == null)
                {
                    account = new Account
                    {
                        Email = request.Email.Trim(),
                        FullName = request.FullName.Trim(),
                        GoogleId = request.GoogleId.Trim(),
                        Phone = request.Phone.Trim(),
                        PasswordHash = HashPassword(request.Password.Trim()),
                        Role = 3, // 3 = Customer
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    };

                    _context.Accounts.Add(account);
                    await _context.SaveChangesAsync();

                    var customer = new Customer
                    {
                        AccountId = account.AccountId,
                        MembershipCode = "MEM" + DateTime.Now.ToString("yyMMddHHmmss"),
                        TierId = 1, // Default Tier: Member
                        PointBalance = 100, // Gift 100 points
                        LifetimePoints = 100,
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
                    // Existing account but phone was missing
                    account.Phone = request.Phone.Trim();
                    account.GoogleId = request.GoogleId.Trim();
                    account.PasswordHash = HashPassword(request.Password.Trim());
                    await _context.SaveChangesAsync();
                }

                // Set cookies
                Response.Cookies.Append("UserEmail", account.Email, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });
                Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private string HashPassword(string password)
        {
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
                var builder = new System.Text.StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }
        }
    }

    public class GoogleLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string GoogleId { get; set; } = string.Empty;
    }

    public class CompleteGoogleSignupRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string GoogleId { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
