using System;
using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Booking
{
    public class RescheduleBookingDto
    {
        [Required(ErrorMessage = "Thời gian hẹn mới là bắt buộc.")]
        public string ScheduledAt { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lý do đổi lịch là bắt buộc.")]
        [StringLength(500, ErrorMessage = "Lý do đổi lịch không được vượt quá 500 ký tự.")]
        public string Reason { get; set; } = string.Empty;
    }
}
