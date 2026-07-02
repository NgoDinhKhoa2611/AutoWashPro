using System;

namespace Auto_Wash.DTOs.Booking
{
    /// <summary>
    /// Ảnh đính kèm inline trong email (giữ trong memory, không lưu DB/disk).
    /// </summary>
    public class EmailInlinePhoto
    {
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "image/jpeg";
        public byte[] Data { get; set; } = Array.Empty<byte>();
    }
}
