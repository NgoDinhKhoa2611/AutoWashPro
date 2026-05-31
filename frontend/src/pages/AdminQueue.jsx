import React, { useState, useEffect } from 'react';
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
    const handleStorage = () => {
      fetchQueue();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Load from localStorage first to preserve live customer bookings
      let localQueue = [];
      try {
        localQueue = JSON.parse(localStorage.getItem('global_queue') || '[]');
      } catch (e) {}

      // If local queue is empty, populate mock data for business demonstration
      if (localQueue.length === 0) {
        localQueue = [
          {
            queueId: 'q_mock_1',
            licensePlate: '51A - 999.99',
            customerName: 'Trần Thị B',
            phone: '0912345678',
            tierName: 'Gold Loyalty',
            tierId: 3,
            status: 'Washing',
            bookingDate: new Date().toISOString().split('T')[0],
            bookingTime: '09:00',
            mainService: 'Combo Rửa xe cao cấp',
            addons: ['Vệ sinh nội thất', 'Wax nano'],
            staffName: 'Trần Văn B',
            progress: 33,
            washStep: 2,
            checkInAt: new Date().toISOString(),
            eta: '15 phút',
            price: 130000,
            points: 13,
            staffNote: 'Xe bẩn nhiều phần xích xe.',
            services: [
              { name: 'Nhận diện LPR', status: 'Completed' },
              { name: 'Rửa bọt tuyết', status: 'Completed' },
              { name: 'Sấy khô', status: 'In Progress' },
              { name: 'Vệ sinh nội thất', status: 'Pending' },
              { name: 'Wax nano', status: 'Pending' },
              { name: 'Kiểm tra cuối', status: 'Pending' },
              { name: 'Hoàn tất', status: 'Pending' }
            ]
          },
          {
            queueId: 'q_mock_2',
            licensePlate: '59 - K1 47278',
            customerName: 'Nguyễn Văn C',
            phone: '0987654321',
            tierName: 'Standard Loyalty',
            tierId: 1,
            status: 'Waiting',
            bookingDate: new Date().toISOString().split('T')[0],
            bookingTime: '10:30',
            mainService: 'Rửa xe phổ thông',
            addons: [],
            staffName: 'Chưa gán',
            progress: 0,
            washStep: 0,
            checkInAt: new Date().toISOString(),
            eta: '20 phút',
            price: 35000,
            points: 3,
            staffNote: '',
            services: [
              { name: 'Nhận diện LPR', status: 'In Progress' },
              { name: 'Rửa bọt tuyết', status: 'Pending' },
              { name: 'Sấy khô', status: 'Pending' },
              { name: 'Kiểm tra cuối', status: 'Pending' },
              { name: 'Hoàn tất', status: 'Pending' }
            ]
          }
        ];
        localStorage.setItem('global_queue', JSON.stringify(localQueue));
      }

      setQueue(localQueue);
    } catch (err) {
      console.error('Lỗi khi tải hàng đợi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to update global queue states and sync with Customer tab
  const saveQueueState = (updatedQueue) => {
    setQueue(updatedQueue);
    localStorage.setItem('global_queue', JSON.stringify(updatedQueue));
    window.dispatchEvent(new Event('storage'));
  };

  // Move vehicle to next Kanban column
  const handleAdvanceColumn = (queueId) => {
    const updated = queue.map(item => {
      if (item.queueId !== queueId) return item;
      
      let nextStatus = item.status;
      if (item.status === 'Waiting') nextStatus = 'LPR_Scan';
      else if (item.status === 'LPR_Scan') nextStatus = 'Washing';
      else if (item.status === 'Washing') nextStatus = 'Addon_Processing';
      else if (item.status === 'Addon_Processing') nextStatus = 'Drying';
      else if (item.status === 'Drying') nextStatus = 'Completed';

      // Automatically update the dynamic steps based on columns
      const updatedServices = [...item.services];
      let newWashStep = item.washStep;

      if (nextStatus === 'LPR_Scan') {
        updatedServices[0].status = 'Completed';
        if (updatedServices[1]) updatedServices[1].status = 'In Progress';
        newWashStep = 1;
      } else if (nextStatus === 'Washing') {
        updatedServices[0].status = 'Completed';
        if (updatedServices[1]) updatedServices[1].status = 'Completed';
        if (updatedServices[2]) updatedServices[2].status = 'In Progress';
        newWashStep = 2;
      } else if (nextStatus === 'Addon_Processing') {
        updatedServices[0].status = 'Completed';
        if (updatedServices[1]) updatedServices[1].status = 'Completed';
        if (updatedServices[2]) updatedServices[2].status = 'Completed';
        // Mark first addon in progress if any
        if (updatedServices.length > 4) {
          updatedServices[3].status = 'In Progress';
          newWashStep = 3;
        } else {
          // No addons, skip to check
          if (updatedServices[updatedServices.length - 2]) {
            updatedServices[updatedServices.length - 2].status = 'In Progress';
          }
          newWashStep = updatedServices.length - 2;
        }
      } else if (nextStatus === 'Drying') {
        // Complete everything before last checking
        for (let i = 0; i < updatedServices.length - 2; i++) {
          updatedServices[i].status = 'Completed';
        }
        if (updatedServices[updatedServices.length - 2]) {
          updatedServices[updatedServices.length - 2].status = 'In Progress';
        }
        newWashStep = updatedServices.length - 2;
      } else if (nextStatus === 'Completed') {
        // Mark all completed
        updatedServices.forEach(s => s.status = 'Completed');
        newWashStep = updatedServices.length - 1;
      }

      const totalS = updatedServices.length;
      const progressPct = Math.round((newWashStep / (totalS - 1)) * 100);

      const newItem = {
        ...item,
        status: nextStatus,
        services: updatedServices,
        washStep: newWashStep,
        progress: progressPct
      };

      // Sync back to Active Booking if matches customer's plate
      syncWithCustomerTab(newItem);

      return newItem;
    });

    saveQueueState(updated);
    if (window.showToast) window.showToast('Đã chuyển xe sang công đoạn tiếp theo!', 'success');
  };

  const syncWithCustomerTab = (queueItem) => {
    try {
      const activeStr = localStorage.getItem('active_booking');
      if (activeStr) {
        const active = JSON.parse(activeStr);
        if (active.vehicle === queueItem.licensePlate) {
          const updatedActive = {
            ...active,
            status: queueItem.status,
            washStep: queueItem.washStep,
            progress: queueItem.progress
          };
          localStorage.setItem('active_booking', JSON.stringify(updatedActive));
          localStorage.setItem('wash_step', String(queueItem.washStep));
        }
      }
    } catch (e) {}
  };

  // Complete a specific step in the detail list
  const handleToggleStepCompleted = (stepIdx) => {
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

    // Sync to queue and customer tab
    const updatedQueue = queue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q);
    saveQueueState(updatedQueue);
    syncWithCustomerTab(updatedItem);
  };

  // Checkout and clean out queue
  const handleCheckoutVehicle = (queueId, plate) => {
    const checkout = () => {
      const updated = queue.filter(item => item.queueId !== queueId);
      saveQueueState(updated);

      // Clean local active booking
      try {
        const activeStr = localStorage.getItem('active_booking');
        if (activeStr) {
          const active = JSON.parse(activeStr);
          if (active.vehicle === plate) {
            localStorage.removeItem('active_booking');
            localStorage.removeItem('wash_step');
          }
        }
      } catch (e) {}

      // Add points to customer ledger
      const ptsEarned = selectedVehicle ? selectedVehicle.points : 13;
      const currentPts = Number(localStorage.getItem('user_points') || 217);
      localStorage.setItem('user_points', String(currentPts + ptsEarned));

      // Notification review
      const reviewNotif = {
        id: 'notif_checkout_' + Date.now(),
        title: 'Dịch vụ hoàn tất ✨',
        body: `Cảm ơn bạn đã sử dụng dịch vụ. Xe ${plate} đã checkout thành công! Bạn nhận được +${ptsEarned} PTS Loyalty.`,
        time: 'Vừa xong',
        type: 'points',
        read: false
      };
      let notifications = [];
      try {
        notifications = JSON.parse(localStorage.getItem('user_notifications') || '[]');
      } catch (e) {}
      localStorage.setItem('user_notifications', JSON.stringify([reviewNotif, ...notifications]));

      window.dispatchEvent(new Event('storage'));
      setSelectedVehicle(null);
      if (window.showToast) window.showToast(`Check-out thành công cho xe ${plate}! Đã cộng +${ptsEarned} điểm Loyalty cho khách.`, 'success');
    };

    if (window.showConfirm) {
      window.showConfirm('Thanh toán & Check-out', `Khách hàng đã hoàn thành toàn bộ dịch vụ. Xác nhận thanh toán và checkout xe ${plate}?`, checkout);
    } else {
      if (window.confirm('Xác nhận checkout?')) checkout();
    }
  };

  // Add Walk-in Check-in
  const handleAddWalkIn = (e) => {
    e.preventDefault();
    if (!walkInPlate.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền biển số xe!', 'warning');
      return;
    }

    // Determine priority multiplier based on selected tier
    let priorityVal = 1;
    if (walkInPriority.includes('Silver')) priorityVal = 2;
    if (walkInPriority.includes('Gold')) priorityVal = 3;
    if (walkInPriority.includes('Platinum')) priorityVal = 4;

    // Check if duplicate today's booking exists
    const duplicate = queue.find(item => item.licensePlate.trim().toUpperCase() === walkInPlate.trim().toUpperCase() && item.status === 'Waiting');
    
    if (duplicate) {
      if (window.showToast) window.showToast(`Phát hiện lịch đặt của xe ${walkInPlate}! Tự động check-in và đẩy vào quy trình LPR.`, 'success');
      handleAdvanceColumn(duplicate.queueId);
      setShowCheckInModal(false);
      return;
    }

    // Creating dynamic services workflow
    const dynamicServices = [
      { name: 'Nhận diện LPR', status: 'In Progress' },
      { name: 'Rửa bọt tuyết', status: 'Pending' },
      { name: 'Sấy khô', status: 'Pending' },
      ...walkInAddons.map(addon => ({ name: addon, status: 'Pending' })),
      { name: 'Kiểm tra cuối', status: 'Pending' },
      { name: 'Hoàn tất', status: 'Pending' }
    ];

    const newItem = {
      queueId: 'q_' + Date.now(),
      licensePlate: walkInPlate.toUpperCase(),
      customerName: walkInName || 'Khách vãng lai',
      phone: walkInPhone || '—',
      tierName: walkInPriority,
      tierId: priorityVal,
      status: 'LPR_Scan', // check-in goes directly to scan LPR
      bookingDate: new Date().toISOString().split('T')[0],
      bookingTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      mainService: walkInMainSvc,
      addons: walkInAddons,
      staffName: 'Chưa gán',
      progress: 15,
      washStep: 0,
      checkInAt: new Date().toISOString(),
      eta: '25 phút',
      price: walkInMainSvc.includes('cao cấp') ? 85000 : 35000,
      points: 5,
      staffNote: walkInNote,
      services: dynamicServices
    };

    saveQueueState([...queue, newItem]);
    
    // Clear form states
    setWalkInPlate('');
    setWalkInName('');
    setWalkInPhone('');
    setWalkInAddons([]);
    setWalkInNote('');
    setShowCheckInModal(false);
    
    if (window.showToast) window.showToast(`Check-in thành công cho xe vãng lai ${newItem.licensePlate}!`, 'success');
  };

  const handleToggleAddonCheck = (addon) => {
    if (walkInAddons.includes(addon)) {
      setWalkInAddons(walkInAddons.filter(a => a !== addon));
    } else {
      setWalkInAddons([...walkInAddons, addon]);
    }
  };

  const handleAssignStaff = (staff) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffName: staff };
    setSelectedVehicle(updatedItem);

    const updatedQueue = queue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q);
    saveQueueState(updatedQueue);
    syncWithCustomerTab(updatedItem);
  };

  const handleSaveStaffNotes = (note) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffNote: note };
    setSelectedVehicle(updatedItem);

    const updatedQueue = queue.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q);
    saveQueueState(updatedQueue);
  };

  return (
    <div className="container-fluid py-4 text-start">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-2 border-bottom pb-3">
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
      <div className="kanban-board-container d-flex gap-3 overflow-auto pb-4" style={{ minHeight: '520px' }}>
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
              <div className="kanban-cards-list d-flex flex-column gap-2" style={{ minHeight: '400px' }}>
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
