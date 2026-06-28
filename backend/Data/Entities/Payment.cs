using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("payments")]
    public class Payment
    {
        [Key]
        public int PaymentId { get; set; }

        [Required]
        public int BookingId { get; set; }

        [Required]
        public int PaymentMethod { get; set; }

        [Required]
        public int Amount { get; set; }

        [Required]
        public int Status { get; set; }

        [MaxLength(100)]
        public string? TxnRef { get; set; }

        [MaxLength(100)]
        public string? TransactionNo { get; set; }

        [MaxLength(50)]
        public string? ResponseCode { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime? PaidAt { get; set; }

        // Navigation properties
        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;
    }
}
