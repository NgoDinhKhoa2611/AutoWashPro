import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import "../styles/shared.css";
import "../styles/customer/loyalty.css";
import { customerService } from "../services/customerService";

const TIER_DATA = {
  "Standard Member": {
    color: "#64748b",
    cardClass: "tier-member",
    dbName: "Member",
    multiplier: "x1.0",
    queuePerk: "Xếp hàng theo thứ tự thông thường.",
    birthday: "Không có ưu đãi sinh nhật.",
    nextTier: "Silver",
    neededPts: 500,
  },
  "Silver Member": {
    color: "#94a3b8",
    cardClass: "tier-silver",
    dbName: "Silver",
    multiplier: "x1.2",
    queuePerk: "Ưu tiên hàng đợi trước khách thường.",
    birthday: "Tặng 01 lần rửa xe phổ thông miễn phí.",
    nextTier: "Gold",
    neededPts: 1000,
  },
  "Gold Member": {
    color: "#ffcf33",
    cardClass: "tier-gold",
    dbName: "Gold",
    multiplier: "x1.5",
    queuePerk: "Bypass hàng rửa xe thường. Vào thẳng ô rửa VIP.",
    birthday:
      "Tặng 01 combo cao cấp rửa xe + hút bụi nội thất miễn phí vào tháng sinh nhật.",
    nextTier: "Platinum",
    neededPts: 2000,
  },
  "Platinum Member": {
    color: "#0ea5e9",
    cardClass: "tier-platinum",
    dbName: "Platinum",
    multiplier: "x2.0",
    queuePerk: "Ưu tiên TUYỆT ĐỐI. Phục vụ ngay không chờ đợi.",
    birthday: "Tặng gói chăm sóc xe toàn diện + bộ quà VIP tháng sinh nhật.",
    nextTier: "Diamond Ultimate",
    neededPts: null,
  },
};

