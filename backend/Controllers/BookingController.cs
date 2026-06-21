using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Controllers
{
    public class BookingController : Controller
    {
        private readonly AuthContextService _authContextService;
        private readonly Auto_Wash.Services.BookingService _bookingService;
        private readonly AutoWashDbContext _context;

        public BookingController(AuthContextService authContextService,
                                 Auto_Wash.Services.BookingService bookingService,
                                 AutoWashDbContext context)
        {
            _authContextService = authContextService;
            _bookingService = bookingService;
            _context = context;
        }

        [HttpGet]
        [Route("Customer/GetServices")]
        public async Task<IActionResult> GetServices()
        {
            try
            {
                var servicesList = await _bookingService.GetServicesAsync();
                var services = servicesList
                    .Select(s => new
                    {
                        id = s.ServiceId.ToString(),
                        name = s.ServiceName,
                        desc = s.Description ?? "",
                        category = s.Category == ServiceCategory.Basic ? "Rửa xe cơ bản" : s.Category == ServiceCategory.Premium ? "Rửa xe cao cấp" : s.Category == ServiceCategory.Deluxe ? "Rửa xe cao cấp" : "Dịch vụ đi kèm",
                        price = s.BasePrice,
                        estimatedMinutes = s.EstimatedMinutes,
                        isActive = s.IsActive,
                        isFeatured = s.IsFeatured,
                        isAddon = s.IsAddOn
                    })
                    .ToList();

                return Ok(new { success = true, services });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Customer/CreateBooking")]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto request)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
                Console.WriteLine($"[CREATE BOOKING MODEL ERROR] {errors}");
                return BadRequest(new { success = false, message = $"Dữ liệu không hợp lệ: {errors}" });
            }

            if (request == null)
            {
                Console.WriteLine("[CREATE BOOKING] Request is null!");
                return BadRequest(new { success = false, message = "Dữ liệu đặt lịch null." });
            }

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var result = await _bookingService.CreateBookingAsync(customer, request);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, bookingId = result.bookingId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("Customer/GetWashHistory")]
        public async Task<IActionResult> GetWashHistory()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var bookingsList = await _bookingService.GetWashHistoryAsync(customer.CustomerId);
                var bookings = bookingsList
                    .Select(b => new
                    {
                        id = b.BookingId.ToString(),
                        vehicle = b.Vehicle.LicensePlate,
                        mainService = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Rửa xe",
                        addons = b.BookingServices.Where(bs => bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).ToList(),
                        status = b.Status == BookingStatus.Pending ? "Pending Confirmation"
                               : b.Status == BookingStatus.Confirmed ? "Confirmed"
                               : b.Status == BookingStatus.CheckedIn ? "Checked In"
                               : b.Status == BookingStatus.Completed ? "Completed"
                               : b.Status == BookingStatus.Cancelled ? "Cancelled"
                               : "In Progress",
                        queueStatus = b.Queues.FirstOrDefault()?.Status.ToString(),
                        bookingDate = b.ScheduledAt.ToString("yyyy-MM-dd"),
                        bookingTime = b.ScheduledAt.ToString("HH:mm"),
                        price = b.FinalPrice,
                        points = b.PointsEarned,
                        hasReview = b.Stars.HasValue
                    })
                    .ToList();

                return Ok(new { success = true, history = bookings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("Customer/GetActiveBooking")]
        public async Task<IActionResult> GetActiveBooking()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var activeBooking = await _bookingService.GetActiveBookingAsync(customer.CustomerId);

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
                var queueStatusEnum = queue?.Status ?? QueueStatus.Waiting;
                string queueStatus = queueStatusEnum.ToString();

                int washStep = hasQueue ? 0 : -1;
                int addonsCount = addons.Count;
                if (hasQueue)
                {
                    if (queueStatusEnum == QueueStatus.Waiting) washStep = 0;
                    else if (queueStatusEnum == QueueStatus.LPR_Scan) washStep = 1;
                    else if (queueStatusEnum == QueueStatus.Washing) washStep = 2;
                    else if (queueStatusEnum == QueueStatus.Addon_Processing) washStep = 2 + (addonsCount > 0 ? 1 : 0);
                    else if (queueStatusEnum == QueueStatus.Drying) washStep = 2 + addonsCount;
                    else if (queueStatusEnum == QueueStatus.Completed) washStep = 3 + addonsCount;
                }

                var bookingData = new
                {
                    id = activeBooking.BookingId.ToString(),
                    vehicle = activeBooking.Vehicle.LicensePlate,
                    mainService = mainSvcName,
                    addons = addons,
                    status = activeBooking.Status == BookingStatus.Pending ? "Pending Confirmation"
                           : activeBooking.Status == BookingStatus.Confirmed ? "Confirmed"
                           : activeBooking.Status == BookingStatus.CheckedIn ? "Checked In"
                           : activeBooking.Status == BookingStatus.Completed ? "Completed"
                           : activeBooking.Status == BookingStatus.Cancelled ? "Cancelled"
                           : "In Progress",
                    bookingDate = activeBooking.ScheduledAt.ToString("yyyy-MM-dd"),
                    bookingTime = activeBooking.ScheduledAt.ToString("HH:mm"),
                    price = activeBooking.FinalPrice,
                    points = activeBooking.PointsEarned,
                    hasQueue = hasQueue,
                    paidAt = activeBooking.PaidAt?.ToString("yyyy-MM-dd HH:mm:ss")
                };

                return Ok(new { success = true, booking = bookingData, queueStatus, washStep });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("Customer/GetBookingDetail/{id}")]
        public async Task<IActionResult> GetBookingDetail(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var booking = await _bookingService.GetBookingDetailAsync(customer.CustomerId, id);
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

        [HttpPost]
        [Route("Customer/CancelBooking/{id}")]
        public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingDto request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Không nhận được dữ liệu hủy lịch." });
            }

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, message = "Lý do hủy là bắt buộc." });
            }

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn chưa đăng nhập!" });
            }

            try
            {
                var result = await _bookingService.CancelBookingAsync(customer.CustomerId, id, request.Reason);
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

        private static readonly string[] DEFAULT_TIME_SLOTS = { "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00" };

        [HttpGet]
        [Route("Customer/GetOccupiedSlots")]
        public async Task<IActionResult> GetOccupiedSlots([FromQuery] string date)
        {
            if (!DateTime.TryParse(date, out DateTime parsedDate))
            {
                return BadRequest(new { success = false, message = "Ngày không hợp lệ." });
            }

            try
            {
                var bookings = await _context.Bookings
                    .Where(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled
                                && b.ScheduledAt.Date == parsedDate.Date)
                    .Select(b => b.ScheduledAt.Hour)
                    .ToListAsync();

                var slotCounts = bookings
                    .GroupBy(h => h)
                    .ToDictionary(g => g.Key, g => g.Count());

                var occupiedSlots = slotCounts
                    .Where(kvp => kvp.Value >= 3)
                    .Select(kvp => $"{kvp.Key:D2}:00")
                    .ToList();

                var slotsStatus = DEFAULT_TIME_SLOTS.ToDictionary(
                    t => t,
                    t => {
                        int hr = int.Parse(t.Split(':')[0]);
                        int count = slotCounts.ContainsKey(hr) ? slotCounts[hr] : 0;
                        return Math.Max(0, 3 - count);
                    }
                );

                return Ok(new { success = true, occupiedSlots, slotsStatus });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        [Route("Customer/GetEarliestAvailableDate")]
        public async Task<IActionResult> GetEarliestAvailableDate([FromQuery] string startDate, [FromQuery] int windowDays = 7)
        {
            if (!DateTime.TryParse(startDate, out DateTime startParsed))
            {
                return BadRequest(new { success = false, message = "Ngày không hợp lệ." });
            }

            try
            {
                var now = DateTime.Now;
                var today = DateTime.Today;

                var endPoint = startParsed.AddDays(windowDays);
                var bookings = await _context.Bookings
                    .Where(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled
                                && b.ScheduledAt.Date >= startParsed.Date && b.ScheduledAt.Date <= endPoint.Date)
                    .Select(b => new { b.ScheduledAt.Date, b.ScheduledAt.Hour })
                    .ToListAsync();

                var grouped = bookings
                    .GroupBy(b => new { b.Date, b.Hour })
                    .ToDictionary(g => g.Key, g => g.Count());

                var standardHours = Enumerable.Range(8, 11).ToList();

                for (int i = 0; i <= windowDays; i++)
                {
                    var checkDate = startParsed.AddDays(i);
                    foreach (var hour in standardHours)
                    {
                        if (checkDate.Date == today && checkDate.Date.AddHours(hour) < now.AddMinutes(15))
                        {
                            continue;
                        }

                        var key = new { Date = checkDate.Date, Hour = hour };
                        int count = grouped.ContainsKey(key) ? grouped[key] : 0;
                        if (count < 3)
                        {
                            return Ok(new { success = true, earliestDate = checkDate.ToString("yyyy-MM-dd") });
                        }
                    }
                }

                return Ok(new { success = true, earliestDate = (string?)null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
