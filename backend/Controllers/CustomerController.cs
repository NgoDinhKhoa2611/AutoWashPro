using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Services;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class CustomerController : Controller
    {
        private readonly CustomerService _customerService;
        private readonly AuthContextService _authContextService;
        private readonly OtpService _otpService;

        public CustomerController(CustomerService customerService, 
                                  AuthContextService authContextService, 
                                  OtpService otpService)
        {
            _customerService = customerService;
            _authContextService = authContextService;
            _otpService = otpService;
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

            if (!string.IsNullOrWhiteSpace(request.Phone) && !PhoneHelper.IsValidVietnamesePhone(request.Phone))
            {
                return BadRequest(new { success = false, message = "Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678)!" });
            }

            try
            {
                bool success = await _customerService.UpdateProfileAsync(account.AccountId, request.FullName, request.Phone);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy tài khoản!" });
                }

                return Ok(new { success = true, message = "Cập nhật hồ sơ thành công!" });
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
                string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "ForgotPassword");

                string subject = "AutoWash OTP Verification";
                string body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'>
                        <div style='text-align: center; margin-bottom: 25px;'>
                            <h2 style='color: #0f172a; margin: 0; font-size: 1.5rem; font-weight: 700;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                            <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Smart Car Wash Solutions</p>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center;'>
                            <p style='color: #334155; font-size: 1rem; margin-bottom: 20px;'>Your OTP code is: <strong style='color: #06b6d4; font-size: 1.15rem;'>{code}</strong>. This code expires in 5 minutes.</p>
                            <div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; display: inline-block; font-size: 1.75rem; font-weight: 700; letter-spacing: 6px; color: #0f172a; margin-bottom: 20px;'>
                                {code}
                            </div>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 25px;'>
                            <p style='font-size: 0.75rem; color: #94a3b8; margin: 0;'>This is an automated verification email. Please do not reply.</p>
                        </div>
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
        public async Task<IActionResult> VerifyEmailAndChangePassword([FromBody] VerifyEmailAndChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.OtpCode) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ!" });
            }

            try
            {
                var result = await _customerService.VerifyEmailAndChangePasswordAsync(request.Email, request.OtpCode, request.CurrentPassword ?? "", request.NewPassword, _otpService);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message });
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
                var vouchers = await _customerService.GetVouchersAsync(customer.CustomerId);
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
                var list = await _customerService.GetNotificationsAsync(customer.CustomerId);
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
                await _customerService.MarkNotificationAsReadAsync(customer.CustomerId, request.Id);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetRewards()
        {
            try
            {
                var rewards = await _customerService.GetRewardsAsync();
                return Ok(new { success = true, rewards });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> RedeemReward([FromBody] RedeemRewardRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            if (request == null || request.RewardId <= 0)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ!" });
            }

            try
            {
                var result = await _customerService.RedeemRewardAsync(customer.CustomerId, request.RewardId);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class RedeemRewardRequest
    {
        public int RewardId { get; set; }
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
        public string? CurrentPassword { get; set; }
        public string NewPassword { get; set; } = string.Empty;
    }
}
