using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.AdminQueue;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class AdminQueueController : Controller
    {
        private readonly AdminQueueService _adminQueueService;

        public AdminQueueController(AdminQueueService adminQueueService)
        {
            _adminQueueService = adminQueueService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return role == "admin" || role == "staff";
        }

        [HttpGet]
        [Route("Admin/GetQueue")]
        public async Task<IActionResult> GetQueue()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var queue = await _adminQueueService.GetTodayQueueAsync();
                return Ok(queue);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/AdvanceQueue")]
        public async Task<IActionResult> AdvanceQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminQueueService.AdvanceQueueAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, newStatus = result.newStatus });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/UpdateQueue")]
        public async Task<IActionResult> UpdateQueue(int id, [FromBody] UpdateQueueRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ!" });
            }

            try
            {
                var result = await _adminQueueService.UpdateQueueAsync(id, request.Status, request.StaffNote);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/CheckoutQueue")]
        public async Task<IActionResult> CheckoutQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminQueueService.CheckoutQueueAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, finalPrice = result.finalPrice, pointsEarned = result.pointsEarned });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/CancelQueue")]
        public async Task<IActionResult> CancelQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminQueueService.CancelQueueAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/AddWalkIn")]
        public async Task<IActionResult> AddWalkIn([FromBody] WalkInRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ!" });
            }

            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                var result = await _adminQueueService.AddWalkInAsync(request.LicensePlate, request.CustomerName);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new {
                    success = true,
                    queueId = result.queueId,
                    customerName = result.customerName,
                    tierName = result.tierName,
                    hasBooking = result.hasBooking,
                    bookingServices = result.bookingServices
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
