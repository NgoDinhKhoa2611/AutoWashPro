using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Auto_Wash.Services
{
    public class OtpService
    {
        private readonly AutoWashDbContext _context;
        private readonly IConfiguration _configuration;

        public OtpService(AutoWashDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<string> GenerateAndSaveOtpAsync(string email, string purpose, string? plateNumber = null)
        {
            var rnd = new Random();
            string code = rnd.Next(100000, 999999).ToString();

            var now = DateTime.UtcNow;

            var otp = new OtpVerification
            {
                Email = email.Trim(),
                Purpose = purpose.Trim(),
                PlateNumber = plateNumber?.Trim(),
                Code = code,
                ExpiresAt = now.AddMinutes(5),
                IsUsed = false,
                CreatedAt = now
            };

            _context.OtpVerifications.Add(otp);
            await _context.SaveChangesAsync();

            return code;
        }

        public async Task<bool> VerifyOtpAsync(string email, string code, string purpose, string? plateNumber = null)
        {
            var now = DateTime.UtcNow;

            var query = _context.OtpVerifications
                .Where(o =>
                    o.Email == email.Trim() &&
                    o.Code == code.Trim() &&
                    !o.IsUsed &&
                    o.ExpiresAt > now
                );

            if (!string.IsNullOrEmpty(purpose))
            {
                query = query.Where(o => o.Purpose == purpose.Trim());
            }

            if (!string.IsNullOrEmpty(plateNumber))
            {
                query = query.Where(o => o.PlateNumber == plateNumber.Trim());
            }

            var otp = await query
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otp == null) return false;

            otp.IsUsed = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task SendEmailOtpAsync(string toEmail, string subject, string body)
        {
            try
            {
                var smtpHost = _configuration["Smtp:Host"] ?? "smtp.gmail.com";
                var smtpPortStr = _configuration["Smtp:Port"] ?? "587";
                int smtpPort = int.TryParse(smtpPortStr, out var port) ? port : 587;
                var smtpUser = _configuration["Smtp:Username"] ?? "";
                var smtpPass = _configuration["Smtp:Password"] ?? "";
                var fromEmail = _configuration["Smtp:FromEmail"] ?? "autowashpro.service@gmail.com";

                if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
                {
                    Console.WriteLine($"[SMTP NOT CONFIG] Email could not be sent to {toEmail} because SMTP is not configured.");
                    return;
                }

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("AutoWash Pro Support", fromEmail));
                message.To.Add(new MailboxAddress("", toEmail));
                message.Subject = subject;

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = body
                };
                message.Body = bodyBuilder.ToMessageBody();

                using (var client = new SmtpClient())
                {
                    var socketOption = smtpPort == 465
                        ? SecureSocketOptions.SslOnConnect
                        : SecureSocketOptions.StartTls;

                    await client.ConnectAsync(smtpHost, smtpPort, socketOption);
                    await client.AuthenticateAsync(smtpUser, smtpPass);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);

                    Console.WriteLine($"[SMTP SUCCESS] MailKit successfully dispatched Email OTP to {toEmail}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SMTP ERROR] MailKit failed to send email to {toEmail}: {ex.Message}");
            }
        }
    }
}