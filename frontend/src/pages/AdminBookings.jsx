import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/shared.css';
import '../styles/admin/admin.css';
import '../styles/admin/bookings.css';
import { adminService } from '../services/adminService';

export const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  
  // Drawer State
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Hover Preview States
  const [hoveredBookingId, setHoveredBookingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const [hoverCache, setHoverCache] = useState({});
  const [closeTimeoutId, setCloseTimeoutId] = useState(null);
  const [fetchTimeoutId, setFetchTimeoutId] = useState(null);

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
  }, [loadBookings]);

  useEffect(() => {
    return () => {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      if (closeTimeoutId) clearTimeout(closeTimeoutId);
    };
  }, [fetchTimeoutId, closeTimeoutId]);

  const loadBookingDetail = async (id) => {
    setLoadingDetail(true);
    setSelectedBookingId(id);
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

  const handleCancel = async (id, name) => {
    const performCancel = async () => {
      try {
        const res = await adminService.cancelBooking(id);
        if (res && res.success) {
          if (window.showToast) window.showToast('Đã hủy lịch đặt thành công!', 'success');
          loadBookings();
          if (selectedBookingId === id) {
            loadBookingDetail(id);
          }
        } else {
          if (window.showToast) window.showToast(res.message || 'Lỗi hủy lịch đặt', 'error');
        }
      } catch (e) {
        console.error('Cancel error', e);
        if (window.showToast) window.showToast('Lỗi hệ thống hủy lịch', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Hủy lịch đặt', `Bạn có chắc chắn muốn hủy lịch đặt cho khách hàng ${name}? Voucher đã sử dụng (nếu có) sẽ được hoàn trả.`, performCancel);
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn hủy lịch đặt cho khách hàng ${name}?`)) {
        performCancel();
      }
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
        if (window.showToast) window.showToast('Lỗi hệ thống check-in', 'error');
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
      case 'Completed': return 'Hoàn thành';
      case 'Cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Confirmed': return 'status-confirmed';
      case 'CheckedIn': return 'status-checkedin';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getPreviewStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 };
      case 'Confirmed':
        return { backgroundColor: '#DBEAFE', color: '#2563EB', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 };
      case 'CheckedIn':
        return { backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 };
      case 'Completed':
        return { backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 };
      case 'Cancelled':
        return { backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 };
      default:
        return {};
    }
  };

  const getTierBadgeClass = (tierName) => {
    const t = (tierName || '').toUpperCase();
    if (t.includes('PLATINUM')) return 'tier-pill-platinum active';
    if (t.includes('GOLD')) return 'tier-pill-gold active';
    if (t.includes('SILVER')) return 'tier-pill-silver active';
    return 'tier-pill-member active';
  };

  // Hover Handlers
  const handleCardMouseEnter = (e, bookingId) => {
    if (closeTimeoutId) {
      clearTimeout(closeTimeoutId);
      setCloseTimeoutId(null);
    }

    if (fetchTimeoutId) {
      clearTimeout(fetchTimeoutId);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    const spaceRight = window.innerWidth - rect.right;
    let left = rect.right + 10;
    if (spaceRight < 340) {
      left = rect.left - 330;
    }
    const top = rect.top + scrollTop - 10;

    const timeout = setTimeout(async () => {
      setHoveredBookingId(bookingId);
      setPreviewPos({ top, left });
      
      if (hoverCache[bookingId]) {
        setPreviewData(hoverCache[bookingId]);
        return;
      }

      setPreviewData({ loading: true });
      try {
        const res = await adminService.getBookingDetail(bookingId);
        if (res && res.success) {
          setPreviewData(res.booking);
          setHoverCache(prev => ({ ...prev, [bookingId]: res.booking }));
        } else {
          setPreviewData(null);
        }
      } catch (err) {
        console.error(err);
        setPreviewData(null);
      }
    }, 150); // 150ms debounce

    setFetchTimeoutId(timeout);
  };

  const handleCardMouseLeave = () => {
    if (fetchTimeoutId) {
      clearTimeout(fetchTimeoutId);
      setFetchTimeoutId(null);
    }

    const timeout = setTimeout(() => {
      setHoveredBookingId(null);
      setPreviewData(null);
    }, 150); // 150ms leave timeout

    setCloseTimeoutId(timeout);
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimeoutId) {
      clearTimeout(closeTimeoutId);
      setCloseTimeoutId(null);
    }
  };

  const handlePopoverMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredBookingId(null);
      setPreviewData(null);
    }, 150); // 150ms leave timeout

    setCloseTimeoutId(timeout);
  };

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    const matchesPlate = (b.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const bDate = b.scheduledAt.split('T')[0];
      matchesDate = bDate === dateFilter;
    }
    
    return matchesPlate && matchesStatus && matchesDate;
  });

  // Statistics
  const stats = {
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'CheckedIn').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    cancelled: bookings.filter(b => b.status === 'Cancelled').length
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
          <h2 className="fw-black mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>BOOKING MANAGEMENT</h2>
          <p className="text-secondary small mb-0">Manage customer appointments, approvals and check-ins.</p>
        </div>
        <button className="app-btn-primary text-dark fw-bold" onClick={loadBookings}>
          <i className="fas fa-sync-alt me-1.5"></i>TẢI LẠI
        </button>
      </div>

      {/* 2. SUMMARY DASHBOARD CARDS */}
      <div className="row g-3 mb-4 text-start">
        {/* All Bookings */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-all ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#0ea5e9' }}>{bookings.length}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>TẤT CẢ LỊCH ĐẶT</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#E0F2FE', color: '#0ea5e9' }}>
                <i className="fas fa-list fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-pending ${statusFilter === 'Pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#FA8C16' }}>{stats.pending}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>CHỜ XÁC NHẬN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#FFF7E6', color: '#FA8C16' }}>
                <i className="fas fa-clock fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmed */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-confirmed ${statusFilter === 'Confirmed' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Confirmed' ? 'ALL' : 'Confirmed')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#1677FF' }}>{stats.confirmed}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>ĐÃ XÁC NHẬN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#E6F4FF', color: '#1677FF' }}>
                <i className="fas fa-calendar-check fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Checked-In */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-checkedin ${statusFilter === 'CheckedIn' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'CheckedIn' ? 'ALL' : 'CheckedIn')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#722ED1' }}>{stats.checkedIn}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>ĐÃ CHECK-IN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#F9F0FF', color: '#722ED1' }}>
                <i className="fas fa-sign-in-alt fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-completed ${statusFilter === 'Completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'ALL' : 'Completed')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#52C41A' }}>{stats.completed}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>HOÀN THÀNH</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#F6FFED', color: '#52C41A' }}>
                <i className="fas fa-check-circle fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="col-12 col-sm-6 col-lg">
          <div 
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-cancelled ${statusFilter === 'Cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Cancelled' ? 'ALL' : 'Cancelled')}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3 className="fw-black mb-0 font-monospace" style={{ color: '#F5222D' }}>{stats.cancelled}</h3>
                <small className="text-muted d-block fw-bold mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>ĐÃ HỦY HẸN</small>
              </div>
              <div className="stat-icon-wrapper" style={{ background: '#FFF1F0', color: '#F5222D' }}>
                <i className="fas fa-times-circle fa-lg"></i>
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
              <option value="Pending">Chờ xác nhận</option>
              <option value="Confirmed">Đã xác nhận</option>
              <option value="CheckedIn">Đã check-in</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
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
                onMouseEnter={(e) => handleCardMouseEnter(e, b.bookingId)}
                onMouseLeave={handleCardMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                <div className="booking-card-row align-items-center mb-2">
                  <span className="fw-black text-cyan" style={{ fontSize: '1rem' }}>#BK-{b.bookingId}</span>
                  <span className={`booking-status-badge ${getStatusClass(b.status)}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                    {getStatusLabel(b.status)}
                  </span>
                </div>
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

      {/* Smart Hover Preview Card */}
      {hoveredBookingId && previewData && (
        <div 
          className="booking-hover-preview text-start"
          style={{ top: `${previewPos.top}px`, left: `${previewPos.left}px` }}
        >
          {previewData.loading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-cyan" role="status"></div>
              <small className="d-block text-muted mt-2" style={{ fontSize: '0.65rem' }}>Đang tải xem nhanh...</small>
            </div>
          ) : (
            <>
              <div className="fw-black text-cyan mb-0" style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>
                #BK-{previewData.bookingId}
              </div>
              <div className="small text-muted mb-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                Booking Preview
              </div>
              <div className="d-flex gap-3 mb-2 small text-secondary">
                <div>
                  <span className="text-muted small">Date: </span>
                  <span className="fw-bold text-white">{new Date(previewData.scheduledAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-muted small">Time: </span>
                  <span className="fw-bold text-white font-monospace">{new Date(previewData.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="preview-divider"></div>
              
              <div className="preview-field mb-2">
                <div className="preview-label" style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>KHÁCH HÀNG</div>
                <div className="preview-val" style={{ color: '#F8FAFC', fontWeight: '600', fontSize: '0.85rem' }}>{previewData.customer.fullName}</div>
                <small style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>{previewData.customer.phone}</small>
              </div>

              <div className="preview-field mb-2">
                <div className="preview-label" style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PHƯƠNG TIỆN</div>
                <div className="preview-val font-monospace" style={{ color: '#F8FAFC', fontWeight: '600', fontSize: '0.85rem' }}>{previewData.vehicle.licensePlate}</div>
                <small style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>{previewData.vehicle.brand} - {previewData.vehicle.model}</small>
              </div>

              <div className="preview-divider"></div>

              <div className="preview-field mb-2">
                <div className="preview-label" style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DỊCH VỤ CHÍNH</div>
                <div className="preview-val" style={{ color: '#F8FAFC', fontWeight: '600', fontSize: '0.85rem' }}>{previewData.mainService?.serviceName || 'Rửa xe tiêu chuẩn'}</div>
                {previewData.addons && previewData.addons.length > 0 && (
                  <div style={{ color: '#CBD5E1', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.3' }}>
                    <span className="text-muted small">Đi kèm: </span> {previewData.addons.map(a => a.serviceName).join(', ')}
                  </div>
                )}
              </div>

              <div className="preview-divider"></div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="preview-field mb-0">
                  <div className="preview-label" style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG THANH TOÁN</div>
                  <div style={{ color: '#38BDF8', fontWeight: '700', fontSize: '24px', lineHeight: '1.2' }}>
                    {Number(previewData.finalPrice).toLocaleString()}đ
                  </div>
                </div>
                <div className="text-end">
                  <div className="preview-label" style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TRẠNG THÁI</div>
                  <span className={`booking-status-badge d-inline-block mt-1`} style={{ ...getPreviewStatusBadgeStyle(previewData.status) }}>
                    {getStatusLabel(previewData.status).toUpperCase()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. REPLACE MODAL WITH RIGHT DRAWER */}
      <div className={`booking-drawer-overlay ${selectedBookingId ? 'show' : ''}`} onClick={closeDrawer}>
        <div className="booking-drawer text-start" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="booking-drawer-header">
            <h5 className="fw-black text-dark mb-0" style={{ letterSpacing: '-0.5px' }}>Chi tiết Lịch đặt: #{selectedBookingId}</h5>
          </div>

          {/* Body */}
          <div className="booking-drawer-body">
            {loadingDetail || !bookingDetail ? (
              renderSkeletonDrawer()
            ) : (
              <>
                {/* Section 1: Customer Information */}
                <div className="booking-drawer-section">
                  <div className="booking-drawer-section-title">Thông tin khách hàng</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    <div className="row g-2.5">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Họ tên</small>
                        <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{bookingDetail.customer.fullName}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Số điện thoại</small>
                        <strong className="text-dark font-monospace" style={{ fontSize: '0.85rem' }}>{bookingDetail.customer.phone}</strong>
                      </div>
                      <div className="col-12 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Địa chỉ email</small>
                        <span className="text-dark small">{bookingDetail.customer.email || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="col-4 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Mã loyalty</small>
                        <span className="text-cyan font-monospace fw-bold" style={{ fontSize: '0.78rem' }}>{bookingDetail.customer.membershipCode}</span>
                      </div>
                      <div className="col-4 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Hạng TV</small>
                        <span className={getTierBadgeClass(bookingDetail.customer.tierName)}>{bookingDetail.customer.tierName}</span>
                      </div>
                      <div className="col-4 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Điểm tích lũy</small>
                        <strong className="text-dark small">{bookingDetail.customer.pointBalance.toLocaleString()} PTS</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehicle Information */}
                <div className="booking-drawer-section">
                  <div className="booking-drawer-section-title">Thông tin phương tiện</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    <div className="row g-2.5">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Biển số xe</small>
                        <strong className="text-dark font-monospace" style={{ fontSize: '0.9rem' }}>{bookingDetail.vehicle.licensePlate}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Phân khúc xe</small>
                        <span className="text-dark small fw-bold">{bookingDetail.vehicle.vehicleClass}</span>
                      </div>
                      <div className="col-6 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Hãng xe</small>
                        <span className="text-dark small">{bookingDetail.vehicle.brand}</span>
                      </div>
                      <div className="col-6 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Dòng xe (Model)</small>
                        <span className="text-dark small">{bookingDetail.vehicle.model}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Appointment Information */}
                <div className="booking-drawer-section">
                  <div className="booking-drawer-section-title">Thông tin lịch trình</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    <div className="row g-2.5">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Ngày đặt hẹn</small>
                        <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{new Date(bookingDetail.scheduledAt).toLocaleDateString('vi-VN')}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Giờ đặt hẹn</small>
                        <strong className="text-dark font-monospace" style={{ fontSize: '0.85rem' }}>{new Date(bookingDetail.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                      </div>
                      <div className="col-6 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Ngày tạo đơn</small>
                        <span className="text-secondary small">{new Date(bookingDetail.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="col-6 border-top pt-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Trạng thái hiện tại</small>
                        <span className={`booking-status-badge d-inline-block mt-0.5 ${getStatusClass(bookingDetail.status)}`}>
                          {getStatusLabel(bookingDetail.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Service Information */}
                <div className="booking-drawer-section">
                  <div className="booking-drawer-section-title">Chi tiết dịch vụ đã chọn</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    {bookingDetail.mainService ? (
                      <div className="d-flex justify-content-between align-items-center mb-2 small">
                        <span className="text-dark fw-bold"><i className="fas fa-cog text-cyan me-1.5"></i>{bookingDetail.mainService.serviceName} (Chính)</span>
                        <strong className="text-dark">{Number(bookingDetail.mainService.price).toLocaleString()}đ</strong>
                      </div>
                    ) : (
                      <div className="small text-secondary">Không có dịch vụ chính</div>
                    )}
                    
                    {bookingDetail.addons && bookingDetail.addons.length > 0 && (
                      <div className="mt-2 pt-2 border-top">
                        <small className="text-muted d-block mb-2 fw-bold">DỊCH VỤ ĐI KÈM (ADD-ONS)</small>
                        {bookingDetail.addons.map((add, idx) => (
                          <div key={idx} className="d-flex justify-content-between align-items-center mb-1.5 small">
                            <span className="text-secondary"><i className="fas fa-plus text-muted me-1.5"></i>{add.serviceName}</span>
                            <span className="text-dark">{Number(add.price).toLocaleString()}đ</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Voucher Information */}
                <div className="booking-drawer-section">
                  <div className="booking-drawer-section-title">Voucher & Khuyến mãi</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    {bookingDetail.voucher ? (
                      <div className="d-flex justify-content-between align-items-start small">
                        <div>
                          <strong className="text-danger"><i className="fas fa-ticket-alt me-1.5"></i>{bookingDetail.voucher.rewardName}</strong>
                          <span className="text-muted d-block mt-0.5" style={{ fontSize: '0.68rem' }}>{bookingDetail.voucher.description || 'Không có mô tả.'}</span>
                        </div>
                        <strong className="text-danger">-{Number(bookingDetail.voucher.discountValue).toLocaleString()}đ</strong>
                      </div>
                    ) : (
                      <div className="small text-secondary text-center py-1">Không có voucher nào được áp dụng</div>
                    )}
                  </div>
                </div>

                {/* Section 6: Payment Summary */}
                <div className="booking-drawer-section mb-0">
                  <div className="booking-drawer-section-title">Tổng kết chi phí</div>
                  <div className="bg-light p-3.5 rounded-4 border">
                    <div className="d-flex justify-content-between align-items-center mb-2 small text-secondary">
                      <span>Giá dịch vụ gốc:</span>
                      <span>{Number(bookingDetail.basePrice).toLocaleString()}đ</span>
                    </div>
                    {bookingDetail.voucher && (
                      <div className="d-flex justify-content-between align-items-center mb-2 small text-danger">
                        <span>Giảm giá khuyến mãi:</span>
                        <span>-{Number(bookingDetail.voucher.discountValue).toLocaleString()}đ</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-center border-top pt-2 fs-6 fw-bold">
                      <span className="text-dark">Số tiền cần trả:</span>
                      <span className="text-cyan">{Number(bookingDetail.finalPrice).toLocaleString()}đ</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 small text-success">
                      <span>Điểm Loyalty tích lũy (dự kiến):</span>
                      <span>+{bookingDetail.pointsEarned} PTS</span>
                    </div>
                  </div>
                </div>

                {bookingDetail.notes && (
                  <div className="mt-3">
                    <small className="text-muted d-block fw-bold mb-1">GHI CHÚ / YÊU CẦU ĐẶC BIỆT</small>
                    <div className="p-3 border rounded text-secondary bg-white small">
                      {bookingDetail.notes}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {bookingDetail && ['Pending', 'Confirmed', 'CheckedIn'].includes(bookingDetail.status) && (
            <div className="booking-drawer-footer">
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
                      DƯYỆT LỊCH HẸN
                    </button>
                  </>
                )}
                
                {bookingDetail.status === 'Confirmed' && (
                  <>
                    <button
                      className="btn btn-danger fw-bold text-white px-4 py-2"
                      style={{ borderRadius: '12px', fontSize: '0.8rem' }}
                      onClick={() => handleCancel(bookingDetail.bookingId, bookingDetail.customer.fullName)}
                    >
                      HỦY LỊCH HẸN
                    </button>
                    <button
                      className="btn btn-info fw-bold text-dark px-4 py-2"
                      style={{ borderRadius: '12px', fontSize: '0.8rem', background: 'var(--cyan-electric)', border: 'none' }}
                      onClick={() => handleCheckIn(bookingDetail.bookingId, bookingDetail.vehicle.licensePlate)}
                    >
                      CHECK-IN NGAY
                    </button>
                  </>
                )}

                {bookingDetail.status === 'CheckedIn' && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;
