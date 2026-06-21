using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class BookingNotificationService
    {
        private readonly OtpService _otpService;
        private readonly ILogger<BookingNotificationService> _logger;

        public BookingNotificationService(OtpService otpService, ILogger<BookingNotificationService> logger)
        {
            _otpService = otpService;
            _logger = logger;
        }

        public async Task SendBookingConfirmedEmailAsync(BookingEmailModel model)
        {
            var dateStr = model.ScheduledAt.ToString("dd/MM/yyyy");
            var timeStr = model.ScheduledAt.ToString("HH:mm");
            var priceStr = model.FinalPrice.ToString("#,##0");

            var subject = "[AutoWash Pro] Lịch hẹn đã được xác nhận";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Lịch hẹn đã được xác nhận</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    <p>Lịch hẹn đặt dịch vụ của bạn đã được xác nhận thành công. Dưới đây là thông tin chi tiết:</p>
    
    <div style=""background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;"">
      <table style=""width: 100%; border-collapse: collapse;"">
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px; width: 40%;"">Mã lịch hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">#BK-{model.BookingId}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Biển số xe:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px; font-family: monospace;"">{model.LicensePlate}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Ngày hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{dateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Giờ hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{timeStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Dịch vụ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{model.ServiceName}</td>
        </tr>
        <tr>
          <td style=""padding: 12px 0 6px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;"">Tổng thanh toán:</td>
          <td style=""padding: 12px 0 6px 0; color: #0ea5e9; font-weight: bold; font-size: 16px; border-top: 1px solid #e2e8f0;"">{priceStr} VNĐ</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">Vui lòng đến đúng giờ để được phục vụ tốt nhất.</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Cảm ơn bạn đã lựa chọn AutoWash Pro!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public async Task SendBookingCancelledEmailAsync(BookingEmailModel model)
        {
            var dateStr = model.ScheduledAt.ToString("dd/MM/yyyy");
            var timeStr = model.ScheduledAt.ToString("HH:mm");

            var subject = "[AutoWash Pro] Lịch hẹn đã bị hủy";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #ef4444; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Lịch hẹn đã bị hủy</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    <p>Rất tiếc, lịch hẹn đặt dịch vụ của bạn đã bị hủy. Chi tiết thông tin lịch hẹn bị hủy:</p>
    
    <div style=""background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;"">
      <table style=""width: 100%; border-collapse: collapse;"">
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px; width: 40%;"">Mã lịch hẹn:</td>
          <td style=""padding: 6px 0; color: #ef4444; font-weight: bold; font-size: 14px;"">#BK-{model.BookingId}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Biển số xe:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px; font-family: monospace;"">{model.LicensePlate}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Ngày hẹn cũ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{dateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Giờ hẹn cũ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{timeStr}</td>
        </tr>
        <tr>
          <td style=""padding: 12px 0 6px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; vertical-align: top;"">Lý do hủy:</td>
          <td style=""padding: 12px 0 6px 0; color: #dc2626; font-weight: bold; font-size: 14px; border-top: 1px solid #e2e8f0;"">{model.CancelReason ?? "Không có lý do cụ thể."}</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #64748b; text-align: center; margin-top: 24px; font-size: 14px;"">Vui lòng tạo lịch hẹn mới nếu cần sử dụng dịch vụ.</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    AutoWash Pro chân thành xin lỗi vì sự bất tiện này!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public void SendBookingConfirmedEmailInBackground(BookingEmailModel model)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendBookingConfirmedEmailAsync(model);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking confirmation email for BookingId BK-{BookingId} to {Email}", model.BookingId, model.Email);
                }
            });
        }

        public void SendBookingCancelledEmailInBackground(BookingEmailModel model)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendBookingCancelledEmailAsync(model);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking cancellation email for BookingId BK-{BookingId} to {Email}", model.BookingId, model.Email);
                }
            });
        }
    }
}
