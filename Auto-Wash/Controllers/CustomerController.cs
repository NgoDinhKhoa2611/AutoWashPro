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
                ViewBag.IsGoogleAccount = (account.GoogleId != null || string.IsNullOrEmpty(account.PasswordHash));
            }
            else
            {
                ViewBag.UserName = "Lê Tuấn Kiệt";
                ViewBag.UserPhone = "0901234567";
                ViewBag.UserEmail = "kien.le@example.com";
                ViewBag.UserTier = "Gold Member";
                ViewBag.UserPoints = 1250;
                ViewBag.UserAvatar = "";
                ViewBag.IsGoogleAccount = false;
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

        [HttpPost]
        public async Task<IActionResult> SendEmailOtp([FromBody] SendEmailOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email không hợp lệ!" });
            }

            try
            {
                var rnd = new Random();
                string code = rnd.Next(100000, 999999).ToString();

                var otp = new OtpVerification
                {
                    Email = request.Email.Trim(),
                    Phone = "",
                    Code = code,
                    ExpiresAt = DateTime.Now.AddMinutes(5),
                    IsUsed = false,
                    CreatedAt = DateTime.Now
                };

                _context.OtpVerifications.Add(otp);
                await _context.SaveChangesAsync();

                Console.WriteLine("\n==============================================");
                Console.WriteLine($"[EMAIL OTP SIMULATION] To: {request.Email}");
                Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
                Console.WriteLine("==============================================\n");

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {request.Email}! (Mã mô phỏng: {code})" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> VerifyEmailAndChangePassword([FromBody] VerifyEmailAndChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.OtpCode) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ!" });
            }

            try
            {
                var otp = await _context.OtpVerifications
                    .Where(o => o.Email == request.Email.Trim() && o.Code == request.OtpCode.Trim() && !o.IsUsed && o.ExpiresAt > DateTime.Now)
                    .OrderByDescending(o => o.CreatedAt)
                    .FirstOrDefaultAsync();

                if (otp == null)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());
                if (account == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy tài khoản tương ứng!" });
                }

                account.PasswordHash = HashPassword(request.NewPassword.Trim());
                otp.IsUsed = true;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Thay đổi mật khẩu thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ChangePasswordWithPhoneOtp([FromBody] ChangePasswordWithPhoneOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ!" });
            }

            try
            {
                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == request.Phone.Trim());
                if (account == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy tài khoản tương ứng!" });
                }

                if (!string.IsNullOrEmpty(request.CurrentPassword))
                {
                    string hashedCurr = HashPassword(request.CurrentPassword.Trim());
                    if (account.PasswordHash != hashedCurr && account.PasswordHash != request.CurrentPassword.Trim())
                    {
                        return BadRequest(new { success = false, message = "Mật khẩu hiện tại không chính xác!" });
                    }
                }

                account.PasswordHash = HashPassword(request.NewPassword.Trim());
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Thay đổi mật khẩu thành công!" });
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

    public class UpdateProfileRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
    }

    public class SendEmailOtpRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyEmailAndChangePasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordWithPhoneOtpRequest
    {
        public string Phone { get; set; } = string.Empty;
        public string? CurrentPassword { get; set; }
        public string NewPassword { get; set; } = string.Empty;
    }
}
