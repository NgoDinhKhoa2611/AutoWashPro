using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;

namespace Auto_Wash.Controllers
{
    public class ReviewController : Controller
    {
        private readonly AutoWashDbContext _context;
        private readonly AuthContextService _authContextService;

        public ReviewController(AutoWashDbContext context, AuthContextService authContextService)
        {
            _context = context;
            _authContextService = authContextService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        [HttpPost]
        [Route("api/reviews")]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu đánh giá null." });
            }

            if (request.Rating < 1 || request.Rating > 5)
            {
                return BadRequest(new { success = false, message = "Điểm đánh giá phải từ 1 đến 5 sao." });
            }

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            // Verify booking completion and ownership
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && b.CustomerId == customer.CustomerId);

            if (booking == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy đơn đặt lịch của bạn!" });
            }

            if (booking.Status != BookingStatus.Completed)
            {
                return BadRequest(new { success = false, message = "Chỉ có thể đánh giá các đơn đặt lịch đã hoàn thành." });
            }

            // Verify if already reviewed
            var existingReview = await _context.Reviews
                .AnyAsync(r => r.BookingId == request.BookingId);
            if (existingReview)
            {
                return BadRequest(new { success = false, message = "Lịch đặt này đã được đánh giá trước đó." });
            }

            try
            {
                var review = new Review
                {
                    BookingId = request.BookingId,
                    CustomerId = customer.CustomerId,
                    Rating = request.Rating,
                    Comment = request.Comment?.Trim(),
                    CreatedAt = DateTime.Now
                };

                _context.Reviews.Add(review);

                // Optionally sync to booking legacy fields if needed, but not required since database table reviews is the source of truth.
                booking.Stars = (byte)request.Rating;
                booking.ReviewText = request.Comment?.Trim();

                // Add notification for review submission
                _context.Notifications.Add(new Notification
                {
                    CustomerId = customer.CustomerId,
                    Title = "Đã gửi đánh giá!",
                    Message = $"Đánh giá {request.Rating} sao cho đơn đặt lịch #{booking.BookingId} đã được ghi nhận.",
                    Type = "info",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                });

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Gửi đánh giá thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("api/reviews/customer")]
        public async Task<IActionResult> GetCustomerReviews()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var reviews = await _context.Reviews
                    .Include(r => r.Booking)
                        .ThenInclude(b => b.Vehicle)
                    .Include(r => r.Booking)
                        .ThenInclude(b => b.BookingServices)
                            .ThenInclude(bs => bs.Service)
                    .Where(r => r.CustomerId == customer.CustomerId)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        reviewId = r.Id,
                        bookingId = r.BookingId,
                        rating = r.Rating,
                        comment = r.Comment ?? "",
                        createdAt = r.CreatedAt,
                        vehicle = r.Booking.Vehicle.LicensePlate,
                        serviceName = r.Booking.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Dịch vụ rửa xe",
                        scheduledAt = r.Booking.ScheduledAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, reviews });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("api/reviews/pending")]
        public async Task<IActionResult> GetPendingReviews()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                // Completed bookings that do not have a review
                var pendingReviews = await _context.Bookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.BookingServices)
                        .ThenInclude(bs => bs.Service)
                    .Where(b => b.CustomerId == customer.CustomerId 
                                && b.Status == BookingStatus.Completed
                                && !_context.Reviews.Any(r => r.BookingId == b.BookingId))
                    .OrderByDescending(b => b.ScheduledAt)
                    .Select(b => new
                    {
                        bookingId = b.BookingId,
                        vehicle = b.Vehicle.LicensePlate,
                        serviceName = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Dịch vụ rửa xe",
                        finalPrice = b.FinalPrice,
                        scheduledAt = b.ScheduledAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, bookings = pendingReviews });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("api/reviews/admin")]
        public async Task<IActionResult> GetAdminReviews()
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });
            }

            try
            {
                var reviews = await _context.Reviews
                    .Include(r => r.Customer)
                        .ThenInclude(c => c.Account)
                    .Include(r => r.Booking)
                        .ThenInclude(b => b.Vehicle)
                    .Include(r => r.Booking)
                        .ThenInclude(b => b.BookingServices)
                            .ThenInclude(bs => bs.Service)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        reviewId = r.Id,
                        bookingId = r.BookingId,
                        customerName = r.Customer.Account.FullName,
                        rating = r.Rating,
                        comment = r.Comment ?? "",
                        createdAt = r.CreatedAt,
                        vehicle = r.Booking.Vehicle.LicensePlate,
                        serviceName = r.Booking.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Dịch vụ rửa xe",
                        scheduledAt = r.Booking.ScheduledAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, reviews });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class CreateReviewDto
    {
        public int BookingId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
