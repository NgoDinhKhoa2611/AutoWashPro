-- ============================================================
--  AutoWash Pro — PostgreSQL (Supabase) Database Schema
-- ============================================================

-- 1. OtpVerifications
CREATE TABLE OtpVerifications (
    OtpId SERIAL PRIMARY KEY,
    Email VARCHAR(150) NOT NULL,
    Code VARCHAR(6) NOT NULL,
    ExpiresAt TIMESTAMP NOT NULL,
    IsUsed BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otp_email ON OtpVerifications (Email);

-- 2. Tiers
CREATE TABLE Tiers (
    TierId SERIAL PRIMARY KEY,
    TierName VARCHAR(20) NOT NULL,
    MinRankingBalance INT NOT NULL DEFAULT 0,
    BookingWindowDays INT NOT NULL,
    QueuePriority INT NOT NULL,
    PointMultiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    DiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    BadgeColor INT NULL,
    SortOrder INT NOT NULL DEFAULT 0
);

-- 3. Accounts
CREATE TABLE Accounts (
    AccountId SERIAL PRIMARY KEY,
    GoogleId VARCHAR(100) NULL UNIQUE,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Phone VARCHAR(10) NOT NULL UNIQUE,
    PasswordHash VARCHAR(256) NULL,
    Role INT NOT NULL DEFAULT 3,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Services
CREATE TABLE Services (
    ServiceId SERIAL PRIMARY KEY,
    ServiceName VARCHAR(100) NOT NULL,
    Description VARCHAR(500) NULL,
    Category INT NOT NULL,
    BasePrice INT NOT NULL,
    EstimatedMinutes INT NOT NULL,
    IsAddOn BOOLEAN NOT NULL DEFAULT FALSE,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    IsFeatured BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Customers
CREATE TABLE Customers (
    CustomerId SERIAL PRIMARY KEY,
    AccountId INT NOT NULL UNIQUE REFERENCES Accounts(AccountId) ON DELETE CASCADE ON UPDATE CASCADE,
    MembershipCode VARCHAR(20) NOT NULL UNIQUE,
    TierId INT NOT NULL REFERENCES Tiers(TierId) ON DELETE RESTRICT ON UPDATE CASCADE,
    PointBalance INT NOT NULL DEFAULT 0,
    LifetimePoints INT NOT NULL DEFAULT 0,
    RankingBalance INT NOT NULL DEFAULT 0,
    TotalVisits INT NOT NULL DEFAULT 0,
    TotalSpend INT NOT NULL DEFAULT 0,
    JoinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastVisitAt TIMESTAMP NULL
);

-- 6. Vehicles
CREATE TABLE Vehicles (
    VehicleId SERIAL PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(CustomerId) ON DELETE CASCADE ON UPDATE CASCADE,
    LicensePlate VARCHAR(20) NOT NULL,
    Brand VARCHAR(50) NULL,
    Name VARCHAR(50) NULL,
    RegisteredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (CustomerId, LicensePlate)
);
CREATE INDEX idx_vehicles_plate ON Vehicles(LicensePlate);

-- 7. TierPerks
CREATE TABLE TierPerks (
    PerkId SERIAL PRIMARY KEY,
    TierId INT NOT NULL REFERENCES Tiers(TierId) ON DELETE CASCADE ON UPDATE CASCADE,
    PerkType VARCHAR(30) NOT NULL,
    PerkValue DECIMAL(10,2) NOT NULL,
    ServiceId INT NULL REFERENCES Services(ServiceId) ON DELETE SET NULL ON UPDATE CASCADE,
    Description VARCHAR(200) NOT NULL,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. LoyaltyConfig
CREATE TABLE LoyaltyConfig (
    ConfigId SERIAL PRIMARY KEY,
    PointsPerThousandVND INT NOT NULL DEFAULT 1,
    PointExpiryMonths INT NOT NULL DEFAULT 12,
    TierReviewDayOfMonth INT NOT NULL DEFAULT 1,
    RankingWindowYears INT NOT NULL DEFAULT 2,
    UpdatedAt TIMESTAMP NULL,
    UpdatedBy INT NULL REFERENCES Accounts(AccountId) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 9. Rewards
CREATE TABLE Rewards (
    RewardId SERIAL PRIMARY KEY,
    RewardName VARCHAR(100) NOT NULL,
    Description VARCHAR(300) NULL,
    PointCost INT NOT NULL,
    RewardType VARCHAR(30) NOT NULL,
    DiscountValue DECIMAL(10,2) NULL,
    ServiceId INT NULL REFERENCES Services(ServiceId) ON DELETE SET NULL ON UPDATE CASCADE,
    MinTierId INT NULL REFERENCES Tiers(TierId) ON DELETE SET NULL ON UPDATE CASCADE,
    ValidDays INT NOT NULL DEFAULT 30,
    StockLimit INT NULL,
    RedeemedCount INT NOT NULL DEFAULT 0,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE
);

-- 10. Campaigns
CREATE TABLE Campaigns (
    CampaignId SERIAL PRIMARY KEY,
    CampaignName VARCHAR(150) NOT NULL,
    Description VARCHAR(500) NULL,
    TargetTierMinId INT NULL REFERENCES Tiers(TierId) ON DELETE SET NULL ON UPDATE CASCADE,
    BonusPointMultiplier DECIMAL(4,2) NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Status INT NOT NULL DEFAULT 0,
    PromoCode VARCHAR(30) NULL UNIQUE,
    DiscountValue INT NULL,
    MinSpendValue INT NOT NULL DEFAULT 0,
    UsageLimit INT NULL,
    UsedCount INT NOT NULL DEFAULT 0,
    CreatedBy INT NOT NULL REFERENCES Accounts(AccountId) ON DELETE RESTRICT ON UPDATE CASCADE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bookings (Tạo trước, chưa có FK tới RewardRedemptions)
CREATE TABLE Bookings (
    BookingId SERIAL PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(CustomerId) ON DELETE RESTRICT ON UPDATE CASCADE,
    VehicleId INT NOT NULL REFERENCES Vehicles(VehicleId) ON DELETE RESTRICT ON UPDATE CASCADE,
    ScheduledAt TIMESTAMP NOT NULL,
    Status INT NOT NULL DEFAULT 1,
    BasePrice INT NOT NULL,
    TierDiscount INT NOT NULL DEFAULT 0,
    PromoDiscount INT NOT NULL DEFAULT 0,
    PointsDiscount INT NOT NULL DEFAULT 0,
    FinalPrice INT NOT NULL,
    PointsEarned INT NOT NULL DEFAULT 0,
    PointsRedeemed INT NOT NULL DEFAULT 0,
    PromoCodeId INT NULL REFERENCES Campaigns(CampaignId) ON DELETE SET NULL ON UPDATE CASCADE,
    RedemptionId INT NULL, 
    Notes VARCHAR(500) NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PaymentMethod INT NOT NULL DEFAULT 1,
    CashAmount INT NULL,
    PointsUsed INT NULL,
    PointsValueVND INT NULL,
    PaidAt TIMESTAMP NULL,
    Stars SMALLINT NULL,
    ReviewText VARCHAR(1000) NULL,
    RatingTags VARCHAR(200) NULL,
    RatingBonusPoints INT NULL
);
CREATE INDEX idx_bookings_customerid ON Bookings(CustomerId);
CREATE INDEX idx_bookings_scheduledat ON Bookings(ScheduledAt);
CREATE INDEX idx_bookings_status ON Bookings(Status);

-- 12. RewardRedemptions
CREATE TABLE RewardRedemptions (
    RedemptionId SERIAL PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(CustomerId) ON DELETE CASCADE ON UPDATE CASCADE,
    RewardId INT NOT NULL REFERENCES Rewards(RewardId) ON DELETE RESTRICT ON UPDATE CASCADE,
    BookingId INT NULL REFERENCES Bookings(BookingId) ON DELETE SET NULL ON UPDATE CASCADE,
    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
    ExpiresAt TIMESTAMP NOT NULL,
    RedeemedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UsedAt TIMESTAMP NULL
);
CREATE INDEX idx_redemptions_customerid ON RewardRedemptions(CustomerId);
CREATE INDEX idx_redemptions_customer_status ON RewardRedemptions(CustomerId, Status);

-- Bổ sung Khóa ngoại chéo cho Bookings
ALTER TABLE Bookings
ADD CONSTRAINT fk_bookings_redemptionid 
FOREIGN KEY (RedemptionId) REFERENCES RewardRedemptions(RedemptionId) ON DELETE SET NULL ON UPDATE CASCADE;

-- 13. BookingServices
CREATE TABLE BookingServices (
    BookingServiceId SERIAL PRIMARY KEY,
    BookingId INT NOT NULL REFERENCES Bookings(BookingId) ON DELETE CASCADE ON UPDATE CASCADE,
    ServiceId INT NOT NULL REFERENCES Services(ServiceId) ON DELETE RESTRICT ON UPDATE CASCADE,
    PriceSnapshot INT NOT NULL,
    UNIQUE (BookingId, ServiceId)
);

-- 14. LoyaltyTransactions
CREATE TABLE LoyaltyTransactions (
    TransactionId SERIAL PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(CustomerId) ON DELETE RESTRICT ON UPDATE CASCADE,
    Points INT NOT NULL,
    TransactionType VARCHAR(20) NOT NULL,
    BookingId INT NULL REFERENCES Bookings(BookingId) ON DELETE SET NULL ON UPDATE CASCADE,
    RedemptionId INT NULL REFERENCES RewardRedemptions(RedemptionId) ON DELETE SET NULL ON UPDATE CASCADE,
    ExpiryDate DATE NULL,
    IsExpired BOOLEAN NOT NULL DEFAULT FALSE,
    FromTierId INT NULL REFERENCES Tiers(TierId) ON DELETE SET NULL ON UPDATE CASCADE,
    ToTierId INT NULL REFERENCES Tiers(TierId) ON DELETE SET NULL ON UPDATE CASCADE,
    Note VARCHAR(300) NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_lt_customerid ON LoyaltyTransactions(CustomerId);
CREATE INDEX idx_lt_type ON LoyaltyTransactions(TransactionType);
CREATE INDEX idx_lt_expiry ON LoyaltyTransactions(ExpiryDate, IsExpired);

-- 15. Queue
CREATE TABLE Queue (
    QueueId SERIAL PRIMARY KEY,
    BookingId INT NULL REFERENCES Bookings(BookingId) ON DELETE SET NULL ON UPDATE CASCADE,
    VehicleId INT NULL REFERENCES Vehicles(VehicleId) ON DELETE SET NULL ON UPDATE CASCADE,
    CustomerId INT NULL REFERENCES Customers(CustomerId) ON DELETE SET NULL ON UPDATE CASCADE,
    LicensePlate VARCHAR(20) NOT NULL,
    CustomerName VARCHAR(100) NULL,
    TierId INT NULL REFERENCES Tiers(TierId) ON DELETE SET NULL ON UPDATE CASCADE,
    Status VARCHAR(30) NOT NULL DEFAULT 'Waiting',
    Position INT NOT NULL,
    CheckInAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    StartedAt TIMESTAMP NULL,
    CompletedAt TIMESTAMP NULL,
    StaffNote VARCHAR(300) NULL
);
CREATE INDEX idx_queue_status ON Queue(Status);
CREATE INDEX idx_queue_plate ON Queue(LicensePlate);

-- 16. Notifications
CREATE TABLE Notifications (
    NotificationId SERIAL PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(CustomerId) ON DELETE CASCADE ON UPDATE CASCADE,
    Title VARCHAR(150) NOT NULL,
    Message VARCHAR(500) NOT NULL,
    Type VARCHAR(20) NOT NULL,
    IsRead BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_customerid ON Notifications(CustomerId);
CREATE INDEX idx_notifications_isread ON Notifications(CustomerId, IsRead);

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO Tiers (TierName, MinRankingBalance, BookingWindowDays, QueuePriority, PointMultiplier, DiscountPercent, BadgeColor, SortOrder)
VALUES
    ('Member',   0,          7,  1, 1.00, 0.00,  NULL, 1),
    ('Silver',   2000000,    10, 2, 1.20, 5.00,  NULL, 2),
    ('Gold',     5000000,    12, 3, 1.50, 10.00, NULL, 3),
    ('Platinum', 15000000,   14, 4, 2.00, 15.00, NULL, 4);

INSERT INTO LoyaltyConfig (ConfigId, PointsPerThousandVND, PointExpiryMonths, TierReviewDayOfMonth, RankingWindowYears)
VALUES (1, 1, 12, 1, 2);

INSERT INTO Services (ServiceName, Description, Category, BasePrice, EstimatedMinutes, IsAddOn, IsActive, IsFeatured)
VALUES
    ('Rửa Basic',         'Rửa ngoài thân xe, lau khô cơ bản',                 1, 50000,  20, FALSE, TRUE, FALSE),
    ('Rửa Premium',       'Rửa trong ngoài, hút bụi nội thất, lau gương',       2, 120000, 40, FALSE, TRUE, TRUE),
    ('Rửa Deluxe',        'Premium + đánh bóng sơn + dưỡng nhựa nội thất',     3, 220000, 70, FALSE, TRUE, TRUE),
    ('Nano Ceramic',      'Phủ lớp bảo vệ nano ceramic chống bám bẩn',          4, 80000,  20, TRUE,  TRUE, FALSE),
    ('Làm thơm cabin',    'Xịt thơm khử mùi toàn bộ nội thất',                 4, 30000,  5,  TRUE,  TRUE, FALSE),
    ('Đánh bóng la-zăng', 'Làm sạch và đánh bóng 4 bánh xe',                   4, 50000,  15, TRUE,  TRUE, FALSE),
    ('Dưỡng da ghế',      'Dưỡng ẩm và bảo vệ bọc da ghế',                     4, 60000,  15, TRUE,  TRUE, FALSE);