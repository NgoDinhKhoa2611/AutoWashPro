using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;

namespace Auto_Wash.Controllers
{
    public class DebugController : Controller
    {
        private readonly string _feLogPath;
        private static readonly object _lock = new object();

        public DebugController(IWebHostEnvironment env)
        {
            _feLogPath = Path.Combine(env.ContentRootPath, "debug_fe.log");
        }

        [HttpPost]
        public IActionResult LogFrontend([FromBody] LogPayload payload)
        {
            if (payload == null)
            {
                return BadRequest(new { success = false, message = "Invalid log payload" });
            }

            var logRecord = $"[{payload.Timestamp ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")}] [{payload.Level ?? "INFO"}] {payload.Message}";
            if (!string.IsNullOrEmpty(payload.Stack))
            {
                logRecord += Environment.NewLine + "Stack Trace: " + payload.Stack;
            }

            lock (_lock)
            {
                try
                {
                    System.IO.File.AppendAllText(_feLogPath, logRecord + Environment.NewLine);
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { success = false, message = "Failed to write log file: " + ex.Message });
                }
            }

            return Ok(new { success = true });
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
