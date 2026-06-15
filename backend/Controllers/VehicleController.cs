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
        [Route("api/vehicle/send-otp")]
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

            string normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            if (string.IsNullOrWhiteSpace(request.Brand) || string.IsNullOrWhiteSpace(request.Model) || string.IsNullOrWhiteSpace(request.VehicleClass))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin phương tiện." });
            }

            try
            {
                bool exists = await _vehicleService.IsPlateRegisteredAsync(normPlate);
                if (exists)
                {
                    return Conflict(new { message = "Biển số xe đã được đăng ký." });
                }

                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email của tài khoản để nhận mã OTP!" });
                }

                string code = await _vehicleService.SendVehicleOtpAsync(account.Email, normPlate);

                string subject = "AutoWash OTP Verification";
                string body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'>
                        <div style='text-align: center; margin-bottom: 25px;'>
                            <h2 style='color: #0f172a; margin: 0; font-size: 1.5rem; font-weight: 700;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                            <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Smart Car Wash Solutions</p>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center;'>
                            <p style='color: #334155; margin-bottom: 15px;'>Đăng ký biển số xe: <strong>{normPlate}</strong></p>
                            <p style='color: #334155; font-size: 1rem; margin-bottom: 20px;'>Your OTP code is: <strong style='color: #06b6d4; font-size: 1.15rem;'>{code}</strong>. This code expires in 5 minutes.</p>
                            <div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; display: inline-block; font-size: 1.75rem; font-weight: 700; letter-spacing: 6px; color: #0f172a; margin-bottom: 20px;'>
                                {code}
                            </div>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 25px;'>
                            <p style='font-size: 0.75rem; color: #94a3b8; margin: 0;'>This is an automated verification email. Please do not reply.</p>
                        </div>
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
        [Route("api/vehicle/verify-otp")]
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

            string normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            if (string.IsNullOrWhiteSpace(request.Brand) || string.IsNullOrWhiteSpace(request.Model) || string.IsNullOrWhiteSpace(request.VehicleClass))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin phương tiện." });
            }

            try
            {
                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email liên kết với tài khoản!" });
                }

                bool exists = await _vehicleService.IsPlateRegisteredAsync(normPlate);
                if (exists)
                {
                    return Conflict(new { message = "Biển số xe đã được đăng ký." });
                }

                bool otpValid = await _vehicleService.VerifyVehicleOtpAsync(account.Email, request.OtpCode, normPlate);
                if (!otpValid)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                Console.WriteLine($"[VEHICLE REGISTRATION LOG] LicensePlate: {normPlate}, Brand: {request.Brand}, Model: {request.Model}, VehicleClass: {request.VehicleClass}");

                await _vehicleService.SaveVehicleAsync(
                    customer.CustomerId, 
                    normPlate, 
                    request.Brand, 
                    request.Model, 
                    request.VehicleClass);

                return Ok(new { success = true, message = "Đăng ký phương tiện thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut]
        [Route("api/vehicle/{id}")]
        public async Task<IActionResult> UpdateVehicle(int id, [FromBody] UpdateVehicleDto request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để sửa thông tin phương tiện!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Brand) || string.IsNullOrWhiteSpace(request.Model) || string.IsNullOrWhiteSpace(request.VehicleClass))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin phương tiện." });
            }

            try
            {
                var result = await _vehicleService.UpdateVehicleAsync(customer.CustomerId, id, request.Brand, request.Model, request.VehicleClass);
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

        [HttpDelete]
        [Route("api/vehicle/{id}")]
        public async Task<IActionResult> DeleteVehicle(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var result = await _vehicleService.DeleteVehicleByIdAsync(customer.CustomerId, id);
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
