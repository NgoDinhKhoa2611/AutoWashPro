import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared.css';
import '../styles/customer/loyalty.css';
import { customerService } from '../services/customerService';

const TIER_DATA = {
  'Standard Member': {
    color: '#64748b',
    cardClass: 'tier-member',
    multiplier: 'x1.0',
    queuePerk: 'Xếp hàng theo thứ tự thông thường.',
    birthday: 'Không có ưu đãi sinh nhật.',
    nextTier: 'Silver',
    neededPts: 500
  },
  'Silver Member': {
    color: '#94a3b8',
    cardClass: 'tier-silver',
    multiplier: 'x1.1',
    queuePerk: 'Ưu tiên hàng đợi trước khách thường.',
    birthday: 'Tặng 01 lần rửa xe phổ thông miễn phí.',
    nextTier: 'Gold',
    neededPts: 1000
  },
  'Gold Member': {
    color: '#ffcf33',
    cardClass: 'tier-gold',
    multiplier: 'x1.2',
    queuePerk: 'Bypass hàng rửa xe thường. Vào thẳng ô rửa VIP.',
    birthday: 'Tặng 01 combo cao cấp rửa xe + vệ sinh sên miễn phí vào tháng sinh nhật.',
    nextTier: 'Platinum',
    neededPts: 2000
  },
  'Platinum Member': {
    color: '#0ea5e9',
    cardClass: 'tier-platinum',
    multiplier: 'x1.5',
    queuePerk: 'Ưu tiên TUYỆT ĐỐI. Phục vụ ngay không chờ đợi.',
    birthday: 'Tặng gói chăm sóc xe toàn diện + bộ quà VIP tháng sinh nhật.',
    nextTier: 'Diamond Ultimate',
    neededPts: null
  }
};

