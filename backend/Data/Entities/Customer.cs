using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("customers")]
    public class Customer
    {
        [Key]
        public int CustomerId { get; set; }

        [Required]
        public int AccountId { get; set; }

        [Required]
        [MaxLength(20)]
        public string MembershipCode { get; set; } = string.Empty;

        [Required]
        public int TierId { get; set; }

        public int PointBalance { get; set; } = 0;

        public int LifetimePoints { get; set; } = 0;

        public int RankingBalance { get; set; } = 0;

        public int TotalVisits { get; set; } = 0;

        public int TotalSpend { get; set; } = 0;

        public DateTime JoinedAt { get; set; } = DateTime.Now;

        public DateTime? LastVisitAt { get; set; }

        // Navigation properties
        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; } = null!;

        [ForeignKey("TierId")]
        public virtual Tier Tier { get; set; } = null!;

        public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<RewardRedemption> RewardRedemptions { get; set; } = new List<RewardRedemption>();
        public virtual ICollection<LoyaltyTransaction> LoyaltyTransactions { get; set; } = new List<LoyaltyTransaction>();
        public virtual ICollection<Queue> Queues { get; set; } = new List<Queue>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
