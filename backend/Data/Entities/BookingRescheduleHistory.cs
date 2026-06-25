using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("bookingreschedulehistories")]
    public class BookingRescheduleHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int BookingId { get; set; }

        [Required]
        public DateTime OldScheduledAt { get; set; }

        [Required]
        public DateTime NewScheduledAt { get; set; }

        [Required]
        [MaxLength(100)]
        public string ChangedBy { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Reason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;
    }
}
