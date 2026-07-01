import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { customerService } from "../services/customerService";
import { queueStatusMapper } from "../utils/queueStatusMapper";
import "../styles/shared.css";
import "../styles/customer/dashboard.css";

export const CustomerDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("Xin chào");
  const [weatherStatus, setWeatherStatus] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [washStep, setWashStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [washHistoryCount, setWashHistoryCount] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => {
    // 1. Greeting header based on hour
    const hour = new Date().getHours();
    const prefix =
      hour >= 5 && hour < 12
        ? "Chào buổi sáng ☀️"
        : hour >= 12 && hour < 18
          ? "Chào buổi chiều 🌤️"
          : "Chào buổi tối 🌙";
    setGreeting(prefix);

    // 2. Weather status chip
    const statuses = [
      "Thời tiết hôm nay rất ráo, cực kỳ thích hợp để đi chăm sóc và bảo vệ xế yêu! ☀️🚗",
      "Đo độ ẩm tương đối dễ chịu, ghé trạm rửa xe nhận diện LPR siêu tốc chỉ 5 phút! 🌤️✨",
      "Hôm nay trời có thể nhiều bụi mịn, đặt trước lịch hẹn rửa xe để tránh chờ đợi! 🌪️💧",
      "Làn rửa xe thông minh đang thông thoáng, camera quét biển số mở 24/7 đón bạn! ⚡🛡",
    ];
    const index = new Date().getDate() % statuses.length;
    setWeatherStatus(statuses[index]);

    // 3. Fetch active booking from API (Closest upcoming booking)
    const fetchActiveBooking = async (background = false) => {
      try {
        const response = await customerService.getActiveBooking(
          background ? { skipGlobalLoader: true } : {},
        );
        if (response && response.success) {
          if (response.booking) {
            setActiveBooking({
              ...response.booking,
              queueStatus: response.queueStatus,
              washStep: response.washStep,
            });
            setWashStep(response.washStep ?? 0);
          } else {
            setActiveBooking(null);
          }
        } else {
          setActiveBooking(null);
        }
      } catch (err) {
        console.error(err);
        setActiveBooking(null);
      }
    };

    // 4. Load dashboard data
    const loadDashboardData = async () => {
      fetchActiveBooking();

      // Vehicles
      try {
        const response = await customerService.getVehicles();
        if (response && response.success && response.vehicles) {
          setVehicles(response.vehicles);
        }
      } catch (err) {
        console.error(err);
      }

      // Vouchers
      try {
        const response = await customerService.getVouchers();
        if (response && response.success && response.vouchers) {
          setClaimedVouchers(response.vouchers);
        }
      } catch (err) {
        console.error(err);
      }

      // Wash history count (completed & cancelled)
      try {
        const response = await customerService.getWashHistory();
        if (response && response.success && response.history) {
          setBookings(response.history);
          setWashHistoryCount(
            response.history.filter((b) => b.status === "Completed").length,
          );
        }
      } catch (err) {
        console.error(err);
      }

      // Notifications (used for Recent Activity timeline)
      try {
        const response = await customerService.getNotifications();
        if (response && response.success && response.notifications) {
          setNotifications(response.notifications);
        }
      } catch (err) {
        console.error(err);
      }

      // Sync loyalty points & tier from backend (reflects webhook-awarded points)
      try {
        const loyaltyRes = await customerService.getLoyaltyStatus();
        if (loyaltyRes && loyaltyRes.success && loyaltyRes.status) {
          const status = loyaltyRes.status;
          // Keep the full payload so the member card can show real rank-up
          // progress (windowed spend vs next-tier threshold).
          setLoyalty(status);
          const updates = {};
          if (status.points != null) updates.points = status.points;
          if (status.tierName) updates.tier = status.tierName;
          if (Object.keys(updates).length > 0) updateUser(updates);
        }
      } catch (err) {
        console.error("Error syncing loyalty status:", err);
      }
    };

    loadDashboardData();

    let intervalId = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.hidden) return;
        fetchActiveBooking(true); // background poll — don't flash the global loader
      }, 10000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const getTierDetails = (tierName) => {
    const t = (tierName || "").toUpperCase();
    if (t.includes("PLATINUM")) {
      return {
        icon: "fa-crown",
        bg: "rgba(2, 132, 199, 0.12)",
        color: "#0284c7",
        perk: "Đặc quyền tích điểm x1.5 dịch vụ",
        cardClass: "tier-platinum",
      };
    } else if (t.includes("GOLD")) {
      return {
        icon: "fa-award",
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        perk: "Đặc quyền tích điểm x1.2 dịch vụ",
        cardClass: "tier-gold",
      };
    } else if (t.includes("SILVER")) {
      return {
        icon: "fa-medal",
        bg: "rgba(148, 163, 184, 0.12)",
        color: "#64748b",
        perk: "Đặc quyền tích điểm x1.1 dịch vụ",
        cardClass: "tier-silver",
      };
    } else {
      return {
        icon: "fa-user",
        bg: "rgba(15, 23, 42, 0.05)",
        color: "#475569",
        perk: "Tích lũy điểm thưởng theo lượt",
        cardClass: "tier-standard",
      };
    }
  };

  const calculateProgress = () => {
    // Tier ranking is driven by spend within a rolling window (from the backend),
    // not by loyalty points. Mirror the Loyalty page so the member card shows the
    // same real rank-up progress: windowed spend vs the next tier's threshold.
    const fmtVnd = (n) => "₫" + Number(n || 0).toLocaleString("vi-VN");
    const windowedSpend = loyalty?.windowedSpend ?? 0;
    const nextTierMin = loyalty?.nextTierMin ?? null;
    const nextTierName = loyalty?.nextTierName ?? null;

    // Loyalty data not loaded yet — show a neutral, non-misleading state.
    if (!loyalty) {
      return {
        pct: 0,
        label: "",
        next: "hạng tiếp theo",
        rem: "Đang cập nhật tiến độ thăng hạng...",
      };
    }

    // Already at the highest tier — backend returns no next tier.
    if (!nextTierName || !nextTierMin) {
      return {
        pct: 100,
        label: "HẠNG CAO NHẤT",
        next: "VIP",
        rem: "Bạn đã đạt hạng cao nhất!",
      };
    }

    const pct = Math.min(100, Math.round((windowedSpend / nextTierMin) * 100));
    const rem =
      loyalty?.amountToNextTier ?? Math.max(0, nextTierMin - windowedSpend);
    return {
      pct,
      label: `${fmtVnd(windowedSpend)}/${fmtVnd(nextTierMin)}`,
      next: nextTierName,
      rem: `Còn ${fmtVnd(rem)} chi tiêu để lên ${nextTierName}`,
    };
  };

  // Live progress text block
  const renderTextProgressBar = (pct) => {
    const totalChars = 10;
    const filledChars = Math.round((pct / 100) * totalChars);
    const emptyChars = totalChars - filledChars;
    return "█".repeat(filledChars) + "░".repeat(emptyChars) + ` ${pct}%`;
  };

  const timelineSteps = activeBooking
    ? queueStatusMapper.getTimelineSteps(
        activeBooking.status,
        activeBooking.queueStatus,
        activeBooking.currentStage,
      )
    : [];

  const totalSteps = timelineSteps.length;
  const activeStepIdx = timelineSteps.findIndex((s) => s.isActive);
  const anyCompleted = timelineSteps.some((s) => s.isCompleted);
  const activeStepNum =
    activeStepIdx !== -1
      ? activeStepIdx + 1
      : timelineSteps.every((s) => s.isCompleted)
        ? totalSteps
        : anyCompleted
          ? 1
          : 0;
  const progressText = `Đang ở bước ${activeStepNum}/${totalSteps}`;

  const points = user?.points ?? 0;
  const rawTier = user?.tier || "Standard Member";
  let tier = rawTier;
  if (rawTier === "Member" || rawTier === "Standard") {
    tier = "Standard Member";
  } else if (rawTier === "Silver") {
    tier = "Silver Member";
  } else if (rawTier === "Gold") {
    tier = "Gold Member";
  } else if (rawTier === "Platinum") {
    tier = "Platinum Member";
  }
  const displayTier =
    tier === "Standard Member"
      ? "Standard Member"
      : tier.replace(" Member", " Loyalty");
  const tierInfo = getTierDetails(tier);
  const progression = calculateProgress();
  const activeVouchers = claimedVouchers.filter((v) => v.status === 1);

  // Map notifications to Activity Timeline with icons/colors
  const getActivityMeta = (title) => {
    const t = title.toLowerCase();
    if (t.includes("đặt lịch") || t.includes("tạo")) {
      return {
        icon: "fa-calendar-plus text-success",
        bg: "rgba(40, 167, 69, 0.08)",
      };
    } else if (t.includes("xác nhận")) {
      return {
        icon: "fa-calendar-check text-primary",
        bg: "rgba(0, 123, 255, 0.08)",
      };
    } else if (t.includes("hủy")) {
      return {
        icon: "fa-times-circle text-danger",
        bg: "rgba(220, 53, 69, 0.08)",
      };
    } else if (
      t.includes("đổi") ||
      t.includes("voucher") ||
      t.includes("phần thưởng")
    ) {
      return {
        icon: "fa-ticket-alt text-warning",
        bg: "rgba(255, 193, 7, 0.08)",
      };
    } else if (
      t.includes("check-in") ||
      t.includes("checkin") ||
      t.includes("quét biển số") ||
      t.includes("quét lpr")
    ) {
      return { icon: "fa-qrcode text-info", bg: "rgba(23, 162, 184, 0.08)" };
    } else if (t.includes("rửa ngoại thất") || t.includes("rửa xe")) {
      return { icon: "fa-soap text-primary", bg: "rgba(0, 123, 255, 0.08)" };
    } else if (t.includes("vệ sinh nội thất") || t.includes("sấy khô")) {
      return { icon: "fa-wind text-primary", bg: "rgba(0, 123, 255, 0.08)" };
    } else if (t.includes("kiểm tra cuối")) {
      return { icon: "fa-search text-cyan", bg: "rgba(6, 182, 212, 0.08)" };
    } else if (
      t.includes("hoàn tất") ||
      t.includes("tích điểm") ||
      t.includes("điểm")
    ) {
      return {
        icon: "fa-check-circle text-success",
        bg: "rgba(40, 167, 69, 0.08)",
      };
    }
    return { icon: "fa-bell text-secondary", bg: "rgba(108, 117, 125, 0.08)" };
  };

  return (
    <div className="container-fluid pt-2 pb-3 px-2 px-lg-3">
      {/* Concierge Greeting */}
      <div className="row mb-3">
        <div className="col-12 text-start">
          <h3
            className="fw-bold mb-1"
            style={{ color: "var(--navy-dark)", letterSpacing: "-0.5px" }}
          >
            {greeting}, {user?.name || "Khách hàng"}!
          </h3>
          <p
            className="text-secondary small mb-0"
            style={{ fontSize: "0.82rem" }}
          >
            {weatherStatus}
          </p>
        </div>
      </div>

      {/* ── QUICK STATS SUMMARY CARDS ── */}
      <div className="row g-3 mb-4">
        {/* Stat 1: Tổng xe */}
        <div className="col-6 col-md-3">
          <Link
            to="/customer/vehicles"
            className="app-card summary-widget-card text-decoration-none"
          >
            <div
              className="summary-icon-wrapper"
              style={{
                background: "rgba(2, 132, 199, 0.08)",
                color: "#0284c7",
              }}
            >
              <i className="fas fa-car-side"></i>
            </div>
            <div className="text-start">
              <span className="summary-title text-muted small d-block">
                Tổng xe của tôi
              </span>
              <div className="summary-value fw-bold text-dark fs-5">
                {vehicles.length} Phương tiện
              </div>
            </div>
          </Link>
        </div>

        {/* Stat 2: Voucher khả dụng */}
        <div className="col-6 col-md-3">
          <Link
            to="/customer/loyalty"
            className="app-card summary-widget-card text-decoration-none"
          >
            <div
              className="summary-icon-wrapper"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                color: "#f59e0b",
              }}
            >
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="text-start">
              <span className="summary-title text-muted small d-block">
                Voucher khả dụng
              </span>
              <div className="summary-value fw-bold text-dark fs-5">
                {activeVouchers.length} Voucher
              </div>
            </div>
          </Link>
        </div>

        {/* Stat 3: Tổng lượt rửa */}
        <div className="col-6 col-md-3">
          <Link
            to="/customer/history"
            className="app-card summary-widget-card text-decoration-none"
          >
            <div
              className="summary-icon-wrapper"
              style={{
                background: "rgba(6, 182, 212, 0.08)",
                color: "#06b6d4",
              }}
            >
              <i className="fas fa-hands-wash"></i>
            </div>
            <div className="text-start">
              <span className="summary-title text-muted small d-block">
                Tổng lượt rửa xe
              </span>
              <div className="summary-value fw-bold text-dark fs-5">
                {washHistoryCount} Lượt rửa
              </div>
            </div>
          </Link>
        </div>

        {/* Stat 4: Điểm Loyalty */}
        <div className="col-6 col-md-3">
          <Link
            to="/customer/loyalty"
            className="app-card summary-widget-card text-decoration-none"
          >
            <div
              className="summary-icon-wrapper"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                color: "#10b981",
              }}
            >
              <i className="fas fa-coins"></i>
            </div>
            <div className="text-start">
              <span className="summary-title text-muted small d-block">
                Điểm tích lũy
              </span>
              <div className="summary-value fw-bold text-dark fs-5">
                {points.toLocaleString()}PTS
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="row g-4 text-start">
        {/* ── LEFT COLUMN: RECENT ACTIVITY & PROCESS TRACKING (col-lg-8) ── */}
        <div className="col-lg-8">
          {/* 1. Live Progress Tracker (Active Booking Wash Progress) */}
          {/* 1. Live Progress Tracker (Active Booking Wash Progress) */}
          {activeBooking &&
            activeBooking.hasQueue &&
            (activeBooking.queueStatus === "Completed" ||
              activeBooking.queueStatus === "Archived") && (
              <div
                className="app-card border-0 p-4 mb-4 text-center rounded-4 shadow-sm bg-white"
                style={{
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <div className="text-center mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning rounded-circle mb-2"
                    style={{ width: "56px", height: "56px" }}
                  >
                    <i className="fas fa-file-invoice-dollar fa-2x"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">
                    🚗 XE ĐÃ HOÀN TẤT DỊCH VỤ
                  </h5>
                  <p className="text-secondary small mb-0">
                    Xe{" "}
                    <strong className="font-monospace text-dark">
                      {activeBooking.vehicle}
                    </strong>{" "}
                    đã hoàn tất quá trình rửa xe. Vui lòng đến quầy để thanh
                    toán và nhận xe.
                  </p>
                </div>

                <div
                  className="p-3 rounded-4 mb-3 text-start"
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                >
                  <div className="mb-2.5 d-flex align-items-center gap-2">
                    <i className="fas fa-info-circle text-warning fs-6"></i>
                    <span className="small text-secondary">
                      Dịch vụ chính:
                    </span>{" "}
                    <strong className="text-dark small">
                      {activeBooking.mainService}
                    </strong>
                  </div>
                </div>

                <button
                  className="btn btn-outline-cyan w-100 py-2.5 font-semibold small"
                  style={{ borderRadius: "10px", fontSize: "0.78rem" }}
                  onClick={() => navigate("/customer/bookings")}
                >
                  Xem chi tiết lịch hẹn →
                </button>
              </div>
            )}

          {activeBooking &&
            activeBooking.hasQueue &&
            activeBooking.queueStatus !== "Completed" && (
              <div
                className="app-card border-0 p-4 mb-4 text-start"
                style={{
                  borderLeft: "4px solid #0ea5e9",
                  background: "#ffffff",
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="pulse-dot-washing"></div>
                    <h5
                      className="fw-bold mb-0 text-dark"
                      style={{ fontSize: "0.95rem" }}
                    >
                      TIẾN ĐỘ RỬA XE TRỰC TIẾP
                    </h5>
                  </div>
                  <span className="badge bg-info bg-opacity-10 text-cyan px-2.5 py-1 rounded-pill small fw-bold">
                    {activeBooking.mainService || "Dịch vụ chính"}
                  </span>
                </div>

                {/* Progress Bar & Stats */}
                <div
                  className="p-3.5 rounded-4 mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div className="row g-3">
                    <div className="col-6 col-sm-3">
                      <small
                        className="text-secondary d-block mb-1"
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        XE ĐANG RỬA
                      </small>
                      <strong
                        className="text-dark font-monospace"
                        style={{ fontSize: "0.88rem" }}
                      >
                        {activeBooking.vehicle}
                      </strong>
                    </div>
                    <div className="col-6 col-sm-3">
                      <small
                        className="text-secondary d-block mb-1"
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        CÔNG ĐOẠN HIỆN TẠI
                      </small>
                      <strong
                        className="text-cyan"
                        style={{ fontSize: "0.85rem" }}
                      >
                        {activeBooking.progressTracking?.currentStage ===
                        "CheckIn"
                          ? "Check-in"
                          : activeBooking.progressTracking?.currentStage ===
                              "Washing"
                            ? "Rửa xe"
                            : activeBooking.progressTracking?.currentStage ===
                                "Drying"
                              ? "Sấy khô"
                              : activeBooking.progressTracking?.currentStage ===
                                  "WaitingCheckout"
                                ? "Chờ thanh toán"
                                : activeBooking.progressTracking
                                      ?.currentStage === "Completed"
                                  ? "Hoàn tất"
                                  : activeBooking.progressTracking
                                      ?.currentStage || "Đang chuẩn bị"}
                      </strong>
                    </div>
                    <div className="col-6 col-sm-3">
                      <small
                        className="text-secondary d-block mb-1"
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        THỜI GIAN CÒN LẠI
                      </small>
                      <strong
                        className="text-dark"
                        style={{ fontSize: "0.85rem" }}
                      >
                        <i className="far fa-clock me-1 text-muted"></i>
                        {activeBooking.progressTracking?.remainingSeconds ??
                          0}{" "}
                        giây
                      </strong>
                    </div>
                    <div className="col-6 col-sm-3">
                      <small
                        className="text-secondary d-block mb-1"
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        GIỜ HOÀN THÀNH (ETA)
                      </small>
                      <strong
                        className="text-success"
                        style={{ fontSize: "0.85rem" }}
                      >
                        <i className="far fa-check-circle me-1 text-success"></i>
                        {activeBooking.eta || "—"}
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span
                        className="small text-secondary"
                        style={{ fontSize: "0.72rem" }}
                      >
                        Tiến trình rửa
                      </span>
                      <span
                        className="small fw-bold text-dark"
                        style={{ fontSize: "0.72rem" }}
                      >
                        {activeBooking.progressTracking?.progress ?? 0}%
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{
                        height: "8px",
                        background: "#e2e8f0",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${activeBooking.progressTracking?.progress ?? 0}%`,
                          borderRadius: "10px",
                          background:
                            "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Stages checklist */}
                <div className="d-flex flex-column gap-2">
                  {(activeBooking.progressTracking?.stages || []).map(
                    (stage, idx) => {
                      const isCompleted = stage.isCompleted;
                      const isActive = stage.isActive;

                      let stepBg = "rgba(15, 23, 42, 0.01)";
                      let stepBorder = "rgba(15, 23, 42, 0.03)";
                      let labelClass = "text-muted";
                      let badgeText = "Chờ";
                      let badgeClass = "bg-secondary bg-opacity-10 text-muted";

                      if (isCompleted) {
                        labelClass =
                          "text-secondary text-decoration-line-through";
                        badgeText = "Đã xong";
                        badgeClass = "bg-success bg-opacity-10 text-success";
                      } else if (isActive) {
                        stepBg = "rgba(14, 165, 233, 0.03)";
                        stepBorder = "rgba(14, 165, 233, 0.2)";
                        labelClass = "text-dark fw-bold";
                        badgeText = "Đang làm";
                        badgeClass = "bg-info bg-opacity-10 text-cyan";
                      }

                      return (
                        <div
                          key={idx}
                          className="d-flex align-items-center justify-content-between p-2.5 rounded-3"
                          style={{
                            background: stepBg,
                            border: `1px solid ${stepBorder}`,
                          }}
                        >
                          <div className="d-flex align-items-center">
                            {isCompleted ? (
                              <i className="fas fa-check-circle text-success me-2.5"></i>
                            ) : isActive ? (
                              <i className="fas fa-spinner fa-spin text-cyan me-2.5"></i>
                            ) : (
                              <i className="far fa-circle text-muted me-2.5"></i>
                            )}
                            <span
                              className={`small ${labelClass}`}
                              style={{ fontSize: "0.8rem" }}
                            >
                              {stage.displayName}
                            </span>
                          </div>
                          <span
                            className={`badge ${badgeClass} px-2.5 py-1 fw-bold`}
                            style={{ fontSize: "0.62rem", borderRadius: "5px" }}
                          >
                            {badgeText}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

          {/* 2. Recent Activity timeline */}
          <div className="app-card border-0 p-4 mb-4 text-start">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5
                className="fw-bold mb-0 text-dark"
                style={{ fontSize: "0.95rem" }}
              >
                <i className="fas fa-history text-cyan me-2"></i>HOẠT ĐỘNG GẦN
                ĐÂY
              </h5>
            </div>

            <div
              className="position-relative d-flex flex-column gap-3 py-2"
              style={{ minHeight: "120px" }}
            >
              <div
                className="notif-timeline-line"
                style={{ left: "20px" }}
              ></div>
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  Chưa có lịch sử hoạt động nào
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => {
                  const meta = getActivityMeta(n.title);
                  return (
                    <div
                      key={n.id}
                      className="d-flex align-items-start gap-3 position-relative z-1"
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center border"
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "white",
                          borderColor: "#e2e8f0",
                          flexShrink: 0,
                        }}
                      >
                        <i className={`fas ${meta.icon} fs-6`}></i>
                      </div>
                      <div className="flex-grow-1 bg-light p-2.5 rounded-3 border">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-dark small">{n.title}</strong>
                          <small
                            className="text-muted"
                            style={{ fontSize: "0.65rem" }}
                          >
                            {n.time || "Vừa xong"}
                          </small>
                        </div>
                        <div
                          className="text-secondary"
                          style={{ fontSize: "0.74rem", lineHeight: "1.4" }}
                        >
                          {n.body}
                        </div>
                        {n.sentAt && (
                          <div
                            className="text-muted mt-1.5"
                            style={{ fontSize: "0.65rem" }}
                          >
                            <i className="far fa-clock me-1"></i>
                            {n.sentAt}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LOYALTY CARD & NEXT BOOKING WIDGET (col-lg-4) ── */}
        <div className="col-lg-4">
          {/* 1. Next Booking Widget */}
          <div
            className="app-card border-0 p-4 mb-4 text-start"
            id="upcoming-appointment-widget"
          >
            <h5
              className="fw-bold mb-3 text-dark"
              style={{ fontSize: "0.9rem" }}
            >
              <i className="fas fa-calendar-alt text-cyan me-2"></i>
              LỊCH HẸN TIẾP THEO
            </h5>

            {activeBooking &&
            (activeBooking.status === "Pending" ||
              activeBooking.status === "Pending Confirmation" ||
              activeBooking.status === "Confirmed") ? (
              <div className="p-3 rounded-4 border bg-light bg-opacity-50">
                <div className="d-flex align-items-start gap-2.5 mb-3">
                  <div className="appointment-badge-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold text-dark"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {activeBooking.bookingDate
                        ? activeBooking.bookingDate
                            .split("-")
                            .reverse()
                            .join("/")
                        : ""}
                    </div>
                    <span
                      className="badge bg-cyan bg-opacity-10 font-monospace mt-1"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {activeBooking.bookingTime}
                    </span>
                  </div>
                </div>

                <div className="mb-3 small">
                  <div className="text-secondary mb-1.5">
                    <i className="fas fa-hands-wash me-2 text-muted"></i>
                    Dịch vụ:{" "}
                    <strong className="text-dark">
                      {activeBooking.mainService}
                    </strong>
                  </div>
                  <div className="text-secondary mb-1.5">
                    <i className="fas fa-car-side me-2 text-muted"></i>
                    Xe rửa:{" "}
                    <strong className="text-dark font-monospace">
                      {activeBooking.vehicle}
                    </strong>
                  </div>
                  <div className="text-secondary mb-1.5">
                    <i className="fas fa-hashtag me-2 text-muted"></i>
                    Mã đặt lịch:{" "}
                    <strong className="text-dark font-monospace">
                      #{activeBooking.id}
                    </strong>
                  </div>
                  <div className="text-secondary">
                    <i className="fas fa-info-circle me-2 text-muted"></i>
                    Trạng thái:{" "}
                    <strong className="text-cyan">
                      {activeBooking.queueStatus
                        ? queueStatusMapper.getLabel(activeBooking.queueStatus)
                        : activeBooking.status === "Pending Confirmation"
                          ? "Chờ xác nhận"
                          : activeBooking.status === "Confirmed"
                            ? "Đã xác nhận"
                            : activeBooking.status === "Checked In"
                              ? "Đã check-in"
                              : activeBooking.status}
                    </strong>
                  </div>
                </div>

                <button
                  className="btn btn-outline-cyan w-100 py-2 font-semibold small"
                  style={{ borderRadius: "10px", fontSize: "0.78rem" }}
                  onClick={() => navigate("/customer/bookings")}
                >
                  Quản lý lịch hẹn →
                </button>
              </div>
            ) : (
              <div className="text-center py-4 rounded-4 border bg-light bg-opacity-50">
                <i className="far fa-calendar-minus text-muted opacity-40 fa-2x mb-2"></i>
                <h6 className="fw-bold text-dark small mb-1">
                  Bạn chưa có lịch hẹn nào
                </h6>
                <p
                  className="text-secondary small mb-3 px-3"
                  style={{ fontSize: "0.7rem" }}
                >
                  Lên lịch rửa xe ngay để trải nghiệm dịch vụ chăm sóc tốt nhất.
                </p>
                <Link
                  to="/customer/booking"
                  className="app-btn-primary text-dark fw-bold text-decoration-none d-inline-block"
                  style={{
                    fontSize: "0.75rem",
                    padding: "8px 22px",
                    borderRadius: "10px",
                    minWidth: "160px",
                  }}
                >
                  Đặt lịch ngay <i className="fas fa-arrow-right ms-1"></i>
                </Link>
              </div>
            )}

            {bookings.length > 0 && (
              <button
                className="btn btn-link text-cyan text-decoration-none w-100 text-center fw-bold mt-3 p-0"
                style={{ fontSize: "0.8rem" }}
                onClick={() => navigate("/customer/bookings")}
              >
                Xem tất cả lịch hẹn ({bookings.length}) ➔
              </button>
            )}
          </div>

          {/* 2. AutoWash Loyalty Card */}
          <div className="app-card border-0 p-4 mb-4 text-start">
            <h6
              className="fw-bold text-secondary mb-3 small"
              style={{ letterSpacing: "0.5px" }}
            >
              AUTOWASH LOYALTY
            </h6>

            <div
              className={`loyalty-card-3d ${tierInfo.cardClass} mb-3`}
              id="member-card"
            >
              <div className="loyalty-card-glass-glow"></div>
              <div className="d-flex justify-content-between align-items-start">
                <span className="loyalty-card-badge">
                  <i className="fas fa-crown"></i>
                  {displayTier}
                </span>
                <i className="fas fa-satellite-dish text-white opacity-40 animate-pulse"></i>
              </div>

              <div className="my-2">
                <span className="loyalty-card-points-label">ĐIỂM HIỆN TẠI</span>
                <div className="loyalty-card-points">
                  <span id="dashboard-points">{points.toLocaleString()}</span>{" "}
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    đ
                  </span>
                </div>
              </div>

              <div className="loyalty-progress-container">
                <div
                  className="d-flex justify-content-between align-items-center mb-1 text-white"
                  style={{ fontSize: "0.68rem", fontWeight: "bold" }}
                >
                  <span>Tiến độ lên {progression.next}</span>
                  <span>{progression.pct}%</span>
                </div>
                <div
                  className="progress"
                  style={{
                    height: "6px",
                    background: "rgba(255,255,255,0.22)",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-bar bg-white"
                    role="progressbar"
                    style={{
                      width: `${progression.pct}%`,
                      borderRadius: "10px",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Loyalty Perks Description */}
            <div
              className="p-2.5 rounded-3 d-flex align-items-center gap-2.5 mb-2"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm border"
                style={{
                  width: "32px",
                  height: "32px",
                  color: tierInfo.color,
                  flexShrink: 0,
                }}
              >
                <i
                  className={`fas ${tierInfo.icon}`}
                  style={{ fontSize: "0.8rem" }}
                ></i>
              </div>
              <div style={{ fontSize: "0.75rem", lineHeight: "1.3" }}>
                <span className="fw-bold text-dark d-block">
                  Quyền lợi {displayTier}
                </span>
                <span
                  className="text-secondary"
                  style={{ fontSize: "0.68rem" }}
                >
                  {tierInfo.perk}
                </span>
              </div>
            </div>

            <p
              className="text-muted small mt-2 mb-0 text-center px-1"
              style={{
                fontSize: "0.68rem",
                lineHeight: "1.4",
                fontWeight: 600,
              }}
            >
              {progression.rem}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