export const CustomerLoyalty = () => {
  const { user, updateUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [rewards, setRewards] = useState([]);

  const [pendingRedeem, setPendingRedeem] = useState(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [loyalty, setLoyalty] = useState(null);

  const loadLoyaltyStatus = async () => {
    try {
      const res = await customerService.getLoyaltyStatus();
      if (res && res.success && res.status) {
        setLoyalty(res.status);
      }
    } catch (e) {
      console.error("Failed to load loyalty status", e);
    }
  };

  const fetchClaimedVouchers = async () => {
    try {
      const response = await customerService.getVouchers();
      if (response && response.success && response.vouchers) {
        setClaimedVouchers(response.vouchers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRewards = async () => {
    try {
      const res = await customerService.getRewards();
      if (res && res.success) {
        setRewards(res.rewards);
      }
    } catch (e) {
      console.error("Failed to load rewards from DB", e);
    }
  };

  useEffect(() => {
    fetchClaimedVouchers();
    loadRewards();
    loadLoyaltyStatus();

    const query = new URLSearchParams(window.location.search);
    const tab = query.get("tab");
    if (tab === "vouchers") {
      const el = document.getElementById("my-vouchers-section");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 350);
      }
    }
  }, [window.location.search]);

  const handleChangeTier = (tierName) => {
    localStorage.setItem("user_tier", tierName);
    updateUser({ tier: tierName });
  };

  const getFilteredRewards = () => {
    if (activeFilter === "Tất cả") return rewards;
    if (activeFilter === "Giảm giá")
      return rewards.filter(
        (r) =>
          r.rewardType === "DiscountPercent" ||
          r.rewardType === "Discount_Fixed",
      );
    if (activeFilter === "Quà tặng" || activeFilter === "Combo đặc biệt")
      return rewards.filter(
        (r) => r.rewardType === "Free_Wash" || r.rewardType === "Free_AddOn",
      );
    if (activeFilter === "Ưu đãi sinh nhật")
      return rewards.filter((r) => r.pointsRequired === 0);
    return rewards;
  };

  const handleOpenRedeemModal = (reward) => {
    setPendingRedeem(reward);
    setRedeemModalOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!pendingRedeem) return;
    try {
      const res = await customerService.redeemReward(pendingRedeem.rewardId);
      if (res && res.success) {
        if (window.showToast)
          window.showToast(
            res.message || "Đổi điểm nhận quà thành công!",
            "success",
          );
        setRedeemModalOpen(false);
        updateUser({ points: user.points - pendingRedeem.pointsRequired });
        fetchClaimedVouchers();
        loadRewards();
      } else {
        if (window.showToast)
          window.showToast(res.message || "Đổi điểm thất bại", "error");
      }
    } catch (e) {
      console.error("Failed to redeem reward", e);
      const errMsg = e.response?.data?.message || "Lỗi kết nối máy chủ";
      if (window.showToast) window.showToast(errMsg, "error");
    }
  };

  const handleUseVoucher = (redemptionId) => {
    if (window.showToast) {
      window.showToast(
        "Voucher này sẽ tự động có sẵn để bạn chọn khi đặt lịch tại tab ĐẶT LỊCH (Booking)!",
        "success",
      );
    }
  };

  const rawTier = user?.tier || "Standard Member";
  let currentTier = rawTier;
  if (
    rawTier === "Member" ||
    rawTier === "Standard" ||
    rawTier === "Standard Member"
  ) {
    currentTier = "Standard Member";
  } else if (rawTier === "Silver" || rawTier === "Silver Member") {
    currentTier = "Silver Member";
  } else if (rawTier === "Gold" || rawTier === "Gold Member") {
    currentTier = "Gold Member";
  } else if (rawTier === "Platinum" || rawTier === "Platinum Member") {
    currentTier = "Platinum Member";
  }
  const pts = loyalty?.points ?? user?.points ?? 0;
  const nextTierDetails =
    TIER_DATA[currentTier] || TIER_DATA["Standard Member"];

  // Ranking is driven by spend within a rolling 6-month window (from the backend),
  // not by loyalty points. The "spend to rank up" amount + progress are computed
  // against the tier currently shown, so the simulator buttons below update the
  // figure live — using the full tier ladder returned by the backend.
  const windowMonths = loyalty?.windowMonths ?? 6;
  const windowedSpend = loyalty?.windowedSpend ?? 0;
  const tierLadder = loyalty?.tiers ?? [];

  const currentLadderIdx = tierLadder.findIndex(
    (t) => t.name === nextTierDetails.dbName,
  );
  const ladderResolved = currentLadderIdx >= 0;
  const nextLadderTier = ladderResolved
    ? (tierLadder[currentLadderIdx + 1] ?? null)
    : null;

  // Prefer the ladder (reactive to the previewed tier); fall back to the
  // backend's current/next pair when the ladder isn't available.
  const nextTierMin = ladderResolved
    ? nextLadderTier
      ? nextLadderTier.minRankingBalance
      : null
    : (loyalty?.nextTierMin ?? null);
  const nextTierName = ladderResolved
    ? nextLadderTier
      ? nextLadderTier.name
      : null
    : (loyalty?.nextTierName ?? nextTierDetails.nextTier);
  const isMaxTier = !nextTierMin;
  const amountToNext =
    nextTierMin != null ? Math.max(0, nextTierMin - windowedSpend) : 0;
  const spendProgressPct = nextTierMin
    ? Math.min(100, Math.round((windowedSpend / nextTierMin) * 100))
    : 100;
  const fmtVnd = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

  // Locked vs achieved state: compare the previewed tier card against the
  // user's REAL rank (loyalty.tierName from the backend, independent of the
  // simulator preview). Tiers above the real rank are locked; the real rank
  // and anything below it are already achieved.
  const realLadderIdx = tierLadder.findIndex(
    (t) => t.name === loyalty?.tierName,
  );
  const previewLadderIdx = currentLadderIdx;
  const rankResolved = realLadderIdx >= 0 && previewLadderIdx >= 0;
  const isLockedPreview = rankResolved && previewLadderIdx > realLadderIdx;
  const isPreviousPreview = rankResolved && previewLadderIdx < realLadderIdx;
  const previewTierLabel = currentTier.replace(" Member", "");
  const previewTierMin = tierLadder[previewLadderIdx]?.minRankingBalance ?? 0;
  const spendToUnlock = Math.max(0, previewTierMin - windowedSpend);
  const unlockProgressPct =
    previewTierMin > 0
      ? Math.min(100, Math.round((windowedSpend / previewTierMin) * 100))
      : 100;
  const barProgressPct = isLockedPreview
    ? unlockProgressPct
    : isPreviousPreview
      ? 100
      : spendProgressPct;

  // Presentation rules for the member card (viewing your own current rank):
  // - Drop the "Bạn đã đạt hạng …" achieved line; keep only the
  //   "Cần thanh toán thêm … để thăng hạng" spend guidance for the current tier.
  // - Standard tier additionally gets a brighter highlight bar to emphasise spend.
  const isStandardTier = currentTier === "Standard Member";
  const isCurrentAchievedView = !isLockedPreview && !isPreviousPreview;
  const useHighlightBar = isStandardTier && isCurrentAchievedView;

  return (
    <div className="container-fluid py-4">
      {/* Interactive Tier Simulator controls */}
      <div className="row mb-4">
        <div className="col-12 text-start">
          <small className="text-cyan fw-bold" style={{ letterSpacing: "1px" }}>
            PHÂN HẠNG THÀNH VIÊN
          </small>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {Object.keys(TIER_DATA).map((key) => (
              <button
                key={key}
                className={`btn btn-sm px-3 rounded-pill fw-bold ${currentTier === key ? "bg-navy text-cyan" : "btn-outline-secondary"}`}
                onClick={() => handleChangeTier(key)}
              >
                {key.replace(" Member", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Loyalty Card and Rules */}
        <div className="col-lg-5">
          <div className="member-card-container mb-4" id="loyalty-member-card">
            <div
              className={`member-card ${nextTierDetails.cardClass}${isLockedPreview ? " member-card-locked" : ""}`}
            >
              {isLockedPreview && (
                <span className="member-card-lock-badge" aria-hidden="true">
                  <i className="fas fa-lock"></i>
                </span>
              )}
              <span className="tier-label">
                <i className="fas fa-crown me-2"></i>
                {currentTier.replace(" Member", " Loyalty")}
              </span>
              <h2
                className="fw-bold text-white mb-1"
                style={{ fontSize: "2.4rem" }}
              >
                {pts.toLocaleString()}{" "}
                <small style={{ fontSize: "1rem", fontWeight: 600 }}>đ</small>
              </h2>
              <p
                className="text-white mb-3"
                style={{ opacity: 0.7, fontSize: "0.85rem" }}
              >
                AutoWash Loyalty Points · dùng để đổi quà
              </p>

              {/* Trạng thái hạng (đã đạt / đã khoá) + tiến độ chi tiêu */}
              <div className="mb-2">
                {/* Dòng trạng thái hạng — chỉ hiển thị khi hạng bị khoá */}
                {isLockedPreview && (
                  <div
                    className="d-flex align-items-center gap-2 mb-2 fw-bold tier-status-locked"
                    style={{ fontSize: "0.95rem" }}
                  >
                    <i className="fas fa-lock"></i>
                    Hạng {previewTierLabel} đã khoá
                  </div>
                )}

                {/* Dòng hướng dẫn chi tiêu — luôn hiển thị cho hạng hiện tại */}
                <div
                  className="text-white mb-2"
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    opacity: 0.95,
                  }}
                >
                  {isLockedPreview ? (
                    <>
                      Cần chi tiêu thêm{" "}
                      <strong style={{ fontWeight: 800 }}>
                        {fmtVnd(spendToUnlock)}
                      </strong>{" "}
                      để mở khoá hạng {previewTierLabel}
                    </>
                  ) : isPreviousPreview ? (
                    <>Bạn đã hoàn thành hạng này ✓</>
                  ) : isMaxTier ? (
                    <>Bạn đang ở hạng cao nhất 🎉</>
                  ) : (
                    <>
                      Cần thanh toán thêm{" "}
                      <strong style={{ fontWeight: 800 }}>
                        {fmtVnd(amountToNext)}
                      </strong>{" "}
                      để thăng hạng{nextTierName ? ` ${nextTierName}` : ""} ›
                    </>
                  )}
                </div>

                {/* Thanh tiến độ */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barProgressPct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: useHighlightBar
                        ? "linear-gradient(90deg, #22d3ee 0%, #38bdf8 55%, #a5f3fc 100%)"
                        : "var(--cyan-electric, #0ea5e9)",
                      boxShadow: useHighlightBar
                        ? "0 0 10px rgba(56,189,248,0.85)"
                        : "none",
                      transition: "width .4s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Perks list */}
          <div className="app-card border-0 shadow-sm p-4 bg-white mb-4 rounded-4 text-start">
            <h5 className="fw-bold mb-3" style={{ color: "var(--navy-dark)" }}>
              Đặc quyền hạng{" "}
              <span className="text-cyan" id="tier-perks-label">
                {currentTier.replace(" Member", "")}
              </span>
            </h5>
            <div
              className="d-flex flex-column gap-3 fs-7"
              style={{ fontSize: "0.85rem" }}
            >
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1 me-2"></i>
                <span id="perk-queue">
                  <strong>Ưu tiên hàng đợi:</strong> {nextTierDetails.queuePerk}
                </span>
              </div>
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1 me-2"></i>
                <span id="perk-multiplier">
                  <strong>Hệ số tích điểm:</strong> Nhân hệ số{" "}
                  {nextTierDetails.multiplier} điểm thưởng.
                </span>
              </div>
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1 me-2"></i>
                <span id="perk-birthday">
                  <strong>Quà sinh nhật:</strong> {nextTierDetails.birthday}
                </span>
              </div>
            </div>
            <button
              className="btn btn-outline-cyan w-100 mt-4 py-2.5 fw-bold"
              style={{ fontSize: "0.78rem", borderRadius: "12px" }}
              onClick={() => {
                if (window.showToast)
                  window.showToast(
                    `Tích điểm: (chi tiêu ÷ 1.000đ) × hệ số hạng — Bạc x1.2, Vàng x1.5, Bạch Kim x2.0. Hạng được xét theo tổng chi tiêu trong ${windowMonths} tháng gần nhất (điểm dùng để đổi quà, không ảnh hưởng hạng).`,
                    "info",
                  );
              }}
            >
              XEM QUY ĐỊNH CHI TIẾT TÍCH ĐIỂM
            </button>
          </div>
        </div>

        {/* Right Column: Ticket Grid */}
        <div className="col-lg-7">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-2">
              <h5
                className="fw-bold mb-0 text-start"
                style={{ color: "var(--navy-dark)" }}
              >
                ĐỔI ĐIỂM NHẬN ƯU ĐÃI ({getFilteredRewards().length})
              </h5>
              <span
                className="badge bg-light text-muted border px-2 py-1"
                style={{ fontSize: "0.65rem" }}
              >
                ĐIỂM HIỆN CÓ: {pts.toLocaleString()}đ
              </span>
            </div>

            {/* Filter buttons */}
            <div className="d-flex flex-nowrap gap-2 mb-4 w-100">
              {["Tất cả", "Giảm giá", "Quà tặng"].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm loyalty-filter-btn border-0 rounded-pill ${
                    activeFilter === f
                      ? "app-btn-primary text-dark"
                      : "bg-light text-muted"
                  }`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Rewards tickets grid */}
            <div className="row g-3" id="rewards-grid">
              {getFilteredRewards().map((r) => {
                const canRedeem = pts >= r.pointsRequired;
                let leftVal =
                  r.rewardType === "DiscountPercent"
                    ? `${r.rewardValue}%`
                    : r.rewardType === "FreeWash"
                      ? "FREE"
                      : "PLUS";
                let leftLabel =
                  r.rewardType === "DiscountPercent"
                    ? "GIẢM GIÁ"
                    : r.rewardType === "FreeWash"
                      ? "RỬA XE"
                      : "TẶNG KÈM";

                return (
                  <div key={r.rewardId} className="col-md-6">
                    <div className="ticket-card">
                      <div className="ticket-left">
                        <div className="ticket-value">{leftVal}</div>
                        <div className="ticket-type-label">{leftLabel}</div>
                      </div>
                      <div className="ticket-right">
                        <div className="ticket-divider"></div>
                        <div className="text-start">
                          <div className="ticket-title">{r.rewardName}</div>
                          <div className="ticket-desc">{r.description}</div>
                          {r.rewardType !== "DiscountPercent" && (
                            <div
                              className="small fw-bold text-cyan mt-1"
                              style={{ fontSize: "0.68rem" }}
                            >
                              Trị giá: ₫{Number(r.rewardValue).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="ticket-footer">
                          <span className="ticket-points-badge">
                            {r.pointsRequired}đ
                          </span>
                          <button
                            className="ticket-btn"
                            disabled={!canRedeem}
                            onClick={() => handleOpenRedeemModal(r)}
                          >
                            {canRedeem ? (
                              <>
                                <i className="fas fa-exchange-alt me-1"></i>ĐỔI
                              </>
                            ) : (
                              `Thiếu ${r.pointsRequired - pts}đ`
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Claimed Vouchers lists */}
      {claimedVouchers.length > 0 && (
        <div className="row g-4 mt-2" id="my-vouchers-section">
          <div className="col-12 text-start">
            <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
              <h5
                className="fw-bold mb-4"
                style={{ color: "var(--navy-dark)" }}
              >
                VÍ VOUCHER ĐÃ ĐỔI CỦA TÔI ({claimedVouchers.length})
              </h5>
              <div className="row g-3" id="my-vouchers-grid">
                {claimedVouchers.map((v, i) => {
                  const isUsed = v.status === 2;
                  let leftVal =
                    v.rewardType === "DiscountPercent"
                      ? `${v.rewardValue}%`
                      : v.rewardType === "FreeWash"
                        ? "FREE"
                        : "PLUS";
                  let leftLabel =
                    v.rewardType === "DiscountPercent"
                      ? "GIẢM GIÁ"
                      : v.rewardType === "FreeWash"
                        ? "RỬA XE"
                        : "TẶNG KÈM";

                  return (
                    <div key={i} className="col-md-6">
                      <div
                        className={`ticket-card claimed-ticket ${isUsed ? "used" : ""}`}
                      >
                        <div className="ticket-left">
                          <div className="ticket-value">{leftVal}</div>
                          <div className="ticket-type-label">{leftLabel}</div>
                        </div>
                        <div className="ticket-right">
                          <div className="ticket-divider"></div>
                          <div className="text-start">
                            <div className="ticket-title">{v.title}</div>
                            <div className="claimed-ticket-code mt-1">
                              Mã: <strong>{v.code}</strong>
                            </div>
                            <div
                              className="text-muted mt-1"
                              style={{ fontSize: "0.67rem" }}
                            >
                              Đổi: {v.redeemedAt} — Hạn dùng: {v.expiredAt}
                            </div>
                          </div>
                          <div className="ticket-footer justify-content-end">
                            {isUsed ? (
                              <span
                                className="badge bg-secondary rounded px-2 py-1 text-white small"
                                style={{ fontSize: "0.62rem", fontWeight: 700 }}
                              >
                                ĐÃ SỬ DỤNG
                              </span>
                            ) : (
                              <button
                                className="ticket-btn"
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: "8px",
                                }}
                                onClick={() => handleUseVoucher(v.redemptionId)}
                              >
                                SỬ DỤNG
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Confirmation Modal */}
      {redeemModalOpen && pendingRedeem && (
        <div
          id="redeem-modal-overlay"
          className="confirm-modal-backdrop show"
          style={{ display: "flex" }}
        >
          <div
            className="confirm-modal-card animate-confirm-in"
            style={{ maxWidth: "400px", width: "100%" }}
          >
            <div className="confirm-modal-body p-4 text-center">
              <div
                className="reward-icon-box mx-auto mb-3"
                style={{
                  width: "64px",
                  height: "64px",
                  fontSize: "1.5rem",
                  background: "rgba(14, 165, 233, 0.08)",
                  color: "var(--cyan-electric)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className={`fas ${pendingRedeem.icon || "fa-ticket-alt"}`}
                ></i>
              </div>
              <h5
                className="fw-bold mb-1"
                style={{ color: "var(--navy-dark)" }}
              >
                Xác nhận đổi thẻ quà tặng
              </h5>
              <p className="text-muted small px-3">
                {pendingRedeem.rewardName}
              </p>

              <div className="app-card bg-light border-0 p-3 rounded-4 mb-4 mt-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small fw-bold">
                    Điểm cần dùng:
                  </span>
                  <span className="fw-bold text-warning">
                    {pendingRedeem.pointsRequired}đ
                  </span>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className="text-muted small fw-bold">
                    Điểm hiện có:
                  </span>
                  <span className="fw-bold text-cyan">
                    {pts.toLocaleString()}đ
                  </span>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="app-btn-secondary w-50 py-2"
                  style={{ borderRadius: "12px" }}
                  onClick={() => setRedeemModalOpen(false)}
                >
                  HỦY BỎ
                </button>
                <button
                  className="app-btn-primary w-50 py-2 text-dark fw-bold"
                  style={{ borderRadius: "12px" }}
                  onClick={handleConfirmRedeem}
                >
                  XÁC NHẬN ĐỔI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerLoyalty;
