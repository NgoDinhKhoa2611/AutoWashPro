using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Booking
{
    public class CancelBookingDto
    {
        [Required(ErrorMessage = "Lý do hủy là bắt buộc.")]
        [StringLength(500, ErrorMessage = "Lý do hủy không được vượt quá 500 ký tự.")]
        public string Reason { get; set; } = string.Empty;
    }
}
