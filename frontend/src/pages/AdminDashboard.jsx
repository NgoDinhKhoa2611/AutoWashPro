import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/admin/dashboard.css";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    revenue7Days: [432000, 216000, 108000, 756000, 540000, 130000, 85000],
    totalRevenue: 2267000,
    prevTotalRevenue: 1950000,
    activeQueue: 0,
    avgMinutes: 22,
    avgStars: 4.8,
    tierDistribution: { Platinum: 1, Gold: 2, Silver: 3, Member: 5 },
    dayLabels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  });

  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pointsPerThousandVND: 1,
    pointExpiryMonths: 12,
    tierReviewDayOfMonth: 1,
    rankingWindowYears: 2,
    tiers: [
      {
        tierId: 1,
        tierName: "Standard",
        minRankingBalance: 0,
        pointMultiplier: 1.0,
        discountPercent: 0,
        bookingWindowDays: 7,
      },
      {
        tierId: 2,
        tierName: "Silver",
        minRankingBalance: 500,
        pointMultiplier: 1.1,
        discountPercent: 2,
        bookingWindowDays: 10,
      },
      {
        tierId: 3,
        tierName: "Gold",
        minRankingBalance: 2000,
        pointMultiplier: 1.2,
        discountPercent: 5,
        bookingWindowDays: 12,
      },
      {
        tierId: 4,
        tierName: "Platinum",
        minRankingBalance: 5000,
        pointMultiplier: 1.5,
        discountPercent: 10,
        bookingWindowDays: 14,
      },
    ],
  });

  const [reviewList, setReviewList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats"); // 'stats' | 'loyalty' | 'tierReview'

  // Realtime counters from localStorage
  const [realtimeCounters, setRealtimeCounters] = useState({
    todayRevenue: 0,
    todayBookingsCount: 0,
    waitingCount: 0,
    washingCount: 0,
    completedCount: 0,
    voucherUsedCount: 3,
    loyaltyPointsGrantedToday: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    calculateRealtimeStats();

    const intervalId = setInterval(() => {
      calculateRealtimeStats();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const calculateRealtimeStats = async () => {
    try {
      const response = await adminService.getQueue();
      if (response) {
        const waiting = response.filter(
          (item) => item.status === "Waiting",
        ).length;
        const washing = response.filter(
          (item) => item.status === "Washing" || item.status === "Drying",
        ).length;
        const completed = response.filter(
          (item) => item.status === "Completed",
        ).length;

        // Calculate revenue from completed orders today
        const completedRevenue = response
          .filter((item) => item.status === "Completed")
          .reduce((sum, item) => sum + (item.finalPrice || 0), 0);

        const pointsGranted = response
          .filter((item) => item.status === "Completed")
          .reduce((sum, item) => sum + (item.pointsEarned || 0), 0);

        setRealtimeCounters({
          todayRevenue: completedRevenue,
          todayBookingsCount: response.length,
          waitingCount: waiting,
          washingCount: washing,
          completedCount: completed,
          voucherUsedCount: 0,
          loyaltyPointsGrantedToday: pointsGranted,
        });
      }
    } catch (e) {
      console.error("Lỗi khi tính toán chỉ số thời gian thực:", e);
      setRealtimeCounters({
        todayRevenue: 0,
        todayBookingsCount: 0,
        waitingCount: 0,
        washingCount: 0,
        completedCount: 0,
        voucherUsedCount: 0,
        loyaltyPointsGrantedToday: 0,
      });
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch data using service endpoints or mock fallback
      let statsRes = null;
      try {
        statsRes = await adminService.getDashboardStats();
      } catch {
        statsRes = {
          revenue7Days: [432000, 216000, 108000, 756000, 540000, 130000, 85000],
          totalRevenue: 2267000,
          prevTotalRevenue: 1950000,
          activeQueue: 0,
          avgMinutes: 22,
          avgStars: 4.8,
          tierDistribution: { Platinum: 1, Gold: 2, Silver: 3, Member: 5 },
          dayLabels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
        };
      }
      setStats(statsRes);

      let configRes = null;
      try {
        configRes = await adminService.getLoyaltyConfig();
      } catch {
        configRes = {
          pointsPerThousandVND: 1,
          pointExpiryMonths: 12,
          tierReviewDayOfMonth: 1,
          rankingWindowYears: 2,
          tiers: [
            {
              tierId: 1,
              tierName: "Standard",
              minRankingBalance: 0,
              pointMultiplier: 1.0,
              discountPercent: 0,
              bookingWindowDays: 7,
            },
            {
              tierId: 2,
              tierName: "Silver",
              minRankingBalance: 500,
              pointMultiplier: 1.1,
              discountPercent: 2,
              bookingWindowDays: 10,
            },
            {
              tierId: 3,
              tierName: "Gold",
              minRankingBalance: 2000,
              pointMultiplier: 1.2,
              discountPercent: 5,
              bookingWindowDays: 12,
            },
            {
              tierId: 4,
              tierName: "Platinum",
              minRankingBalance: 5000,
              pointMultiplier: 1.5,
              discountPercent: 10,
              bookingWindowDays: 14,
            },
          ],
        };
      }
      setLoyaltyConfig(configRes);

      try {
        const reviewRes = await adminService.tierReview();
        setReviewList(reviewRes || []);
      } catch (e) {
        console.error("Lỗi khi lấy danh sách dự báo thăng hạng:", e);
        setReviewList([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await adminService.saveLoyaltyConfig({
        PointsPerThousandVND: loyaltyConfig.pointsPerThousandVND,
        PointExpiryMonths: loyaltyConfig.pointExpiryMonths,
        TierReviewDayOfMonth: loyaltyConfig.tierReviewDayOfMonth,
        RankingWindowYears: loyaltyConfig.rankingWindowYears,
        TierUpdates: loyaltyConfig.tiers.map((t) => ({
          TierId: t.tierId,
          PointMultiplier: t.pointMultiplier,
          DiscountPercent: t.discountPercent,
          BookingWindowDays: t.bookingWindowDays,
        })),
      });

      if (response.success) {
        if (window.showToast)
          window.showToast(
            "Lưu cấu hình AutoWash Loyalty thành công!",
            "success",
          );
      } else {
        if (window.showToast)
          window.showToast(
            response.message || "Lưu cấu hình thất bại!",
            "error",
          );
      }
    } catch (err) {
      console.error(err);
      if (window.showToast)
        window.showToast("Lỗi kết nối khi lưu cấu hình!", "error");
    }
  };

  const handleRunTierReview = async () => {
    const run = async () => {
      if (window.showToast) {
        window.showToast(
          "Đang chạy xếp hạng định kỳ cho tất cả khách hàng...",
          "info",
        );
      }
      try {
        const response = await adminService.runTierReview();
        if (response.success) {
          if (window.showToast) {
            window.showToast(
              `Đã áp dụng thăng/hạ hạng Loyalty thành công (Thăng hạng: ${response.upgrades}, Hạ hạng: ${response.downgrades})!`,
              "success",
            );
          }
          fetchDashboardData();
        } else {
          if (window.showToast)
            window.showToast("Lỗi khi chạy xếp hạng định kỳ!", "error");
        }
      } catch (err) {
        console.error(err);
        if (window.showToast)
          window.showToast("Lỗi kết nối khi chạy xếp hạng định kỳ!", "error");
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        "Chạy Xếp Hạng Định Kỳ",
        "Bạn có chắc chắn muốn áp dụng xếp hạng mới cho toàn bộ khách hàng ngay bây giờ?",
        run,
      );
    } else {
      if (window.confirm("Chạy xếp hạng?")) {
        run();
      }
    }
  };

  const handleUpdateTierConfig = (idx, field, val) => {
    const updatedTiers = [...loyaltyConfig.tiers];
    updatedTiers[idx] = { ...updatedTiers[idx], [field]: Number(val) };
    setLoyaltyConfig({ ...loyaltyConfig, tiers: updatedTiers });
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 text-start">
      {/* Header and navigation tabs */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-3 border-bottom pb-3">
        <div>
          <h4
            className="fw-bold mb-1 text-dark"
            style={{ letterSpacing: "-0.5px" }}
          >
            BẢNG ĐIỀU KHIỂN HỆ THỐNG
          </h4>
          <p className="text-secondary small mb-0">
            Hệ thống quản lý, giám sát và cấu hình đặc quyền rửa xe thông minh
          </p>
        </div>
        <div className="dashboard-tabs d-flex bg-white shadow-sm p-1 rounded-3 gap-1">
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "stats" ? "active" : ""
            }`}
            onClick={() => setActiveTab("stats")}
          >
            <i className="fas fa-chart-line me-2"></i>Thống kê vận hành
          </button>
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "loyalty" ? "active" : ""
            }`}
            onClick={() => setActiveTab("loyalty")}
          >
            <i className="fas fa-cogs me-2"></i>Cấu hình Loyalty
          </button>
          <button
            className={`btn btn-sm px-3 border-0 dashboard-tab ${
              activeTab === "tierReview" ? "active" : ""
            }`}
            onClick={() => setActiveTab("tierReview")}
          >
            <i className="fas fa-users-cog me-2"></i>Xếp hạng tháng
          </button>
        </div>
      </div>

      {activeTab === "stats" && (
        <>
          {/* 8 KPI Cards Grid */}
          <div className="row g-3 mb-4">
            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  DOANH THU HÔM NAY
                </small>
                <h4 className="fw-bold text-cyan mt-1 mb-1">
                  {realtimeCounters.todayRevenue.toLocaleString()}đ
                </h4>
                <small
                  className="text-success fw-bold"
                  style={{ fontSize: "0.68rem" }}
                >
                  <i className="fas fa-trending-up me-1"></i>Đã thanh toán thực
                  tế
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  LỊCH ĐẶT HÔM NAY
                </small>
                <h4 className="fw-bold text-dark mt-1 mb-1">
                  {realtimeCounters.todayBookingsCount} lượt
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Đặt hẹn từ app khách hàng
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  XE ĐANG CHỜ RỬA
                </small>
                <h4 className="fw-bold text-warning mt-1 mb-1">
                  {realtimeCounters.waitingCount} xe
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Đang đợi check-in
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  XE ĐANG RỬA & SẤY
                </small>
                <h4 className="fw-bold text-primary mt-1 mb-1">
                  {realtimeCounters.washingCount} xe
                </h4>
                <small
                  className="text-cyan fw-bold"
                  style={{ fontSize: "0.68rem" }}
                >
                  Đang thực hiện công việc
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  HOÀN THÀNH HÔM NAY
                </small>
                <h4 className="fw-bold text-success mt-1 mb-1">
                  {realtimeCounters.completedCount} xe
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Đã qua quy trình rửa
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  VOUCHER ĐÃ DÙNG
                </small>
                <h4 className="fw-bold text-danger mt-1 mb-1">
                  {realtimeCounters.voucherUsedCount} voucher
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Áp dụng ưu đãi giảm giá
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  LOYALTY POINTS ĐÃ CỘNG
                </small>
                <h4 className="fw-bold text-warning mt-1 mb-1">
                  +{realtimeCounters.loyaltyPointsGrantedToday} PTS
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Tích điểm cho khách hàng
                </small>
              </div>
            </div>

            <div className="col-lg-3 col-sm-6">
              <div className="app-card border-0 p-3.5 bg-white rounded-4 h-100">
                <small
                  className="text-muted d-block fw-bold"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  ĐÁNH GIÁ TRUNG BÌNH
                </small>
                <h4 className="fw-bold text-warning mt-1 mb-1">
                  {stats.avgStars}{" "}
                  <i
                    className="fas fa-star"
                    style={{ color: "#ffcf33", fontSize: "1.1rem" }}
                  ></i>
                </h4>
                <small
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  Lượt phản hồi từ khách hàng
                </small>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Revenue Chart */}
            <div className="col-lg-8">
              <div
                className="app-card border-0 shadow-sm p-4 bg-white rounded-4"
                style={{ minHeight: "380px" }}
              >
                <h5
                  className="fw-bold mb-4"
                  style={{ color: "var(--navy-dark)", fontSize: "0.95rem" }}
                >
                  <i className="fas fa-chart-bar text-cyan me-2"></i>BIỂU ĐỒ
                  DOANH THU CHI TIẾT 7 NGÀY GẦN NHẤT
                </h5>
                <div
                  className="d-flex align-items-end justify-content-between px-3 mt-5"
                  style={{
                    height: "220px",
                    borderBottom: "1.5px solid #f1f5f9",
                  }}
                >
                  {stats.revenue7Days.map((val, idx) => {
                    const max = Math.max(...stats.revenue7Days) || 1;
                    const pct = Math.max(10, Math.round((val / max) * 100));
                    return (
                      <div
                        key={idx}
                        className="text-center d-flex flex-column align-items-center"
                        style={{ flex: 1 }}
                      >
                        <small
                          className="text-cyan fw-bold mb-2"
                          style={{ fontSize: "0.68rem" }}
                        >
                          {val > 0 ? `${Math.round(val / 1000)}k` : "0"}
                        </small>
                        <div
                          className="w-50 rounded-top animate-pulse"
                          style={{
                            height: `${pct * 1.5}px`,
                            background:
                              "linear-gradient(180deg, #0ea5e9 0%, rgba(14,165,233,0.2) 100%)",
                            boxShadow: "0 4px 12px rgba(14,165,233,0.1)",
                            transition: "height 0.8s ease",
                          }}
                        ></div>
                        <small
                          className="text-muted fw-semibold mt-2"
                          style={{ fontSize: "0.72rem" }}
                        >
                          {stats.dayLabels[idx]}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Loyalty Tier distribution */}
            <div className="col-lg-4">
              <div
                className="app-card border-0 shadow-sm p-4 bg-white rounded-4"
                style={{ minHeight: "380px" }}
              >
                <h5
                  className="fw-bold mb-4"
                  style={{ color: "var(--navy-dark)", fontSize: "0.95rem" }}
                >
                  <i className="fas fa-chart-pie text-cyan me-2"></i>PHÂN BỐ
                  THÀNH VIÊN LOYALTY
                </h5>
                <div className="d-flex flex-column gap-3.5 mt-3">
                  {Object.entries(stats.tierDistribution).map(
                    ([tier, count]) => {
                      const total =
                        Object.values(stats.tierDistribution).reduce(
                          (s, i) => s + i,
                          0,
                        ) || 1;
                      const pct = Math.round((count / total) * 100);

                      const colors = {
                        Platinum: "bg-primary",
                        Gold: "bg-warning",
                        Silver: "bg-secondary",
                        Member: "bg-dark",
                      };

                      return (
                        <div key={tier} className="text-start">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-dark">
                              {tier} Loyalty
                            </span>
                            <span className="text-muted small fw-bold">
                              {count} thành viên ({pct}%)
                            </span>
                          </div>
                          <div
                            className="progress"
                            style={{ height: "6px", borderRadius: "10px" }}
                          >
                            <div
                              className={`progress-bar ${colors[tier] || "bg-cyan"}`}
                              style={{ width: `${pct}%`, borderRadius: "10px" }}
                            ></div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "loyalty" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <h5
            className="fw-bold mb-4 border-bottom pb-2.5"
            style={{ color: "var(--navy-dark)" }}
          >
            <i className="fas fa-cogs text-cyan me-2"></i>CẤU HÌNH QUY CHẾ ĐẶC
            QUYỀN AUTOWASH LOYALTY
          </h5>
          <form onSubmit={handleSaveLoyaltyConfig}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  SỐ ĐIỂM TÍCH LŨY / 1.000đ CHI TIÊU
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.pointsPerThousandVND}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      pointsPerThousandVND: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  HẠN DÙNG ĐIỂM LOYALTY (THÁNG)
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.pointExpiryMonths}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      pointExpiryMonths: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  NGÀY XẾP HẠNG THÀNH VIÊN
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.tierReviewDayOfMonth}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      tierReviewDayOfMonth: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">
                  VÒNG REVIEW (NĂM)
                </label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5 rounded-3 text-dark fw-bold"
                  value={loyaltyConfig.rankingWindowYears}
                  onChange={(e) =>
                    setLoyaltyConfig({
                      ...loyaltyConfig,
                      rankingWindowYears: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <h6
              className="fw-bold mb-3 mt-4"
              style={{ color: "var(--navy-dark)" }}
            >
              ĐẶC QUYỀN VIP CHO TỪNG PHÂN HẠNG LOYALTY
            </h6>

            {/* Visual Tier Cards instead of flat table */}
            <div className="row g-3">
              {loyaltyConfig.tiers.map((t, i) => {
                const colors = {
                  Standard: "linear-gradient(135deg, #64748b, #334155)",
                  Silver: "linear-gradient(135deg, #94a3b8, #475569)",
                  Gold: "linear-gradient(135deg, #fbbf24, #d97706)",
                  Platinum: "linear-gradient(135deg, #475569, #0f172a)",
                };

                return (
                  <div key={t.tierId} className="col-md-3">
                    <div
                      className="p-3 rounded-4 border text-white shadow-sm h-100 d-flex flex-column justify-content-between"
                      style={{ background: colors[t.tierName] || "#0f172a" }}
                    >
                      <div>
                        <div
                          className="fw-bold text-uppercase"
                          style={{ fontSize: "0.9rem", letterSpacing: "0.5px" }}
                        >
                          {t.tierName} Loyalty
                        </div>
                        <small className="opacity-75 d-block mt-1">
                          Ngưỡng điểm tối thiểu:{" "}
                          <strong>
                            {t.minRankingBalance.toLocaleString()} pts
                          </strong>
                        </small>
                      </div>

                      <div
                        className="mt-3 d-flex flex-column gap-2 bg-white bg-opacity-10 p-2.5 rounded-3 text-start"
                        style={{ fontSize: "0.72rem" }}
                      >
                        <div>
                          <label className="opacity-75 d-block">
                            HỆ SỐ ĐIỂM
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                            style={{ outline: "none" }}
                            value={t.pointMultiplier}
                            onChange={(e) =>
                              handleUpdateTierConfig(
                                i,
                                "pointMultiplier",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="opacity-75 d-block">
                            CHIẾT KHẤU (%)
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                            value={t.discountPercent}
                            onChange={(e) =>
                              handleUpdateTierConfig(
                                i,
                                "discountPercent",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="opacity-75 d-block">
                            ĐẶT LỊCH TRƯỚC (NGÀY)
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm bg-transparent border-0 text-white fw-bold p-0"
                            value={t.bookingWindowDays}
                            onChange={(e) =>
                              handleUpdateTierConfig(
                                i,
                                "bookingWindowDays",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="app-btn-primary py-2.5 px-5 mt-4 text-dark fw-bold border-0"
              style={{
                borderRadius: "12px",
                background: "var(--cyan-electric)",
              }}
            >
              LƯU CẤU HÌNH QUY CHẾ LOYALTY
            </button>
          </form>
        </div>
      )}

      {activeTab === "tierReview" && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-2.5">
            <div>
              <h5
                className="fw-bold mb-1"
                style={{ color: "var(--navy-dark)" }}
              >
                <i className="fas fa-users-cog text-cyan me-2"></i>CHẠY XẾP HẠNG
                THÀNH VIÊN ĐỊNH KỲ
              </h5>
              <p className="text-secondary small mb-0">
                Hệ thống phân tích mức tích lũy trượt chi tiêu của khách hàng để
                tự động cập nhật VIP Tier
              </p>
            </div>
            <button
              className="app-btn-primary py-2 px-4 shadow-none border-0 text-dark fw-bold"
              style={{
                borderRadius: "10px",
                background: "var(--cyan-electric)",
              }}
              onClick={handleRunTierReview}
            >
              <i className="fas fa-play me-2"></i>ÁP DỤNG XẾP HẠNG NGAY
            </button>
          </div>

          <h6 className="fw-bold mb-3" style={{ color: "var(--navy-dark)" }}>
            BẢNG DỰ ĐOÁN THAY ĐỔI HẠNG KHÁCH HÀNG
          </h6>
          <div className="table-responsive">
            <table className="table align-middle tier-review-table">
              <thead>
                <tr className="bg-light">
                  <th>Tên khách hàng</th>
                  <th>Hạng hiện tại</th>
                  <th className="text-end">Tích lũy chi tiêu</th>
                  <th>Dự báo hạng mới</th>
                  <th>Trạng thái</th>
                  <th>Lý do điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {reviewList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      Không có dữ liệu thay đổi hạng nào cần xem xét
                    </td>
                  </tr>
                ) : (
                  reviewList.map((item, idx) => {
                    const dirClass =
                      item.direction === "up"
                        ? "badge bg-success bg-opacity-10 text-success"
                        : item.direction === "down"
                          ? "badge bg-danger bg-opacity-10 text-danger"
                          : "badge bg-secondary bg-opacity-10 text-secondary";
                    const dirLabel =
                      item.direction === "up"
                        ? "NÂNG HẠNG"
                        : item.direction === "down"
                          ? "HẠ HẠNG"
                          : "GIỮ NGUYÊN";
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td className="fw-bold text-dark">{item.name}</td>
                        <td className="text-secondary">{item.currentTier}</td>
                        <td className="fw-bold text-cyan text-end">
                          {item.rankingBalance.toLocaleString()}
                        </td>
                        <td className="fw-bold text-warning">
                          {item.predictedTier}
                        </td>
                        <td>
                          <span
                            className={`${dirClass} px-3 py-1.5 rounded-pill fw-bold`}
                            style={{ fontSize: "0.62rem" }}
                          >
                            {dirLabel}
                          </span>
                        </td>
                        <td className="text-muted small">{item.reason}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
