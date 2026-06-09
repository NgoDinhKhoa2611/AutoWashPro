using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Admin;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        // ── Dashboard Stats API ───────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> DashboardStats()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var stats = await _adminService.GetDashboardStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Loyalty Config API ────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetLoyaltyConfig()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var config = await _adminService.GetLoyaltyConfigAsync();
                return Ok(config);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveLoyaltyConfig([FromBody] SaveLoyaltyConfigRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var accountId = HttpContext.Session.GetInt32("AccountId");
                await _adminService.SaveLoyaltyConfigAsync(request, accountId);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Monthly Tier Review API ───────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> TierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var reviews = await _adminService.GetTierReviewAsync();
                return Ok(reviews);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Run Tier Review (Apply) API ───────────────────────────────

        [HttpPost]
        public async Task<IActionResult> RunTierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminService.RunTierReviewAsync();
                return Ok(new { success = true, upgrades = result.upgrades, downgrades = result.downgrades });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Service Management API ─────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetServices()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var services = await _adminService.GetAdminServicesAsync();
                return Ok(new { success = true, services });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveService([FromBody] SaveServiceRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                await _adminService.SaveServiceAsync(request);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ToggleService([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.ToggleServiceStatusAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteService([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.DeleteServiceAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Customer Management API ────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var customers = await _adminService.GetCustomersAsync(search);
                return Ok(new { success = true, customers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomerDetail([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var detail = await _adminService.GetCustomerDetailAsync(id);
                if (detail == null) return NotFound(new { success = false, message = "Không tìm thấy khách hàng." });
                return Ok(new { success = true, customer = detail });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AdjustCustomerPoints([FromBody] AdjustPointsRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var staffAccountId = HttpContext.Session.GetInt32("AccountId");
                var success = await _adminService.AdjustCustomerPointsAsync(request.CustomerId, request.PointsChange, request.Reason, staffAccountId);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy khách hàng." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAvailableVouchers()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var vouchers = await _adminService.GetAvailableVouchersAsync();
                return Ok(new { success = true, vouchers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AssignVoucher([FromBody] AssignVoucherRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var success = await _adminService.AssignVoucherAsync(request.CustomerId, request.RewardId);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy khách hàng hoặc voucher." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Promotions / Campaigns Management Endpoints ───────────────

        [HttpGet]
        [Route("api/admin/promotions")]
        public async Task<IActionResult> GetPromotions()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var promotions = await _adminService.GetPromotionsAsync();
                return Ok(promotions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("api/admin/promotions/{id}")]
        public async Task<IActionResult> GetPromotionById(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var promotion = await _adminService.GetPromotionByIdAsync(id);
                if (promotion == null) return NotFound(new { success = false, message = "Không tìm thấy chiến dịch khuyến mãi." });
                return Ok(promotion);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/admin/promotions")]
        public async Task<IActionResult> CreatePromotion([FromBody] CampaignRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ." });
            }

            try
            {
                var accountId = HttpContext.Session.GetInt32("AccountId") ?? 1;
                var promotion = await _adminService.CreatePromotionAsync(request, accountId);
                return Ok(new { success = true, id = promotion.CampaignId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut]
        [Route("api/admin/promotions/{id}")]
        public async Task<IActionResult> UpdatePromotion(int id, [FromBody] CampaignRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ." });
            }

            try
            {
                var success = await _adminService.UpdatePromotionAsync(id, request);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy chiến dịch khuyến mãi." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch]
        [Route("api/admin/promotions/{id}/toggle")]
        public async Task<IActionResult> TogglePromotion(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.TogglePromotionStatusAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy chiến dịch khuyến mãi." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete]
        [Route("api/admin/promotions/{id}")]
        public async Task<IActionResult> DeletePromotion(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.DeletePromotionAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy chiến dịch khuyến mãi." });
                return Ok(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
