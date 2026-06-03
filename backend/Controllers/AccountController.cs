using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class AccountController : Controller
    {
        private readonly AutoWashDbContext _context;
        private readonly IConfiguration _configuration;

        public AccountController(AutoWashDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }


        [HttpPost]
        public async Task<IActionResult> Login([FromBody] PhoneLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ thông tin!" });

            try
            {
                var hash = HashPassword(request.Password);
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
            return Redirect("/login");
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

                string? tier = "Member";
                int points = 0;
                var customer = await _context.Customers
                    .Include(c => c.Tier)
                    .FirstOrDefaultAsync(c => c.AccountId == account.AccountId);
                if (customer != null)
                {
                    tier = customer.Tier?.TierName ?? "Member";
                    points = customer.PointBalance;
                }

                HttpContext.Session.SetString("UserRole", "customer");
                HttpContext.Session.SetString("UserName", account.FullName);
                HttpContext.Session.SetString("UserEmail", account.Email);
                HttpContext.Session.SetInt32("AccountId", account.AccountId);

                // Set cookies for returning users
                Response.Cookies.Append("UserEmail", account.Email, new CookieOptions {
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

        private async Task SendRealEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var smtpHost = _configuration["Smtp:Host"] ?? "smtp.gmail.com";
                var smtpPortStr = _configuration["Smtp:Port"] ?? "587";
                int smtpPort = int.TryParse(smtpPortStr, out var port) ? port : 587;
                var smtpUser = _configuration["Smtp:Username"] ?? "";
                var smtpPass = _configuration["Smtp:Password"] ?? "";
                var fromEmail = _configuration["Smtp:FromEmail"] ?? "autowashpro.service@gmail.com";

                if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
                {
                    Console.WriteLine($"[SMTP NOT CONFIG] Email could not be sent to {toEmail} because SMTP is not configured in appsettings.json.");
                    return;
                }

                var message = new MimeKit.MimeMessage();
                message.From.Add(new MimeKit.MailboxAddress("AutoWash Pro Support", fromEmail));
                message.To.Add(new MimeKit.MailboxAddress("", toEmail));
                message.Subject = subject;

                var bodyBuilder = new MimeKit.BodyBuilder
                {
                    HtmlBody = body
                };
                message.Body = bodyBuilder.ToMessageBody();

                using (var client = new MailKit.Net.Smtp.SmtpClient())
                {
                    var socketOption = smtpPort == 465 
                        ? MailKit.Security.SecureSocketOptions.SslOnConnect 
                        : MailKit.Security.SecureSocketOptions.StartTls;

                    await client.ConnectAsync(smtpHost, smtpPort, socketOption);
                    await client.AuthenticateAsync(smtpUser, smtpPass);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);

                    Console.WriteLine($"[SMTP SUCCESS] MailKit successfully dispatched Email OTP to {toEmail}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SMTP ERROR] MailKit failed to send email to {toEmail}: {ex.Message}");
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
                var existingEmail = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());
                if (existingEmail != null)
                {
                    return BadRequest(new { success = false, message = "Email này đã được sử dụng bởi một tài khoản khác!" });
                }

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
                Console.WriteLine($"[REGISTER EMAIL OTP SIMULATION] To: {request.Email}");
                Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
                Console.WriteLine("==============================================\n");

                // Dispatch real Email OTP via SMTP
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

                await SendRealEmailAsync(request.Email.Trim(), subject, body);

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {request.Email}! (Mã mô phỏng: {code})" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Vui lòng điền đầy đủ tất cả các trường và mã OTP!" });
            }

            try
            {
                // Verify OTP first
                var otp = await _context.OtpVerifications
                    .Where(o => o.Email == request.Email.Trim() && o.Code == request.OtpCode.Trim() && !o.IsUsed && o.ExpiresAt > DateTime.Now)
                    .OrderByDescending(o => o.CreatedAt)
                    .FirstOrDefaultAsync();

                if (otp == null)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                var existingEmail = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());
                if (existingEmail != null)
                {
                    return BadRequest(new { success = false, message = "Email này đã được sử dụng bởi một tài khoản khác!" });
                }

                var existingPhone = await _context.Accounts.FirstOrDefaultAsync(a => a.Phone == request.Phone.Trim());
                if (existingPhone != null)
                {
                    return BadRequest(new { success = false, message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
                }

                var account = new Account
                {
                    Email = request.Email.Trim(),
                    FullName = request.FullName.Trim(),
                    Phone = request.Phone.Trim(),
                    PasswordHash = HashPassword(request.Password.Trim()),
                    Role = 3, // 3 = Customer
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };

                _context.Accounts.Add(account);
                otp.IsUsed = true;
                await _context.SaveChangesAsync();

                var customerProfile = new Customer
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

                _context.Customers.Add(customerProfile);
                await _context.SaveChangesAsync();

                Response.Cookies.Append("UserEmail", account.Email, new CookieOptions {
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

    public class PhoneLoginRequest
    {
        public string Identifier { get; set; } = string.Empty;
        public string Password   { get; set; } = string.Empty;
    }

    public class CompleteGoogleSignupRequest
    {
        public string Email    { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string GoogleId { get; set; } = string.Empty;
        public string Phone    { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
    }

    public class SendRegisterOtpRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
