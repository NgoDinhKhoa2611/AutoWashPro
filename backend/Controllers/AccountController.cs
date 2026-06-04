using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Account;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class AccountController : Controller
    {
        private readonly AccountService _accountService;
        private readonly OtpService _otpService;

        public AccountController(AccountService accountService, OtpService otpService)
        {
            _accountService = accountService;
            _otpService = otpService;
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ thông tin!" });

            try
            {
                var account = await _accountService.AuthenticateAsync(request.Identifier, request.Password);
                if (account == null)
                    return Ok(new { success = false, message = "Tài khoản hoặc mật khẩu không đúng!" });

                var roleStr = account.Role == 1 ? "admin" : account.Role == 2 ? "staff" : "customer";
                HttpContext.Session.SetString("UserRole", roleStr);
                HttpContext.Session.SetString("UserName", account.FullName);
                HttpContext.Session.SetString("UserEmail", account.Email ?? "");
                HttpContext.Session.SetInt32("AccountId", account.AccountId);

                string? tier = null;
                int? points = null;
                if (account.Role == 3)
                {
                    var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                    if (customer != null)
                    {
                        tier = customer.Tier?.TierName;
                        points = customer.PointBalance;
                    }
                }

                // Ghi cookies cho an toàn
                if (!string.IsNullOrEmpty(account.Email))
                {
                    Response.Cookies.Append("UserEmail", account.Email, new CookieOptions {
                        Expires = DateTime.Now.AddDays(7),
                        SameSite = SameSiteMode.Lax
                    });
                }
                if (!string.IsNullOrEmpty(account.Phone))
                {
                    Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                        Expires = DateTime.Now.AddDays(7),
                        SameSite = SameSiteMode.Lax
                    });
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
            Response.Cookies.Delete("UserEmail");
            Response.Cookies.Delete("UserPhone");
            return Redirect("/login");
        }

        [HttpPost]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email không hợp lệ!" });
            }

            try
            {
                var account = await _accountService.FindByEmailAsync(request.Email);

                if (account == null)
                {
                    return Ok(new { success = true, isNewUser = true });
                }
                else
                {
                    if (string.IsNullOrEmpty(account.Phone))
                    {
                        return Ok(new { success = true, isNewUser = true });
                    }

                    if (string.IsNullOrEmpty(account.GoogleId))
                    {
                        await _accountService.UpdateGoogleIdAsync(account, request.GoogleId);
                    }
                    else if (account.GoogleId != request.GoogleId.Trim())
                    {
                        return BadRequest(new { success = false, message = "Tài khoản này đã được liên kết với một tài khoản Google khác!" });
                    }
                }

                string? tier = "Member";
                int points = 0;
                var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                if (customer != null)
                {
                    tier = customer.Tier?.TierName ?? "Member";
                    points = customer.PointBalance;
                }

                HttpContext.Session.SetString("UserRole", "customer");
                HttpContext.Session.SetString("UserName", account.FullName);
                HttpContext.Session.SetString("UserEmail", account.Email ?? "");
                HttpContext.Session.SetInt32("AccountId", account.AccountId);

                Response.Cookies.Append("UserEmail", account.Email ?? "", new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });
                Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });

                return Ok(new {
                    success = true,
                    isNewUser = false,
                    role = "customer",
                    name = account.FullName,
                    email = account.Email,
                    phone = account.Phone,
                    tier = tier,
                    points = points
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CompleteGoogleSignup([FromBody] CompleteGoogleSignupRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, message = "Dữ liệu hoàn thành đăng ký không hợp lệ!" });
            }

            try
            {
                var existingPhone = await _accountService.FindByPhoneAsync(request.Phone);
                if (existingPhone != null)
                {
                    return BadRequest(new { success = false, message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
                }

                var account = await _accountService.CompleteGoogleSignupAsync(request);

                Response.Cookies.Append("UserEmail", account.Email ?? "", new CookieOptions {
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

        [HttpPost]
        public async Task<IActionResult> SendRegisterOtp([FromBody] SendRegisterOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Email không hợp lệ!" });
            }

            try
            {
                var existingEmail = await _accountService.FindByEmailAsync(request.Email);
                if (existingEmail != null)
                {
                    return BadRequest(new { success = false, message = "Email này đã được sử dụng bởi một tài khoản khác!" });
                }

                string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "");

                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    Console.WriteLine("\n==============================================");
                    Console.WriteLine($"[REGISTER EMAIL OTP SIMULATION] To: {request.Email}");
                    Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
                    Console.WriteLine("==============================================\n");
                }

                string subject = "AutoWash Pro - Xác thực đăng ký tài khoản";
                string body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;'>
                        <div style='text-align: center; margin-bottom: 20px;'>
                            <h2 style='color: #0f172a; margin: 0;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                            <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Hệ Thống Quản Lý Rửa Xe Thông Minh</p>
                        </div>
                        <hr style='border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;' />
                        <p style='color: #334155;'>Xin chào,</p>
                        <p style='color: #334155;'>Bạn đang thực hiện đăng ký tài khoản mới tại AutoWash Pro.</p>
                        <p style='color: #334155;'>Vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây để hoàn tất thủ tục:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <span style='font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #06b6d4; background-color: #0f172a; padding: 10px 25px; border-radius: 8px; display: inline-block;'>{code}</span>
                        </div>
                        <p style='color: #64748b; font-size: 0.8rem; text-align: center;'>Mã OTP này có giá trị trong vòng 5 phút và chỉ được sử dụng một lần. Vui lòng không cung cấp mã này cho bất kỳ ai.</p>
                        <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
                        <p style='font-size: 0.8rem; color: #64748b; text-align: center;'>Đây là email tự động từ hệ thống AutoWash Pro. Vui lòng không trả lời email này.</p>
                    </div>";

                await _otpService.SendEmailOtpAsync(request.Email.Trim(), subject, body);

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {request.Email}!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ tất cả các trường và mã OTP!" });
            }

            try
            {
                bool otpValid = await _otpService.VerifyOtpAsync(request.Email, request.OtpCode);
                if (!otpValid)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                var existingEmail = await _accountService.FindByEmailAsync(request.Email);
                if (existingEmail != null)
                {
                    return BadRequest(new { success = false, message = "Email này đã được sử dụng bởi một tài khoản khác!" });
                }

                var existingPhone = await _accountService.FindByPhoneAsync(request.Phone);
                if (existingPhone != null)
                {
                    return BadRequest(new { success = false, message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
                }

                var account = await _accountService.RegisterAccountAsync(request);

                Response.Cookies.Append("UserEmail", account.Email ?? "", new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });
                Response.Cookies.Append("UserPhone", account.Phone, new CookieOptions {
                    Expires = DateTime.Now.AddDays(7),
                    SameSite = SameSiteMode.Lax
                });

                return Ok(new
                {
                    success = true,
                    role = "customer",
                    name = account.FullName,
                    email = account.Email,
                    phone = account.Phone,
                    tier = "Member",
                    points = 0
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class SendRegisterOtpRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
