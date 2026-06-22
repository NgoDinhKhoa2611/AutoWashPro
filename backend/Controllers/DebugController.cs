using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;

namespace Auto_Wash.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly string _feLogPath;
        private static readonly object _lock = new();


    public DebugController(IWebHostEnvironment env)
        {
            _feLogPath = Path.Combine(env.ContentRootPath, "debug_fe.log");
        }

        [HttpPost("LogFrontend")]
        public IActionResult LogFrontend([FromBody] LogPayload payload)
        {
            if (payload == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid log payload"
                });
            }

            var logRecord =
                $"[{payload.Timestamp ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")}] " +
                $"[{payload.Level ?? "INFO"}] {payload.Message}";

            if (!string.IsNullOrWhiteSpace(payload.Stack))
            {
                logRecord += Environment.NewLine +
                             "Stack Trace: " +
                             payload.Stack;
            }

            lock (_lock)
            {
                try
                {
                    System.IO.File.AppendAllText(
                        _feLogPath,
                        logRecord + Environment.NewLine
                    );
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        message = $"Failed to write log file: {ex.Message}"
                    });
                }
            }

            return Ok(new { success = true });
        }

        [HttpGet("Bookings")]
        public IActionResult GetBookings([FromServices] Auto_Wash.Data.AutoWashDbContext context)
        {
            try
            {
                var bookings = context.Bookings
                    .Select(b => new
                    {
                        b.BookingId,
                        b.CustomerId,
                        b.VehicleId,
                        LicensePlate = b.Vehicle.LicensePlate,
                        b.ScheduledAt,
                        Status = b.Status.ToString(),
                        b.FinalPrice,
                        b.RedemptionId,
                        b.PaidAt,
                        b.CreatedAt
                    })
                    .OrderByDescending(b => b.CreatedAt)
                    .Take(25)
                    .ToList();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }

    public class LogPayload
    {
        public string? Level { get; set; }
        public string? Message { get; set; }
        public string? Timestamp { get; set; }
        public string? Stack { get; set; }
    }


}
