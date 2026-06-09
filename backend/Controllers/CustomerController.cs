using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Services;

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

                string subject = "AutoWash Pro - Xác thực đổi mật khẩu";
                string body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;'>
                <div style='text-align: center; margin-bottom: 20px;'>
                    <h2 style='color: #0f172a; margin: 0;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                    <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Hệ Thống Quản Lý Rửa Xe Thông Minh</p>
                </div>

                <hr style='border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;' />

                <p style='color: #334155;'>Xin chào,</p>
                <p style='color: #334155;'>Bạn đang thực hiện đổi mật khẩu tại AutoWash Pro.</p>
                <p style='color: #334155;'>Vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây để hoàn tất thủ tục:</p>

                <div style='text-align: center; margin: 30px 0;'>
                    <span style='font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #06b6d4; background-color: #0f172a; padding: 10px 25px; border-radius: 8px; display: inline-block;'>{code}</span>
                </div>

                <p style='color: #64748b; font-size: 0.8rem; text-align: center;'>
                    Mã OTP này có giá trị trong vòng 5 phút và chỉ được sử dụng một lần. Vui lòng không cung cấp mã này cho bất kỳ ai.
                </p>

                <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
                <p style='font-size: 0.8rem; color: #64748b; text-align: center;'>
                    Đây là email tự động từ hệ thống AutoWash Pro. Vui lòng không trả lời email này.
                </p>
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
