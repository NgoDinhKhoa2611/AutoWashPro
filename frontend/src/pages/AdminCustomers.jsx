import React, { useState, useEffect } from 'react';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adjustAction, setAdjustAction] = useState('add');
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCustomers();
    // Listen to localStorage changes in case another tab changes the user data
    const handleStorageChange = () => {
      loadCustomers();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadCustomers = () => {
    const userPoints = Number(localStorage.getItem('user_points') || 1250);
    const userTier = (localStorage.getItem('user_tier') || 'Gold Member').replace(' Member', '').toUpperCase();
    const userName = localStorage.getItem('user_display_name') || 'Lê Tuấn Kiệt';
    const userPhone = localStorage.getItem('user_phone') || '0901234567';

    const list = [
      { id: 'cus_user', name: `${userName} (Bạn)`, phone: userPhone, tier: userTier, points: userPoints, joined: '19/05/2026', spend: userPoints.toLocaleString() + 'đ', isUser: true },
      { id: 'cus_01',   name: 'Nguyễn Văn A',       phone: '0902345678',  tier: 'SILVER',   points: 450,  joined: '10/05/2026', spend: '120.000đ', isUser: false },
      { id: 'cus_02',   name: 'Lê Văn C',            phone: '0988888888',  tier: 'PLATINUM', points: 2150, joined: '01/01/2026', spend: '850.000đ', isUser: false }
    ];
    setCustomers(list);
  };

  const getTierBadgeClass = (tier) => {
    switch ((tier || '').toUpperCase()) {
      case 'PLATINUM': return 'tier-pill-platinum active';
      case 'GOLD':     return 'tier-pill-gold active';
      case 'SILVER':   return 'tier-pill-silver active';
      default:         return 'tier-pill-member active';
    }
  };

  const getTierInfo = (pts) => {
    if (pts >= 2000) return { tier: 'Platinum Member', nextTier: null, remaining: '0đ' };
    if (pts >= 1000) return { tier: 'Gold Member', nextTier: 'Platinum', remaining: '750k (hoặc 750 PTS)' };
    if (pts >= 500) return { tier: 'Silver Member', nextTier: 'Gold', remaining: '500k (hoặc 500 PTS)' };
    return { tier: 'Standard Member', nextTier: 'Silver', remaining: '500k (hoặc 500 PTS)' };
  };

  const openPointsModal = (customer) => {
    setSelectedCustomer(customer);
    setAdjustAction('add');
    setAdjustPoints(0);
    setAdjustReason('');
    setShowModal(true);
  };

  const closePointsModal = () => {
    setSelectedCustomer(null);
    setShowModal(false);
  };

  const applyPointAdjustment = () => {
    if (!selectedCustomer) return;

    const change = adjustPoints * (adjustAction === 'add' ? 1 : -1);
    const newPts = Math.max(0, selectedCustomer.points + change);

    // Update in-memory and state
    const updated = customers.map(c => {
      if (c.id !== selectedCustomer.id) return c;
      let newTier = c.tier;
      if (c.isUser) {
        const tierInfo = getTierInfo(newPts);
        newTier = tierInfo.tier.replace(' Member', '').toUpperCase();
        localStorage.setItem('user_points', String(newPts));
        localStorage.setItem('user_tier', tierInfo.tier);
        localStorage.setItem('user_next_tier', tierInfo.nextTier || '');
        localStorage.setItem('user_remaining_spend', tierInfo.remaining || '');
        window.dispatchEvent(new Event('storage'));
      }
      return { ...c, points: newPts, tier: newTier };
    });

    setCustomers(updated);
    if (window.showToast) {
      window.showToast(`Đã cập nhật điểm thành công cho ${selectedCustomer.name}!`, 'success');
    }
    closePointsModal();
  };

  const viewCustomerProfile = (name) => {
    if (window.showToast) {
      window.showToast(`Đang tải hồ sơ chi tiết của ${name}...`, 'info');
    }
  };

  const handleExportCustomers = () => {
    if (window.showToast) {
      window.showToast('Đang xuất dữ liệu khách hàng ra file Excel...', 'success');
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div className="container-fluid py-4">
      <header className="d-flex justify-content-between align-items-center mb-5 animate-up">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Customer Relationship</h4>
          <p className="text-muted small mb-0 fw-medium">Manage loyalty tiers and customer data.</p>
        </div>
        <div className="d-flex gap-2">
          <div className="input-group" style={{ width: '300px' }}>
            <span className="input-group-text bg-white border-0 shadow-sm">
              <i className="fas fa-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-0 shadow-sm px-3 py-2"
              placeholder="Tìm theo tên hoặc số điện thoại..."
              style={{ borderRadius: '0 12px 12px 0' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="app-btn-primary py-2 px-4 w-auto shadow-none"
            style={{ fontSize: '0.8rem', borderRadius: '12px' }}
            onClick={handleExportCustomers}
          >
            <i className="fas fa-file-export me-1"></i> EXPORT DATA
          </button>
        </div>
      </header>

      {/* Customer Table */}
      <div className="app-card p-0 overflow-hidden border-0 shadow-lg animate-up" style={{ animationDelay: '0.1s', borderRadius: '24px' }}>
        <div className="p-4 border-bottom bg-white d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0" style={{ color: 'var(--navy-dark)' }}>Customer Directory</h6>
          <span className="badge bg-light text-muted border-0 fw-bold" style={{ fontSize: '0.7rem' }}>
            TOTAL: {filteredCustomers.length} CUSTOMERS
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="small text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                <th className="ps-4 py-3">Customer</th>
                <th>Phone Number</th>
                <th>Loyalty Tier</th>
                <th>Points</th>
                <th>Monthly Spend</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody className="small fw-medium">
              {filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td className="ps-4">
                    <div className="fw-bold" style={{ color: 'var(--navy-dark)' }}>
                      {c.name}
                      {c.isUser && (
                        <span className="badge ms-1 fw-bold" style={{ fontSize: '0.6rem', background: 'var(--navy-dark)', color: 'var(--cyan-electric)' }}>
                          BẠN
                        </span>
                      )}
                    </div>
                    <small className="text-muted">Joined: {c.joined}</small>
                  </td>
                  <td className="fw-bold" style={{ color: 'var(--navy-dark)' }}>{c.phone}</td>
                  <td>
                    <span className={`badge tier-pill ${getTierBadgeClass(c.tier)} px-3 py-1 border-0`} style={{ fontSize: '0.65rem', color: 'black' }}>
                      {c.tier}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold" style={{ color: 'var(--navy-dark)' }}>
                      {Number(c.points).toLocaleString()} PTS
                    </span>
                  </td>
                  <td className="fw-bold text-cyan">{c.spend}</td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm me-1 rounded-3 px-3 py-2 shadow-sm fw-bold"
                      style={{ fontSize: '0.7rem', background: 'var(--navy-dark)', color: 'var(--cyan-electric)' }}
                      onClick={() => openPointsModal(c)}
                    >
                      <i className="fas fa-plus-circle me-1"></i> POINTS
                    </button>
                    <button
                      className="btn btn-sm bg-light text-muted border-0 rounded-3 p-2 shadow-sm"
                      style={{ width: '35px' }}
                      onClick={() => viewCustomerProfile(c.name)}
                    >
                      <i className="fas fa-user-cog"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point Adjustment Modal */}
      {showModal && selectedCustomer && (
        <>
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 overflow-hidden" style={{ borderRadius: '24px' }}>
                <div className="modal-header text-white border-0 px-4 pt-4" style={{ background: 'var(--navy-dark)' }}>
                  <h6 className="fw-bold mb-0" style={{ color: 'var(--cyan-electric)' }}>ĐIỀU CHỈNH ĐIỂM THÀNH VIÊN</h6>
                  <button type="button" className="btn-close btn-close-white" onClick={closePointsModal}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="app-card bg-light border-0 p-3 mb-4 rounded-4">
                    <div className="row">
                      <div className="col-6 border-end">
                        <small className="text-muted fw-bold small mb-1 d-block">KHÁCH HÀNG</small>
                        <div className="fw-bold" style={{ color: 'var(--navy-dark)' }}>{selectedCustomer.name}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted fw-bold small mb-1 d-block">ĐIỂM HIỆN TẠI</small>
                        <div className="fw-bold text-cyan fs-5">{Number(selectedCustomer.points).toLocaleString()} PTS</div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">HÀNH ĐỘNG</label>
                    <select
                      className="form-select bg-light border-0 py-2"
                      value={adjustAction}
                      onChange={(e) => setAdjustAction(e.target.value)}
                    >
                      <option value="add">Cộng điểm (+)</option>
                      <option value="sub">Trừ điểm (-)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">SỐ ĐIỂM</label>
                    <input
                      type="number"
                      className="form-control bg-light border-0 py-2"
                      value={adjustPoints}
                      onChange={(e) => setAdjustPoints(Number(e.target.value))}
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label small fw-bold text-muted">LÝ DO ĐIỀU CHỈNH</label>
                    <textarea
                      className="form-control bg-light border-0 py-2"
                      rows="3"
                      placeholder="Ví dụ: Đền bù dịch vụ lỗi, Tặng quà sinh nhật..."
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    className="app-btn-primary shadow-none py-3"
                    onClick={applyPointAdjustment}
                  >
                    CẬP NHẬT ĐIỂM
                  </button>
                  <button
                    type="button"
                    className="btn btn-link text-muted w-100 mt-2 text-decoration-none small fw-bold"
                    onClick={closePointsModal}
                  >
                    HỦY BỎ
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
        </>
      )}
    </div>
  );
};

export default AdminCustomers;
