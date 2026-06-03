using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    public class CustomerController : Controller
    {
        private readonly AutoWashDbContext _context;
        private readonly IConfiguration _configuration;

        public CustomerController(AutoWashDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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

        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            string? email = Request.Cookies["UserEmail"];
            string? phone = Request.Cookies["UserPhone"];

            Account? account = null;
            if (!string.IsNullOrEmpty(email))
            {
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .FirstOrDefaultAsync(a => a.Email == email.Trim());
            }
            else if (!string.IsNullOrEmpty(phone))
            {
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .FirstOrDefaultAsync(a => a.Phone == phone.Trim());
            }

            if (account == null)
            {
                // Fallback to first customer
                account = await _context.Accounts
                    .Include(a => a.Customer)
                    .FirstOrDefaultAsync(a => a.Role == 3);
            }

            if (account == null || account.Customer == null)
            {
                return BadRequest(new { success = false, message = "Không tìm thấy khách hàng!" });
            }

            var list = await _context.Vehicles
                .Where(v => v.CustomerId == account.Customer.CustomerId)
                .Select(v => new {
                    plate = v.LicensePlate,
                    type = v.Name ?? v.Brand ?? "Xe ga"
                })
                .ToListAsync();

            return Ok(new { success = true, vehicles = list });
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
        public async Task<IActionResult> SendVehicleOtp([FromBody] SendVehicleOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Thông tin không hợp lệ!" });
            }

            if (!IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            var exists = await _context.Vehicles.AnyAsync(v => v.LicensePlate == request.LicensePlate.Trim());
            if (exists)
            {
                return BadRequest(new { success = false, message = "Biển số xe này đã được đăng ký trên hệ thống!" });
            }

            var email = Request.Cookies["UserEmail"] ?? "kien.le@example.com";
            var phone = Request.Cookies["UserPhone"] ?? "";

            var rnd = new Random();
            string code = rnd.Next(100000, 999999).ToString();

            var otp = new OtpVerification
            {
                Email = email,
                Phone = phone,
                Code = code,
                ExpiresAt = DateTime.Now.AddMinutes(5),
                IsUsed = false,
                CreatedAt = DateTime.Now
            };

            _context.OtpVerifications.Add(otp);
            await _context.SaveChangesAsync();

            Console.WriteLine("\n==============================================");
            Console.WriteLine($"[VEHICLE ADD OTP SIMULATION] Plate: {request.LicensePlate}");
            Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
            Console.WriteLine("==============================================\n");

            // Dispatch real Email OTP via SMTP
            string subject = "AutoWash Pro - Xác thực đăng ký phương tiện";
            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;'>
                    <div style='text-align: center; margin-bottom: 20px;'>
                        <h2 style='color: #0f172a; margin: 0;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                        <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Hệ Thống Quản Lý Rửa Xe Thông Minh</p>
                    </div>
                    <hr style='border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;' />
                    <p style='color: #334155;'>Xin chào khách hàng,</p>
                    <p style='color: #334155;'>Bạn đang thực hiện đăng ký biển số xe mới <strong>{request.LicensePlate.ToUpper()}</strong> vào tài khoản cá nhân tại hệ thống AutoWash Pro.</p>
                    <p style='color: #334155;'>Vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây để hoàn tất thủ tục:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <span style='font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #06b6d4; background-color: #0f172a; padding: 10px 25px; border-radius: 8px; display: inline-block;'>{code}</span>
                    </div>
                    <p style='color: #64748b; font-size: 0.8rem; text-align: center;'>Mã OTP này có giá trị trong vòng 5 phút và chỉ được sử dụng một lần. Vui lòng không cung cấp mã này cho bất kỳ ai.</p>
                    <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
                    <p style='font-size: 0.8rem; color: #64748b; text-align: center;'>Đây là email tự động từ hệ thống AutoWash Pro. Vui lòng không trả lời email này.</p>
                </div>";

            await SendRealEmailAsync(email, subject, body);

            return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {email}! (Mã mô phỏng: {code})" });
        }

        [HttpPost]
        public async Task<IActionResult> VerifyVehicleOtpAndSave([FromBody] VerifyVehicleOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ!" });
            }

            if (!IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            var email = Request.Cookies["UserEmail"] ?? "kien.le@example.com";
            var otp = await _context.OtpVerifications
                .Where(o => o.Email == email && o.Code == request.OtpCode.Trim() && !o.IsUsed && o.ExpiresAt > DateTime.Now)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otp == null)
            {
                return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
            }

            var phone = Request.Cookies["UserPhone"];
            Account? account = null;
            if (!string.IsNullOrEmpty(email))
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Email == email.Trim());
            }
            else if (!string.IsNullOrEmpty(phone))
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Phone == phone.Trim());
            }

            if (account == null)
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Role == 3);
            }

            if (account == null || account.Customer == null)
            {
                return BadRequest(new { success = false, message = "Không tìm thấy thông tin khách hàng tương ứng!" });
            }

            var exists = await _context.Vehicles.AnyAsync(v => v.LicensePlate == request.LicensePlate.Trim());
            if (exists)
            {
                return BadRequest(new { success = false, message = "Biển số xe này đã được đăng ký trên hệ thống!" });
            }

            var vehicle = new Vehicle
            {
                CustomerId = account.Customer.CustomerId,
                LicensePlate = request.LicensePlate.Trim().ToUpper(),
                Brand = request.Type?.Trim() ?? "Honda",
                Name = request.Type?.Trim() ?? "Xe ga",
                RegisteredAt = DateTime.Now
            };

            _context.Vehicles.Add(vehicle);
            otp.IsUsed = true;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đăng ký phương tiện thành công!" });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteVehicle([FromBody] DeleteVehicleRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Thông tin không hợp lệ!" });
            }

            var email = Request.Cookies["UserEmail"];
            var phone = Request.Cookies["UserPhone"];
            Account? account = null;
            if (!string.IsNullOrEmpty(email))
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Email == email.Trim());
            }
            else if (!string.IsNullOrEmpty(phone))
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Phone == phone.Trim());
            }

            if (account == null)
            {
                account = await _context.Accounts.Include(a => a.Customer).FirstOrDefaultAsync(a => a.Role == 3);
            }

            if (account == null || account.Customer == null)
            {
                return BadRequest(new { success = false, message = "Không tìm thấy khách hàng!" });
            }

            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == account.Customer.CustomerId && v.LicensePlate == request.LicensePlate.Trim());

            if (vehicle == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy phương tiện tương ứng của bạn!" });
            }

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Xoá phương tiện thành công!" });
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

        private bool IsValidVietnameseLicensePlate(string? licensePlate)
        {
            if (string.IsNullOrWhiteSpace(licensePlate)) return false;

            // Normalize: remove space, dash, dot, and convert to uppercase
            string cleanPlate = licensePlate.Replace(" ", "").Replace("-", "").Replace(".", "").Trim().ToUpper();

            // Match format XXA12345 (3 alphanumeric characters + 5 digits)
            var match = System.Text.RegularExpressions.Regex.Match(cleanPlate, @"^([A-Z0-9]{3})(\d{5})$");
            if (!match.Success) return false;

            string prefix = match.Groups[1].Value;
            if (prefix.Length < 2) return false;

            string provinceCode = prefix.Substring(0, 2);
            var validProvinces = new System.Collections.Generic.HashSet<string>
            {
                "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "40", "41", "43", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "88", "89", "90", "92", "93", "94", "95", "97", "98", "99"
            };

            return validProvinces.Contains(provinceCode);
        }

        [HttpGet]
        public async Task<IActionResult> GetServices()
        {
            try
            {
                var services = await _context.Services
                    .Where(s => s.IsActive)
                    .Select(s => new
                    {
                        id = s.ServiceId.ToString(),
                        name = s.ServiceName,
                        desc = s.Description ?? "",
                        category = s.Category == 1 ? "Rửa xe cơ bản" : s.Category == 2 ? "Rửa xe cao cấp" : s.Category == 3 ? "Rửa xe cao cấp" : "Dịch vụ đi kèm",
                        price = s.BasePrice,
                        estimatedMinutes = s.EstimatedMinutes,
                        isActive = s.IsActive,
                        isFeatured = s.IsFeatured
                    })
                    .ToListAsync();

                return Ok(new { success = true, services });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.MainServiceName))
            {
                return BadRequest(new { success = false, message = "Thông tin đặt lịch không hợp lệ!" });
            }

            try
            {
                int? accountId = HttpContext.Session.GetInt32("AccountId");
                Account? account = null;
                if (accountId.HasValue)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .ThenInclude(c => c!.Tier)
                        .FirstOrDefaultAsync(a => a.AccountId == accountId.Value);
                }

                if (account == null)
                {
                    string? email = Request.Cookies["UserEmail"];
                    string? phone = Request.Cookies["UserPhone"];
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
                }

                if (account == null)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .ThenInclude(c => c!.Tier)
                        .FirstOrDefaultAsync(a => a.Role == 3);
                }

                if (account == null || account.Customer == null)
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy khách hàng!" });
                }

                var normPlate = request.LicensePlate.Replace("-", "").Replace(" ", "").ToUpper();
                var vehicle = await _context.Vehicles
                    .FirstOrDefaultAsync(v => v.CustomerId == account.Customer.CustomerId 
                                           && v.LicensePlate.Replace("-", "").Replace(" ", "").ToUpper() == normPlate);
                if (vehicle == null)
                {
                    vehicle = new Vehicle
                    {
                        CustomerId = account.Customer.CustomerId,
                        LicensePlate = request.LicensePlate.Trim().ToUpper(),
                        Brand = "Honda",
                        Name = "Xe ga",
                        RegisteredAt = DateTime.Now
                    };
                    _context.Vehicles.Add(vehicle);
                    await _context.SaveChangesAsync();
                }

                var mainService = await _context.Services
                    .FirstOrDefaultAsync(s => s.ServiceName == request.MainServiceName.Trim() && !s.IsAddOn);
                if (mainService == null)
                {
                    mainService = await _context.Services.FirstOrDefaultAsync(s => !s.IsAddOn);
                }

                var addonsList = new List<Service>();
                if (request.AddonServiceNames != null)
                {
                    foreach (var addonName in request.AddonServiceNames)
                    {
                        var addon = await _context.Services
                            .FirstOrDefaultAsync(s => s.ServiceName == addonName.Trim() && s.IsAddOn);
                        if (addon != null)
                        {
                            addonsList.Add(addon);
                        }
                    }
                }

                if (!DateTime.TryParse($"{request.BookingDate} {request.BookingTime}", out var scheduledAt))
                {
                    scheduledAt = DateTime.Now.AddDays(1);
                }

                int basePrice = (mainService?.BasePrice ?? 0) + addonsList.Sum(a => a.BasePrice);

                var booking = new Booking
                {
                    CustomerId = account.Customer.CustomerId,
                    VehicleId = vehicle.VehicleId,
                    ScheduledAt = scheduledAt,
                    Status = 1, // 1 = Booked/Pending
                    BasePrice = basePrice,
                    FinalPrice = request.FinalPrice,
                    PointsEarned = request.PointsEarned,
                    Notes = request.Notes,
                    CreatedAt = DateTime.Now
                };
                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                if (mainService != null)
                {
                    _context.BookingServices.Add(new BookingService
                    {
                        BookingId = booking.BookingId,
                        ServiceId = mainService.ServiceId,
                        PriceSnapshot = mainService.BasePrice
                    });
                }
                foreach (var addon in addonsList)
                {
                    _context.BookingServices.Add(new BookingService
                    {
                        BookingId = booking.BookingId,
                        ServiceId = addon.ServiceId,
                        PriceSnapshot = addon.BasePrice
                    });
                }
                await _context.SaveChangesAsync();



                return Ok(new { success = true, bookingId = booking.BookingId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetWashHistory()
        {
            try
            {
                int? accountId = HttpContext.Session.GetInt32("AccountId");
                Account? account = null;
                if (accountId.HasValue)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .FirstOrDefaultAsync(a => a.AccountId == accountId.Value);
                }

                if (account == null)
                {
                    string? email = Request.Cookies["UserEmail"];
                    string? phone = Request.Cookies["UserPhone"];
                    if (!string.IsNullOrEmpty(email))
                    {
                        account = await _context.Accounts
                            .Include(a => a.Customer)
                            .FirstOrDefaultAsync(a => a.Email == email.Trim());
                    }
                    else if (!string.IsNullOrEmpty(phone))
                    {
                        account = await _context.Accounts
                            .Include(a => a.Customer)
                            .FirstOrDefaultAsync(a => a.Phone == phone.Trim());
                    }
                }

                if (account == null)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .FirstOrDefaultAsync(a => a.Role == 3);
                }

                if (account == null || account.Customer == null)
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy khách hàng!" });
                }

                var bookings = await _context.Bookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.BookingServices)
                        .ThenInclude(bs => bs.Service)
                    .Where(b => b.CustomerId == account.Customer.CustomerId)
                    .OrderByDescending(b => b.ScheduledAt)
                    .Select(b => new
                    {
                        id = b.BookingId.ToString(),
                        vehicle = b.Vehicle.LicensePlate,
                        mainService = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Rửa xe",
                        addons = b.BookingServices.Where(bs => bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).ToList(),
                        status = b.Status == 4 ? "Completed" : b.Status == 1 ? "Booked" : b.Status == 2 ? "Confirmed" : "In Progress",
                        bookingDate = b.ScheduledAt.ToString("yyyy-MM-dd"),
                        bookingTime = b.ScheduledAt.ToString("HH:mm"),
                        price = b.FinalPrice,
                        points = b.PointsEarned
                    })
                    .ToListAsync();

                return Ok(new { success = true, history = bookings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveBooking()
        {
            try
            {
                int? accountId = HttpContext.Session.GetInt32("AccountId");
                Account? account = null;
                if (accountId.HasValue)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .FirstOrDefaultAsync(a => a.AccountId == accountId.Value);
                }

                if (account == null)
                {
                    string? email = Request.Cookies["UserEmail"];
                    string? phone = Request.Cookies["UserPhone"];
                    if (!string.IsNullOrEmpty(email))
                    {
                        account = await _context.Accounts
                            .Include(a => a.Customer)
                            .FirstOrDefaultAsync(a => a.Email == email.Trim());
                    }
                    else if (!string.IsNullOrEmpty(phone))
                    {
                        account = await _context.Accounts
                            .Include(a => a.Customer)
                            .FirstOrDefaultAsync(a => a.Phone == phone.Trim());
                    }
                }

                if (account == null)
                {
                    account = await _context.Accounts
                        .Include(a => a.Customer)
                        .FirstOrDefaultAsync(a => a.Role == 3);
                }

                if (account == null || account.Customer == null)
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy khách hàng!" });
                }

                var activeBooking = await _context.Bookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.BookingServices)
                        .ThenInclude(bs => bs.Service)
                    .Include(b => b.Queues)
                    .Where(b => b.CustomerId == account.Customer.CustomerId && b.Status < 4)
                    .OrderBy(b => b.ScheduledAt)
                    .FirstOrDefaultAsync();

                if (activeBooking == null)
                {
                    return Ok(new { success = true, booking = (object?)null });
                }

                var mainSvcName = activeBooking.BookingServices
                    .Where(bs => !bs.Service.IsAddOn)
                    .Select(bs => bs.Service.ServiceName)
                    .FirstOrDefault() ?? "Rửa xe";
                var addons = activeBooking.BookingServices
                    .Where(bs => bs.Service.IsAddOn)
                    .Select(bs => bs.Service.ServiceName)
                    .ToList();

                var queue = activeBooking.Queues.FirstOrDefault();
                bool hasQueue = queue != null;
                string queueStatus = queue?.Status ?? "Waiting";

                int washStep = hasQueue ? 0 : -1;
                int addonsCount = addons.Count;
                if (hasQueue)
                {
                    if (queueStatus == "Waiting") washStep = 0;
                    else if (queueStatus == "LPR_Scan") washStep = 1;
                    else if (queueStatus == "Washing") washStep = 2;
                    else if (queueStatus == "Addon_Processing") washStep = 2 + (addonsCount > 0 ? 1 : 0);
                    else if (queueStatus == "Drying") washStep = 2 + addonsCount;
                    else if (queueStatus == "Completed") washStep = 3 + addonsCount;
                }

                var bookingData = new
                {
                    id = activeBooking.BookingId.ToString(),
                    vehicle = activeBooking.Vehicle.LicensePlate,
                    mainService = mainSvcName,
                    addons = addons,
                    status = queueStatus == "Completed" ? "Completed" : "Booked",
                    bookingDate = activeBooking.ScheduledAt.ToString("yyyy-MM-dd"),
                    bookingTime = activeBooking.ScheduledAt.ToString("HH:mm"),
                    price = activeBooking.FinalPrice,
                    points = activeBooking.PointsEarned,
                    hasQueue = hasQueue
                };

                return Ok(new { success = true, booking = bookingData, queueStatus, washStep });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class CreateBookingRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string MainServiceName { get; set; } = string.Empty;
        public List<string> AddonServiceNames { get; set; } = new();
        public string BookingDate { get; set; } = string.Empty;
        public string BookingTime { get; set; } = string.Empty;
        public int FinalPrice { get; set; }
        public int PointsEarned { get; set; }
        public string? Notes { get; set; }
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

    public class SendVehicleOtpRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
    }

    public class VerifyVehicleOtpRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
    }

    public class DeleteVehicleRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
    }
}
