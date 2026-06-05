using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("services")]
    public class Service
    {
        [Key]
        public int ServiceId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ServiceName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public int Category { get; set; } // 1=Basic | 2=Premium | 3=Deluxe | 4=AddOn

        public int BasePrice { get; set; }

        public int EstimatedMinutes { get; set; }

        public bool IsAddOn { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public bool IsFeatured { get; set; } = false;

        // Navigation properties
        public virtual ICollection<TierPerk> TierPerks { get; set; } = new List<TierPerk>();
        public virtual ICollection<Reward> Rewards { get; set; } = new List<Reward>();
        public virtual ICollection<BookingService> BookingServices { get; set; } = new List<BookingService>();
    }
}