export const CustomerLoyalty = () => {
  const { user, updateUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [rewards, setRewards] = useState([]);
  
  const [pendingRedeem, setPendingRedeem] = useState(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

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
      console.error('Failed to load rewards from DB', e);
    }
  };

  useEffect(() => {
    fetchClaimedVouchers();
    loadRewards();

    const query = new URLSearchParams(window.location.search);
    const tab = query.get('tab');
    if (tab === 'vouchers') {
      const el = document.getElementById('my-vouchers-section');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
      }
    }
  }, [window.location.search]);

  const handleChangeTier = (tierName) => {
    localStorage.setItem('user_tier', tierName);
    updateUser({ tier: tierName });
  };

  const getFilteredRewards = () => {
    if (activeFilter === 'Tất cả') return rewards;
    if (activeFilter === 'Giảm giá') return rewards.filter(r => r.rewardType === 'DiscountPercent' || r.rewardType === 'Discount_Fixed');
    if (activeFilter === 'Dịch vụ') return rewards.filter(r => r.rewardType === 'Free_Wash' || r.rewardType === 'Free_AddOn');
    if (activeFilter === 'Quà tặng' || activeFilter === 'Combo đặc biệt') return rewards.filter(r => r.rewardType === 'Free_Wash' || r.rewardType === 'Free_AddOn');
    if (activeFilter === 'Ưu đãi sinh nhật') return rewards.filter(r => r.pointsRequired === 0);
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
        if (window.showToast) window.showToast(res.message || 'Đổi điểm nhận quà thành công!', 'success');
        setRedeemModalOpen(false);
        updateUser({ points: user.points - pendingRedeem.pointsRequired });
        fetchClaimedVouchers();
        loadRewards();
      } else {
        if (window.showToast) window.showToast(res.message || 'Đổi điểm thất bại', 'error');
      }
    } catch (e) {
      console.error('Failed to redeem reward', e);
      const errMsg = e.response?.data?.message || 'Lỗi kết nối máy chủ';
      if (window.showToast) window.showToast(errMsg, 'error');
    }
  };

  const handleUseVoucher = (redemptionId) => {
    if (window.showToast) {
      window.showToast('Voucher này sẽ tự động có sẵn để bạn chọn khi đặt lịch tại tab ĐẶT LỊCH (Booking)!', 'success');
    }
  };

  const rawTier = user?.tier || 'Standard Member';
  let currentTier = rawTier;
  if (rawTier === 'Member' || rawTier === 'Standard' || rawTier === 'Standard Member') {
    currentTier = 'Standard Member';
  } else if (rawTier === 'Silver' || rawTier === 'Silver Member') {
    currentTier = 'Silver Member';
  } else if (rawTier === 'Gold' || rawTier === 'Gold Member') {
    currentTier = 'Gold Member';
  } else if (rawTier === 'Platinum' || rawTier === 'Platinum Member') {
    currentTier = 'Platinum Member';
  }
  const pts = user?.points ?? 0;
  const nextTierDetails = TIER_DATA[currentTier] || TIER_DATA['Standard Member'];
  const remaining = nextTierDetails.neededPts ? Math.max(0, nextTierDetails.neededPts - pts) + ' PTS' : 'Tối cao';

  return (
    <div className="container-fluid py-4">
      {/* Interactive Tier Simulator controls */}
      <div className="row mb-4">
        <div className="col-12 text-start">
          <small className="text-cyan fw-bold" style={{ letterSpacing: '1px' }}>SIMULATOR PHÂN HẠNG THÀNH VIÊN</small>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {Object.keys(TIER_DATA).map(key => (
              <button
                key={key}
                className={`btn btn-sm px-3 rounded-pill fw-bold ${currentTier === key ? 'bg-navy text-cyan' : 'btn-outline-secondary'}`}
                onClick={() => handleChangeTier(key)}
              >
                {key.replace(' Member', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Loyalty Card and Rules */}
        <div className="col-lg-5">
          <div className="member-card-container mb-4" id="loyalty-member-card">
            <div className={`member-card ${nextTierDetails.cardClass}`}>
              <span className="tier-label"><i className="fas fa-crown me-2"></i>{currentTier.replace(' Member', ' Loyalty')}</span>
              <h2 className="fw-bold text-white mb-1" style={{ fontSize: '2.4rem' }}>{pts.toLocaleString()} <small style={{ fontSize: '1rem', fontWeight: 600 }}>PTS</small></h2>
              <p className="text-white mb-3" style={{ opacity: 0.7, fontSize: '0.85rem' }}>AutoWash Loyalty Points</p>
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>HẠNG TIẾP THEO</small>
                  <div className="fw-bold text-cyan mt-1" style={{ fontSize: '0.88rem' }}>{nextTierDetails.nextTier} — còn {remaining}</div>
                </div>
                <div className="text-end">
                  <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>MÃ THÀNH VIÊN</small>
                  <div className="fw-bold text-white mt-1 font-monospace" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>AW-LOYALTY-{currentTier.replace(' Member','').toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Perks list */}
          <div className="app-card border-0 shadow-sm p-4 bg-white mb-4 rounded-4 text-start">
            <h5 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)' }}>
              Đặc quyền hạng <span className="text-cyan" id="tier-perks-label">{currentTier.replace(' Member', '')}</span>
            </h5>
            <div className="d-flex flex-column gap-3 fs-7" style={{ fontSize: '0.85rem' }}>
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1"></i>
                <span id="perk-queue"><strong>Ưu tiên hàng đợi:</strong> {nextTierDetails.queuePerk}</span>
              </div>
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1"></i>
                <span id="perk-multiplier"><strong>Hệ số tích điểm:</strong> Nhân hệ số {nextTierDetails.multiplier} điểm thưởng.</span>
              </div>
              <div className="d-flex align-items-start gap-2.5">
                <i className="fas fa-check-circle text-cyan mt-1"></i>
                <span id="perk-birthday"><strong>Quà sinh nhật:</strong> {nextTierDetails.birthday}</span>
              </div>
            </div>
            <button
              className="btn btn-outline-cyan w-100 mt-4 py-2.5 fw-bold"
              style={{ fontSize: '0.78rem', borderRadius: '12px' }}
              onClick={() => {
                if (window.showToast) window.showToast('Quy định: Mỗi 1.000đ chi tiêu = 1 PTS. Hạng VIP nhân hệ số: Bạc x1.1, Vàng x1.2, Kim Cương x1.5.', 'info');
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
              <h5 className="fw-bold mb-0 text-start" style={{ color: 'var(--navy-dark)' }}>
                ĐỔI ĐIỂM NHẬN ƯU ĐÃI ({getFilteredRewards().length})
              </h5>
              <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: '0.65rem' }}>
                ĐIỂM HIỆN CÓ: {pts.toLocaleString()} PTS
              </span>
            </div>

            {/* Filter buttons */}
            <div className="d-flex flex-wrap gap-1.5 mb-4">
              {['Tất cả', 'Giảm giá', 'Dịch vụ', 'Quà tặng'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm px-3.5 py-2 border-0 rounded-pill ${
                    activeFilter === f ? 'app-btn-primary text-dark' : 'bg-light text-muted'
                  }`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Rewards tickets grid */}
            <div className="row g-3" id="rewards-grid">
              {getFilteredRewards().map(r => {
                const canRedeem = pts >= r.pointsRequired;
                let leftVal = r.rewardType === 'DiscountPercent' ? `${r.rewardValue}%` : r.rewardType === 'FreeWash' ? 'FREE' : 'PLUS';
                let leftLabel = r.rewardType === 'DiscountPercent' ? 'GIẢM GIÁ' : r.rewardType === 'FreeWash' ? 'RỬA XE' : 'TẶNG KÈM';

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
                          {r.rewardType !== 'DiscountPercent' && (
                            <div className="small fw-bold text-cyan mt-1" style={{ fontSize: '0.68rem' }}>
                              Trị giá: ₫{Number(r.rewardValue).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="ticket-footer">
                          <span className="ticket-points-badge">{r.pointsRequired} PTS</span>
                          {canRedeem ? (
                            <button className="ticket-btn" onClick={() => handleOpenRedeemModal(r)}>
                              <i className="fas fa-exchange-alt me-1"></i>ĐỔI
                            </button>
                          ) : (
                            <span className="small text-muted" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                              Cần thêm {r.pointsRequired - pts} PTS
                            </span>
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

      {/* Claimed Vouchers lists */}
      {claimedVouchers.length > 0 && (
        <div className="row g-4 mt-2" id="my-vouchers-section">
          <div className="col-12 text-start">
            <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
              <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
                VÍ VOUCHER ĐÃ ĐỔI CỦA TÔI ({claimedVouchers.length})
              </h5>
              <div className="row g-3" id="my-vouchers-grid">
                {claimedVouchers.map((v, i) => {
                  const isUsed = v.status === 2;
                  let leftVal = v.rewardType === 'DiscountPercent' ? `${v.rewardValue}%` : v.rewardType === 'FreeWash' ? 'FREE' : 'PLUS';
                  let leftLabel = v.rewardType === 'DiscountPercent' ? 'GIẢM GIÁ' : v.rewardType === 'FreeWash' ? 'RỬA XE' : 'TẶNG KÈM';

                  return (
                    <div key={i} className="col-md-6">
                      <div className={`ticket-card claimed-ticket ${isUsed ? 'used' : ''}`}>
                        <div className="ticket-left">
                          <div className="ticket-value">{leftVal}</div>
                          <div className="ticket-type-label">{leftLabel}</div>
                        </div>
                        <div className="ticket-right">
                          <div className="ticket-divider"></div>
                          <div className="text-start">
                            <div className="ticket-title">{v.title}</div>
                            <div className="claimed-ticket-code mt-1">Mã: <strong>{v.code}</strong></div>
                            <div className="text-muted mt-1" style={{ fontSize: '0.67rem' }}>
                              Đổi: {v.redeemedAt} — Hạn dùng: {v.expiredAt}
                            </div>
                          </div>
                          <div className="ticket-footer justify-content-end">
                            {isUsed ? (
                              <span className="badge bg-secondary rounded px-2 py-1 text-white small" style={{ fontSize: '0.62rem', fontWeight: 700 }}>
                                ĐÃ SỬ DỤNG
                              </span>
                            ) : (
                              <button className="ticket-btn" style={{ padding: '4px 12px', borderRadius: '8px' }} onClick={() => handleUseVoucher(v.redemptionId)}>
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
        <div id="redeem-modal-overlay" className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="confirm-modal-body p-4 text-center">
              <div
                className="reward-icon-box mx-auto mb-3"
                style={{
                  width: '64px',
                  height: '64px',
                  fontSize: '1.5rem',
                  background: 'rgba(14, 165, 233, 0.08)',
                  color: 'var(--cyan-electric)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className={`fas ${pendingRedeem.icon || 'fa-ticket-alt'}`}></i>
              </div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Xác nhận đổi thẻ quà tặng</h5>
              <p className="text-muted small px-3">{pendingRedeem.rewardName}</p>

              <div className="app-card bg-light border-0 p-3 rounded-4 mb-4 mt-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small fw-bold">Điểm cần dùng:</span>
                  <span className="fw-bold text-warning">{pendingRedeem.pointsRequired} PTS</span>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className="text-muted small fw-bold">Điểm hiện có:</span>
                  <span className="fw-bold text-cyan">{pts.toLocaleString()} PTS</span>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button className="app-btn-secondary w-50 py-2" style={{ borderRadius: '12px' }} onClick={() => setRedeemModalOpen(false)}>HỦY BỎ</button>
                <button className="app-btn-primary w-50 py-2 text-dark fw-bold" style={{ borderRadius: '12px' }} onClick={handleConfirmRedeem}>XÁC NHẬN ĐỔI</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerLoyalty;
