using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Controllers
{
    public class BookingController : Controller
    {
        private readonly AuthContextService _authContextService;
        private readonly Auto_Wash.Services.BookingService _bookingService;

        public BookingController(AuthContextService authContextService,
                                 Auto_Wash.Services.BookingService bookingService)
        {
            _authContextService = authContextService;
            _bookingService = bookingService;
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
                        category = s.Category == 1 ? "Rửa xe cơ bản" : s.Category == 2 ? "Rửa xe cao cấp" : s.Category == 3 ? "Rửa xe cao cấp" : "Dịch vụ đi kèm",
                        price = s.BasePrice,
                        estimatedMinutes = s.EstimatedMinutes,
                        isActive = s.IsActive,
                        isFeatured = s.IsFeatured
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
                        status = b.Status == (int)BookingStatus.Completed ? "Completed" 
                               : b.Status == (int)BookingStatus.Pending ? "Booked" 
                               : b.Status == (int)BookingStatus.Confirmed ? "Confirmed" 
                               : b.Status == (int)BookingStatus.Cancelled ? "Cancelled" 
                               : "In Progress",
                        bookingDate = b.ScheduledAt.ToString("yyyy-MM-dd"),
                        bookingTime = b.ScheduledAt.ToString("HH:mm"),
                        price = b.FinalPrice,
                        points = b.PointsEarned
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
                string queueStatus = queue?.Status ?? "Waiting";

                int washStep = hasQueue ? 0 : -1;
                int addonsCount = addons.Count;
                if (hasQueue)
                {
                    if (queueStatus == "Waiting") washStep = 0;
                    else if (queueStatus == "LPR_Scan") washStep = 1;
                    else if (queueStatus == "Washing") washStep = 2;
                    else if (queueStatus == "Addon_Processing") washStep = 2 + (addonsCount > 0 ? 1 : 0);
                    else if (queueStatus == "Drying") washStep = 2 + addonsCount;
                    else if (queueStatus == "Completed") washStep = 3 + addonsCount;
                }

                var bookingData = new
                {
                    id = activeBooking.BookingId.ToString(),
                    vehicle = activeBooking.Vehicle.LicensePlate,
                    mainService = mainSvcName,
                    addons = addons,
                    status = queueStatus == "Completed" ? "Completed" : "Booked",
                    bookingDate = activeBooking.ScheduledAt.ToString("yyyy-MM-dd"),
                    bookingTime = activeBooking.ScheduledAt.ToString("HH:mm"),
                    price = activeBooking.FinalPrice,
                    points = activeBooking.PointsEarned,
                    hasQueue = hasQueue
                };

                return Ok(new { success = true, booking = bookingData, queueStatus, washStep });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
