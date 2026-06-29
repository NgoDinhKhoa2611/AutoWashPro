import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/shared.css';
import '../styles/admin/admin.css';
import '../styles/admin/bookings.css';
import { adminService } from '../services/adminService';
import { customerService } from '../services/customerService';
import { useBookingHub } from '../hooks/useBookingHub';

const DEFAULT_TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00", "23:00"
];

export const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('WAITING_CHECKIN');
  const [dateFilter, setDateFilter] = useState('');
  
  // Drawer State
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Reschedule Form State
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('08:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);

  useEffect(() => {
    customerService.getBookingConfig()
      .then(res => {
        if (res.success && res.slots) {
          setTimeSlots(res.slots);
          if (res.slots.length > 0) {
            setRescheduleTime(res.slots[0]);
          }
        }
      })
      .catch(err => console.error("Error loading booking config:", err));
  }, []);

  // Collapsible Sections State
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    vehicle: true,
    schedule: true,
    payment: false,
    history: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const customerHistory = useMemo(() => {
    if (!bookingDetail || !bookings.length) return [];
    return bookings.filter(b => 
      b.phone === bookingDetail.customer.phone && 
      b.bookingId !== bookingDetail.bookingId
    );
  }, [bookingDetail, bookings]);

  // Cancel Reason Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelCustomerName, setCancelCustomerName] = useState('');
  const [selectedReason, setSelectedReason] = useState('Hết slot trong ngày');
  const [customReason, setCustomReason] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getBookings();
      if (res && res.success) {
        setBookings(res.bookings);
      } else {
        if (window.showToast) window.showToast('Không thể tải danh sách đặt lịch', 'error');
      }
    } catch (e) {
      console.error('Failed to load bookings', e);
      if (window.showToast) window.showToast('Lỗi tải danh sách đặt lịch', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(() => {
      adminService.getBookings().then(res => {
        if (res && res.success) {
          setBookings(res.bookings);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  // Real-time: refresh instantly when a new booking is created (poll above is fallback).
  useBookingHub((payload) => {
    loadBookings();
    if (window.showToast) {
      window.showToast(`Lịch đặt mới #${payload.bookingId} · ${payload.licensePlate}`, 'info');
    }
  });

  const loadBookingDetail = async (id) => {
    setLoadingDetail(true);
    setSelectedBookingId(id);
    setExpandedSections({
      customer: true,
      vehicle: true,
      schedule: true,
      payment: false,
      history: false
    });
    try {
      const res = await adminService.getBookingDetail(id);
      if (res && res.success) {
        setBookingDetail(res.booking);
      } else {
        if (window.showToast) window.showToast('Không thể tải chi tiết đặt lịch', 'error');
        setSelectedBookingId(null);
      }
    } catch (e) {
      console.error('Failed to load booking detail', e);
      if (window.showToast) window.showToast('Lỗi tải chi tiết đặt lịch', 'error');
      setSelectedBookingId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDrawer = () => {
    setSelectedBookingId(null);
    setBookingDetail(null);
    setIsRescheduling(false);
  };

  const submitReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      if (window.showToast) window.showToast('Vui lòng chọn ngày và giờ hẹn!', 'warning');
      return;
    }
    if (!rescheduleReason.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập lý do đổi lịch!', 'warning');
      return;
    }

    const scheduledAt = `${rescheduleDate}T${rescheduleTime}:00`;
    try {
      const res = await adminService.rescheduleBooking(bookingDetail.bookingId, scheduledAt, rescheduleReason.trim());
      if (res && res.success) {
        if (window.showToast) window.showToast('Đổi lịch hẹn thành công!', 'success');
        setIsRescheduling(false);
        loadBookings();
        loadBookingDetail(bookingDetail.bookingId);
      } else {
        if (window.showToast) window.showToast(res.message || 'Lỗi đổi lịch hẹn', 'error');
      }
    } catch (e) {
      console.error('Reschedule error', e);
      const errMsg = e.response?.data?.message || 'Lỗi hệ thống đổi lịch';
      if (window.showToast) window.showToast(errMsg, 'error');
    }
  };

  const handleConfirm = async (id, name) => {
    const performConfirm = async () => {
      try {
        const res = await adminService.confirmBooking(id);
        if (res && res.success) {
          if (window.showToast) window.showToast('Xác nhận đặt lịch thành công!', 'success');
          loadBookings();
          if (selectedBookingId === id) {
            loadBookingDetail(id);
          }
        } else {
          if (window.showToast) window.showToast(res.message || 'Lỗi xác nhận đặt lịch', 'error');
        }
      } catch (e) {
        console.error('Confirm error', e);
        if (window.showToast) window.showToast('Lỗi hệ thống xác nhận', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xác nhận lịch đặt', `Bạn có chắc chắn muốn xác nhận lịch đặt cho khách hàng ${name}?`, performConfirm);
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn xác nhận lịch đặt cho khách hàng ${name}?`)) {
        performConfirm();
      }
    }
  };

  const handleCancel = (id, name) => {
    setCancelBookingId(id);
    setCancelCustomerName(name);
    setSelectedReason('Hết slot trong ngày');
    setCustomReason('');
    setShowCancelModal(true);
  };

  const submitCancel = async () => {
    const finalReason = selectedReason === 'Khác' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      if (window.showToast) window.showToast('Vui lòng nhập lý do hủy lịch!', 'warning');
      return;
    }

    try {
      const res = await adminService.cancelBooking(cancelBookingId, finalReason);
      if (res && res.success) {
        if (window.showToast) window.showToast('Đã hủy lịch đặt thành công!', 'success');
        setShowCancelModal(false);
        loadBookings();
        if (selectedBookingId === cancelBookingId) {
          loadBookingDetail(cancelBookingId);
        }
      } else {
        if (window.showToast) window.showToast(res.message || 'Lỗi hủy lịch đặt', 'error');
      }
    } catch (e) {
      console.error('Cancel error', e);
      const errMsg = e.response?.data?.message || 'Lỗi hệ thống hủy lịch';
      if (window.showToast) window.showToast(errMsg, 'error');
    }
  };

  const handleCheckIn = async (id, plate) => {
    const performCheckIn = async () => {
      try {
        const res = await adminService.checkinBooking(id);
        if (res && res.success) {
          if (window.showToast) window.showToast('Check-in thành công! Xe đã được thêm vào hàng đợi trực tiếp.', 'success');
          loadBookings();
          if (selectedBookingId === id) {
            loadBookingDetail(id);
          }
        } else {
          if (window.showToast) window.showToast(res.message || 'Lỗi check-in xe', 'error');
        }
      } catch (e) {
        console.error('Check-in error', e);
        const errMsg = e.response?.data?.message || 'Lỗi hệ thống check-in';
        if (window.showToast) window.showToast(errMsg, 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Check-In xe vào hàng đợi', `Thực hiện check-in xe biển số ${plate} vào hàng đợi trực tiếp ngay bây giờ?`, performCheckIn);
    } else {
      if (window.confirm(`Thực hiện check-in xe biển số ${plate} vào hàng đợi trực tiếp ngay bây giờ?`)) {
        performCheckIn();
      }
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Pending': return 'Chờ xác nhận';
      case 'Confirmed': return 'Đã xác nhận';
      case 'CheckedIn': return 'Đã check-in';
      case 'Washing': return 'Đang rửa';
      case 'Completed': return 'Hoàn thành';
      case 'Cancelled': return 'Đã hủy';
      case 'NoShow': return 'Khách không đến';
      case 'WaitingCheckout': return 'Chờ thanh toán';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Confirmed': return 'status-confirmed';
      case 'CheckedIn': return 'status-checkedin';
      case 'Washing': return 'status-washing';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      case 'NoShow': return 'status-noshow';
      case 'WaitingCheckout': return 'status-waiting-checkout';
      default: return '';
    }
  };

  const getTierBadgeClass = (tierName) => {
    const t = (tierName || '').toUpperCase();
    if (t.includes('PLATINUM')) return 'tier-pill-platinum active';
    if (t.includes('GOLD')) return 'tier-pill-gold active';
    if (t.includes('SILVER')) return 'tier-pill-silver active';
    return 'tier-pill-member active';
  };

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    const matchesPlate = (b.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (statusFilter === 'Pending') {
      matchesStatus = b.status === 'Pending';
    } else if (statusFilter === 'Confirmed') {
      matchesStatus = b.status === 'Confirmed';
    } else if (statusFilter === 'CheckedIn') {
      matchesStatus = b.status === 'CheckedIn';
    } else if (statusFilter === 'Washing') {
      matchesStatus = b.status === 'Washing';
    } else if (statusFilter === 'Completed') {
      matchesStatus = b.status === 'Completed';
    } else if (statusFilter === 'Cancelled') {
      matchesStatus = b.status === 'Cancelled';
    } else if (statusFilter === 'NoShow') {
      matchesStatus = b.status === 'NoShow';
    } else if (statusFilter === 'WAITING_CHECKIN') {
      matchesStatus = b.status === 'Confirmed' || b.status === 'Pending';
    } else if (statusFilter === 'PROCESSING') {
      matchesStatus = b.status === 'CheckedIn' || b.status === 'Washing';
    } else if (statusFilter === 'COMPLETED_TODAY') {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      matchesStatus = b.status === 'Completed' && b.scheduledAt.split('T')[0] === todayStr;
    }
    
    let matchesDate = true;
    if (dateFilter) {
      const bDate = b.scheduledAt.split('T')[0];
      matchesDate = bDate === dateFilter;
    }
    
    return matchesPlate && matchesStatus && matchesDate;
  });

  // Statistics
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const stats = {
    waitingCheckIn: bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length,
    processing: bookings.filter(b => b.status === 'CheckedIn' || b.status === 'Washing').length,
    completedToday: bookings.filter(b => b.status === 'Completed' && b.scheduledAt.split('T')[0] === todayStr).length,
    noShow: bookings.filter(b => b.status === 'NoShow').length
  };

  // Render Skeleton Cards
  const renderSkeletonCards = () => {
    return Array.from({ length: 9 }).map((_, idx) => (
      <div key={idx} className="skeleton-card">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="skeleton-pulse skeleton-block" style={{ width: '30%', height: '16px' }}></div>
          <div className="skeleton-pulse skeleton-block" style={{ width: '35%', height: '18px', borderRadius: '20px' }}></div>
        </div>
        <div className="d-flex justify-content-between align-items-end mt-auto">
          <div className="skeleton-pulse skeleton-block" style={{ width: '35%', height: '12px' }}></div>
          <div className="skeleton-pulse skeleton-block" style={{ width: '25%', height: '14px' }}></div>
        </div>
      </div>
    ));
  };

  // Render Skeleton Drawer
  const renderSkeletonDrawer = () => {
    return (
      <div className="p-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="mb-4">
            <div className="skeleton-pulse skeleton-block" style={{ width: '35%', height: '16px', marginBottom: '12px' }}></div>
            <div className="skeleton-pulse skeleton-block" style={{ width: '90%', height: '40px', borderRadius: '12px' }}></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container-fluid py-2">
      {/* 1. PAGE HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 text-start">
        <div>
          <h2 className="fw-black mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>QUẢN LÝ ĐẶT LỊCH</h2>
          <p className="text-secondary small mb-0">Quản lý lịch hẹn, duyệt lịch và check-in cho khách hàng</p>
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
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>ĐANG XỬ LÝ</small>
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
      </div>

      {/* 3. FILTER PANEL */}
      <div className="app-card border-0 p-4 mb-4 text-start">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold text-muted mb-1">TÌM THEO BIỂN SỐ XE</label>
            <div className="position-relative">
              <input
                type="text"
                className="form-control bg-light border-0 py-2.5 ps-4 text-dark fw-bold font-monospace"
                style={{ fontSize: '0.85rem' }}
                placeholder="Ví dụ: 30A-12345..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search position-absolute top-50 translate-middle-y text-muted opacity-50" style={{ left: '14px', fontSize: '0.8rem' }}></i>
            </div>
          </div>
          
          <div className="col-12 col-md-3">
            <label className="form-label small fw-bold text-muted mb-1">TRẠNG THÁI</label>
            <select
              className="form-select bg-light border-0 py-2.5 text-dark fw-bold"
              style={{ fontSize: '0.85rem' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ xác nhận (Pending)</option>
              <option value="Confirmed">Đã xác nhận (Confirmed)</option>
              <option value="CheckedIn">Đã check-in (CheckedIn)</option>
              <option value="Washing">Đang rửa xe (Washing)</option>
              <option value="Completed">Hoàn thành (Completed)</option>
              <option value="Cancelled">Đã hủy (Cancelled)</option>
              <option value="NoShow">Khách không đến (NoShow)</option>
              <option value="WAITING_CHECKIN">Chờ check-in (Tổng hợp)</option>
              <option value="PROCESSING">Đang xử lý (Tổng hợp)</option>
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label small fw-bold text-muted mb-1">NGÀY HẸN ĐẶT</label>
            <input
              type="date"
              className="form-control bg-light border-0 py-2 text-dark fw-bold"
              style={{ fontSize: '0.85rem' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-2 d-flex align-items-end">
            <button
              className="btn btn-secondary w-100 py-2.5 fw-bold"
              style={{ fontSize: '0.8rem', borderRadius: '12px' }}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDateFilter('');
              }}
            >
              XÓA BỘ LỌC
            </button>
          </div>
        </div>
      </div>

      {/* 4. REPLACE TABLE WITH BOOKING CARDS GRID */}
      {loading ? (
        <div className="booking-card-grid">
          {renderSkeletonCards()}
        </div>
      ) : filteredBookings.length === 0 ? (
        /* 7. EMPTY STATES */
        <div className="app-card border-0 empty-state-container bg-white rounded-4">
          <i className="far fa-calendar-alt empty-state-icon"></i>
          <h5 className="empty-state-text">No bookings found.</h5>
          <p className="empty-state-subtext">Try changing filters or search criteria.</p>
        </div>
      ) : (
        <div className="booking-card-grid text-start">
          {filteredBookings.map((b) => {
            const sDate = new Date(b.scheduledAt);
            const formattedDate = sDate.toLocaleDateString('vi-VN');
            const formattedTime = sDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div 
                key={b.bookingId} 
                className={`booking-card card-${b.status.toLowerCase()} position-relative`}
                onClick={() => loadBookingDetail(b.bookingId)}
                style={{ cursor: 'pointer', height: 'auto' }}
              >
                {/* Top: BK-ID and Status */}
                <div className="booking-card-row align-items-center mb-2.5">
                  <span className="fw-black text-cyan" style={{ fontSize: '1rem' }}>#BK-{b.bookingId}</span>
                  <span className={`booking-status-badge ${getStatusClass(b.status)}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                    {getStatusLabel(b.status)}
                  </span>
                </div>
                
                {/* Middle: License Plate and Service Package */}
                <div className="booking-card-row align-items-center mb-2.5">
                  <div className="d-flex flex-column text-start">
                    <small className="text-muted" style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BIỂN SỐ XE</small>
                    <span className="fw-black font-monospace text-dark px-2 py-0.5 rounded bg-light border" style={{ fontSize: '0.82rem', width: 'fit-content' }}>
                      {b.licensePlate || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="d-flex flex-column text-end">
                    <small className="text-muted" style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>GÓI DỊCH VỤ</small>
                    <span className="fw-bold text-dark text-truncate" style={{ fontSize: '0.82rem', maxWidth: '140px' }} title={b.mainService?.serviceName || 'Standard Car Wash'}>
                      {b.mainService?.serviceName || 'Standard Car Wash'}
                    </span>
                  </div>
                </div>

                <div className="booking-card-divider my-2"></div>

                {/* Bottom: Date and Time */}
                <div className="booking-card-row align-items-end mt-auto mb-0">
                  <div className="d-flex flex-column text-start">
                    <small className="text-muted" style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NGÀY HẸN</small>
                    <span className="fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>{formattedDate}</span>
                  </div>
                  <div className="d-flex flex-column text-end">
                    <small className="text-muted" style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>GIỜ HẸN</small>
                    <span className="fw-bold monospace text-dark" style={{ fontSize: '0.95rem' }}>{formattedTime}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. REPLACE MODAL WITH RIGHT DRAWER */}
      <div className={`booking-drawer-overlay ${selectedBookingId ? 'show' : ''}`} onClick={closeDrawer}>
        <div className="booking-drawer text-start" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="booking-drawer-header d-flex justify-content-between align-items-center">
            <h5 className="fw-black text-dark mb-0" style={{ letterSpacing: '-0.5px' }}>Chi tiết Lịch đặt: #{selectedBookingId}</h5>
            <button type="button" className="btn-close" onClick={closeDrawer} aria-label="Close"></button>
          </div>

          {/* Body */}
          <div className="booking-drawer-body">
            {loadingDetail || !bookingDetail ? (
              renderSkeletonDrawer()
            ) : (
              <>
                {/* Section 1: Customer Information */}
                <div className="booking-drawer-section mb-2">
                  <div 
                    className="booking-drawer-section-title" 
                    onClick={() => toggleSection('customer')}
                  >
                    <span>1. Thông tin khách hàng</span>
                    <i className={`fas fa-chevron-${expandedSections.customer ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.65rem' }}></i>
                  </div>
                  {expandedSections.customer && (
                    <div className="bg-light p-2 rounded-3 border">
                      <div className="row g-2">
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Họ tên</small>
                          <strong className="text-dark" style={{ fontSize: '0.8rem' }}>{bookingDetail.customer.fullName}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Số điện thoại</small>
                          <strong className="text-dark font-monospace" style={{ fontSize: '0.8rem' }}>{bookingDetail.customer.phone}</strong>
                        </div>
                        <div className="col-6 border-top pt-1">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Email</small>
                          <span className="text-dark small" style={{ fontSize: '0.78rem' }}>{bookingDetail.customer.email || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="col-6 border-top pt-1">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Hạng TV & Điểm</small>
                          <div className="d-flex align-items-center gap-1.5 mt-0.5">
                            <span className={getTierBadgeClass(bookingDetail.customer.tierName)} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{bookingDetail.customer.tierName}</span>
                            <strong className="text-secondary small" style={{ fontSize: '0.75rem' }}>{bookingDetail.customer.pointBalance.toLocaleString()} PTS</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Vehicle Information */}
                <div className="booking-drawer-section mb-2">
                  <div 
                    className="booking-drawer-section-title" 
                    onClick={() => toggleSection('vehicle')}
                  >
                    <span>2. Thông tin phương tiện</span>
                    <i className={`fas fa-chevron-${expandedSections.vehicle ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.65rem' }}></i>
                  </div>
                  {expandedSections.vehicle && (
                    <div className="bg-light p-2 rounded-3 border">
                      <div className="row g-2">
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Biển số xe</small>
                          <strong className="text-dark font-monospace" style={{ fontSize: '0.85rem' }}>{bookingDetail.vehicle.licensePlate}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Phân khúc xe</small>
                          <span className="text-dark fw-bold" style={{ fontSize: '0.78rem' }}>{bookingDetail.vehicle.vehicleClass}</span>
                        </div>
                        <div className="col-12 border-top pt-1">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Hãng xe & Dòng xe</small>
                          <span className="text-dark small" style={{ fontSize: '0.78rem' }}>{bookingDetail.vehicle.brand} - {bookingDetail.vehicle.model}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Appointment Information */}
                <div className="booking-drawer-section mb-2">
                  <div 
                    className="booking-drawer-section-title" 
                    onClick={() => toggleSection('schedule')}
                  >
                    <span>3. Thông tin lịch trình</span>
                    <i className={`fas fa-chevron-${expandedSections.schedule ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.65rem' }}></i>
                  </div>
                  {expandedSections.schedule && (
                    <div className="bg-light p-2 rounded-3 border">
                      <div className="row g-2">
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Thời gian hẹn</small>
                          <strong className="text-dark" style={{ fontSize: '0.8rem' }}>
                            {new Date(bookingDetail.scheduledAt).toLocaleDateString('vi-VN')} @ {new Date(bookingDetail.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Trạng thái</small>
                          <span className={`booking-status-badge d-inline-block mt-0.5 ${getStatusClass(bookingDetail.status)}`} style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
                            {getStatusLabel(bookingDetail.status)}
                          </span>
                        </div>
                        <div className="col-12 border-top pt-1 d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Ngày tạo đơn</small>
                            <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>{new Date(bookingDetail.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Quota 30 ngày (Khách)</small>
                            <span className={`badge ${bookingDetail.quotaUsed >= 3 ? 'bg-danger' : 'bg-secondary'} px-2 py-1 mt-0.5`} style={{ fontSize: '0.7rem' }}>
                              Used: {bookingDetail.quotaUsed ?? 0} / 3
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {bookingDetail.status === 'Cancelled' && bookingDetail.cancelReason && (
                  <div className="booking-drawer-section mb-3">
                    <div className="booking-drawer-section-title text-danger mb-1.5" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', borderLeft: '3px solid #dc3545', paddingLeft: '8px' }}>Lý do hủy lịch</div>
                    <div className="p-2 border border-danger-subtle rounded-3 text-danger bg-danger bg-opacity-10 small fw-semibold" style={{ fontSize: '0.78rem' }}>
                      <i className="fas fa-exclamation-circle me-1.5"></i>{bookingDetail.cancelReason}
                    </div>
                  </div>
                )}
                
                {isRescheduling && (
                  <div className="booking-drawer-section mb-3 bg-light border border-info p-3 rounded-3 animate-confirm-in">
                    <div className="fw-bold text-info mb-2 small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                      <i className="fas fa-edit me-1.5"></i>Thay đổi lịch hẹn mới
                    </div>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-bold text-muted mb-1">CHỌN NGÀY MỚI *</label>
                        <input
                          type="date"
                          className="form-control bg-white border py-2 text-dark fw-bold"
                          style={{ fontSize: '0.82rem' }}
                          value={rescheduleDate}
                          min={new Date().toLocaleDateString('sv-SE')}
                          onChange={e => setRescheduleDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-bold text-muted mb-1">CHỌN GIỜ MỚI *</label>
                        <select
                          className="form-select bg-white border py-2 text-dark fw-bold"
                          style={{ fontSize: '0.82rem' }}
                          value={rescheduleTime}
                          onChange={e => setRescheduleTime(e.target.value)}
                        >
                          {timeSlots.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 mt-2">
                        <label className="form-label small fw-bold text-muted mb-1">LÝ DO ĐỔI LỊCH *</label>
                        <textarea
                          className="form-control bg-white border py-2 text-dark"
                          rows="2"
                          maxLength="500"
                          placeholder="Lý do thay đổi lịch hẹn..."
                          value={rescheduleReason}
                          onChange={e => setRescheduleReason(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Payment Summary */}
                <div className="booking-drawer-section mb-2">
                  <div 
                    className="booking-drawer-section-title" 
                    onClick={() => toggleSection('payment')}
                  >
                    <span>4. Chi phí & thanh toán</span>
                    <i className={`fas fa-chevron-${expandedSections.payment ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.65rem' }}></i>
                  </div>
                  {expandedSections.payment && (
                    <div className="bg-light p-2 rounded-3 border">
                      {/* Service Table */}
                      <div className="border rounded-3 overflow-hidden bg-white mb-2">
                        <table className="table table-sm table-borderless mb-0 align-middle" style={{ fontSize: '0.78rem', tableLayout: 'fixed', width: '100%' }}>
                          <thead className="bg-light border-bottom" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                            <tr>
                              <th className="ps-3 py-1.5 text-muted" style={{ width: '60%' }}>Tên dịch vụ</th>
                              <th className="py-1.5 text-muted text-center" style={{ width: '20%' }}>Thời lượng</th>
                              <th className="pe-3 py-1.5 text-muted text-end" style={{ width: '20%' }}>Đơn giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookingDetail.mainService ? (
                              <tr>
                                <td className="ps-3 py-2 fw-semibold text-dark" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                  <i className="fas fa-cog text-cyan me-1.5"></i>{bookingDetail.mainService.serviceName} <span className="badge bg-cyan text-dark small" style={{ fontSize: '0.55rem', padding: '1.5px 4px' }}>Chính</span>
                                </td>
                                <td className="py-2 text-center text-secondary">60 phút</td>
                                <td className="pe-3 py-2 text-end fw-semibold text-dark">{Number(bookingDetail.mainService.price).toLocaleString()}đ</td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan="3" className="ps-3 py-2 text-secondary text-center">Không có dịch vụ chính</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Payment Calculations */}
                      <div className="px-1 py-1">
                        <div className="d-flex justify-content-between align-items-center mb-1.5 small text-secondary" style={{ fontSize: '0.78rem' }}>
                          <span>Tổng tiền dịch vụ:</span>
                          <span>{Number(bookingDetail.basePrice).toLocaleString()}đ</span>
                        </div>
                        {bookingDetail.voucher && (
                          <div className="border-top pt-1.5 mt-1.5 mb-1.5">
                            <div className="d-flex justify-content-between align-items-start mb-1 small text-danger" style={{ fontSize: '0.78rem' }}>
                              <div>
                                <strong className="text-danger"><i className="fas fa-ticket-alt me-1.5"></i>{bookingDetail.voucher.rewardName}</strong>
                                {bookingDetail.voucher.description && <small className="text-muted d-block" style={{ fontSize: '0.62rem' }}>{bookingDetail.voucher.description}</small>}
                              </div>
                              <span className="fw-bold text-danger">-{Number(bookingDetail.voucher.discountValue || bookingDetail.promoDiscount).toLocaleString()}đ</span>
                            </div>
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center border-top pt-1.5 fw-bold" style={{ fontSize: '0.88rem' }}>
                          <span className="text-dark">Số tiền cần trả:</span>
                          <span className="text-cyan" style={{ fontSize: '1rem' }}>{Number(bookingDetail.finalPrice).toLocaleString()}đ</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1.5 small text-success" style={{ fontSize: '0.75rem' }}>
                          <span>Tích lũy Loyalty:</span>
                          <span>+{bookingDetail.pointsEarned} PTS</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 5: Booking History, Timeline & Reschedules */}
                <div className="booking-drawer-section mb-0">
                  <div 
                    className="booking-drawer-section-title" 
                    onClick={() => toggleSection('history')}
                  >
                    <span>5. Dòng thời gian & Lịch sử đặt lịch</span>
                    <i className={`fas fa-chevron-${expandedSections.history ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.65rem' }}></i>
                  </div>
                  {expandedSections.history && (
                    <div className="bg-light p-2 rounded-3 border d-flex flex-column gap-2">
                      {/* Timeline Audit Logs */}
                      <div>
                        <small className="text-muted d-block fw-bold mb-1.5" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>DÒNG THỜI GIAN ĐƠN ĐẶT</small>
                        {bookingDetail.timeline && bookingDetail.timeline.length > 0 ? (
                          <div className="booking-timeline ps-2 border-start py-1" style={{ fontSize: '0.75rem' }}>
                            {bookingDetail.timeline.map((log) => (
                              <div key={log.id} className="timeline-item mb-2 position-relative">
                                <div className="timeline-marker" style={{ left: '-12.5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--cyan-electric)', position: 'absolute' }}></div>
                                <div className="d-flex justify-content-between align-items-start ms-2">
                                  <div>
                                    <strong className="text-dark">{log.action === 'Created' ? 'Khởi tạo' : log.action === 'Confirmed' ? 'Đã duyệt' : log.action === 'CheckedIn' ? 'Đã check-in' : log.action === 'WashingStarted' ? 'Đang rửa' : log.action === 'Completed' ? 'Hoàn thành' : log.action === 'Cancelled' ? 'Đã hủy' : log.action === 'NoShow' ? 'Khách không đến' : log.action === 'Rescheduled' ? 'Đổi lịch' : log.action}</strong>
                                    <span className="text-secondary d-block mt-0.5" style={{ fontSize: '0.72rem' }}>{log.description}</span>
                                  </div>
                                  <div className="text-end text-muted font-monospace" style={{ fontSize: '0.68rem', minWidth: '100px' }}>
                                    {new Date(log.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: '0.55rem' }}>{log.performedBy}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="small text-secondary text-center py-1">Không có nhật ký dòng thời gian</div>
                        )}
                      </div>

                      {/* Reschedule History */}
                      {bookingDetail.reschedules && bookingDetail.reschedules.length > 0 && (
                        <div className="border-top pt-2.5">
                          <small className="text-muted d-block fw-bold mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>LỊCH SỬ ĐỔI LỊCH HẸN</small>
                          <div className="d-flex flex-column gap-2" style={{ fontSize: '0.75rem' }}>
                            {bookingDetail.reschedules.map((resch) => (
                              <div key={resch.id} className="bg-white p-2 rounded border border-info-subtle">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <strong className="text-info"><i className="fas fa-calendar-alt me-1"></i>Thay đổi lịch hẹn</strong>
                                  <span className="text-muted font-monospace" style={{ fontSize: '0.65rem' }}>{new Date(resch.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className="text-dark mb-1">
                                  <span>Từ: </span><span className="text-muted">{new Date(resch.oldScheduledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                  <span className="mx-1.5"><i className="fas fa-long-arrow-alt-right"></i></span>
                                  <span>Sang: </span><strong className="text-dark">{new Date(resch.newScheduledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</strong>
                                </div>
                                <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                  <strong>Lý do:</strong> {resch.reason} <span className="badge bg-light text-secondary border float-end">{resch.changedBy}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Customer Booking History (Other bookings) */}
                      <div className="border-top pt-2.5">
                        <small className="text-muted d-block fw-bold mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>LỊCH HẸN KHÁC CỦA KHÁCH HÀNG ({customerHistory.length})</small>
                        {customerHistory.length === 0 ? (
                          <div className="small text-secondary text-center py-1">Không có lịch sử lịch đặt khác</div>
                        ) : (
                          <div className="d-flex flex-column gap-1.5" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                            {customerHistory.map(hist => {
                              const hDate = new Date(hist.scheduledAt).toLocaleDateString('vi-VN');
                              const hTime = new Date(hist.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                              return (
                                <div key={hist.bookingId} className="bg-white p-2 rounded border d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                                  <div className="d-flex flex-column text-start">
                                    <strong className="text-dark font-monospace">#BK-{hist.bookingId} • {hist.licensePlate}</strong>
                                    <span className="text-secondary" style={{ fontSize: '0.68rem' }}>{hDate} lúc {hTime}</span>
                                  </div>
                                  <div className="text-end">
                                    <span className={`booking-status-badge ${getStatusClass(hist.status)}`} style={{ fontSize: '0.58rem', padding: '1px 6px' }}>
                                      {getStatusLabel(hist.status)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {bookingDetail.notes && (
                  <div className="mt-2.5">
                    <small className="text-muted d-block fw-bold mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>GHI CHÚ / YÊU CẦU ĐẶC BIỆT</small>
                    <div className="p-2 border rounded text-secondary bg-white small" style={{ fontSize: '0.75rem' }}>
                      {bookingDetail.notes}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {bookingDetail && (isRescheduling || ['Pending', 'Confirmed', 'CheckedIn', 'Washing'].includes(bookingDetail.status)) && (
            <div className="booking-drawer-footer">
              {isRescheduling ? (
                <div className="d-flex gap-2 w-100 justify-content-end">
                  <button
                    className="btn btn-secondary fw-bold px-4 py-2"
                    style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                    onClick={() => setIsRescheduling(false)}
                  >
                    HỦY BỎ
                  </button>
                  <button
                    className="btn btn-primary fw-bold text-white px-4 py-2"
                    style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                    onClick={submitReschedule}
                  >
                    LƯU ĐỔI LỊCH
                  </button>
                </div>
              ) : (
                <div className="d-flex gap-2 w-100 justify-content-end">
                  {bookingDetail.status === 'Pending' && (
                    <>
                      <button
                        className="btn btn-danger fw-bold text-white px-4 py-2"
                        style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                        onClick={() => handleCancel(bookingDetail.bookingId, bookingDetail.customer.fullName)}
                      >
                        HỦY LỊCH HẸN
                      </button>
                      <button
                        className="btn btn-success fw-bold text-white px-4 py-2"
                        style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                        onClick={() => handleConfirm(bookingDetail.bookingId, bookingDetail.customer.fullName)}
                      >
                        DUYỆT LỊCH HẸN
                      </button>
                    </>
                  )}
                  
                  {bookingDetail.status === 'Confirmed' && (() => {
                    const bookingDate = new Date(bookingDetail.scheduledAt);
                    bookingDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isFutureBooking = bookingDate > today;

                    return (
                      <>
                        <button
                          className="btn btn-danger fw-bold text-white px-4 py-2"
                          style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                          onClick={() => handleCancel(bookingDetail.bookingId, bookingDetail.customer.fullName)}
                        >
                          HỦY LỊCH HẸN
                        </button>
                        <button
                          className="btn btn-warning fw-bold text-dark px-4 py-2"
                          style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            const sDate = new Date(bookingDetail.scheduledAt);
                            setRescheduleDate(sDate.toLocaleDateString('sv-SE'));
                            setRescheduleTime(sDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
                            setRescheduleReason('');
                            setIsRescheduling(true);
                          }}
                        >
                          ĐỔI LỊCH HẸN
                        </button>
                        <button
                          className="btn btn-info fw-bold text-dark px-4 py-2"
                          style={{
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            background: isFutureBooking ? '#6c757d' : 'var(--cyan-electric)',
                            color: isFutureBooking ? '#fff' : 'var(--dark)',
                            border: 'none',
                            cursor: isFutureBooking ? 'not-allowed' : 'pointer',
                            opacity: isFutureBooking ? 0.65 : 1
                          }}
                          disabled={isFutureBooking}
                          title={isFutureBooking ? "Chỉ có thể check-in vào ngày hẹn." : ""}
                          onClick={() => handleCheckIn(bookingDetail.bookingId, bookingDetail.vehicle.licensePlate)}
                        >
                          CHECK-IN NGAY
                        </button>
                      </>
                    );
                  })()}

                  {['CheckedIn', 'Washing'].includes(bookingDetail.status) && (
                    <button
                      className="btn btn-info fw-bold text-dark px-4 py-2"
                      style={{ borderRadius: '12px', fontSize: '0.8rem', background: 'var(--cyan-electric)', border: 'none' }}
                      onClick={() => {
                        closeDrawer();
                        navigate('/admin/queue');
                      }}
                    >
                      <i className="fas fa-list-ol me-1.5"></i> XEM HÀNG ĐỢI
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Reason Modal */}
      {showCancelModal && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex', zIndex: 1060 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px' }}>
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">
                <i className="fas fa-times-circle text-danger me-2"></i>Hủy lịch hẹn của khách
              </h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setShowCancelModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body text-start py-3">
              <p className="text-secondary small">
                Bạn đang thực hiện hủy lịch hẹn cho khách hàng <strong>{cancelCustomerName}</strong>. Voucher đã sử dụng (nếu có) sẽ được hoàn trả.
              </p>
              
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">LÝ DO HỦY LỊCH HẸN *</label>
                <div className="d-flex flex-column gap-2">
                  {['Hết slot trong ngày', 'Hệ thống bảo trì', 'Khách yêu cầu hủy', 'Khác'].map((reason) => (
                    <label key={reason} className="d-flex align-items-center gap-2 p-2 rounded border bg-light cursor-pointer" style={{ fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                      />
                      <span className="text-dark fw-medium">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedReason === 'Khác' && (
                <div className="mb-3 animate-confirm-in">
                  <label className="form-label small fw-bold text-muted">NHẬP LÝ DO HỦY CHI TIẾT *</label>
                  <textarea
                    className="form-control bg-light border-0 py-2.5 text-dark"
                    rows="3"
                    maxLength="500"
                    placeholder="Vui lòng nhập lý do hủy lịch hẹn..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              )}
            </div>
            <div className="confirm-modal-footer d-flex gap-2">
              <button 
                type="button" 
                className="confirm-cancel-btn w-50" 
                onClick={() => setShowCancelModal(false)}
              >
                HỦY BỎ
              </button>
              <button 
                type="button" 
                className="btn btn-danger fw-bold text-white px-4 py-2 w-50"
                style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                onClick={submitCancel}
              >
                XÁC NHẬN HỦY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
