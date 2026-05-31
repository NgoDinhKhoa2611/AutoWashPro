import React, { useState, useEffect } from 'react';

const AdminPromotions = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [promoName, setPromoName] = useState('');
  const [promoTarget, setPromoTarget] = useState('All Customers');
  const [promoMax, setPromoMax] = useState(500);
  const [promoDesc, setPromoDesc] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = () => {
    const saved = localStorage.getItem('app_promotions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCampaigns(parsed);
        return;
      } catch (e) {
        console.error('Failed to parse app_promotions', e);
      }
    }
    const defaultCampaigns = [
      {
        id: 'promo_01',
        name: 'Chào hè rực rỡ 2026',
        description: 'Giảm 20% cho tất cả khách hàng hạng Platinum khi đặt lịch vào khung giờ vàng (11:00 - 14:00).',
        status: 'Active',
        target: 'Platinum',
        redemptions: 145,
        maxRedemptions: 500
      },
      {
        id: 'promo_02',
        name: 'Tết Nguyên Đán 2026',
        description: 'Tặng 100 điểm thưởng cho mọi lượt rửa xe từ 25 Tết đến mùng 5 Tết.',
        status: 'Expired',
        target: 'All Customers',
        redemptions: 320,
        maxRedemptions: 320
      }
    ];
    localStorage.setItem('app_promotions', JSON.stringify(defaultCampaigns));
    setCampaigns(defaultCampaigns);
  };

  const launchCampaign = (e) => {
    e.preventDefault();
    if (!promoName.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập tên chiến dịch!', 'warning');
      return;
    }

    const newPromo = {
      id: 'promo_' + Date.now(),
      name: promoName.trim(),
      description: promoDesc.trim() || 'Ưu đãi đặc biệt từ hệ thống AutoWash Pro.',
      status: 'Active',
      target: promoTarget,
      redemptions: 0,
      maxRedemptions: Number(promoMax) || 500
    };

    const updated = [newPromo, ...campaigns];
    setCampaigns(updated);
    localStorage.setItem('app_promotions', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    // Reset Form & Close Modal
    setPromoName('');
    setPromoTarget('All Customers');
    setPromoMax(500);
    setPromoDesc('');
    setShowModal(false);

    if (window.showToast) {
      window.showToast('Phát hành chiến dịch khuyến mãi mới thành công!', 'success');
    }
  };

  const toggleCampaignStatus = (id) => {
    const updated = campaigns.map(c => {
      if (c.id !== id) return c;
      const nextStatus = c.status === 'Active' ? 'Stopped' : 'Active';
      return { ...c, status: nextStatus };
    });
    setCampaigns(updated);
    localStorage.setItem('app_promotions', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const deleteCampaign = (id) => {
    if (window.showConfirm) {
      window.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xoá chiến dịch này?', () => {
        const updated = campaigns.filter(c => c.id !== id);
        setCampaigns(updated);
        localStorage.setItem('app_promotions', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        if (window.showToast) window.showToast('Đã xoá chiến dịch thành công!', 'success');
      });
    } else {
      if (window.confirm('Bạn có chắc chắn muốn xoá chiến dịch này?')) {
        const updated = campaigns.filter(c => c.id !== id);
        setCampaigns(updated);
        localStorage.setItem('app_promotions', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  return (
    <div className="container-fluid py-4">
      <header className="d-flex justify-content-between align-items-center mb-5 animate-up">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Campaigns</h4>
          <p className="text-muted small mb-0 fw-medium">Manage premium promotions and customer rewards.</p>
        </div>
        <button
          className="app-btn-primary w-auto px-4 shadow-none"
          style={{ fontSize: '0.8rem', borderRadius: '12px' }}
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus me-2"></i> NEW CAMPAIGN
        </button>
      </header>

      {/* Campaign Cards Grid */}
      <div className="row g-4">
        {campaigns.length === 0 ? (
          <div className="col-12 animate-up">
            <div className="app-card border-0 shadow-sm p-5 text-center text-muted" style={{ borderRadius: '24px' }}>
              <i className="fas fa-bullhorn fa-3x mb-3 opacity-25"></i>
              <h5 className="fw-bold" style={{ color: 'var(--navy-dark)' }}>Chưa có chiến dịch nào</h5>
              <p className="text-muted small mb-0">Tạo chiến dịch đầu tiên bằng cách nhấn "NEW CAMPAIGN".</p>
            </div>
          </div>
        ) : (
          campaigns.map((c, i) => {
            const pct = Math.min(100, c.maxRedemptions > 0 ? Math.floor((c.redemptions / c.maxRedemptions) * 100) : 0);
            const isActive = c.status === 'Active';
            const isExpired = c.status === 'Expired';
            const isStopped = c.status === 'Stopped';

            const statusBadge = isActive
              ? 'bg-success bg-opacity-10 text-success'
              : isExpired
              ? 'bg-secondary bg-opacity-10 text-secondary'
              : 'bg-danger bg-opacity-10 text-danger';

            return (
              <div key={c.id} className="col-md-6 animate-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                <div className={`app-card border-0 shadow-sm p-4 ${!isActive ? 'opacity-75' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>{c.name}</h6>
                      <span className={`badge ${statusBadge} rounded-pill px-3`} style={{ fontSize: '0.7rem' }}>
                        {c.status}
                      </span>
                    </div>
                    <div className="dropdown">
                      <button className="btn btn-light btn-sm rounded-circle shadow-sm" data-bs-toggle="dropdown">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <ul className="dropdown-menu border-0 shadow-sm">
                        {isActive && (
                          <li>
                            <button className="dropdown-item fw-medium small border-0 bg-transparent text-start" onClick={() => toggleCampaignStatus(c.id)}>
                              <i className="fas fa-pause me-2 text-warning"></i> Tạm dừng
                            </button>
                          </li>
                        )}
                        {isStopped && (
                          <li>
                            <button className="dropdown-item fw-medium small border-0 bg-transparent text-start" onClick={() => toggleCampaignStatus(c.id)}>
                              <i className="fas fa-play me-2 text-success"></i> Kích hoạt
                            </button>
                          </li>
                        )}
                        <li>
                          <button className="dropdown-item fw-medium text-danger small border-0 bg-transparent text-start" onClick={() => deleteCampaign(c.id)}>
                            <i className="fas fa-trash-alt me-2"></i> Xoá bỏ
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <p className="small text-muted mb-4">{c.description}</p>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="bg-light p-2 rounded-3 text-center">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '0.6rem', fontWeight: 700 }}>TARGET TIER</small>
                        <span className="fw-bold small" style={{ color: 'var(--navy-dark)' }}>{c.target}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light p-2 rounded-3 text-center">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '0.6rem', fontWeight: 700 }}>REDEMPTIONS</small>
                        <span className="fw-bold small" style={{ color: 'var(--navy-dark)' }}>{c.redemptions}/{c.maxRedemptions}</span>
                      </div>
                    </div>
                  </div>
                  <div className="progress bg-light" style={{ height: '6px', borderRadius: '10px' }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${pct}%`,
                        background: isActive ? 'var(--cyan-electric)' : '#94a3b8',
                        boxShadow: isActive ? 'var(--cyan-glow)' : 'none'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Promo Modal */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 overflow-hidden" style={{ borderRadius: '24px' }}>
                <div className="modal-header text-white border-0 px-4 pt-4" style={{ background: 'var(--navy-dark)' }}>
                  <h6 className="fw-bold mb-0" style={{ color: 'var(--cyan-electric)' }}>CREATE NEW CAMPAIGN</h6>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={launchCampaign}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">CAMPAIGN NAME</label>
                        <input
                          type="text"
                          className="form-control bg-light border-0 py-2"
                          placeholder="e.g. VIP Summer Wash Discount"
                          value={promoName}
                          onChange={(e) => setPromoName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">TARGET MEMBER TIER</label>
                        <select
                          className="form-select bg-light border-0 py-2 text-muted fw-semibold"
                          value={promoTarget}
                          onChange={(e) => setPromoTarget(e.target.value)}
                        >
                          <option value="All Customers">All Customers</option>
                          <option value="Platinum">Platinum</option>
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                          <option value="Standard Member">Standard Member</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">MAX REDEMPTIONS</label>
                        <input
                          type="number"
                          className="form-control bg-light border-0 py-2"
                          value={promoMax}
                          onChange={(e) => setPromoMax(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-muted">DESCRIPTION & TERMS</label>
                        <textarea
                          className="form-control bg-light border-0 py-2"
                          rows="3"
                          placeholder="Enter description..."
                          value={promoDesc}
                          onChange={(e) => setPromoDesc(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <button type="submit" className="app-btn-primary shadow-none py-3 border-0">
                      LAUNCH CAMPAIGN
                    </button>
                    <button
                      type="button"
                      className="btn btn-link text-muted w-100 mt-2 text-decoration-none small fw-bold"
                      onClick={() => setShowModal(false)}
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
        </>
      )}
    </div>
  );
};

export default AdminPromotions;
