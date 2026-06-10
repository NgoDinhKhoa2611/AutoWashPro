import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import '../styles/shared.css';
import '../styles/admin/queue.css';

// Column definitions for Kanban board
const KANBAN_COLUMNS = [
  { id: 'Waiting', name: 'Chờ check-in', color: 'border-secondary' },
  { id: 'LPR_Scan', name: 'Đã quét LPR', color: 'border-warning' },
  { id: 'Washing', name: 'Đang rửa bọt tuyết', color: 'border-info' },
  { id: 'Addon_Processing', name: 'Xử lý dịch vụ đi kèm', color: 'border-primary' },
  { id: 'Drying', name: 'Sấy khô / K.tra cuối', color: 'border-cyan' },
  { id: 'Completed', name: 'Hoàn tất', color: 'border-success' }
];

const STAFF_LIST = ['Nguyễn Văn A', 'Trần Văn B', 'Lê Văn C', 'Phạm Hồng D'];

export const AdminQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form check-in walk-in
  const [walkInPlate, setWalkInPlate] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInMainSvc, setWalkInMainSvc] = useState('Combo Rửa xe cao cấp');
  const [walkInAddons, setWalkInAddons] = useState([]);
  const [walkInPriority, setWalkInPriority] = useState('Standard Loyalty');
  const [walkInNote, setWalkInNote] = useState('');
  
  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Static services list for walk-in form
  const mainServicesList = [
    'Rửa xe phổ thông',
    'Combo Rửa xe cao cấp',
    'Rửa xe siêu nhanh'
  ];

  const addonServicesList = [
    'Vệ sinh nội thất',
    'Wax nano',
    'Chăm sóc dưỡng nhựa',
    'Vệ sinh sên xích'
  ];

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await adminService.getQueue();
      if (response) {
        const mapped = response.map(item => {
          const mainService = item.services[0]?.name || 'Rửa xe phổ thông';
          const addonsOnly = item.services.filter(s => s.name !== mainService).map(s => s.name);

          const servicesList = [
            { name: 'Nhận diện LPR', status: item.status === 'Waiting' ? 'In Progress' : 'Completed' },
            { name: 'Rửa bọt tuyết', status: item.status === 'Waiting' ? 'Pending' : (item.status === 'LPR_Scan' ? 'In Progress' : 'Completed') }
          ];
          
          addonsOnly.forEach(a => {
            servicesList.push({ 
              name: a, 
              status: (item.status === 'Waiting' || item.status === 'LPR_Scan') ? 'Pending' 
                     : (item.status === 'Washing' || item.status === 'Addon_Processing' ? 'In Progress' : 'Completed') 
            });
          });
          
          servicesList.push({ 
            name: 'Sấy khô', 
            status: item.status === 'Completed' ? 'Completed' 
                   : (item.status === 'Drying' ? 'In Progress' : 'Pending') 
          });
          
          servicesList.push({ 
            name: 'Hoàn tất', 
            status: item.status === 'Completed' ? 'Completed' : 'Pending' 
          });

          const totalS = servicesList.length;
          let washStep = 0;
          const addonsCount = addonsOnly.length;
          if (item.status === 'Waiting') washStep = 0;
          else if (item.status === 'LPR_Scan') washStep = 1;
          else if (item.status === 'Washing') washStep = 2;
          else if (item.status === 'Addon_Processing') washStep = 2 + (addonsCount > 0 ? 1 : 0);
          else if (item.status === 'Drying') washStep = 2 + addonsCount;
          else if (item.status === 'Completed') washStep = 3 + addonsCount;

          const progressPct = totalS > 1 ? Math.round((washStep / (totalS - 1)) * 100) : 100;

          return {
            queueId: item.queueId,
            licensePlate: item.licensePlate,
            customerName: item.customerName,
            phone: '—',
            tierName: item.tierName,
            tierId: item.tierId,
            status: item.status,
            bookingDate: new Date(item.checkInAt).toISOString().split('T')[0],
            bookingTime: new Date(item.checkInAt).toTimeString().substring(0, 5),
            mainService: mainService,
            addons: addonsOnly,
            staffName: item.staffNote || 'Chưa gán',
            progress: progressPct,
            washStep: washStep,
            checkInAt: item.checkInAt,
            eta: item.status === 'Completed' ? 'Đã xong' : '15 phút',
            price: item.finalPrice,
            points: item.pointsEarned,
            staffNote: item.staffNote || '',
            services: servicesList
          };
        });
        setQueue(mapped);
      }
    } catch (err) {
      console.error('Lỗi khi tải hàng đợi từ API:', err);
    } finally {
      setLoading(false);
    }
  };

  // Move vehicle to next Kanban column
  const handleAdvanceColumn = async (queueId) => {
    try {
      if (typeof queueId === 'number' || !isNaN(queueId)) {
        const response = await adminService.advanceQueue(queueId);
        if (response.success) {
          if (window.showToast) window.showToast('Đã chuyển xe sang công đoạn tiếp theo!', 'success');
          fetchQueue();
        } else {
          if (window.showToast) window.showToast(response.message || 'Lỗi khi cập nhật hàng đợi!', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi kết nối khi cập nhật hàng đợi!', 'error');
    }
  };

  // Complete a specific step in the detail list
  const handleToggleStepCompleted = async (stepIdx) => {
    if (!selectedVehicle) return;

    const updatedServices = selectedVehicle.services.map((s, idx) => {
      if (idx === stepIdx) return { ...s, status: 'Completed' };
      if (idx === stepIdx + 1) return { ...s, status: 'In Progress' };
      return s;
    });

    let nextStepIndex = stepIdx + 1;
    let newStatus = selectedVehicle.status;

    // Map column status based on the current completed step
    if (nextStepIndex === 1) newStatus = 'LPR_Scan';
    else if (nextStepIndex === 2) newStatus = 'Washing';
    else if (nextStepIndex >= 3 && nextStepIndex < updatedServices.length - 2) newStatus = 'Addon_Processing';
    else if (nextStepIndex === updatedServices.length - 2) newStatus = 'Drying';
    else if (nextStepIndex === updatedServices.length - 1) newStatus = 'Completed';

    const totalSteps = updatedServices.length;
    const progressPct = Math.min(100, Math.round((nextStepIndex / (totalSteps - 1)) * 100));

    const updatedItem = {
      ...selectedVehicle,
      services: updatedServices,
      washStep: nextStepIndex,
      status: newStatus,
      progress: progressPct
    };

    setSelectedVehicle(updatedItem);
    setQueue(prevQueue => prevQueue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q));

    // Call API to save to database
    try {
      if (typeof selectedVehicle.queueId === 'number' || !isNaN(selectedVehicle.queueId)) {
        const response = await adminService.updateQueue(selectedVehicle.queueId, newStatus, selectedVehicle.staffNote);
        if (response.success) {
          if (window.showToast) window.showToast('Đã cập nhật công đoạn rửa xe!', 'success');
          fetchQueue();
        } else {
          if (window.showToast) window.showToast(response.message || 'Lỗi khi cập nhật công đoạn!', 'error');
        }
      }
    } catch (err) {
      console.error('Lỗi khi gọi API UpdateQueue:', err);
      if (window.showToast) window.showToast('Lỗi kết nối khi cập nhật công đoạn!', 'error');
    }
  };

  // Checkout and clean out queue
  const handleCheckoutVehicle = (queueId, plate) => {
    const checkout = async () => {
      try {
        if (typeof queueId === 'number' || !isNaN(queueId)) {
          const response = await adminService.checkoutQueue(queueId);
          if (response.success) {
            if (window.showToast) window.showToast(`Check-out thành công cho xe ${plate}! Đã cộng +${response.pointsEarned} điểm Loyalty cho khách.`, 'success');
            setSelectedVehicle(null);
            fetchQueue();
          } else {
            if (window.showToast) window.showToast(response.message || 'Lỗi khi checkout!', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Lỗi kết nối khi checkout!', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Thanh toán & Check-out', `Khách hàng đã hoàn thành toàn bộ dịch vụ. Xác nhận thanh toán và checkout xe ${plate}?`, checkout);
    } else {
      if (window.confirm('Xác nhận checkout?')) checkout();
    }
  };

  // Add Walk-in Check-in
  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInPlate.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền biển số xe!', 'warning');
      return;
    }

    try {
      const response = await adminService.addWalkIn(walkInPlate.trim(), walkInName.trim());
      if (response.success) {
        if (window.showToast) window.showToast(`Check-in thành công xe ${walkInPlate}!`, 'success');
        setShowCheckInModal(false);
        setWalkInPlate('');
        setWalkInName('');
        setWalkInPhone('');
        setWalkInAddons([]);
        setWalkInNote('');
        fetchQueue();
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi check-in xe!', 'error');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi kết nối khi check-in xe!', 'error');
    }
  };

  const handleToggleAddonCheck = (addon) => {
    if (walkInAddons.includes(addon)) {
      setWalkInAddons(walkInAddons.filter(a => a !== addon));
    } else {
      setWalkInAddons([...walkInAddons, addon]);
    }
  };

  const handleAssignStaff = async (staff) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffName: staff, staffNote: staff };
    setSelectedVehicle(updatedItem);
    setQueue(prevQueue => prevQueue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q));

    try {
      if (typeof selectedVehicle.queueId === 'number' || !isNaN(selectedVehicle.queueId)) {
        const response = await adminService.updateQueue(selectedVehicle.queueId, selectedVehicle.status, staff);
        if (response.success) {
          if (window.showToast) window.showToast('Đã gán nhân viên phụ trách!', 'success');
          fetchQueue();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStaffNotes = (note) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffNote: note };
    setSelectedVehicle(updatedItem);
    setQueue(prevQueue => prevQueue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q));
  };

  const handleBlurStaffNotes = async () => {
    if (!selectedVehicle) return;
    try {
      if (typeof selectedVehicle.queueId === 'number' || !isNaN(selectedVehicle.queueId)) {
        await adminService.updateQueue(selectedVehicle.queueId, selectedVehicle.status, selectedVehicle.staffNote);
        if (window.showToast) window.showToast('Đã lưu ghi chú dịch vụ!', 'success');
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container-fluid py-0 text-start d-flex flex-column h-100">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-2 border-bottom pb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>HÀNG ĐỢI XE TRONG NGÀY ({queue.length})</h4>
          <p className="text-secondary small mb-0">Hệ thống quản lý, phân bổ làn và giám sát các xe đang thực hiện dịch vụ</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-dark btn-sm py-2 px-3 fw-bold rounded-3" onClick={() => setShowCheckInModal(true)}>
            <i className="fas fa-plus-circle me-1"></i> CHECK-IN XE VÃNG LAI
          </button>
          <button className="btn btn-light btn-sm py-2 px-3 fw-bold rounded-3 shadow-sm border" onClick={fetchQueue}>
            <i className="fas fa-sync-alt me-1"></i> LÀM MỚI
          </button>
        </div>
      </div>

      {/* KANBAN BOARD LAYOUT */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : (
      <div className="kanban-board-container d-flex gap-3">
        {KANBAN_COLUMNS.map(col => {
          const colItems = queue.filter(item => item.status === col.id);

          return (
            <div key={col.id} className="kanban-column-wrapper flex-shrink-0" style={{ width: '270px' }}>
              <div className={`kanban-column-header bg-white border-top border-4 ${col.color} p-3 rounded-4 shadow-sm mb-3 text-start`}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>{col.name}</span>
                  <span className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: '0.65rem' }}>{colItems.length}</span>
                </div>
              </div>

              {/* Kanban Column Cards List */}
              <div className="kanban-cards-list d-flex flex-column gap-2">
                {colItems.length === 0 ? (
                  <div className="text-center py-5 text-muted small bg-light bg-opacity-40 rounded-4 border border-dashed" style={{ borderStyle: 'dashed' }}>
                    Trống
                  </div>
                ) : (
                  colItems.map(item => {
                    const tierColors = {
                      'Platinum Loyalty': 'bg-primary bg-opacity-10 text-primary',
                      'Gold Loyalty': 'bg-warning bg-opacity-10 text-warning',
                      'Silver Loyalty': 'bg-secondary bg-opacity-20 text-secondary',
                      'Standard Loyalty': 'bg-dark bg-opacity-10 text-dark'
                    };

                    return (
                      <div
                        key={item.queueId}
                        className="kanban-card app-card p-3 bg-white text-start shadow-sm border"
                        style={{ cursor: 'pointer', borderRadius: '14px' }}
                        onClick={() => setSelectedVehicle(item)}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="font-monospace fw-bold text-dark bg-light border px-2 py-0.5 rounded" style={{ fontSize: '0.8rem' }}>
                            {item.licensePlate}
                          </span>
                          <span className={`badge ${tierColors[item.tierName] || 'bg-light text-muted'} text-truncate`} style={{ fontSize: '0.58rem', maxWidth: '90px' }}>
                            {item.tierName.replace(' Loyalty', '')}
                          </span>
                        </div>

                        <div className="mb-2 text-dark fw-bold" style={{ fontSize: '0.82rem' }}>{item.customerName}</div>
                        
                        <div className="mb-2.5 small text-secondary" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                          <div>Gói chính: <strong className="text-dark">{item.mainService}</strong></div>
                          {item.addons && item.addons.length > 0 && (
                            <div className="text-truncate">Addons: <strong className="text-dark">{item.addons.join(', ')}</strong></div>
                          )}
                        </div>

                        <div className="progress mb-2" style={{ height: '4px', borderRadius: '10px' }}>
                          <div className="progress-bar bg-info" role="progressbar" style={{ width: `${item.progress}%`, background: 'var(--cyan-electric)' }}></div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-2.5 pt-2 border-top" style={{ fontSize: '0.68rem', borderColor: '#f1f5f9' }}>
                          <span className="text-muted"><i className="far fa-user me-1"></i>{item.staffName.split(' ').pop()}</span>
                          <button
                            className="btn btn-sm btn-cyan py-0.5 px-2 text-dark font-bold border-0"
                            style={{ fontSize: '0.6rem', borderRadius: '5px', background: 'rgba(14,165,233,0.12)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.status === 'Completed') {
                                handleCheckoutVehicle(item.queueId, item.licensePlate);
                              } else {
                                handleAdvanceColumn(item.queueId);
                              }
                            }}
                          >
                            {item.status === 'Completed' ? 'CHECKOUT' : 'TIẾP THEO'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* DETAIL SERVICE WORKFLOW MODAL */}
      {selectedVehicle && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">Chi tiết công đoạn xe {selectedVehicle.licensePlate}</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setSelectedVehicle(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body text-start py-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              
              {/* Meta brief stats */}
              <div className="bg-light p-3 rounded-4 mb-3" style={{ border: '1px solid #e2e8f0' }}>
                <div className="row g-2" style={{ fontSize: '0.78rem' }}>
                  <div className="col-6">
                    <span className="text-muted d-block small">GÓI CHÍNH</span>
                    <strong className="text-dark">{selectedVehicle.mainService}</strong>
                  </div>
                  <div className="col-6 text-end">
                    <span className="text-muted d-block small">LOẠI KHÁCH HÀNG</span>
                    <strong className="text-warning">{selectedVehicle.tierName}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted d-block small">ETA HOÀN THÀNH</span>
                    <strong className="text-cyan">{selectedVehicle.status === 'Completed' ? 'Đã xong' : `${(selectedVehicle.services.length - 1 - selectedVehicle.washStep) * 5} phút`}</strong>
                  </div>
                  <div className="col-6 text-end mt-2">
                    <span className="text-muted d-block small">TIẾN ĐỘ</span>
                    <strong className="text-dark">{selectedVehicle.progress}%</strong>
                  </div>
                </div>
              </div>

              {/* Staff Assignment */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted mb-1">GÁN NHÂN VIÊN PHỤ TRÁCH</label>
                <select
                  className="form-select bg-light border-0 py-2 text-dark fw-bold"
                  value={selectedVehicle.staffName}
                  onChange={(e) => handleAssignStaff(e.target.value)}
                >
                  <option value="Chưa gán">-- Chọn nhân viên --</option>
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Dynamic Step Checklist */}
              <label className="form-label small fw-bold text-muted mb-2">DANH SÁCH BƯỚC THỰC HIỆN ĐỘNG</label>
              <div className="d-flex flex-column gap-2 mb-3">
                {selectedVehicle.services.map((step, idx) => {
                  const isCompleted = step.status === 'Completed' || idx < selectedVehicle.washStep;
                  const isActive = step.status === 'In Progress' || idx === selectedVehicle.washStep;

                  return (
                    <div
                      key={idx}
                      className="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-white"
                      style={{
                        borderColor: isActive ? 'rgba(14, 165, 233, 0.3)' : '#e2e8f0',
                        background: isActive ? 'rgba(14, 165, 233, 0.02)' : 'none'
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        {isCompleted ? (
                          <i className="fas fa-check-circle text-success fs-6"></i>
                        ) : isActive ? (
                          <i className="fas fa-spinner fa-spin text-primary fs-6"></i>
                        ) : (
                          <i className="far fa-circle text-muted fs-6"></i>
                        )}
                        <span className={`small ${isCompleted ? 'text-muted text-decoration-line-through' : 'text-dark fw-bold'}`} style={{ fontSize: '0.8rem' }}>
                          {step.name}
                        </span>
                      </div>
                      
                      {isActive && (
                        <button
                          className="btn btn-sm btn-success py-1 px-2 fw-bold"
                          style={{ fontSize: '0.62rem', borderRadius: '6px' }}
                          onClick={() => handleToggleStepCompleted(idx)}
                        >
                          Xong bước
                        </button>
                      )}
                      
                      {!isActive && !isCompleted && (
                        <span className="badge bg-secondary bg-opacity-10 text-muted" style={{ fontSize: '0.6rem' }}>Chờ</span>
                      )}
                      {isCompleted && (
                        <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.6rem' }}>Xong</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Staff Notes */}
              <div className="mb-0">
                <label className="form-label small fw-bold text-muted mb-1">GHI CHÚ DỊCH VỤ / TÌNH TRẠNG XE</label>
                <textarea
                  className="form-control bg-light border-0 py-2 rounded-3"
                  rows="3"
                  placeholder="Điền ghi chú tình trạng xe, vết xước sẵn có..."
                  value={selectedVehicle.staffNote || ''}
                  onChange={(e) => handleSaveStaffNotes(e.target.value)}
                  onBlur={handleBlurStaffNotes}
                ></textarea>
              </div>

            </div>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn w-50" onClick={() => setSelectedVehicle(null)}>ĐÓNG</button>
              {selectedVehicle.status === 'Completed' && (
                <button
                  className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark"
                  style={{ background: 'var(--cyan-electric)' }}
                  onClick={() => handleCheckoutVehicle(selectedVehicle.queueId, selectedVehicle.licensePlate)}
                >
                  THANH TOÁN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN CHECK-IN MODAL FORM */}
      {showCheckInModal && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold"><i className="fas fa-sign-in-alt text-cyan me-2"></i>Check-in xe tại quầy</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setShowCheckInModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddWalkIn}>
              <div className="confirm-modal-body text-start py-3" style={{ maxHeight: '430px', overflowY: 'auto' }}>
                
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">BIỂN SỐ XE</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2.5 font-monospace fw-bold uppercase"
                      placeholder="VÍ DỤ: 51G - 123.45"
                      value={walkInPlate}
                      onChange={(e) => setWalkInPlate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">HẠNG LOYALTY ƯU TIÊN</label>
                    <select
                      className="form-select bg-light border-0 py-2.5 text-dark fw-bold"
                      value={walkInPriority}
                      onChange={(e) => setWalkInPriority(e.target.value)}
                    >
                      <option value="Standard Loyalty">Standard Loyalty (Thường)</option>
                      <option value="Silver Loyalty">Silver Loyalty</option>
                      <option value="Gold Loyalty">Gold Loyalty (Ưu tiên LPR)</option>
                      <option value="Platinum Loyalty">Platinum Loyalty (Vip pass)</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">TÊN KHÁCH HÀNG</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2.5"
                      placeholder="Nguyễn Văn A"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">SỐ ĐIỆN THOẠI</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2.5 font-monospace"
                      placeholder="0901234567"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">GÓI DỊCH VỤ CHÍNH</label>
                  <select
                    className="form-select bg-light border-0 py-2.5 text-dark fw-bold"
                    value={walkInMainSvc}
                    onChange={(e) => setWalkInMainSvc(e.target.value)}
                  >
                    {mainServicesList.map(svc => <option key={svc} value={svc}>{svc}</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted mb-2">CHỌN DỊCH VỤ ĐI KÈM (ADD-ONS)</label>
                  <div className="row g-2">
                    {addonServicesList.map(addon => {
                      const isChecked = walkInAddons.includes(addon);
                      return (
                        <div key={addon} className="col-6">
                          <div
                            className={`p-2 rounded-3 border text-center small fw-bold ${isChecked ? 'bg-info bg-opacity-10 border-info text-cyan' : 'bg-light border-light text-muted'}`}
                            style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                            onClick={() => handleToggleAddonCheck(addon)}
                          >
                            {addon}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-0">
                  <label className="form-label small fw-bold text-muted">GHI CHÚ HÀNG CHỜ</label>
                  <textarea
                    className="form-control bg-light border-0 py-2 rounded-3"
                    rows="2"
                    placeholder="Lưu ý vết xước trước rửa, đồ để trên xe..."
                    value={walkInNote}
                    onChange={(e) => setWalkInNote(e.target.value)}
                  ></textarea>
                </div>

              </div>
              <div className="confirm-modal-footer">
                <button type="button" className="confirm-cancel-btn w-50" onClick={() => setShowCheckInModal(false)}>HỦY</button>
                <button type="submit" className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark" style={{ background: 'var(--cyan-electric)' }}> CHECK-IN </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminQueue;
