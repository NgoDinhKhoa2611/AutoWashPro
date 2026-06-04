import React, { useState, useEffect } from 'react';
import '../styles/shared.css';
import '../styles/admin/customers.css';

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  
  // Point adjustment states
  const [adjustAction, setAdjustAction] = useState('add');
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Voucher assignment states
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('WASH10K');

  const availableVouchers = [
    { code: 'WASH10K', title: 'Voucher Giảm 10.000đ' },
    { code: 'SILVER10', title: 'Ưu đãi Silver Giảm 10%' },
    { code: 'GOLD15', title: 'Ưu đãi Gold Giảm 15%' },
    { code: 'VIP20', title: 'Ưu đãi Platinum Giảm 20%' }
  ];

  useEffect(() => {
    loadCustomers();
    const handleStorage = () => loadCustomers();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadCustomers = () => {
    // Loyalty ranking logic Silver: 500-1999, Gold: 2000-4999, Platinum: 5000+
    const list = [
      {
        id: 'cus_01',
        name: 'Lê Tuấn Kiệt',
        phone: '0901234567',
        tier: 'Silver Loyalty',
        points: 217,
        joined: '19/05/2026',
        spend: 2170000,
        totalWashes: 12,
        activeVouchersCount: 1,
        lastActive: 'Hôm nay',
        vehicles: [{ plate: '51G - 123.45', type: 'Honda Vision' }],
        history: [
          { date: '28/05/2026', service: 'Combo Rửa xe cao cấp', price: 85000, status: 'Completed' },
          { date: '15/05/2026', service: 'Rửa xe phổ thông', price: 35000, status: 'Completed' }
        ],
        vouchers: [{ code: 'WASH10K', title: 'Voucher Giảm 10%', status: 'Active' }]
      },
      {
        id: 'cus_02',
        name: 'Nguyễn Văn A',
        phone: '0902345678',
        tier: 'Silver Loyalty',
        points: 650,
        joined: '10/05/2026',
        spend: 6500000,
        totalWashes: 8,
        activeVouchersCount: 2,
        lastActive: '3 ngày trước',
        vehicles: [{ plate: '51A - 999.99', type: 'SH Mode' }],
        history: [
          { date: '22/05/2026', service: 'Combo Rửa xe cao cấp', price: 85000, status: 'Completed' }
        ],
        vouchers: []
      },
      {
        id: 'cus_03',
        name: 'Lê Văn C',
        phone: '0988888888',
        tier: 'Gold Loyalty',
        points: 2150,
        joined: '01/01/2026',
        spend: 21500000,
        totalWashes: 24,
        activeVouchersCount: 3,
        lastActive: 'Hôm qua',
        vehicles: [{ plate: '59 - K1 47278', type: 'Yamaha Exciter' }],
        history: [
          { date: '29/05/2026', service: 'Combo Rửa xe cao cấp + Wax nano', price: 110000, status: 'Completed' }
        ],
        vouchers: []
      }
    ];
    setCustomers(list);
  };

  const getTierBadgeClass = (tier) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('PLATINUM')) return 'tier-pill-platinum active';
    if (t.includes('GOLD')) return 'tier-pill-gold active';
    if (t.includes('SILVER')) return 'tier-pill-silver active';
    return 'tier-pill-member active';
  };

  const openPointsModal = (customer) => {
    setSelectedCustomer(customer);
    setAdjustAction('add');
    setAdjustPoints(0);
    setAdjustReason('');
    setShowPointsModal(true);
  };

  const openVoucherModal = (customer) => {
    setSelectedCustomer(customer);
    setSelectedVoucherCode('WASH10K');
    setShowVoucherModal(true);
  };

  const applyPointAdjustment = () => {
    if (!selectedCustomer) return;

    const change = adjustPoints * (adjustAction === 'add' ? 1 : -1);
    const newPts = Math.max(0, selectedCustomer.points + change);

    // Dynamic Tier calculation Silver: 500-1999, Gold: 2000-4999, Platinum: 5000+
    let newTier = 'Standard Loyalty';
    if (newPts >= 5000) newTier = 'Platinum Loyalty';
    else if (newPts >= 2000) newTier = 'Gold Loyalty';
    else if (newPts >= 500) newTier = 'Silver Loyalty';

    const updated = customers.map(c => {
      if (c.id !== selectedCustomer.id) return c;
      return { ...c, points: newPts, tier: newTier };
    });

    setCustomers(updated);
    if (window.showToast) {
      window.showToast(`Đã cập nhật thành công ${change > 0 ? '+' : ''}${change} điểm cho ${selectedCustomer.name}!`, 'success');
    }
    setShowPointsModal(false);
  };

  const applyVoucherAssign = () => {
    if (!selectedCustomer) return;
    const vInfo = availableVouchers.find(v => v.code === selectedVoucherCode);

    if (window.showToast) {
      window.showToast(`Đã gán thành công voucher "${vInfo.title}" cho ${selectedCustomer.name}!`, 'success');
    }
    setShowVoucherModal(false);
  };

  const handleExportCustomers = () => {
    if (window.showToast) {
      window.showToast('Đang xuất danh sách khách hàng ra file Excel...', 'success');
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div className="container-fluid py-4 text-start">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-2 border-bottom pb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>QUẢN LÝ KHÁCH HÀNG</h4>
          <p className="text-secondary small mb-0">Hồ sơ khách hàng, phân hạng thành viên Loyalty và đặc quyền điểm tích lũy</p>
        </div>
        <div className="d-flex gap-2">
          <div className="input-group" style={{ width: '280px' }}>
            <span className="input-group-text bg-white border border-end-0 shadow-sm" style={{ borderRadius: '10px 0 0 10px' }}>
              <i className="fas fa-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border border-start-0 shadow-sm py-2"
              placeholder="Tìm tên hoặc SĐT..."
              style={{ borderRadius: '0 10px 10px 0' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-light btn-sm py-2 px-3 fw-bold rounded-3 shadow-sm border" onClick={handleExportCustomers}>
            <i className="fas fa-file-export me-1"></i> XUẤT FILE EXCEL
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="app-card border-0 shadow-sm bg-white rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="small text-uppercase text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                <th className="ps-4 py-3">Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Phân hạng Loyalty</th>
                <th>Số điểm tích lũy</th>
                <th>Chi tiêu tích lũy</th>
                <th>Tổng lượt rửa</th>
                <th>Voucher khả dụng</th>
                <th className="text-end pe-4">Hành động</th>
              </tr>
            </thead>
            <tbody className="small fw-semibold">
              {filteredCustomers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{c.name}</div>
                    <small className="text-muted">Ngày tham gia: {c.joined}</small>
                  </td>
                  <td className="font-monospace text-dark">{c.phone}</td>
                  <td>
                    <span className={`badge tier-pill ${getTierBadgeClass(c.tier)} px-3 py-1.5 border-0`} style={{ fontSize: '0.62rem', color: 'black' }}>
                      {c.tier}
                    </span>
                  </td>
                  <td className="fw-bold text-dark">{c.points.toLocaleString()} PTS</td>
                  <td className="fw-bold text-cyan">{c.spend.toLocaleString()}đ</td>
                  <td className="text-dark">{c.totalWashes} lượt</td>
                  <td className="text-secondary">{c.activeVouchersCount} voucher</td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-1.5">
                      <button
                        className="btn btn-sm btn-cyan font-bold py-1.5 px-2.5 text-dark border-0"
                        style={{ fontSize: '0.65rem', borderRadius: '8px', background: 'rgba(14,165,233,0.12)' }}
                        onClick={() => openPointsModal(c)}
                      >
                        <i className="fas fa-plus-circle me-1"></i>ĐIỂM
                      </button>
                      <button
                        className="btn btn-sm btn-light py-1.5 px-2.5 font-bold border rounded-3 shadow-sm"
                        style={{ fontSize: '0.65rem' }}
                        onClick={() => openVoucherModal(c)}
                      >
                        <i className="fas fa-ticket-alt me-1 text-warning"></i>GÁN VOUCHER
                      </button>
                      <button
                        className="btn btn-sm bg-light text-muted border-0 p-2 rounded-circle"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => setDetailCustomer(c)}
                      >
                        <i className="fas fa-user-cog"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point Adjustment Modal */}
      {showPointsModal && selectedCustomer && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '420px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">Điều chỉnh điểm Loyalty</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setShowPointsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body py-3">
              <div className="bg-light p-3 rounded-4 mb-3" style={{ border: '1px solid #e2e8f0' }}>
                <div className="row text-start" style={{ fontSize: '0.8rem' }}>
                  <div className="col-6 border-end">
                    <small className="text-muted d-block">KHÁCH HÀNG</small>
                    <strong className="text-dark">{selectedCustomer.name}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">ĐIỂM HIỆN TẠI</small>
                    <strong className="text-cyan fs-6">{selectedCustomer.points.toLocaleString()} PTS</strong>
                  </div>
                </div>
              </div>
              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-muted mb-1">HÀNH ĐỘNG</label>
                <select className="form-select bg-light border-0 py-2" value={adjustAction} onChange={e => setAdjustAction(e.target.value)}>
                  <option value="add">Cộng điểm (+)</option>
                  <option value="sub">Trừ điểm (-)</option>
                </select>
              </div>
              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-muted mb-1">SỐ ĐIỂM CẬP NHẬT</label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2 text-dark fw-bold"
                  value={adjustPoints}
                  onChange={e => setAdjustPoints(Number(e.target.value))}
                />
              </div>
              <div className="mb-0 text-start">
                <label className="form-label small fw-bold text-muted mb-1">LÝ DO ĐIỀU CHỈNH</label>
                <textarea
                  className="form-control bg-light border-0 py-2"
                  rows="3"
                  placeholder="Điền lý do: Tặng quà sinh nhật, đền bù dịch vụ lỗi..."
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn w-50" onClick={() => setShowPointsModal(false)}>HỦY</button>
              <button className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark" style={{ background: 'var(--cyan-electric)' }} onClick={applyPointAdjustment}>CẬP NHẬT</button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Assignment Modal */}
      {showVoucherModal && selectedCustomer && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '420px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">Gán voucher ưu đãi</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setShowVoucherModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body py-3">
              <div className="bg-light p-3 rounded-4 mb-3 text-start">
                <small className="text-muted d-block mb-1">GÁN CHO KHÁCH HÀNG</small>
                <strong className="text-dark">{selectedCustomer.name}</strong> ({selectedCustomer.phone})
              </div>
              <div className="mb-0 text-start">
                <label className="form-label small fw-bold text-muted mb-1 font-bold">CHỌN VOUCHER ƯU ĐÃI</label>
                <select className="form-select bg-light border-0 py-2.5 text-dark fw-bold" value={selectedVoucherCode} onChange={e => setSelectedVoucherCode(e.target.value)}>
                  {availableVouchers.map(v => <option key={v.code} value={v.code}>{v.title} ({v.code})</option>)}
                </select>
              </div>
            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn w-50" onClick={() => setShowVoucherModal(false)}>HỦY</button>
              <button className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark" style={{ background: 'var(--cyan-electric)' }} onClick={applyVoucherAssign}>GÁN VOUCHER</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL DRAWER / MODAL */}
      {detailCustomer && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '520px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">Hồ sơ khách hàng: {detailCustomer.name}</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setDetailCustomer(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body text-start py-3" style={{ maxHeight: '440px', overflowY: 'auto' }}>
              
              {/* Profile details */}
              <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '0.85rem' }}>THÔNG TIN CÁ NHÂN</h6>
              <div className="bg-light p-3 rounded-4 mb-3 border">
                <div className="row g-2 text-secondary" style={{ fontSize: '0.78rem' }}>
                  <div className="col-6">Họ tên: <strong className="text-dark">{detailCustomer.name}</strong></div>
                  <div className="col-6">SĐT: <strong className="text-dark font-monospace">{detailCustomer.phone}</strong></div>
                  <div className="col-6">Hạng Loyalty: <strong className="text-cyan">{detailCustomer.tier}</strong></div>
                  <div className="col-6">Điểm: <strong className="text-dark">{detailCustomer.points} PTS</strong></div>
                  <div className="col-6">Tham gia: <strong className="text-dark">{detailCustomer.joined}</strong></div>
                  <div className="col-6">Lần cuối: <strong className="text-dark">{detailCustomer.lastActive}</strong></div>
                </div>
              </div>

              {/* Vehicles owned */}
              <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '0.85rem' }}>DANH SÁCH PHƯƠNG TIỆN ({detailCustomer.vehicles.length})</h6>
              <div className="d-flex flex-column gap-2 mb-3">
                {detailCustomer.vehicles.map((v, i) => (
                  <div key={i} className="p-2 border rounded-3 d-flex justify-content-between align-items-center bg-white">
                    <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.8rem' }}>{v.plate}</span>
                    <span className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: '0.62rem' }}>{v.type}</span>
                  </div>
                ))}
              </div>

              {/* History Wash Bookings */}
              <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '0.85rem' }}>LỊCH SỬ RỬA XE GẦN NHẤT</h6>
              <div className="d-flex flex-column gap-2 mb-3">
                {detailCustomer.history.length === 0 ? (
                  <small className="text-muted">Chưa có lịch sử rửa xe.</small>
                ) : (
                  detailCustomer.history.map((h, i) => (
                    <div key={i} className="p-2 border rounded-3 d-flex justify-content-between bg-white text-secondary" style={{ fontSize: '0.75rem' }}>
                      <div>
                        <strong className="text-dark d-block">{h.service}</strong>
                        <small>{h.date}</small>
                      </div>
                      <div className="text-end">
                        <strong className="text-cyan d-block">{h.price.toLocaleString()}đ</strong>
                        <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.58rem' }}>Xong</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active claimed vouchers */}
              <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '0.85rem' }}>VOUCHER ĐANG KHẢ DỤNG</h6>
              <div className="d-flex flex-column gap-2">
                {detailCustomer.vouchers.length === 0 ? (
                  <small className="text-muted">Không có voucher khả dụng.</small>
                ) : (
                  detailCustomer.vouchers.map((v, i) => (
                    <div key={i} className="p-2 border border-dashed rounded-3 bg-white d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem', borderStyle: 'dashed' }}>
                      <span className="fw-bold text-dark">{v.title} ({v.code})</span>
                      <span className="badge bg-info bg-opacity-10 text-cyan">Active</span>
                    </div>
                  ))
                )}
              </div>

            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn w-100" onClick={() => setDetailCustomer(null)}>ĐÓNG HỒ SƠ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCustomers;
