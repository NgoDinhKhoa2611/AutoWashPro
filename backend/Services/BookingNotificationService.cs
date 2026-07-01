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

        public async Task SendBookingRescheduledEmailAsync(BookingRescheduleEmailModel model)
        {
            var oldDateStr = model.OldScheduledAt.ToString("dd/MM/yyyy");
            var oldTimeStr = model.OldScheduledAt.ToString("HH:mm");
            var newDateStr = model.NewScheduledAt.ToString("dd/MM/yyyy");
            var newTimeStr = model.NewScheduledAt.ToString("HH:mm");

            var subject = "[AutoWash Pro] Lịch hẹn đã được thay đổi";
            var updaterText = model.UpdatedByStaff 
                ? "<p>Lịch hẹn đặt dịch vụ của bạn đã được cập nhật bởi nhân viên <strong>AutoWash Pro staff</strong>. Dưới đây là thông tin chi tiết:</p>"
                : "<p>Lịch hẹn đặt dịch vụ của bạn đã được thay đổi thành công. Dưới đây là thông tin chi tiết:</p>";

            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Lịch hẹn đã được thay đổi</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    {updaterText}
    
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
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Dịch vụ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{model.ServiceName}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Thời gian hẹn cũ:</td>
          <td style=""padding: 6px 0; color: #ef4444; font-weight: bold; font-size: 14px; text-decoration: line-through;"">{oldTimeStr} ngày {oldDateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Thời gian hẹn mới:</td>
          <td style=""padding: 6px 0; color: #16a34a; font-weight: bold; font-size: 14px;"">{newTimeStr} ngày {newDateStr}</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">Vui lòng đến đúng giờ hẹn mới để được phục vụ tốt nhất.</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Cảm ơn bạn đã lựa chọn AutoWash Pro!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public void SendBookingRescheduledEmailInBackground(BookingRescheduleEmailModel model)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendBookingRescheduledEmailAsync(model);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking reschedule email for BookingId BK-{BookingId} to {Email}", model.BookingId, model.Email);
                }
            });
        }

        public async Task SendBookingReminderEmailAsync(BookingEmailModel model, int reminderNumber, bool isDemoMode)
        {
            var dateStr = model.ScheduledAt.ToString("dd/MM/yyyy");
            var timeStr = model.ScheduledAt.ToString("HH:mm");

            string timingStr = reminderNumber == 1 ? (isDemoMode ? "60 giây" : "60 phút") : (isDemoMode ? "30 giây" : "30 phút");
            var subject = $"[AutoWash Pro] Nhắc nhở lịch hẹn sắp diễn ra - {timingStr} nữa";

            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Nhắc nhở lịch hẹn sắp diễn ra</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    <p>Lịch hẹn đặt dịch vụ của bạn tại AutoWash Pro sắp đến giờ thực hiện (còn khoảng <strong>{timingStr}</strong>). Dưới đây là thông tin chi tiết:</p>
    
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
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Thời gian hẹn:</td>
          <td style=""padding: 6px 0; color: #0ea5e9; font-weight: bold; font-size: 14px;"">{timeStr} ngày {dateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Dịch vụ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{model.ServiceName}</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">Vui lòng chuẩn bị và di chuyển đến cửa hàng để được hỗ trợ dịch vụ đúng giờ.</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Cảm ơn bạn đã lựa chọn AutoWash Pro!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public void SendBookingReminderEmailInBackground(BookingEmailModel model, int reminderNumber, bool isDemoMode)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendBookingReminderEmailAsync(model, reminderNumber, isDemoMode);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking reminder {Reminder} email for BookingId BK-{BookingId} to {Email}", reminderNumber, model.BookingId, model.Email);
                }
            });
        }

        public async Task SendNoShowEmailAsync(BookingEmailModel model)
        {
            var dateStr = model.ScheduledAt.ToString("dd/MM/yyyy");
            var timeStr = model.ScheduledAt.ToString("HH:mm");

            var subject = "[AutoWash Pro] Lịch hẹn quá hạn (No-Show)";

            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #ef4444; padding: 24px; text-align: center;"">
    <h1 style=""color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #dc2626; margin-top: 0; font-size: 20px; font-weight: bold;"">Lịch hẹn quá hạn (No-Show)</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    <p>Chúng tôi rất tiếc phải thông báo rằng lịch hẹn đặt dịch vụ của bạn đã hết hạn (chuyển sang trạng thái No-Show) vì bạn đã không thực hiện check-in trong thời gian quy định.</p>
    
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
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Thời gian hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{timeStr} ngày {dateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Dịch vụ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{model.ServiceName}</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #64748b; font-size: 14px; line-height: 1.5;"">Theo quy định của AutoWash Pro, lịch hẹn sẽ tự động bị hủy và đánh dấu là Không Đến (No-Show) nếu khách hàng không check-in tại cửa hàng trong vòng 15 phút kể từ giờ hẹn đã đặt. Nếu bạn vẫn có nhu cầu sử dụng dịch vụ, vui lòng thực hiện đặt lịch hẹn mới trên ứng dụng/website của chúng tôi.</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    AutoWash Pro chân thành cảm ơn và hẹn gặp lại bạn!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public void SendNoShowEmailInBackground(BookingEmailModel model)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendNoShowEmailAsync(model);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking no-show email for BookingId BK-{BookingId} to {Email}", model.BookingId, model.Email);
                }
            });
        }

        public async Task SendPaymentSuccessEmailAsync(
            string email,
            string customerName,
            string licensePlate,
            int bookingId,
            int amount,
            string invoiceNumber,
            string transactionNo,
            DateTime paymentTime,
            int pointsEarned,
            string tierName)
        {
            var dateStr = paymentTime.ToString("dd/MM/yyyy");
            var timeStr = paymentTime.ToString("HH:mm:ss");
            var amountStr = amount.ToString("#,##0");

            var subject = "[AutoWash Pro] Xác nhận thanh toán thành công";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Xác nhận thanh toán thành công</h2>
    <p>Xin chào <strong>{customerName}</strong>,</p>
    <p>Cảm ơn bạn đã thanh toán dịch vụ. Dưới đây là thông tin biên lai hóa đơn của bạn:</p>
    
    <div style=""background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;"">
      <table style=""width: 100%; border-collapse: collapse;"">
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px; width: 40%;"">Số hóa đơn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{invoiceNumber}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Mã lịch hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">#BK-{bookingId}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Biển số xe:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px; font-family: monospace;"">{licensePlate}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Mã giao dịch:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{transactionNo}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Thời gian thanh toán:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{timeStr} ngày {dateStr}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Điểm Loyalty nhận:</td>
          <td style=""padding: 6px 0; color: #10b981; font-weight: bold; font-size: 14px;"">+{pointsEarned}đ</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Hạng thành viên hiện tại:</td>
          <td style=""padding: 6px 0; color: #f59e0b; font-weight: bold; font-size: 14px;"">{tierName}</td>
        </tr>
        <tr>
          <td style=""padding: 12px 0 6px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;"">Số tiền thanh toán:</td>
          <td style=""padding: 12px 0 6px 0; color: #0ea5e9; font-weight: bold; font-size: 16px; border-top: 1px solid #e2e8f0;"">{amountStr} VNĐ</td>
        </tr>
      </table>
    </div>
    
    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">AutoWash Pro hân hạnh được phục vụ quý khách!</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Cảm ơn bạn đã lựa chọn AutoWash Pro!
  </div>
</div>
";
            await _otpService.SendEmailAsync(email, subject, body);
        }

        public void SendPaymentSuccessEmailInBackground(
            string email,
            string customerName,
            string licensePlate,
            int bookingId,
            int amount,
            string invoiceNumber,
            string transactionNo,
            DateTime paymentTime,
            int pointsEarned,
            string tierName)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendPaymentSuccessEmailAsync(email, customerName, licensePlate, bookingId, amount, invoiceNumber, transactionNo, paymentTime, pointsEarned, tierName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send payment success email for BookingId BK-{BookingId} to {Email}", bookingId, email);
                }
            });
        }

        public async Task SendWaitingCheckoutEmailAsync(BookingEmailModel model)
        {
            var dateStr = model.ScheduledAt.ToString("dd/MM/yyyy");
            var timeStr = model.ScheduledAt.ToString("HH:mm");
            var priceStr = model.FinalPrice.ToString("#,##0");

            var subject = "[AutoWash Pro] Xe của bạn đã hoàn tất dịch vụ";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background-color: #0f172a; padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;"">Xe của bạn đã hoàn tất dịch vụ</h2>
    <p>Xin chào <strong>{model.CustomerName}</strong>,</p>
    <p>Xe của bạn đã hoàn tất quá trình rửa. Dưới đây là thông tin chi tiết:</p>

    <div style=""background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;"">
      <table style=""width: 100%; border-collapse: collapse;"">
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px; width: 40%;"">Mã lịch hẹn:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">BK-{model.BookingId}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Biển số xe:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px; font-family: monospace;"">{model.LicensePlate}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px;"">Dịch vụ:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 14px;"">{model.ServiceName}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0;"">Thành tiền:</td>
          <td style=""padding: 6px 0; color: #0ea5e9; font-weight: bold; font-size: 16px; border-top: 1px solid #e2e8f0;"">{priceStr} VNĐ</td>
        </tr>
      </table>
    </div>

    <p style=""font-size: 14px; color: #334155;"">Vui lòng đến cửa hàng để:</p>
    <ul style=""list-style: none; padding: 0; margin: 12px 0;"">
      <li style=""padding: 4px 0; font-size: 14px; color: #10b981;"">✓ Nhận xe</li>
      <li style=""padding: 4px 0; font-size: 14px; color: #10b981;"">✓ Thanh toán</li>
    </ul>

    <div style=""margin-top: 24px; border-top: 1px dashed #e2e8f0; padding-top: 16px; font-size: 13px; color: #64748b;"">
      <p style=""margin: 4px 0;"">📍 <strong>Địa chỉ cửa hàng:</strong> 123 Đường 3/2, Quận 10, TP. Hồ Chí Minh</p>
      <p style=""margin: 4px 0;"">📞 <strong>Hotline hỗ trợ:</strong> 1900 8888</p>
      <p style=""margin: 4px 0;"">🕒 <strong>Giờ mở cửa:</strong> 07:00 - 21:00 (Hàng ngày)</p>
    </div>

    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">Xin cảm ơn quý khách!</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Cảm ơn bạn đã lựa chọn AutoWash Pro!
  </div>
</div>
";
            await _otpService.SendEmailAsync(model.Email, subject, body);
        }

        public void SendWaitingCheckoutEmailInBackground(BookingEmailModel model)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendWaitingCheckoutEmailAsync(model);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send waiting-checkout email for BookingId BK-{BookingId} to {Email}", model.BookingId, model.Email);
                }
            });
        }
    }
}
