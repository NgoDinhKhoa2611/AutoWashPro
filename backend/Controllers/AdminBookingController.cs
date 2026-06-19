using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;

namespace Auto_Wash.Controllers
{
    public class AdminBookingController : Controller
    {
        private readonly AdminBookingService _adminBookingService;

        public AdminBookingController(AdminBookingService adminBookingService)
        {
            _adminBookingService = adminBookingService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        [HttpGet]
        [Route("api/admin/bookings")]
        public async Task<IActionResult> GetBookings()
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var bookings = await _adminBookingService.GetAdminBookingsAsync();
                return Ok(new { success = true, bookings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("api/admin/bookings/{id}")]
        public async Task<IActionResult> GetBookingDetail(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var booking = await _adminBookingService.GetBookingDetailAsync(id);
                if (booking == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy đơn đặt lịch này!" });
                }
                return Ok(new { success = true, booking });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut]
        [Route("api/admin/bookings/{id}/confirm")]
        public async Task<IActionResult> ConfirmBooking(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var result = await _adminBookingService.ConfirmBookingAsync(id);
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

        [HttpPut]
        [Route("api/admin/bookings/{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var result = await _adminBookingService.CancelBookingAsync(id);
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

        [HttpPut]
        [Route("api/admin/bookings/{id}/checkin")]
        public async Task<IActionResult> CheckInBooking(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var result = await _adminBookingService.CheckInBookingAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, message = result.message, queueId = result.queueId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
