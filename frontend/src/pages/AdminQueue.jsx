import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import '../styles/shared.css';
import '../styles/admin/queue.css';

export const AdminQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Walk-in form states
  const [walkInPlate, setWalkInPlate] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInLoading, setWalkInLoading] = useState(false);

  // Edit notes state
  const [editingItem, setEditingItem] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
    // Auto-reload every 30 seconds for live updates
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await adminService.getQueue();
      setQueue(data);
    } catch (err) {
      console.error('Lỗi khi tải hàng đợi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceQueue = async (id) => {
    try {
      const response = await adminService.advanceQueue(id);
      if (response.success) {
        if (window.showToast) window.showToast(`Chuyển trạng thái xe thành công sang '${response.newStatus}'!`, 'success');
        fetchQueue();
      } else {
        if (window.showToast) window.showToast('Không thể chuyển đổi trạng thái!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Có lỗi xảy ra!', 'error');
    }
  };

  const handleCancelQueue = (id, plate) => {
    const cancel = async () => {
      try {
        const response = await adminService.cancelQueue(id);
        if (response.success) {
          if (window.showToast) window.showToast(`Đã huỷ hàng đợi xe ${plate} thành công.`, 'warning');
          fetchQueue();
        }
      } catch (err) {
        if (window.showToast) window.showToast('Lỗi khi huỷ hàng đợi!', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Huỷ lượt rửa xe', `Bạn có chắc muốn huỷ lượt rửa xe cho biển số ${plate}?`, cancel);
    } else {
      if (window.confirm('Huỷ lượt xe?')) cancel();
    }
  };

  const handleCheckoutQueue = (id, plate) => {
    const checkout = async () => {
      try {
        const response = await adminService.checkoutQueue(id);
        if (response.success) {
          if (window.showToast) {
            window.showToast(`Check-out thành công cho xe ${plate}! Tổng thu: ${response.finalPrice.toLocaleString()}đ. Khách nhận: +${response.pointsEarned} PTS.`, 'success');
          }
          fetchQueue();
        }
      } catch (err) {
        if (window.showToast) window.showToast('Lỗi khi thanh toán!', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Thanh toán & Check-out', `Khách hàng đã hoàn thành và muốn thanh toán cho xe ${plate}?`, checkout);
    } else {
      if (window.confirm('Checkout xe?')) checkout();
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInPlate.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền biển số xe!', 'warning');
      return;
    }

    setWalkInLoading(true);
    try {
      const response = await adminService.addWalkIn(walkInPlate, walkInName);
      if (response.success) {
        if (window.showToast) {
          window.showToast(
            response.hasBooking
              ? `Check-in thành công khách VIP: ${response.customerName}. Tìm thấy lịch đặt trước dịch vụ: ${response.bookingServices}!`
              : `Check-in khách vãng lai thành công cho xe ${walkInPlate}!`,
            'success'
          );
        }
        setWalkInPlate('');
        setWalkInName('');
        fetchQueue();
      }
    } catch (err) {
      if (window.showToast) window.showToast('Biển số xe không hợp lệ hoặc lỗi kết nối!', 'error');
    } finally {
      setWalkInLoading(false);
    }
  };

  const handleOpenNotesModal = (item) => {
    setEditingItem(item);
    setEditNotes(item.staffNote || '');
  };

  const handleSaveNotes = async () => {
    if (!editingItem) return;
    setNotesLoading(true);
    try {
      const response = await adminService.updateQueue(editingItem.queueId, editingItem.status, editNotes);
      if (response.success) {
        if (window.showToast) window.showToast('Cập nhật ghi chú nhân viên thành công!', 'success');
        setEditingItem(null);
        fetchQueue();
      }
    } catch (err) {
      if (window.showToast) window.showToast('Lỗi cập nhật ghi chú!', 'error');
    } finally {
      setNotesLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Waiting':
        return <span className="badge bg-secondary bg-opacity-10 text-secondary px-2.5 py-1.5 rounded-pill fw-bold">Chờ check-in</span>;
      case 'LPR_Scan':
        return <span className="badge bg-warning bg-opacity-10 text-warning px-2.5 py-1.5 rounded-pill fw-bold">Đã quét LPR</span>;
      case 'Washing':
        return <span className="badge bg-info bg-opacity-10 text-cyan px-2.5 py-1.5 rounded-pill fw-bold animate-pulse"><span className="pulse-dot-washing me-1"></span>Đang phun rửa vỏ</span>;
      case 'Drying':
        return <span className="badge bg-info bg-opacity-10 text-cyan px-2.5 py-1.5 rounded-pill fw-bold animate-pulse"><span className="pulse-dot-washing me-1"></span>Đang sấy áp lực</span>;
      default:
        return <span className="badge bg-success bg-opacity-10 text-success px-2.5 py-1.5 rounded-pill fw-bold">Hoàn tất</span>;
    }
  };

  const getNextActionLabel = (status) => {
    switch (status) {
      case 'Waiting':
        return 'QUÉT LPR';
      case 'LPR_Scan':
        return 'BẮT ĐẦU RỬA';
      case 'Washing':
        return 'CHUYỂN SẤY KHÔ';
      default:
        return '';
    }
  };

  const isBypassActive = (tierId) => tierId >= 3; // Gold & Platinum bypass

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row g-4">
        {/* Left Column: Live Queue Table */}
        <div className="col-lg-8">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4" style={{ minHeight: '450px' }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-2">
              <h5 className="fw-bold mb-0" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-list-ol text-cyan me-2"></i>HÀNG ĐỢI XE TRONG NGÀY ({queue.length})
              </h5>
              <button className="btn btn-light btn-sm rounded shadow-sm py-1.5 px-3 fw-bold" onClick={fetchQueue} disabled={loading}>
                <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i> LÀM MỚI
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr className="bg-light text-secondary small" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                    <th className="ps-4">Vị trí & Biển số</th>
                    <th>Chủ xe / VIP</th>
                    <th>Dịch vụ đã chọn</th>
                    <th>Trạng thái rửa</th>
                    <th className="text-end pe-4">Thao tác xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted small">
                        Hàng đợi trống. Check-in xe vãng lai hoặc chờ camera quét LPR.
                      </td>
                    </tr>
                  ) : (
                    queue.map((item, idx) => {
                      const nextLabel = getNextActionLabel(item.status);
                      const isVIP = isBypassActive(item.tierId);
                      
                      return (
                        <tr key={item.queueId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Position & Plate */}
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark font-monospace border py-1.5 px-2.5" style={{ fontSize: '0.85rem' }}>
                                {item.licensePlate}
                              </span>
                              {isVIP && (
                                <span className="badge bg-warning text-dark font-semibold" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                                  VIP PASS
                                </span>
                              )}
                            </div>
                            <small className="text-muted mt-1 d-block" style={{ fontSize: '0.68rem' }}>
                              Check-in: {new Date(item.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </td>

                          {/* Customer */}
                          <td>
                            <span className="fw-bold d-block" style={{ color: 'var(--navy-dark)', fontSize: '0.85rem' }}>{item.customerName}</span>
                            <span className="badge bg-light text-muted border py-0.5 px-2" style={{ fontSize: '0.62rem' }}>{item.tierName}</span>
                          </td>

                          {/* Services */}
                          <td>
                            <div className="d-flex flex-column gap-0.5">
                              {item.services.map((s, sidx) => (
                                <small key={sidx} className="fw-semibold text-muted" style={{ fontSize: '0.72rem' }}>
                                  {s.name}
                                </small>
                              ))}
                            </div>
                          </td>

                          {/* Status */}
                          <td>{getStatusBadge(item.status)}</td>

                          {/* Actions */}
                          <td className="text-end pe-4">
                            <div className="d-flex justify-content-end gap-1.5">
                              {nextLabel ? (
                                <button className="btn btn-sm btn-cyan fw-bold py-1.5 px-3" style={{ fontSize: '0.68rem', borderRadius: '8px' }} onClick={() => handleAdvanceQueue(item.queueId)}>
                                  {nextLabel}
                                </button>
                              ) : item.status === 'Drying' ? (
                                <button className="btn btn-sm btn-success fw-bold py-1.5 px-3" style={{ fontSize: '0.68rem', borderRadius: '8px' }} onClick={() => handleCheckoutQueue(item.queueId, item.licensePlate)}>
                                  CHECKOUT
                                </button>
                              ) : (
                                <span className="text-muted small px-3">Hoàn tất</span>
                              )}

                              <button className="btn btn-sm bg-light text-muted border-0 p-2 rounded-circle" style={{ width: '32px', height: '32px' }} onClick={() => handleOpenNotesModal(item)} data-bs-toggle="modal" data-bs-target="#notesModal">
                                <i className="fas fa-edit"></i>
                              </button>

                              {item.status !== 'Completed' && (
                                <button className="btn btn-sm btn-outline-danger border-0 p-2 rounded-circle" style={{ width: '32px', height: '32px' }} onClick={() => handleCancelQueue(item.queueId, item.licensePlate)}>
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Walk-in Check-in form */}
        <div className="col-lg-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-sign-in-alt text-cyan me-2"></i>CHECK-IN XE VÀNG LAI (WALK-IN)
            </h5>
            <form onSubmit={handleAddWalkIn}>
              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-muted">BIỂN SỐ XE</label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2.5 font-monospace uppercase fw-bold"
                  placeholder="VÍ DỤ: 59A - 999.99"
                  value={walkInPlate}
                  onChange={(e) => setWalkInPlate(e.target.value)}
                  required
                />
                <small className="text-muted mt-1 d-block" style={{ fontSize: '0.68rem' }}>Hệ thống tự liên kết nếu đã có lịch đặt sẵn hôm nay</small>
              </div>
              <div className="mb-4 text-start">
                <label className="form-label small fw-bold text-muted">TÊN KHÁCH HÀNG (TÙY CHỌN)</label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2.5"
                  placeholder="Nhập tên khách hàng"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                />
              </div>
              <button type="submit" disabled={walkInLoading} className="app-btn-primary w-100 py-3 shadow-lg fs-6">
                {walkInLoading ? 'ĐANG ĐĂNG KÝ...' : 'THÊM VÀO HÀNG CHỜ RỬA'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Staff Notes Edit Modal */}
      {editingItem && (
        <div id="notesModal" className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="confirm-modal-header">
              <h5 className="confirm-modal-title">Ghi chú nhân viên</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setEditingItem(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body text-start">
              <div className="alert alert-info py-2 small mb-3">
                Cập nhật ghi chú nội bộ cho xe <strong>{editingItem.licensePlate}</strong> (ví dụ: vết trầy sơn sẵn có, lưu ý vệ sinh).
              </div>
              <textarea
                className="form-control bg-light border-0 py-2.5 rounded-3"
                rows="4"
                placeholder="Điền ghi chú của bạn tại đây..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn w-50" onClick={() => setEditingItem(null)}>ĐÓNG</button>
              <button className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold" disabled={notesLoading} onClick={handleSaveNotes}>
                {notesLoading ? 'ĐANG LƯU...' : 'LƯU GHI CHÚ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminQueue;
