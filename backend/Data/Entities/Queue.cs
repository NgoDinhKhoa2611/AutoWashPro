using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("Queue")]
    public class Queue
    {
        [Key]
        public int QueueId { get; set; }

        public int? BookingId { get; set; }

        public int? VehicleId { get; set; }

        public int? CustomerId { get; set; }

        [Required]
        [MaxLength(20)]
        public string LicensePlate { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? CustomerName { get; set; }

        public int? TierId { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Waiting";

        public int Position { get; set; }

        public DateTime CheckInAt { get; set; } = DateTime.Now;

        public DateTime? StartedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        [MaxLength(300)]
        public string? StaffNote { get; set; }

        // Navigation properties
        [ForeignKey("BookingId")]
        public virtual Booking? Booking { get; set; }

        [ForeignKey("VehicleId")]
        public virtual Vehicle? Vehicle { get; set; }

        [ForeignKey("CustomerId")]
        public virtual Customer? Customer { get; set; }

        [ForeignKey("TierId")]
        public virtual Tier? Tier { get; set; }
    }
}
