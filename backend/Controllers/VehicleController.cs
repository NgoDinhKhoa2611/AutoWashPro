using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Vehicle;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class VehicleController : Controller
    {
        private readonly VehicleService _vehicleService;
        private readonly AuthContextService _authContextService;
        private readonly OtpService _otpService;

        public VehicleController(VehicleService vehicleService, AuthContextService authContextService, OtpService otpService)
        {
            _vehicleService = vehicleService;
            _authContextService = authContextService;
            _otpService = otpService;
        }

        [HttpGet]
        [Route("Customer/GetVehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để xem danh sách phương tiện!" });
            }

            try
            {
                var list = await _vehicleService.GetCustomerVehiclesAsync(customer.CustomerId);
                return Ok(new { success = true, vehicles = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Customer/SendVehicleOtp")]
        public async Task<IActionResult> SendVehicleOtp([FromBody] CreateVehicleDto request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (account == null || customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để đăng ký phương tiện!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không được để trống!" });
            }

            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                bool exists = await _vehicleService.IsPlateRegisteredAsync(request.LicensePlate);
                if (exists)
                {
                    return BadRequest(new { success = false, message = "Biển số xe này đã được đăng ký trên hệ thống!" });
                }

                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email của tài khoản để nhận mã OTP!" });
                }

                string code = await _vehicleService.SendVehicleOtpAsync(account.Email, request.LicensePlate);

                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    Console.WriteLine("\n==============================================");
                    Console.WriteLine($"[VEHICLE ADD OTP SIMULATION] Plate: {request.LicensePlate}");
                    Console.WriteLine($"Code: {code} (Valid for 5 minutes)");
                    Console.WriteLine("==============================================\n");
                }

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

                await _otpService.SendEmailOtpAsync(account.Email, subject, body);

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {account.Email}!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Customer/VerifyVehicleOtpAndSave")]
        public async Task<IActionResult> VerifyVehicleOtpAndSave([FromBody] VerifyVehicleOtpDto request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (account == null || customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để đăng ký phương tiện!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Dữ liệu xác thực không hợp lệ!" });
            }

            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email liên kết với tài khoản!" });
                }

                bool otpValid = await _vehicleService.VerifyVehicleOtpAsync(account.Email, request.OtpCode, request.LicensePlate);
                if (!otpValid)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                bool exists = await _vehicleService.IsPlateRegisteredAsync(request.LicensePlate);
                if (exists)
                {
                    return BadRequest(new { success = false, message = "Biển số xe này đã được đăng ký trên hệ thống!" });
                }

                await _vehicleService.SaveVehicleAsync(customer.CustomerId, request.LicensePlate, request.Type);

                return Ok(new { success = true, message = "Đăng ký phương tiện thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Customer/DeleteVehicle")]
        public async Task<IActionResult> DeleteVehicle([FromBody] DeleteVehicleDto request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ!" });
            }

            try
            {
                var result = await _vehicleService.DeleteVehicleAsync(customer.CustomerId, request.LicensePlate);
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
}
