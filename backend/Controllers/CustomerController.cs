using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Booking;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class CustomerController : Controller
    {
        private readonly AutoWashDbContext _context;
        private readonly AuthContextService _authContextService;
        private readonly OtpService _otpService;
        private readonly Auto_Wash.Services.BookingService _bookingService;

        // TODO: Refactor direct DbContext querying in CustomerController actions into a service class.
        public CustomerController(AutoWashDbContext context, 
                                  AuthContextService authContextService, 
                                  OtpService otpService,
                                  Auto_Wash.Services.BookingService bookingService)
        {
            _context = context;
            _authContextService = authContextService;
            _otpService = otpService;
            _bookingService = bookingService;
        }

        [HttpPost]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            if (account == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new { success = false, message = "Thông tin không hợp lệ!" });
            }

            try
            {
                account.FullName = request.FullName.Trim();
                account.Phone = request.Phone?.Trim() ?? string.Empty;

                await _context.SaveChangesAsync();

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
                string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "");

                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    Console.WriteLine("\n==============================================");
                    Console.WriteLine($"[EMAIL OTP SIMULATION] To: {request.Email}");
                    Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
                    Console.WriteLine("==============================================\n");
                }

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {request.Email}!" });
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
                bool otpValid = await _otpService.VerifyOtpAsync(request.Email, request.OtpCode);
                if (!otpValid)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email.Trim());
                if (account == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy tài khoản tương ứng!" });
                }

                account.PasswordHash = PasswordHelper.HashPassword(request.NewPassword.Trim());
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
                    string hashedCurr = PasswordHelper.HashPassword(request.CurrentPassword.Trim());
                    if (account.PasswordHash != hashedCurr)
                    {
                        return BadRequest(new { success = false, message = "Mật khẩu hiện tại không chính xác!" });
                    }
                }

                account.PasswordHash = PasswordHelper.HashPassword(request.NewPassword.Trim());
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Thay đổi mật khẩu thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }



        [HttpGet]
        public async Task<IActionResult> GetVouchers()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var vouchers = await _context.RewardRedemptions
                    .Include(r => r.Reward)
                    .Where(r => r.CustomerId == customer.CustomerId)
                    .OrderByDescending(r => r.RedeemedAt)
                    .Select(r => new
                    {
                        redemptionId = r.RedemptionId,
                        title = r.Reward.RewardName,
                        code = r.Reward.PointCost == 0 ? $"WELCOME10-{customer.CustomerId}" : $"AW-RED-{r.RedemptionId}",
                        rewardType = r.Reward.RewardType,
                        rewardValue = r.Reward.DiscountValue,
                        status = r.Status == "Active" ? 1 : 2, // 1 = Available, 2 = Used
                        redeemedAt = r.RedeemedAt.ToString("dd/MM/yyyy"),
                        expiredAt = r.ExpiresAt.ToString("dd/MM/yyyy")
                    })
                    .ToListAsync();

                return Ok(new { success = true, vouchers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var list = await _context.Notifications
                    .Where(n => n.CustomerId == customer.CustomerId)
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new
                    {
                        id = n.NotificationId.ToString(),
                        title = n.Title,
                        body = n.Message,
                        time = "Vừa xong", // Can map dynamically or use formatted date
                        type = n.Type,
                        read = n.IsRead
                    })
                    .ToListAsync();

                return Ok(new { success = true, notifications = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> MarkNotificationAsRead([FromBody] MarkNotificationRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var notif = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationId == request.Id && n.CustomerId == customer.CustomerId);
                if (notif != null)
                {
                    notif.IsRead = true;
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class MarkNotificationRequest
    {
        public int Id { get; set; }
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
