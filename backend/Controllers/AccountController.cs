using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Account;
using Auto_Wash.Helpers;
using Auto_Wash.Data.Entities;

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

        private async Task<object> SetupSessionAndBuildResponseAsync(Account account, bool isNewUser = false)
        {
            var roleStr = account.Role == AccountRole.Admin ? "admin" : account.Role == AccountRole.Staff ? "staff" : "customer";
            HttpContext.Session.SetString("UserRole", roleStr);
            HttpContext.Session.SetString("UserName", account.FullName);
            HttpContext.Session.SetString("UserEmail", account.Email ?? "");
            HttpContext.Session.SetInt32("AccountId", account.AccountId);

            string? tier = null;
            int? points = null;
            int? customerId = null;

            if (account.Role == AccountRole.Customer)
            {
                var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                if (customer != null)
                {
                    customerId = customer.CustomerId;
                    tier = customer.Tier?.TierName;
                    points = customer.PointBalance;
                    HttpContext.Session.SetInt32("CustomerId", customer.CustomerId);
                }
            }

            return new
            {
                success = true,
                isNewUser = isNewUser,
                role = roleStr,
                accountId = account.AccountId,
                customerId = customerId,
                fullName = account.FullName,
                name = account.FullName, // backward compatibility
                email = account.Email,
                phone = account.Phone,
                tier = tier ?? "Member",
                points = points ?? 0
            };
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

                var responseObj = await SetupSessionAndBuildResponseAsync(account);
                return Ok(responseObj);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [HttpPost]
        [Route("Account/Logout")]
        [Route("api/account/logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            Response.Cookies.Delete("UserEmail");
            Response.Cookies.Delete("UserPhone");
            Response.Cookies.Delete("UserAvatar");
            return Ok(new { success = true });
        }

        [HttpGet]
        [Route("Account/Me")]
        [Route("api/account/me")]
        public async Task<IActionResult> Me()
        {
            var accountId = HttpContext.Session.GetInt32("AccountId");
            if (accountId == null)
            {
                return Ok(new { isAuthenticated = false });
            }

            var account = await _accountService.GetAccountByIdAsync(accountId.Value);
            if (account == null || !account.IsActive)
            {
                HttpContext.Session.Clear();
                return Ok(new { isAuthenticated = false });
            }

            var roleStr = account.Role == AccountRole.Admin ? "admin" : account.Role == AccountRole.Staff ? "staff" : "customer";

            string? tier = null;
            int? points = null;
            int? customerId = null;

            if (account.Role == AccountRole.Customer)
            {
                var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                if (customer != null)
                {
                    customerId = customer.CustomerId;
                    tier = customer.Tier?.TierName;
                    points = customer.PointBalance;
                }
            }

            return Ok(new
            {
                isAuthenticated = true,
                accountId = account.AccountId,
                email = account.Email,
                role = roleStr,
                customerId = customerId,
                fullName = account.FullName,
                phone = account.Phone,
                tier = tier ?? "Member",
                points = points ?? 0
            });
        }

        [HttpPost]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.GoogleId))
            {
                return BadRequest(new { success = false, message = "Dữ liệu đăng nhập Google không hợp lệ!" });
            }

            try
            {
                // 1. Try to find the account by Google ID first
                var account = await _accountService.FindByGoogleIdAsync(request.GoogleId);

                if (account == null)
                {
                    // 2. If not found by Google ID, find by Email
                    account = await _accountService.FindByEmailAsync(request.Email);
                }

                if (account == null)
                {
                    // New user: must complete profile
                    return Ok(new { success = true, isNewUser = true });
                }

                // 3. Security check: is the account active?
                if (!account.IsActive)
                {
                    return BadRequest(new { success = false, message = "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động!" });
                }

                // 4. If email matches but Google ID is not linked, attempt to link it
                if (string.IsNullOrEmpty(account.GoogleId))
                {
                    await _accountService.UpdateGoogleIdAsync(account, request.GoogleId);
                }
                else if (account.GoogleId != request.GoogleId.Trim())
                {
                    return BadRequest(new { success = false, message = "Tài khoản này đã được liên kết với một tài khoản Google khác!" });
                }

                // 5. If phone is missing, prompt profile completion
                if (string.IsNullOrEmpty(account.Phone))
                {
                    return Ok(new { success = true, isNewUser = true });
                }

                var responseObj = await SetupSessionAndBuildResponseAsync(account);
                return Ok(responseObj);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CompleteGoogleSignup([FromBody] CompleteGoogleSignupRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.GoogleId))
            {
                return BadRequest(new { success = false, message = "Dữ liệu hoàn thành đăng ký không hợp lệ!" });
            }

            try
            {
                // Validate phone is not already in use
                var existingPhone = await _accountService.FindByPhoneAsync(request.Phone);
                if (existingPhone != null)
                {
                    return BadRequest(new { success = false, message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
                }

                // Validate GoogleId is not already linked to another account
                var existingGoogle = await _accountService.FindByGoogleIdAsync(request.GoogleId);
                if (existingGoogle != null && existingGoogle.Email != request.Email.Trim())
                {
                    return BadRequest(new { success = false, message = "Tài khoản Google này đã được liên kết với một tài khoản khác!" });
                }

                var account = await _accountService.CompleteGoogleSignupAsync(request);
                var responseObj = await SetupSessionAndBuildResponseAsync(account);
                return Ok(responseObj);
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

                string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "Register");

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
                bool otpValid = await _otpService.VerifyOtpAsync(request.Email, request.OtpCode, "Register");
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
                var responseObj = await SetupSessionAndBuildResponseAsync(account);
                return Ok(responseObj);
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
