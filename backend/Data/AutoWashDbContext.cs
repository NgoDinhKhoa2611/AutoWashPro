using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Data
{
    public class AutoWashDbContext : DbContext
    {
        public AutoWashDbContext(DbContextOptions<AutoWashDbContext> options) : base(options)
        {
        }

        public DbSet<OtpVerification> OtpVerifications { get; set; } = null!;
        public DbSet<Tier> Tiers { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Service> Services { get; set; } = null!;
        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<Vehicle> Vehicles { get; set; } = null!;
        public DbSet<TierPerk> TierPerks { get; set; } = null!;
        public DbSet<LoyaltyConfig> LoyaltyConfigs { get; set; } = null!;
        public DbSet<Reward> Rewards { get; set; } = null!;
        public DbSet<Campaign> Campaigns { get; set; } = null!;
        public DbSet<Booking> Bookings { get; set; } = null!;
        public DbSet<RewardRedemption> RewardRedemptions { get; set; } = null!;
        public DbSet<BookingService> BookingServices { get; set; } = null!;
        public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; } = null!;
        public DbSet<Queue> Queues { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // 1. OtpVerifications
            builder.Entity<OtpVerification>()
                .HasIndex(o => o.Phone)
                .HasDatabaseName("idx_otp_email");

            // 2. Tiers (No special index or unique keys other than PK)

            // 3. Accounts
            builder.Entity<Account>()
                .HasIndex(a => a.GoogleId)
                .IsUnique()
                .HasDatabaseName("uq_accounts_googleid");

            builder.Entity<Account>()
                .HasIndex(a => a.Email)
                .IsUnique()
                .HasDatabaseName("uq_accounts_email");

            builder.Entity<Account>()
                .HasIndex(a => a.Phone)
                .IsUnique()
                .HasDatabaseName("uq_accounts_phone");

            // 4. Services (No special indices or unique keys other than PK)

            // 5. Customers
            builder.Entity<Customer>()
                .HasIndex(c => c.AccountId)
                .IsUnique()
                .HasDatabaseName("uq_customers_accountid");

            builder.Entity<Customer>()
                .HasIndex(c => c.MembershipCode)
                .IsUnique()
                .HasDatabaseName("uq_customers_membershipcode");

            builder.Entity<Customer>()
                .HasOne(c => c.Account)
                .WithOne(a => a.Customer)
                .HasForeignKey<Customer>(c => c.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Customer>()
                .HasOne(c => c.Tier)
                .WithMany(t => t.Customers)
                .HasForeignKey(c => c.TierId)
                .OnDelete(DeleteBehavior.Restrict);

            // 6. Vehicles
            builder.Entity<Vehicle>()
                .HasIndex(v => new { v.CustomerId, v.LicensePlate })
                .IsUnique()
                .HasDatabaseName("uq_vehicles_customer_plate");

            builder.Entity<Vehicle>()
                .HasIndex(v => v.LicensePlate)
                .HasDatabaseName("idx_vehicles_plate");

            builder.Entity<Vehicle>()
                .HasOne(v => v.Customer)
                .WithMany(c => c.Vehicles)
                .HasForeignKey(v => v.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // 7. TierPerks
            builder.Entity<TierPerk>()
                .HasOne(tp => tp.Tier)
                .WithMany(t => t.TierPerks)
                .HasForeignKey(tp => tp.TierId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TierPerk>()
                .HasOne(tp => tp.Service)
                .WithMany(s => s.TierPerks)
                .HasForeignKey(tp => tp.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            // 8. LoyaltyConfig
            builder.Entity<LoyaltyConfig>()
                .HasOne(lc => lc.UpdatedByAccount)
                .WithMany(a => a.UpdatedLoyaltyConfigs)
                .HasForeignKey(lc => lc.UpdatedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // 9. Rewards
            builder.Entity<Reward>()
                .HasOne(r => r.Service)
                .WithMany(s => s.Rewards)
                .HasForeignKey(r => r.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Reward>()
                .HasOne(r => r.MinTier)
                .WithMany()
                .HasForeignKey(r => r.MinTierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 10. Campaigns
            builder.Entity<Campaign>()
                .HasIndex(c => c.PromoCode)
                .IsUnique()
                .HasDatabaseName("uq_campaigns_promocode");

            builder.Entity<Campaign>()
                .HasOne(c => c.TargetTierMin)
                .WithMany()
                .HasForeignKey(c => c.TargetTierMinId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Campaign>()
                .HasOne(c => c.CreatedByAccount)
                .WithMany(a => a.CreatedCampaigns)
                .HasForeignKey(c => c.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // 11. Bookings
            builder.Entity<Booking>()
                .HasIndex(b => b.CustomerId)
                .HasDatabaseName("idx_bookings_customerid");

            builder.Entity<Booking>()
                .HasIndex(b => b.ScheduledAt)
                .HasDatabaseName("idx_bookings_scheduledat");

            builder.Entity<Booking>()
                .HasIndex(b => b.Status)
                .HasDatabaseName("idx_bookings_status");

            builder.Entity<Booking>()
                .HasOne(b => b.Customer)
                .WithMany(c => c.Bookings)
                .HasForeignKey(b => b.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Booking>()
                .HasOne(b => b.Vehicle)
                .WithMany(v => v.Bookings)
                .HasForeignKey(b => b.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Booking>()
                .HasOne(b => b.PromoCodeCampaign)
                .WithMany(c => c.Bookings)
                .HasForeignKey(b => b.PromoCodeId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Booking>()
                .HasOne(b => b.AppliedRedemption)
                .WithMany(r => r.AppliedBookings)
                .HasForeignKey(b => b.RedemptionId)
                .OnDelete(DeleteBehavior.SetNull);

            // 12. RewardRedemptions
            builder.Entity<RewardRedemption>()
                .HasIndex(r => r.CustomerId)
                .HasDatabaseName("idx_redemptions_customerid");

            builder.Entity<RewardRedemption>()
                .HasIndex(r => new { r.CustomerId, r.Status })
                .HasDatabaseName("idx_redemptions_customer_status");

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Customer)
                .WithMany(c => c.RewardRedemptions)
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Reward)
                .WithMany(rw => rw.RewardRedemptions)
                .HasForeignKey(r => r.RewardId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Booking)
                .WithMany(b => b.RelatedRedemptions)
                .HasForeignKey(r => r.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            // 13. BookingServices
            builder.Entity<BookingService>()
                .HasIndex(bs => new { bs.BookingId, bs.ServiceId })
                .IsUnique()
                .HasDatabaseName("uq_bookingservices");

            builder.Entity<BookingService>()
                .HasOne(bs => bs.Booking)
                .WithMany(b => b.BookingServices)
                .HasForeignKey(bs => bs.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<BookingService>()
                .HasOne(bs => bs.Service)
                .WithMany(s => s.BookingServices)
                .HasForeignKey(bs => bs.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // 14. LoyaltyTransactions
            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => lt.CustomerId)
                .HasDatabaseName("idx_lt_customerid");

            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => lt.TransactionType)
                .HasDatabaseName("idx_lt_type");

            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => new { lt.ExpiryDate, lt.IsExpired })
                .HasDatabaseName("idx_lt_expiry");

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.Customer)
                .WithMany(c => c.LoyaltyTransactions)
                .HasForeignKey(lt => lt.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.Booking)
                .WithMany(b => b.LoyaltyTransactions)
                .HasForeignKey(lt => lt.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.RewardRedemption)
                .WithMany(r => r.LoyaltyTransactions)
                .HasForeignKey(lt => lt.RedemptionId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.FromTier)
                .WithMany()
                .HasForeignKey(lt => lt.FromTierId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.ToTier)
                .WithMany()
                .HasForeignKey(lt => lt.ToTierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 15. Queue
            builder.Entity<Queue>()
                .HasIndex(q => q.Status)
                .HasDatabaseName("idx_queue_status");

            builder.Entity<Queue>()
                .HasIndex(q => q.LicensePlate)
                .HasDatabaseName("idx_queue_plate");

            builder.Entity<Queue>()
                .HasOne(q => q.Booking)
                .WithMany(b => b.Queues)
                .HasForeignKey(q => q.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Vehicle)
                .WithMany(v => v.Queues)
                .HasForeignKey(q => q.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Customer)
                .WithMany(c => c.Queues)
                .HasForeignKey(q => q.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Tier)
                .WithMany()
                .HasForeignKey(q => q.TierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 16. Notifications
            builder.Entity<Notification>()
                .HasIndex(n => n.CustomerId)
                .HasDatabaseName("idx_notifications_customerid");

            builder.Entity<Notification>()
                .HasIndex(n => new { n.CustomerId, n.IsRead })
                .HasDatabaseName("idx_notifications_isread");

            builder.Entity<Notification>()
                .HasOne(n => n.Customer)
                .WithMany(c => c.Notifications)
                .HasForeignKey(n => n.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
