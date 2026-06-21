using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("reviews")]
    public class Review
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("bookingid")]
        public int BookingId { get; set; }

        [Required]
        [Column("customerid")]
        public int CustomerId { get; set; }

        [Required]
        [Range(1, 5)]
        [Column("rating")]
        public int Rating { get; set; }

        [MaxLength(1000)]
        [Column("comment")]
        public string? Comment { get; set; }

        [Required]
        [Column("createdat")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;
    }
}
