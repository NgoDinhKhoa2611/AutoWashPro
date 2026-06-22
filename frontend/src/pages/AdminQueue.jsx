import { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/adminService';
import '../styles/shared.css';
import '../styles/admin/bookings.css';
import '../styles/admin/queue.css';

const STAFF_LIST = ['Nguyễn Văn A', 'Trần Văn B', 'Lê Văn C', 'Phạm Hồng D'];

const STAGE_LABEL_MAP = {
  CheckIn: 'Check-in',
  ExteriorWash: 'Rửa ngoại thất',
  Exterior: 'Rửa ngoại thất',
  InteriorCleaning: 'Vệ sinh nội thất',
  Interior: 'Vệ sinh nội thất',
  FinalInspection: 'Kiểm tra cuối',
  Completed: 'Hoàn tất',
};

const STAGE_COLOR_MAP = {
  'Check-in': '#f59e0b',
  'Rửa ngoại thất': '#3b82f6',
  'Vệ sinh nội thất': '#8b5cf6',
  'Kiểm tra cuối': '#0ea5e9',
  'Hoàn tất': '#22c55e',
  'Chờ check-in': '#94a3b8',
};

export const AdminQueue = () => {
  const getStageLabel = (stage) => STAGE_LABEL_MAP[stage] || stage || 'Chờ check-in';

  const [queue, setQueue] = useState({ waitingForCheckIn: [], currentlyProcessing: [], completedToday: [] });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, bookingsRes] = await Promise.all([
        adminService.getQueue(),
        adminService.getBookings()
      ]);
      if (queueRes) {
        setQueue({
          waitingForCheckIn: queueRes.waitingForCheckIn || [],
          currentlyProcessing: queueRes.currentlyProcessing || [],
          completedToday: queueRes.completedToday || []
        });

        // Sync selectedVehicle to avoid stale service data
        setSelectedVehicle(prev => {
          if (!prev) return null;
          const allItems = [
            ...(queueRes.waitingForCheckIn || []),
            ...(queueRes.currentlyProcessing || []),
            ...(queueRes.completedToday || [])
          ];
          const updated = allItems.find(item => item.queueId === prev.queueId);
          if (updated) {
            const statusGroup = (queueRes.waitingForCheckIn || []).some(x => x.queueId === updated.queueId) ? 'Waiting'
                              : (queueRes.currentlyProcessing || []).some(x => x.queueId === updated.queueId) ? 'Processing'
                              : 'Completed';
            return {
              ...updated,
              statusGroup,
              mainService: updated.services?.[0]?.name || 'Standard Car Wash'
            };
          }
          return prev;
        });
      }
      if (bookingsRes && bookingsRes.success) {
        setBookings(bookingsRes.bookings);
      }
    } catch (err) {
      console.error('Lỗi khi tải hàng đợi từ API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // 30s Polling
    const interval = setInterval(() => {
      Promise.all([
        adminService.getQueue(),
        adminService.getBookings()
      ]).then(([res, bookingsRes]) => {
        if (res) {
          setQueue({
            waitingForCheckIn: res.waitingForCheckIn || [],
            currentlyProcessing: res.currentlyProcessing || [],
            completedToday: res.completedToday || []
          });

          // Sync selectedVehicle during polling
          setSelectedVehicle(prev => {
            if (!prev) return null;
            const allItems = [
              ...(res.waitingForCheckIn || []),
              ...(res.currentlyProcessing || []),
              ...(res.completedToday || [])
            ];
            const updated = allItems.find(item => item.queueId === prev.queueId);
            if (updated) {
              const statusGroup = (res.waitingForCheckIn || []).some(x => x.queueId === updated.queueId) ? 'Waiting'
                                : (res.currentlyProcessing || []).some(x => x.queueId === updated.queueId) ? 'Processing'
                                : 'Completed';
              return {
                ...updated,
                statusGroup,
                mainService: updated.services?.[0]?.name || 'Standard Car Wash'
              };
            }
            return prev;
          });
        }
        if (bookingsRes && bookingsRes.success) {
          setBookings(bookingsRes.bookings);
        }
      }).catch(err => console.error(err));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Move vehicle to next stage
  const handleAdvanceColumn = async (queueId) => {
    if (submittingIds.has(queueId)) return;
    setSubmittingIds(prev => {
      const next = new Set(prev);
      next.add(queueId);
      return next;
    });
    try {
      const response = await adminService.advanceQueue(queueId);
      if (response.success) {
        if (window.showToast) window.showToast('Đã chuyển xe sang công đoạn tiếp theo!', 'success');
        fetchQueue();
        if (selectedVehicle && selectedVehicle.queueId === queueId) {
          setSelectedVehicle(null);
        }
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi khi cập nhật hàng đợi!', 'error');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Lỗi kết nối khi cập nhật hàng đợi!';
      if (window.showToast) window.showToast(errMsg, 'error');
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  };

  // Checkout and clean out queue
  const handleCheckoutVehicle = (queueId, plate) => {
    if (submittingIds.has(queueId)) return;
    const checkout = async () => {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.add(queueId);
        return next;
      });
      try {
        const response = await adminService.checkoutQueue(queueId);
        if (response.success) {
          if (window.showToast) window.showToast(`Check-out thành công cho xe ${plate}! Đã cộng +${response.pointsEarned} điểm Loyalty cho khách.`, 'success');
          setSelectedVehicle(null);
          fetchQueue();
        } else {
          if (window.showToast) window.showToast(response.message || 'Lỗi khi checkout!', 'error');
        }
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.message || 'Lỗi kết nối khi checkout!';
        if (errMsg.includes('thanh toán và checkout trước đó')) {
          setSelectedVehicle(null);
          fetchQueue();
        } else {
          if (window.showToast) window.showToast(errMsg, 'error');
        }
      } finally {
        setSubmittingIds(prev => {
          const next = new Set(prev);
          next.delete(queueId);
          return next;
        });
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Thanh toán & Check-out', `Khách hàng đã hoàn thành toàn bộ dịch vụ. Xác nhận thanh toán và checkout xe ${plate}?`, checkout);
    } else {
      if (window.confirm('Xác nhận checkout?')) checkout();
    }
  };

  const handleAssignStaff = async (staff) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffName: staff, staffNote: staff };
    setSelectedVehicle(updatedItem);
    setQueue(prev => ({
      ...prev,
      currentlyProcessing: prev.currentlyProcessing.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q)
    }));

    try {
      await adminService.updateQueue(selectedVehicle.queueId, selectedVehicle.status, staff);
      if (window.showToast) window.showToast('Đã gán nhân viên phụ trách!', 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStaffNotes = (note) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffNote: note };
    setSelectedVehicle(updatedItem);
    setQueue(prev => ({
      ...prev,
      currentlyProcessing: prev.currentlyProcessing.map(q => q.queueId === selectedVehicle.queueId ? updatedItem : q)
    }));
  };

  const handleBlurStaffNotes = async () => {
    if (!selectedVehicle) return;
    try {
      await adminService.updateQueue(selectedVehicle.queueId, selectedVehicle.status, selectedVehicle.staffNote);
      if (window.showToast) window.showToast('Đã lưu ghi chú dịch vụ!', 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Service Stages
  const getServiceStages = (serviceName) => {
    return ['Check-in', 'Rửa ngoại thất', 'Vệ sinh nội thất', 'Kiểm tra cuối', 'Hoàn tất'];
  };

  const getActiveStageIndex = (item, stages) => {
    if (item.statusGroup === 'Waiting') return 0;
    if (item.statusGroup === 'Completed') return stages.length - 1;
    if (item.statusGroup === 'NoShow') return stages.length - 1;
    
    const backendStage = item.currentStage;
    if (backendStage === 'CheckIn') return 0;
    if (backendStage === 'ExteriorWash' || backendStage === 'Exterior') return 1;
    if (backendStage === 'InteriorCleaning' || backendStage === 'Interior') return 2;
    if (backendStage === 'FinalInspection') return 3;
    if (backendStage === 'Completed') return 4;
    return 0;
  };

  const getModalStages = (item) => {
    if (item.progressTracking && item.progressTracking.stages && item.progressTracking.stages.length > 0) {
      return item.progressTracking.stages.map(stage => ({
        name: stage.displayName,
        isCompleted: stage.isCompleted,
        isActive: stage.isActive,
        completedAt: stage.completedAt || null,
        startedAt: stage.startedAt || null,
      }));
    }
    const stages = getServiceStages(item.mainService || 'Standard Car Wash');
    const activeIndex = getActiveStageIndex(item, stages);
    return stages.map((stage, idx) => ({
      name: stage,
      isCompleted: idx < activeIndex,
      isActive: idx === activeIndex,
      completedAt: null,
      startedAt: null,
    }));
  };

  const getCurrentStageLabel = (item) => {
    // Try progressTracking stages first for active stage displayName
    if (item.progressTracking?.stages?.length) {
      const active = item.progressTracking.stages.find(s => s.isActive);
      if (active) return active.displayName;
    }
    // Fallback to currentStage mapping
    return getStageLabel(item.progressTracking?.currentStage || item.currentStage);
  };

  const todayStr = useMemo(() => {
    return new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  }, []);

  const waitingItems = useMemo(() => (queue.waitingForCheckIn || []).map(item => ({
    ...item,
    statusGroup: 'Waiting',
    bookingId: Math.abs(item.bookingId || item.queueId),
    mainService: item.services?.[0]?.name || 'Standard Car Wash'
  })), [queue.waitingForCheckIn]);

  const processingItems = useMemo(() => (queue.currentlyProcessing || []).map(item => ({
    ...item,
    statusGroup: 'Processing',
    mainService: item.services?.[0]?.name || 'Standard Car Wash'
  })), [queue.currentlyProcessing]);

  const completedItems = useMemo(() => (queue.completedToday || []).map(item => ({
    ...item,
    statusGroup: 'Completed',
    mainService: item.services?.[0]?.name || 'Standard Car Wash'
  })), [queue.completedToday]);

  const noShowItems = useMemo(() => bookings
    .filter(b => b.status === 'NoShow' && b.scheduledAt.split('T')[0] === todayStr)
    .map(b => ({
      queueId: `noshow-${b.bookingId}`,
      bookingId: b.bookingId,
      licensePlate: b.licensePlate,
      mainService: b.mainService?.serviceName || 'Standard Car Wash',
      status: b.status,
      statusGroup: 'NoShow',
      remainingSeconds: 0,
      progress: 0,
      etaCompletion: 'N/A',
      bookingTime: new Date(b.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      noShowTime: b.noShowAt ? new Date(b.noShowAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date(b.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      customerName: b.customerName,
      phone: b.phone,
      tierName: 'Member'
    })), [bookings, todayStr]);

  const stats = useMemo(() => {
    return {
      waitingCheckIn: waitingItems.length,
      processing: processingItems.length,
      completedToday: completedItems.length,
      noShow: noShowItems.length,
      todaysRevenue: completedItems.reduce((sum, item) => sum + (Number(item.finalPrice) || 0), 0)
    };
  }, [waitingItems, processingItems, completedItems, noShowItems]);

  // Filtered sections
  const filteredWaiting = useMemo(() => {
    if (statusFilter === 'ALL' || statusFilter === 'WAITING_CHECKIN') return waitingItems;
    return [];
  }, [waitingItems, statusFilter]);

  const filteredProcessing = useMemo(() => {
    if (statusFilter === 'ALL' || statusFilter === 'PROCESSING') return processingItems;
    return [];
  }, [processingItems, statusFilter]);

  const filteredCompleted = useMemo(() => {
    if (statusFilter === 'ALL' || statusFilter === 'COMPLETED_TODAY') return completedItems;
    return [];
  }, [completedItems, statusFilter]);

  const filteredNoShow = useMemo(() => {
    if (statusFilter === 'ALL' || statusFilter === 'NoShow') return noShowItems;
    return [];
  }, [noShowItems, statusFilter]);

  const hasAnyItems = filteredWaiting.length > 0 || filteredProcessing.length > 0 || filteredCompleted.length > 0 || filteredNoShow.length > 0;

  // Get status class for card border
  const getStatusClass = (item) => {
    if (item.statusGroup === 'Waiting') return 'status-waiting';
    if (item.statusGroup === 'NoShow') return 'status-noshow';
    if (item.statusGroup === 'Completed') return 'status-completed';
    // Processing substates
    const s = item.status;
    if (s === 'Cancelled') return 'status-cancelled';
    return 'status-processing';
  };

  // Get progress bar color
  const getProgressColor = (item) => {
    if (item.statusGroup === 'Waiting') return '#f59e0b';
    if (item.statusGroup === 'Completed') return '#22c55e';
    if (item.statusGroup === 'NoShow') return '#ef4444';
    return '#3b82f6';
  };

  // Format remaining seconds to mm:ss
  const formatRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── Compact Queue Card (Waiting / Processing / NoShow) ──
  const renderCompactCard = (item) => {
    const isNoShow = item.statusGroup === 'NoShow';
    if (isNoShow) {
      return (
        <div key={item.queueId} className="queue-card-compact status-noshow">
          <div className="queue-card-header">
            <span className="queue-card-id">#BK-{item.bookingId}</span>
            <span className="queue-status-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              NO SHOW
            </span>
          </div>
          <div className="queue-card-plate">{item.licensePlate}</div>
          <div className="stage-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <span className="stage-dot" style={{ background: '#ef4444' }}></span>
            Khách không đến
          </div>
          <div className="queue-card-info-grid">
            <div className="queue-info-row">
              <span className="queue-info-label">Giờ quá hạn</span>
              <span className="queue-info-value font-monospace">{item.noShowTime || '—'}</span>
            </div>
          </div>
          <div className="queue-card-actions">
            <button
              className="queue-btn queue-btn-detail w-100"
              onClick={() => setSelectedVehicle(item)}
            >
              CHI TIẾT
            </button>
          </div>
        </div>
      );
    }

    const stageLabel = getCurrentStageLabel(item);
    const stageColor = STAGE_COLOR_MAP[stageLabel] || '#94a3b8';
    const isWaiting = item.statusGroup === 'Waiting';
    const statusText = isWaiting ? 'CHỜ' : 'ĐANG XỬ LÝ';
    const statusColor = isWaiting ? '#f59e0b' : '#3b82f6';
    const statusBg = isWaiting ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)';

    return (
      <div
        key={item.queueId}
        className={`queue-card-compact ${getStatusClass(item)}`}
      >
        {/* Header row: ID + Status badge */}
        <div className="queue-card-header">
          <span className="queue-card-id">#BK-{item.bookingId}</span>
          <span className="queue-status-badge" style={{
            background: statusBg,
            color: statusColor
          }}>
            {statusText}
          </span>
        </div>

        {/* License plate */}
        <div className="queue-card-plate">{item.licensePlate}</div>

        {/* Service Name */}
        <div className="queue-card-service text-truncate small fw-bold text-secondary">
          <i className="fas fa-concierge-bell me-1.5" style={{ fontSize: '0.7rem' }}></i>
          {item.mainService}
        </div>

        {/* Current stage badge */}
        <div className="stage-badge" style={{
          background: `${stageColor}15`,
          color: stageColor
        }}>
          <span className="stage-dot" style={{ background: stageColor }}></span>
          {stageLabel}
        </div>

        {/* Info rows */}
        <div className="queue-card-info-grid">
          <div className="queue-info-row">
            <span className="queue-info-label">{isWaiting ? 'Hẹn lúc' : 'Check-in'}</span>
            <span className="queue-info-value font-monospace">{item.checkInTime || item.bookingTime || '—'}</span>
          </div>

          {!isWaiting && (
            <>
              <div className="queue-info-row">
                <span className="queue-info-label">Còn lại</span>
                <span className="queue-info-value font-monospace">{formatRemaining(item.remainingSeconds)}</span>
              </div>
              <div className="queue-info-row">
                <span className="queue-info-label">ETA</span>
                <span className="queue-info-value font-monospace">{item.etaCompletion || '—'}</span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="queue-card-actions">
          {isWaiting ? (
            <>
              <button
                className="queue-btn queue-btn-checkin"
                disabled={submittingIds.has(item.queueId)}
                onClick={() => handleAdvanceColumn(item.queueId)}
              >
                {submittingIds.has(item.queueId) && <span className="spinner-border spinner-border-sm me-1" role="status"></span>}
                CHECK-IN
              </button>
              <button
                className="queue-btn queue-btn-detail"
                onClick={() => setSelectedVehicle(item)}
              >
                <i className="fas fa-eye"></i>
              </button>
            </>
          ) : (
            <button
              className="queue-btn queue-btn-detail w-100"
              onClick={() => setSelectedVehicle(item)}
            >
              CHI TIẾT
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Completed Card (even more compact) ──
  const renderCompletedCard = (item) => {
    return (
      <div
        key={item.queueId}
        className="queue-card-compact queue-card-completed status-completed"
      >
        <div className="queue-card-header">
          <span className="queue-card-id">#BK-{item.bookingId}</span>
          <span className="queue-status-badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            XONG
          </span>
        </div>
        <div className="queue-card-plate" style={{ fontSize: '0.95rem' }}>{item.licensePlate}</div>
        
        <div className="queue-card-service text-truncate small fw-bold text-secondary" style={{ fontSize: '0.68rem' }}>
          <i className="fas fa-concierge-bell me-1.5" style={{ fontSize: '0.65rem' }}></i>
          {item.mainService}
        </div>

        <div className="stage-badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.65rem', padding: '1px 6px' }}>
          <span className="stage-dot" style={{ background: '#22c55e' }}></span>
          Hoàn tất
        </div>

        <div className="queue-card-info-grid">
          <div className="queue-info-row">
            <span className="queue-info-label">Check-in</span>
            <span className="queue-info-value font-monospace" style={{ fontSize: '0.68rem' }}>{item.checkInTime || item.bookingTime || '—'}</span>
          </div>
          <div className="queue-info-row">
            <span className="queue-info-label">Hoàn thành</span>
            <span className="queue-info-value font-monospace text-success" style={{ fontSize: '0.68rem' }}>{item.completedTime || '—'}</span>
          </div>
        </div>
        <div className="queue-card-actions">
          <button
            className="queue-btn queue-btn-detail w-100"
            style={{ padding: '3px 10px', fontSize: '0.62rem' }}
            onClick={() => setSelectedVehicle(item)}
          >
            CHI TIẾT
          </button>
        </div>
      </div>
    );
  };

  // ── Section header ──
  const renderSectionHeader = (icon, label, count, color) => (
    <div className="queue-section-header">
      <div className="queue-section-label">
        <i className={icon} style={{ color }}></i>
        <span>{label}</span>
      </div>
      <span className="queue-section-count" style={{ background: `${color}15`, color }}>{count}</span>
    </div>
  );

  return (
    <div className="container-fluid py-2 text-start d-flex flex-column h-100">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-black mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>TIẾN ĐỘ DỊCH VỤ HÔM NAY</h2>
          <p className="text-secondary small mb-0">Theo dõi tiến độ xử lý xe trong ngày</p>
        </div>
      </div>

      {/* 2. SUMMARY DASHBOARD CARDS */}
      <div className="row g-3 mb-4 text-start">
        {/* Waiting Check-In */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-pending ${statusFilter === 'WAITING_CHECKIN' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'WAITING_CHECKIN' ? 'ALL' : 'WAITING_CHECKIN')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#FA8C16' }}>{stats.waitingCheckIn}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>CHỜ CHECK-IN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#FFF7E6', color: '#FA8C16' }}>
                <i className="fas fa-clock fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Processing */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-checkedin ${statusFilter === 'PROCESSING' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'PROCESSING' ? 'ALL' : 'PROCESSING')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#722ED1' }}>{stats.processing}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>ĐANG THỰC HIỆN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#F9F0FF', color: '#722ED1' }}>
                <i className="fas fa-sync-alt fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-completed ${statusFilter === 'COMPLETED_TODAY' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED_TODAY' ? 'ALL' : 'COMPLETED_TODAY')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#52C41A' }}>{stats.completedToday}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>HOÀN THÀNH HÔM NAY</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#F6FFED', color: '#52C41A' }}>
                <i className="fas fa-check-circle fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* No Show */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-cancelled ${statusFilter === 'NoShow' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'NoShow' ? 'ALL' : 'NoShow')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#64748b' }}>{stats.noShow}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>KHÁCH KHÔNG ĐẾN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#F1F5F9', color: '#64748b' }}>
                <i className="fas fa-user-slash fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-all`}
            style={{ cursor: 'default' }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#0ea5e9' }}>
                  {stats.todaysRevenue.toLocaleString()}đ
                </h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>DOANH THU HÔM NAY</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#E0F2FE', color: '#0ea5e9' }}>
                <i className="fas fa-dollar-sign fa-lg"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : (
        <div className="flex-grow-1">
          {!hasAnyItems ? (
            <div className="text-center py-5 text-muted small bg-light bg-opacity-40 rounded-4 border border-dashed">
              Chưa có phương tiện nào trong danh sách hôm nay.
            </div>
          ) : (
            <div className="d-flex flex-column gap-4 mb-4">

              {/* Section: Chờ Check-in */}
              {filteredWaiting.length > 0 && (
                <div>
                  {renderSectionHeader('fas fa-clock', 'Chờ Check-in', filteredWaiting.length, '#f59e0b')}
                  <div className="queue-grid">
                    {filteredWaiting.map(item => renderCompactCard(item))}
                  </div>
                </div>
              )}

              {/* Section: Đang xử lý */}
              {filteredProcessing.length > 0 && (
                <div>
                  {renderSectionHeader('fas fa-sync-alt', 'Đang xử lý', filteredProcessing.length, '#3b82f6')}
                  <div className="queue-grid">
                    {filteredProcessing.map(item => renderCompactCard(item))}
                  </div>
                </div>
              )}

              {/* Section: Khách không đến */}
              {filteredNoShow.length > 0 && (
                <div>
                  {renderSectionHeader('fas fa-user-slash', 'Khách không đến', filteredNoShow.length, '#ef4444')}
                  <div className="queue-grid">
                    {filteredNoShow.map(item => renderCompactCard(item))}
                  </div>
                </div>
              )}

              {/* Section: Hoàn tất hôm nay */}
              {filteredCompleted.length > 0 && (
                <div>
                  {renderSectionHeader('fas fa-check-circle', 'Hoàn tất hôm nay', filteredCompleted.length, '#22c55e')}
                  <div className="queue-grid">
                    {filteredCompleted.map(item => renderCompletedCard(item))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              {selectedVehicle.statusGroup === 'NoShow' ? (
                <div className="bg-light p-3 rounded-4 mb-3" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="row g-3" style={{ fontSize: '0.85rem' }}>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">MÃ ĐẶT LỊCH</span>
                      <strong className="text-dark">#BK-{selectedVehicle.bookingId}</strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">BIỂN SỐ XE</span>
                      <strong className="text-dark font-monospace">{selectedVehicle.licensePlate}</strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">TRẠNG THÁI</span>
                      <div>
                        <span className="badge bg-danger bg-opacity-10 text-danger fw-bold rounded-pill px-2.5 py-1" style={{ fontSize: '0.75rem' }}>
                          Khách không đến (No-Show)
                        </span>
                      </div>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">THỜI GIAN QUÁ HẠN</span>
                      <strong className="text-dark font-monospace">{selectedVehicle.noShowTime || '—'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-light p-3 rounded-4 mb-3" style={{ border: '1px solid #e2e8f0' }}>
                    <div className="row g-2" style={{ fontSize: '0.78rem' }}>
                      <div className="col-6">
                        <span className="text-muted d-block small">GÓI DỊCH VỤ</span>
                        <strong className="text-dark">{selectedVehicle.mainService}</strong>
                      </div>
                      <div className="col-6 text-end">
                        <span className="text-muted d-block small">ETA HOÀN THÀNH</span>
                        <strong className="text-cyan">{selectedVehicle.etaCompletion}</strong>
                      </div>
                      <div className="col-6 mt-2">
                        <span className="text-muted d-block small">TIẾN ĐỘ THỜI GIAN</span>
                        <strong className="text-dark">{selectedVehicle.progress}%</strong>
                      </div>
                      <div className="col-6 text-end mt-2">
                        <span className="text-muted d-block small">CÒN LẠI</span>
                        <strong className="text-cyan">{selectedVehicle.remainingSeconds} giây</strong>
                      </div>
                    </div>
                  </div>

                  {selectedVehicle.statusGroup !== 'NoShow' && (
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted mb-1">GÁN NHÂN VIÊN PHỤ TRÁCH</label>
                      <select
                        className="form-select bg-light border-0 py-2 text-dark fw-bold"
                        value={selectedVehicle.staffName || "Chưa gán"}
                        onChange={(e) => handleAssignStaff(e.target.value)}
                      >
                        <option value="Chưa gán">-- Chọn nhân viên --</option>
                        {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  <label className="form-label small fw-bold text-muted mb-2">QUY TRÌNH THỰC HIỆN DỰ KIẾN</label>
                  <div className="d-flex flex-column gap-2 mb-3">
                    {getModalStages(selectedVehicle).map((step, idx) => {
                      return (
                        <div
                          key={idx}
                          className="d-flex align-items-center justify-content-between p-2.5 rounded-3 border bg-white"
                          style={{
                            borderColor: step.isActive ? 'rgba(14, 165, 233, 0.3)' : '#e2e8f0',
                            background: step.isActive ? 'rgba(14, 165, 233, 0.02)' : 'none'
                          }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            {step.isCompleted ? (
                              <i className="fas fa-check-circle text-success fs-6"></i>
                            ) : step.isActive ? (
                              <i className="fas fa-spinner fa-spin text-cyan fs-6"></i>
                            ) : (
                              <i className="far fa-circle text-muted fs-6"></i>
                            )}
                            <div className="d-flex flex-column">
                              <span className={`small ${step.isCompleted ? 'text-muted text-decoration-line-through' : 'text-dark fw-bold'}`} style={{ fontSize: '0.8rem' }}>
                                {step.name}
                              </span>
                              {step.completedAt && (
                                <span className="text-muted" style={{ fontSize: '0.62rem' }}>
                                  {new Date(step.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {step.isActive && step.startedAt && (
                                <span className="text-cyan" style={{ fontSize: '0.62rem' }}>
                                  Bắt đầu: {new Date(step.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                          {step.isCompleted && <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.6rem' }}>Xong</span>}
                          {step.isActive && <span className="badge bg-info bg-opacity-10 text-cyan animate-pulse" style={{ fontSize: '0.6rem' }}>Đang chạy</span>}
                          {!step.isCompleted && !step.isActive && <span className="badge bg-light text-muted" style={{ fontSize: '0.6rem' }}>Chờ</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-0">
                    <label className="form-label small fw-bold text-muted mb-1">GHI CHÚ DỊCH VỤ / TÌNH TRẠNG XE</label>
                    <textarea
                      className="form-control bg-light border-0 py-2 rounded-3"
                      rows="3"
                      placeholder="Lưu ý vết xước của xe..."
                      value={selectedVehicle.staffNote || ''}
                      onChange={(e) => handleSaveStaffNotes(e.target.value)}
                      onBlur={handleBlurStaffNotes}
                    ></textarea>
                  </div>
                </>
              )}
            </div>
            <div className="confirm-modal-footer">
              {selectedVehicle.statusGroup === 'NoShow' ? (
                <button className="confirm-cancel-btn w-100 py-2.5 fw-bold" style={{ borderRadius: '12px' }} onClick={() => setSelectedVehicle(null)}>ĐÓNG</button>
              ) : (
                <>
                  <button className="confirm-cancel-btn w-50" onClick={() => setSelectedVehicle(null)}>ĐÓNG</button>
                  {(selectedVehicle.status === 'Completed' || selectedVehicle.progress >= 100 || selectedVehicle.statusGroup === 'Completed' || selectedVehicle.status === 'Archived') ? (
                    selectedVehicle.status === 'Archived' ? (
                      <button
                        className="confirm-ok-btn w-50 fw-bold border-0 text-muted"
                        style={{ background: '#e2e8f0', cursor: 'not-allowed' }}
                        disabled={true}
                      >
                        ĐÃ CHECKOUT
                      </button>
                    ) : (
                      <button
                        className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark"
                        style={{ background: 'var(--cyan-electric)' }}
                        disabled={submittingIds.has(selectedVehicle.queueId)}
                        onClick={() => handleCheckoutVehicle(selectedVehicle.queueId, selectedVehicle.licensePlate)}
                      >
                        THANH TOÁN & CHECKOUT
                      </button>
                    )
                  ) : selectedVehicle.statusGroup === 'Processing' ? (
                    <button
                      className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-muted"
                      style={{ background: '#e2e8f0', cursor: 'not-allowed' }}
                      disabled={true}
                    >
                      TỰ ĐỘNG CHUYỂN TIẾP (DEMO)
                    </button>
                  ) : (
                    <button
                      className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark"
                      style={{ background: 'var(--cyan-electric)' }}
                      disabled={submittingIds.has(selectedVehicle.queueId)}
                      onClick={() => handleAdvanceColumn(selectedVehicle.queueId)}
                    >
                      TIẾP TỤC VÀO LÀN RỬA
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQueue;
