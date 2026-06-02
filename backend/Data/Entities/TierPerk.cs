using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("TierPerks")]
    public class TierPerk
    {
        [Key]
        public int PerkId { get; set; }

        [Required]
        public int TierId { get; set; }

        [Required]
        [MaxLength(30)]
        public string PerkType { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal PerkValue { get; set; }

        public int? ServiceId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Description { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("TierId")]
        public virtual Tier Tier { get; set; } = null!;

        [ForeignKey("ServiceId")]
        public virtual Service? Service { get; set; }
    }
}
