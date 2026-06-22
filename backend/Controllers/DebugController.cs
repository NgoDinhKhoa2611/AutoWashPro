using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Linq;
using Auto_Wash.Helpers;
using Auto_Wash.Data.Entities;

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

        [HttpGet]
        [HttpPost]
        [Route("Debug/RestorePasswords")]
        public IActionResult RestorePasswords()
        {
            var db = (Auto_Wash.Data.AutoWashDbContext)HttpContext.RequestServices.GetService(typeof(Auto_Wash.Data.AutoWashDbContext))!;
            
            var admin = db.Accounts.FirstOrDefault(a => a.Email == "admin@autowash.com" || a.Phone == "0900000001");
            if (admin != null)
            {
                admin.PasswordHash = PasswordHelper.HashPassword("123456");
            }

            var quoc = db.Accounts.FirstOrDefault(a => a.Email == "quoctrinnh.2007@gmail.com");
            if (quoc != null)
            {
                quoc.PasswordHash = PasswordHelper.HashPassword("123456");
            }
            
            db.SaveChanges();
            return Ok(new { success = true, message = "Passwords restored to 123456 successfully!" });
        }

        [HttpPost]
        [Route("Debug/ResetPasswords")]
        public IActionResult ResetPasswords()
        {
            var db = (Auto_Wash.Data.AutoWashDbContext)HttpContext.RequestServices.GetService(typeof(Auto_Wash.Data.AutoWashDbContext))!;
            var accounts = db.Accounts.ToList();
            foreach (var account in accounts)
            {
                account.PasswordHash = PasswordHelper.HashPassword("Password@123");
            }
            db.SaveChanges();
            return Ok(new { success = true, message = "All passwords reset to Password@123" });
        }

        [HttpGet]
        [Route("Debug/GetUsers")]
        public IActionResult GetUsers()
        {
            var db = (Auto_Wash.Data.AutoWashDbContext)HttpContext.RequestServices.GetService(typeof(Auto_Wash.Data.AutoWashDbContext))!;
            var accounts = db.Accounts
                .Select(a => new {
                    accountId = a.AccountId,
                    fullName = a.FullName,
                    phone = a.Phone,
                    email = a.Email,
                    role = a.Role.ToString()
                })
                .ToList();
            return Ok(accounts);
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
