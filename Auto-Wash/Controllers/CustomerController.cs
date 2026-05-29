using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class CustomerController : Controller
    {
        private readonly AutoWashDbContext _context;

        public CustomerController(AutoWashDbContext context)
        {
            _context = context;
        }

        private async Task PopulateUserProfileAsync()
        {
            string? email = Request.Cookies["UserEmail"];
            string? phone = Request.Cookies["UserPhone"];
            string? cookieAvatar = Request.Cookies["UserAvatar"];
            string? avatar = null;
            if (!string.IsNullOrEmpty(cookieAvatar))
            {
                try
                {
                    avatar = System.Net.WebUtility.UrlDecode(cookieAvatar);
                }
                catch {}
            }

            Account? account = null;
            if (!string.IsNullOrEmpty(email))
            {
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .ThenInclude(c => c!.Tier)
                    .FirstOrDefaultAsync(a => a.Email == email.Trim());
            }
            else if (!string.IsNullOrEmpty(phone))
            {
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .ThenInclude(c => c!.Tier)
                    .FirstOrDefaultAsync(a => a.Phone == phone.Trim());
            }

            if (account == null)
            {
                // Fallback: Grab the first customer in the DB for mock testing
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .ThenInclude(c => c!.Tier)
                    .FirstOrDefaultAsync(a => a.Role == 3);
            }

            if (account != null)
            {
                ViewBag.UserName = account.FullName;
                ViewBag.UserPhone = account.Phone ?? "";
                ViewBag.UserEmail = account.Email;
                ViewBag.UserTier = account.Customer?.Tier?.TierName ?? "Gold Member";
                ViewBag.UserPoints = account.Customer?.PointBalance ?? 1250;
                ViewBag.UserAvatar = !string.IsNullOrEmpty(avatar) ? avatar : (account.GoogleId != null ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200" : "");
            }
            else
            {
                ViewBag.UserName = "Lê Tuấn Kiệt";
                ViewBag.UserPhone = "0901234567";
                ViewBag.UserEmail = "kien.le@example.com";
                ViewBag.UserTier = "Gold Member";
                ViewBag.UserPoints = 1250;
                ViewBag.UserAvatar = "";
            }
        }

        public async Task<IActionResult> Dashboard()
        {
            ViewBag.PageTitle  = "Dashboard";
            ViewBag.ActiveNav  = "dashboard";
            await PopulateUserProfileAsync();
            return View();
        }

        public async Task<IActionResult> Booking()
        {
            ViewBag.PageTitle = "Đặt lịch rửa xe";
            ViewBag.ActiveNav = "booking";
            await PopulateUserProfileAsync();
            return View();
        }

        public async Task<IActionResult> Loyalty()
        {
            ViewBag.PageTitle = "Tích điểm & Ưu đãi";
            ViewBag.ActiveNav = "loyalty";
            await PopulateUserProfileAsync();
            return View();
        }

        public async Task<IActionResult> History()
        {
            ViewBag.PageTitle = "Lịch sử rửa xe";
            ViewBag.ActiveNav = "history";
            await PopulateUserProfileAsync();
            return View();
        }

        public async Task<IActionResult> Profile()
        {
            ViewBag.PageTitle = "Hồ sơ của tôi";
            ViewBag.ActiveNav = "profile";
            await PopulateUserProfileAsync();
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new { success = false, message = "Thông tin không hợp lệ!" });
            }

            try
            {
                // Identify the logged in user using cookies
                string? email = Request.Cookies["UserEmail"];
                string? phone = Request.Cookies["UserPhone"];

                Account? account = null;
                if (!string.IsNullOrEmpty(email))
                {
                    account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
                }
                else if (!string.IsNullOrEmpty(phone))
                {
                    account = await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == phone.Trim());
                }

                if (account == null)
                {
                    // Mock/Fallback: update the first Customer in database if no cookies found
                    account = await _context.Accounts.FirstOrDefaultAsync(a => a.Role == 3);
                }

                if (account == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy tài khoản tương ứng!" });
                }

                // Update only FullName and Phone as requested
                account.FullName = request.FullName.Trim();
                account.Phone = request.Phone?.Trim();

                await _context.SaveChangesAsync();

                // If they updated their phone, let's update their cookie as well
                if (!string.IsNullOrEmpty(account.Phone))
                {
                    Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                        Expires = DateTime.Now.AddDays(7),
                        SameSite = SameSiteMode.Lax
                    });
                }

                return Ok(new { success = true, message = "Cập nhật hồ sơ thành công vào cơ sở dữ liệu!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class UpdateProfileRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
    }
}
