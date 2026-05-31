import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared.css';
import '../styles/customer/loyalty.css';

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

const ALL_REWARDS = [
  { rewardId: 1, rewardName: 'Voucher giảm 10%', description: 'Áp dụng cho mọi hóa đơn rửa xe.', pointsRequired: 100, rewardType: 'DiscountPercent', rewardValue: 10, isActive: 1, icon: 'fa-percent' },
  { rewardId: 2, rewardName: 'Miễn phí rửa vỏ bọt tuyết', description: 'Tặng 1 lần rửa vỏ ngoài bọt tuyết.', pointsRequired: 200, rewardType: 'FreeWash', rewardValue: 100000, isActive: 1, icon: 'fa-soap' },
  { rewardId: 3, rewardName: 'Voucher giảm 20%', description: 'Áp dụng cho khách hàng Gold & Platinum.', pointsRequired: 500, rewardType: 'DiscountPercent', rewardValue: 20, isActive: 1, icon: 'fa-percent' },
  { rewardId: 4, rewardName: 'Vệ sinh sên chuyên sâu', description: 'Gói chăm sóc sên và nhông xích xe máy.', pointsRequired: 150, rewardType: 'AddOnService', rewardValue: 50000, isActive: 1, icon: 'fa-link' },
  { rewardId: 5, rewardName: 'Phủ Wax bóng Nano', description: 'Bảo vệ bề mặt sơn xe sáng bóng.', pointsRequired: 300, rewardType: 'AddOnService', rewardValue: 120000, isActive: 1, icon: 'fa-shield-alt' },
  { rewardId: 6, rewardName: 'Hút bụi & Vệ sinh nội thất', description: 'Vệ sinh cabin, dọn dẹp sạch sẽ nội thất.', pointsRequired: 400, rewardType: 'AddOnService', rewardValue: 150000, isActive: 1, icon: 'fa-couch' },
  { rewardId: 7, rewardName: 'Combo chăm sóc VIP', description: 'Dịch vụ dọn xe chuyên sâu cho Platinum.', pointsRequired: 800, rewardType: 'FreeWash', rewardValue: 350000, isActive: 1, icon: 'fa-crown' }
];

export const CustomerLoyalty = () => {
  const { user, updateUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  
  const [pendingRedeem, setPendingRedeem] = useState(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  useEffect(() => {
    const syncData = () => {
      try {
        const claimed = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
        setClaimedVouchers(claimed);
      } catch (e) {}
    };

    syncData();
    window.addEventListener('storage', syncData);

    return () => {
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const handleChangeTier = (tierName) => {
    localStorage.setItem('user_tier', tierName);
    updateUser({ tier: tierName });
  };

  const getFilteredRewards = () => {
    if (activeFilter === 'Tất cả') return ALL_REWARDS;
    if (activeFilter === 'Giảm giá') return ALL_REWARDS.filter(r => r.rewardType === 'DiscountPercent');
    if (activeFilter === 'Dịch vụ') return ALL_REWARDS.filter(r => r.rewardType === 'FreeWash' || r.rewardType === 'AddOnService');
    if (activeFilter === 'Quà tặng' || activeFilter === 'Combo đặc biệt') return ALL_REWARDS.filter(r => r.rewardType === 'FreeWash' || r.rewardType === 'AddOnService');
    if (activeFilter === 'Ưu đãi sinh nhật') return ALL_REWARDS.filter(r => r.pointsRequired === 0);
    return ALL_REWARDS;
  };

  const handleOpenRedeemModal = (reward) => {
    setPendingRedeem(reward);
    setRedeemModalOpen(true);
  };

  const handleConfirmRedeem = () => {
    if (!pendingRedeem) return;
    const currentPts = user?.points || 0;

    if (currentPts < pendingRedeem.pointsRequired) {
      if (window.showToast) window.showToast('Bạn không đủ điểm để đổi phần thưởng này!', 'error');
      setRedeemModalOpen(false);
      return;
    }

    const newPts = Math.max(0, currentPts - pendingRedeem.pointsRequired);
    localStorage.setItem('user_points', String(newPts));
    updateUser({ points: newPts });

    const randCode = 'AW-RED-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newVoucher = {
      redemptionId: 'red_' + Date.now(),
      rewardId: pendingRedeem.rewardId,
      title: pendingRedeem.rewardName,
      rewardType: pendingRedeem.rewardType,
      rewardValue: pendingRedeem.rewardValue,
      icon: pendingRedeem.icon,
      code: randCode,
      status: 1, // 1 = Available
      redeemedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      expiredAt: expiryStr
    };

    const updatedVouchers = [newVoucher, ...claimedVouchers];
    setClaimedVouchers(updatedVouchers);
    localStorage.setItem('user_claimed_vouchers', JSON.stringify(updatedVouchers));

    // Create notification
    const notif = {
      id: 'notif_redeem_' + Date.now(),
      title: 'Đổi thưởng thành công',
      body: `Bạn đã đổi "${pendingRedeem.rewardName}" (Mã: ${randCode}). Hạn sử dụng đến ${expiryStr}.`,
      time: 'Vừa xong',
      type: 'points',
      read: false
    };
    let notifications = [];
    try {
      notifications = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    } catch (e) {}
    localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifications]));
    window.dispatchEvent(new Event('storage'));

    setRedeemModalOpen(false);
    if (window.showToast) window.showToast(`Đổi quà thành công! Đã trừ ${pendingRedeem.pointsRequired} PTS.`, 'success');
  };

  const handleUseVoucher = (redemptionId) => {
    const applyVoucher = () => {
      const updated = claimedVouchers.map(v => v.redemptionId === redemptionId ? { ...v, status: 2 } : v);
      setClaimedVouchers(updated);
      localStorage.setItem('user_claimed_vouchers', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      if (window.showToast) window.showToast('Áp dụng voucher thành công!', 'success');
    };

    if (window.showConfirm) {
      window.showConfirm('Áp dụng ưu đãi', 'Bạn có chắc chắn muốn sử dụng voucher này cho lượt đặt lịch rửa xe tiếp theo?', applyVoucher);
    } else {
      if (window.confirm('Bạn có chắc chắn muốn sử dụng voucher này?')) {
        applyVoucher();
      }
    }
  };

  const currentTier = user?.tier || 'Gold Member';
  const pts = user?.points || 550;
  const nextTierDetails = TIER_DATA[currentTier] || TIER_DATA['Gold Member'];
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
              <span className="tier-label"><i className="fas fa-crown me-2"></i>{currentTier}</span>
              <h2 className="fw-bold text-white mb-1" style={{ fontSize: '2.4rem' }}>{pts.toLocaleString()} <small style={{ fontSize: '1rem', fontWeight: 600 }}>PTS</small></h2>
              <p className="text-white mb-3" style={{ opacity: 0.7, fontSize: '0.85rem' }}>S-Member Loyalty Points</p>
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>HẠNG TIẾP THEO</small>
                  <div className="fw-bold text-cyan mt-1" style={{ fontSize: '0.88rem' }}>{nextTierDetails.nextTier} — còn {remaining}</div>
                </div>
                <div className="text-end">
                  <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>MÃ THÀNH VIÊN</small>
                  <div className="fw-bold text-white mt-1 font-monospace" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>AW-2026-{currentTier.replace(' Member','').toUpperCase()}</div>
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
