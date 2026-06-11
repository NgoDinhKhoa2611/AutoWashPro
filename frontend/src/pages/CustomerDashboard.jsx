import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/dashboard.css';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Xin chào');
  const [weatherStatus, setWeatherStatus] = useState('');
  const [activeBooking, setActiveBooking] = useState(null);
  const [washStep, setWashStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [washHistoryCount, setWashHistoryCount] = useState(0);
  const [vouchersUsedCount, setVouchersUsedCount] = useState(0);

  useEffect(() => {
    // 1. Greeting header based on hour
    const hour = new Date().getHours();
    const prefix = hour >= 5 && hour < 12
      ? 'Chào buổi sáng ☀️'
      : hour >= 12 && hour < 18
        ? 'Chào buổi chiều 🌤️'
        : 'Chào buổi tối 🌙';
    setGreeting(prefix);

    // 2. Weather status chip
    const statuses = [
      'Thời tiết hôm nay rất ráo, cực kỳ thích hợp để đi chăm sóc và bảo vệ xế yêu! ☀️🚗',
      'Đo độ ẩm tương đối dễ chịu, ghé trạm rửa xe nhận diện LPR siêu tốc chỉ 5 phút! 🌤️✨',
      'Hôm nay trời có thể nhiều bụi mịn, đặt trước lịch hẹn rửa xe để tránh chờ đợi! 🌪️💧',
      'Làn rửa xe thông minh đang thông thoáng, camera quét biển số mở 24/7 đón bạn! ⚡🛡'
    ];
    const index = new Date().getDate() % statuses.length;
    setWeatherStatus(statuses[index]);

    // 3. Fetch active booking from API
    const fetchActiveBooking = async () => {
      try {
        const response = await customerService.getActiveBooking();
        if (response && response.success) {
          if (response.booking) {
            setActiveBooking(response.booking);
            setWashStep(response.washStep || 0);
          } else {
            setActiveBooking(null);
          }
        } else {
          setActiveBooking(null);
        }
      } catch (err) {
        console.error(err);
        setActiveBooking(null);
      }
    };

    // 4. Load dashboard data
    const loadDashboardData = async () => {
      fetchActiveBooking();

      // Vehicles
      try {
        const response = await customerService.getVehicles();
        if (response && response.success && response.vehicles) {
          setVehicles(response.vehicles);
        } else {
          setVehicles([]);
        }
      } catch (err) {
        console.error(err);
        setVehicles([]);
      }

      // Vouchers
      try {
        const response = await customerService.getVouchers();
        if (response && response.success && response.vouchers) {
          setClaimedVouchers(response.vouchers);
          setVouchersUsedCount(response.vouchers.filter(v => v.status === 2).length);
        } else {
          setClaimedVouchers([]);
          setVouchersUsedCount(0);
        }
      } catch (err) {
        console.error(err);
        setClaimedVouchers([]);
        setVouchersUsedCount(0);
      }

      // Wash history count
      try {
        const response = await customerService.getWashHistory();
        if (response && response.success && response.history) {
          setWashHistoryCount(response.history.length);
        } else {
          setWashHistoryCount(0);
        }
      } catch (err) {
        console.error(err);
        setWashHistoryCount(0);
      }

      // Notifications
      try {
        const response = await customerService.getNotifications();
        if (response && response.success && response.notifications) {
          setNotifications(response.notifications);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error(err);
        setNotifications([]);
      }
    };

    loadDashboardData();

    // dynamic polling for active booking status every 5 seconds
    const interval = setInterval(() => {
      fetchActiveBooking();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const markNotifRead = async (id) => {
    try {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        await customerService.markNotificationAsRead(numericId);
      }
    } catch (e) {
      console.error(e);
    }
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
  };

  const getTierDetails = (tierName) => {
    const t = (tierName || '').toUpperCase();
    if (t.includes('PLATINUM')) {
      return {
        icon: 'fa-crown',
        bg: 'rgba(2, 132, 199, 0.12)',
        color: '#0284c7',
        perk: 'Đặc quyền tích điểm x1.5 dịch vụ',
        cardClass: 'tier-platinum'
      };
    } else if (t.includes('GOLD')) {
      return {
        icon: 'fa-award',
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#f59e0b',
        perk: 'Đặc quyền tích điểm x1.2 dịch vụ',
        cardClass: 'tier-gold'
      };
    } else if (t.includes('SILVER')) {
      return {
        icon: 'fa-medal',
        bg: 'rgba(148, 163, 184, 0.12)',
        color: '#64748b',
        perk: 'Đặc quyền tích điểm x1.1 dịch vụ',
        cardClass: 'tier-silver'
      };
    } else {
      return {
        icon: 'fa-user',
        bg: 'rgba(15, 23, 42, 0.05)',
        color: '#475569',
        perk: 'Tích lũy điểm thưởng theo lượt',
        cardClass: 'tier-standard'
      };
    }
  };

  // Progression calculation based on Silver (100-499), Gold (500-999), Platinum (1000+)
  const calculateProgress = () => {
    const currentPts = user?.points ?? 0;
    const rawTier = user?.tier || 'Standard Member';
    let tierName = rawTier;
    if (rawTier === 'Member' || rawTier === 'Standard') {
      tierName = 'Standard Member';
    } else if (rawTier === 'Silver') {
      tierName = 'Silver Member';
    } else if (rawTier === 'Gold') {
      tierName = 'Gold Member';
    } else if (rawTier === 'Platinum') {
      tierName = 'Platinum Member';
    }
    
    if (tierName.toUpperCase().includes('PLATINUM')) {
      return {
        pct: 100,
        label: 'HẠNG CAO NHẤT',
        next: 'Platinum VIP',
        rem: 'Bạn đã đạt hạng Bạch Kim cao nhất!'
      };
    } else if (tierName.toUpperCase().includes('GOLD')) {
      const start = 500;
      const target = 1000;
      const pct = Math.min(Math.max(((currentPts - start) / (target - start)) * 100, 0), 99); // max 99% if not reached
      const rem = Math.max(target - currentPts, 0);
      return {
        pct: Math.round(pct),
        label: `${currentPts}/${target} điểm`,
        next: 'Platinum',
        rem: `Còn ${rem} điểm để lên Platinum`
      };
    } else if (tierName.toUpperCase().includes('SILVER')) {
      const start = 100;
      const target = 500;
      const pct = Math.min(Math.max(((currentPts - start) / (target - start)) * 100, 0), 99); // max 99% if not reached
      const rem = Math.max(target - currentPts, 0);
      return {
        pct: Math.round(pct),
        label: `${currentPts}/${target} điểm`,
        next: 'Gold',
        rem: `Còn ${rem} điểm để lên Gold`
      };
    } else {
      const start = 0;
      const target = 100;
      const pct = Math.min(Math.max(((currentPts - start) / (target - start)) * 100, 0), 99); // max 99% if not reached
      const rem = Math.max(target - currentPts, 0);
      return {
        pct: Math.round(pct),
        label: `${currentPts}/${target} điểm`,
        next: 'Silver',
        rem: `Còn ${rem} điểm để lên Silver`
      };
    }
  };

  // Generate steps list dynamically based on booking addons
  const getDynamicSteps = () => {
    if (!activeBooking) return [];
    return [
      'Nhận diện LPR',
      'Rửa bọt tuyết',
      ...(activeBooking.addons || []),
      'Sấy khô',
      'Hoàn tất'
    ];
  };

  const steps = getDynamicSteps();
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 1 ? Math.min(100, Math.round((washStep / (totalSteps - 1)) * 100)) : 0;
  
  // Calculate text progress bar like "███████░░░░ 45%"
  const renderTextProgressBar = (pct) => {
    const totalChars = 10;
    const filledChars = Math.round((pct / 100) * totalChars);
    const emptyChars = totalChars - filledChars;
    return '█'.repeat(filledChars) + '░'.repeat(emptyChars) + ` ${pct}%`;
  };

  // Calculate ETA dynamically (e.g. 5 mins per remaining step)
  const remainingSteps = activeBooking ? Math.max(0, totalSteps - 1 - washStep) : 0;
  const minutesLeft = remainingSteps * 5;
  const etaText = washStep === totalSteps - 1 ? 'Đã xong' : `${minutesLeft} phút`;

  const points = user?.points ?? 0;
  const rawTier = user?.tier || 'Standard Member';
  let tier = rawTier;
  if (rawTier === 'Member' || rawTier === 'Standard') {
    tier = 'Standard Member';
  } else if (rawTier === 'Silver') {
    tier = 'Silver Member';
  } else if (rawTier === 'Gold') {
    tier = 'Gold Member';
  } else if (rawTier === 'Platinum') {
    tier = 'Platinum Member';
  }
  const displayTier = tier === 'Standard Member' ? 'Standard Member' : tier.replace(' Member', ' Loyalty');
  const tierInfo = getTierDetails(tier);
  const progression = calculateProgress();

  const activeVouchers = claimedVouchers.filter(v => v.status === 1);
  const displayedNotifications = showAllNotifs ? notifications : notifications.slice(0, 3);

  const typeIcons = {
    points: 'fa-coins text-warning',
    status: 'fa-car-side text-info',
    info: 'fa-info-circle text-primary'
  };

  return (
    <div className="container-fluid pt-2 pb-3 px-2 px-lg-3">
      {/* Concierge Greeting */}
      <div className="row mb-3">
        <div className="col-12 text-start">
          <h3 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)', letterSpacing: '-0.5px' }}>
            {greeting}, {user?.name || 'Khách hàng'}!
          </h3>
          <p className="text-secondary small mb-0" style={{ fontSize: '0.82rem' }}>
            {weatherStatus}
          </p>
        </div>
      </div>

      {/* ── TOP SUMMARY CARDS (4 horizontally aligned widgets) ── */}
      <div className="row g-3 mb-4">
        {/* Card 1: Xe của tôi */}
        <div className="col-6 col-md-3">
          <Link to="/customer/vehicles" className="app-card summary-widget-card">
            <div className="summary-icon-wrapper" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <i className="fas fa-motorcycle"></i>
            </div>
            <div className="text-start">
              <span className="summary-title">Xe của tôi</span>
              <div className="summary-value">{vehicles.length} Phương tiện</div>
            </div>
          </Link>
        </div>

        {/* Card 2: Voucher khả dụng */}
        <div className="col-6 col-md-3">
          <Link to="/customer/loyalty" className="app-card summary-widget-card">
            <div className="summary-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="text-start">
              <span className="summary-title">Voucher khả dụng</span>
              <div className="summary-value">{activeVouchers.length || 0} Voucher</div>
            </div>
          </Link>
        </div>

        {/* Card 3: Lịch hẹn sắp tới */}
        <div className="col-6 col-md-3">
          <a
            href="#upcoming-appointment-widget"
            className="app-card summary-widget-card"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('upcoming-appointment-widget');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="summary-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="text-start">
              <span className="summary-title">Lịch hẹn sắp tới</span>
              <div className="summary-value">{activeBooking ? '1 Lịch hẹn' : '0 Lịch hẹn'}</div>
            </div>
          </a>
        </div>

        {/* Card 4: Tổng lượt rửa */}
        <div className="col-6 col-md-3">
          <Link to="/customer/history" className="app-card summary-widget-card">
            <div className="summary-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4' }}>
              <i className="fas fa-hands-wash"></i>
            </div>
            <div className="text-start">
              <span className="summary-title">Tổng lượt rửa</span>
              <div className="summary-value">{washHistoryCount} Lượt rửa</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="row g-4">
        {/* ── LEFT COLUMN: MAIN OPERATIONS (col-lg-8) ── */}
        <div className="col-lg-8">
          
          {/* 1. Garage xe của tôi */}
          <div className="app-card border-0 p-4 mb-4 text-start">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
                <i className="fas fa-motorcycle text-cyan me-2"></i>GARAGE XE CỦA TÔI
              </h5>
              <Link to="/customer/vehicles" className="compact-action-link">
                Quản lý garage ➔
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-4 text-muted small" style={{ background: '#f8fafc', borderRadius: '14px', border: '1px dashed #e2e8f0' }}>
                <p className="mb-3">Bạn chưa đăng ký phương tiện nào</p>
                <Link to="/customer/vehicles" className="app-btn-primary px-3 py-2 text-dark fw-bold text-decoration-none d-inline-block" style={{ fontSize: '0.75rem', borderRadius: '8px' }}>
                  + Thêm phương tiện đầu tiên
                </Link>
              </div>
            ) : vehicles.length === 1 ? (
              // If only 1 vehicle
              <div className="p-3 rounded-4 border bg-light bg-opacity-50">
                <div className="row align-items-center">
                  <div className="col-sm-6 mb-2 mb-sm-0">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', color: '#64748b' }}>
                        <i className="fas fa-motorcycle fa-lg"></i>
                      </div>
                      <div>
                        <div className="fw-bold font-monospace text-dark" style={{ fontSize: '1rem' }}>{vehicles[0].plate}</div>
                        <small className="text-secondary">{vehicles[0].type}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-3 col-6 text-start">
                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>LẦN RỬA GẦN NHẤT</small>
                    <span className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>{vehicles[0].lastWash || 'Chưa có'}</span>
                  </div>
                  <div className="col-sm-3 col-6 text-start">
                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>TỔNG SỐ LƯỢT RỬA</small>
                    <span className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>{vehicles[0].totalWashes || 0} lượt rửa</span>
                  </div>
                </div>
              </div>
            ) : (
              // If multiple vehicles
              <div className="row g-2">
                {vehicles.map((v, idx) => (
                  <div key={idx} className="col-sm-6">
                    <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 border bg-white" style={{ borderColor: '#e2e8f0' }}>
                      <div className="d-flex align-items-center gap-2">
                        <i className="fas fa-motorcycle text-secondary" style={{ fontSize: '0.85rem' }}></i>
                        <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.8rem' }}>{v.plate}</span>
                      </div>
                      <span className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: '0.65rem' }}>{v.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Ví Voucher Khả Dụng */}
          <div className="app-card border-0 p-4 mb-4 text-start">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
                <i className="fas fa-ticket-alt text-cyan me-2"></i>VÍ VOUCHER KHẢ DỤNG
              </h5>
              <Link to="/customer/loyalty" className="compact-action-link">
                Đổi thêm voucher ➔
              </Link>
            </div>
            {activeVouchers.length === 0 ? (
              <div className="text-center py-4 text-muted small" style={{ fontSize: '0.8rem', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #e2e8f0' }}>
                Bạn chưa có voucher khả dụng nào.{' '}
                <Link to="/customer/loyalty" className="text-cyan text-decoration-none fw-bold">Đổi điểm lấy quà ngay</Link>
              </div>
            ) : (
              <div className="row g-3">
                {activeVouchers.map((v, idx) => (
                  <div key={idx} className="col-sm-4">
                    <div className="p-2.5 rounded-4 border d-flex align-items-center justify-content-between bg-white" style={{ borderColor: 'rgba(2, 132, 199, 0.15)', background: 'rgba(2, 132, 199, 0.01)' }}>
                      <div className="overflow-hidden">
                        <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.78rem', maxWidth: '140px' }}>{v.title}</div>
                        <small className="text-muted font-monospace d-block" style={{ fontSize: '0.65rem' }}>{v.code}</small>
                      </div>
                      <Link to="/customer/loyalty" className="badge bg-success bg-opacity-10 text-success text-decoration-none fw-bold" style={{ fontSize: '0.62rem', padding: '6px 10px', borderRadius: '6px' }}>
                        DÙNG
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Thống Kê & Voucher (merged — moved from right column) */}
          <div className="app-card border-0 p-3 mb-4 text-start">
            <h5 className="fw-bold mb-2 text-dark" style={{ fontSize: '0.88rem' }}>
              <i className="fas fa-chart-bar text-cyan me-2"></i>THỐNG KÊ CÁ NHÂN
            </h5>
            <div className="personal-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="personal-stat-box">
                <div className="personal-stat-icon" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
                  <i className="fas fa-hands-wash"></i>
                </div>
                <span className="personal-stat-num">{washHistoryCount}</span>
                <span className="personal-stat-text">Lượt rửa xe</span>
              </div>
              <div className="personal-stat-box">
                <div className="personal-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <span className="personal-stat-num">{vouchersUsedCount}</span>
                <span className="personal-stat-text">Voucher đã dùng</span>
              </div>
              <div className="personal-stat-box">
                <div className="personal-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
                  <i className="fas fa-award"></i>
                </div>
                <span className="personal-stat-num">{points}</span>
                <span className="personal-stat-text">Điểm tích luỹ</span>
              </div>
              <div className="personal-stat-box">
                <div className="personal-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6' }}>
                  <i className="fas fa-motorcycle"></i>
                </div>
                <span className="personal-stat-num">{vehicles.length}</span>
                <span className="personal-stat-text">Xe quản lý</span>
              </div>
            </div>

            <hr className="my-3 opacity-50" />

            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.88rem' }}>
                <i className="fas fa-hourglass-end text-danger me-2"></i>VOUCHER GẦN HẾT HẠN
              </h5>
            </div>
            {activeVouchers.length === 0 ? (
              <div className="text-center py-2 text-muted small" style={{ background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0', fontSize: '0.75rem' }}>
                Không có voucher nào sắp hết hạn
              </div>
            ) : (
              <div className="ticket-dashed-box" style={{ borderLeft: '4px solid #dc2626' }}>
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.8rem' }}>{activeVouchers[0].title}</div>
                    <small className="text-secondary d-block" style={{ fontSize: '0.68rem' }}>Mã: {activeVouchers[0].code}</small>
                  </div>
                  <span className="badge bg-danger text-white fw-bold px-2 py-1" style={{ fontSize: '0.62rem' }}>
                    Còn {activeVouchers[0].code === 'WELCOME10' ? '30' : '29'} ngày
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Live Wash Tracking (Tesla Car Care Premium design - 100% dynamic timeline) */}
          {activeBooking && activeBooking.hasQueue && (
            <div className="app-card border-0 p-4 mb-4 text-start" style={{ borderLeft: '4px solid #0ea5e9' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="pulse-dot-washing"></div>
                  <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
                    TIẾN ĐỘ RỬA XE TRỰC TIẾP
                  </h5>
                </div>
                <span className="badge bg-info bg-opacity-10 text-cyan px-2.5 py-1 rounded-pill small fw-bold">
                  Làn LPR
                </span>
              </div>

              {/* Tesla Dashboard Style Layout */}
              <div className="p-3 rounded-4 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="row">
                  <div className="col-sm-6 mb-2.5 mb-sm-0">
                    <small className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>XE ĐANG RỬA</small>
                    <strong className="text-dark font-monospace" style={{ fontSize: '1rem' }}>{activeBooking.vehicle}</strong>
                  </div>
                  <div className="col-sm-6 text-sm-end mb-2.5 mb-sm-0">
                    <small className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>GÓI DỊCH VỤ</small>
                    <strong className="text-dark">{activeBooking.mainService}</strong>
                  </div>
                  <div className="col-sm-6 mb-2.5 mb-sm-0 mt-sm-2">
                    <small className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>NHÂN VIÊN PHỤ TRÁCH</small>
                    <strong className="text-dark"><i className="far fa-user me-1"></i>{activeBooking.staffName || 'Nguyễn Văn A'}</strong>
                  </div>
                  <div className="col-sm-6 text-sm-end mt-sm-2">
                    <small className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>THỜI GIAN CÒN LẠI (ETA)</small>
                    <strong className="text-cyan">{etaText}</strong>
                  </div>
                </div>
                <hr className="my-2" style={{ borderStyle: 'dashed' }} />
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-secondary fw-bold" style={{ fontSize: '0.68rem' }}>TIẾN ĐỘ THỰC TẾ</small>
                  <strong className="font-monospace text-dark" style={{ fontSize: '0.82rem' }}>
                    {renderTextProgressBar(progressPercent)}
                  </strong>
                </div>
              </div>

              {/* Dynamic Service Timeline Flow */}
              <div className="d-flex flex-column gap-2 mb-2">
                {steps.map((name, i) => {
                  const isCompleted = i < washStep;
                  const isActive = i === washStep;
                  
                  const iconElement = isCompleted
                    ? <i className="fas fa-check-circle text-success me-2 fs-6"></i>
                    : isActive
                      ? <i className="fas fa-spinner fa-spin text-primary me-2 fs-6"></i>
                      : <i className="far fa-circle text-muted me-2 fs-6"></i>;
                  let itemBg = 'rgba(15, 23, 42, 0.01)';
                  let itemBorder = 'rgba(15, 23, 42, 0.03)';
                  let labelClass = 'text-muted';
                  let badgeText = 'Chờ';
                  let badgeClass = 'bg-secondary bg-opacity-10 text-muted';

                  if (isCompleted) {
                    labelClass = 'text-secondary text-decoration-line-through';
                    badgeText = 'Xong';
                    badgeClass = 'bg-success bg-opacity-10 text-success';
                  } else if (isActive) {
                    itemBg = 'rgba(14, 165, 233, 0.03)';
                    itemBorder = 'rgba(14, 165, 233, 0.2)';
                    labelClass = 'text-dark fw-bold';
                    badgeText = 'Đang chạy';
                    badgeClass = 'bg-info bg-opacity-10 text-cyan';
                  }

                  return (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-between p-2.5 rounded-3"
                      style={{
                        background: itemBg,
                        border: `1px solid ${itemBorder}`
                      }}
                    >
                      <div className="d-flex align-items-center">
                        {iconElement}
                        <span className={`small ${labelClass}`} style={{ fontSize: '0.8rem' }}>
                          {name}
                        </span>
                      </div>
                      <span className={`badge ${badgeClass} px-2.5 py-1 fw-bold`} style={{ fontSize: '0.6rem', borderRadius: '5px' }}>
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Nhật Ký Thông Báo */}
          <div className="app-card border-0 p-4 mb-4 timeline-feed-widget text-start">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
                <i className="fas fa-concierge-bell text-cyan me-2"></i>NHẬT KÝ THÔNG BÁO
              </h5>
              {notifications.length > 3 && (
                <button
                  className="btn btn-link p-0 text-cyan text-decoration-none small fw-bold"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setShowAllNotifs(!showAllNotifs)}
                >
                  {showAllNotifs ? 'Thu gọn' : `Xem tất cả (${notifications.length})`}
                </button>
              )}
            </div>

            <div className="position-relative d-flex flex-column gap-2" style={{ minHeight: '100px' }}>
              <div className="notif-timeline-line"></div>
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  Không có thông báo hoạt động nào
                </div>
              ) : (
                displayedNotifications.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item-saas ${n.read ? '' : 'unread'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => markNotifRead(n.id)}
                  >
                    <div className="notif-icon-circle">
                      <i className={`fas ${typeIcons[n.type] || 'fa-bell text-muted'}`}></i>
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex justify-content-between align-items-center mb-0.5">
                        <span className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>{n.title}</span>
                        <small className="text-muted" style={{ fontSize: '0.62rem' }}>{n.time}</small>
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{n.body}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: SIDEBAR WIDGETS (col-lg-4) ── */}
        <div className="col-lg-4">
          
          {/* 1. AutoWash Loyalty Card */}
          <div className="app-card border-0 p-4 mb-4 text-start">
            <h6 className="fw-bold text-secondary mb-3 small" style={{ letterSpacing: '0.5px' }}>AUTOWASH LOYALTY</h6>
            
            <div className={`loyalty-card-3d ${tierInfo.cardClass} mb-3`} id="member-card">
              <div className="loyalty-card-glass-glow"></div>
              <div className="d-flex justify-content-between align-items-start">
                <span className="loyalty-card-badge">
                  <i className="fas fa-crown"></i>
                  {displayTier}
                </span>
                <i className="fas fa-satellite-dish text-white opacity-40 animate-pulse"></i>
              </div>
              
              <div className="my-2">
                <span className="loyalty-card-points-label">ĐIỂM HIỆN TẠI</span>
                <div className="loyalty-card-points">
                  <span id="dashboard-points">{points.toLocaleString()}</span>{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>PTS</span>
                </div>
              </div>
              
              <div className="loyalty-progress-container">
                <div className="d-flex justify-content-between align-items-center mb-1 text-white" style={{ fontSize: '0.68rem', fontWeight: 'bold' }}>
                  <span>Tiến độ lên {progression.next}</span>
                  <span>{progression.pct}%</span>
                </div>
                <div className="progress" style={{ height: '6px', background: 'rgba(255,255,255,0.22)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div className="progress-bar bg-white" role="progressbar" style={{ width: `${progression.pct}%`, borderRadius: '10px' }}></div>
                </div>
              </div>
            </div>

            {/* Loyalty Perks Description */}
            <div className="p-2.5 rounded-3 d-flex align-items-center gap-2.5 mb-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm border" style={{ width: '32px', height: '32px', color: tierInfo.color, flexShrink: 0 }}>
                <i className={`fas ${tierInfo.icon}`} style={{ fontSize: '0.8rem' }}></i>
              </div>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
                <span className="fw-bold text-dark d-block">Quyền lợi {displayTier}</span>
                <span className="text-secondary" style={{ fontSize: '0.68rem' }}>{tierInfo.perk}</span>
              </div>
            </div>

            <p className="text-muted small mt-2 mb-0 text-center px-1" style={{ fontSize: '0.68rem', lineHeight: '1.4', fontWeight: 600 }}>
              {progression.rem}
            </p>
          </div>

          {/* 2. Lịch Hẹn Tiếp Theo */}
          <div className="app-card border-0 p-4 mb-4 text-start" id="upcoming-appointment-widget">
            <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-calendar-alt text-cyan me-2"></i>LỊCH HẸN TIẾP THEO
            </h5>

            {activeBooking ? (
              <div className="p-3 rounded-4 border bg-light bg-opacity-50">
                <div className="d-flex align-items-start gap-2.5 mb-3">
                  <div className="appointment-badge-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>Hôm nay, {activeBooking.bookingDate ? activeBooking.bookingDate.split('-').reverse().join('/') : '31/05/2026'}</div>
                    <span className="badge bg-cyan bg-opacity-10 text-cyan font-monospace mt-1" style={{ fontSize: '0.7rem' }}>
                      {activeBooking.bookingTime}
                    </span>
                  </div>
                </div>
                <div className="mb-3 small">
                  <div className="text-secondary mb-1">
                    <i className="fas fa-hands-wash me-1.5 text-muted"></i>
                    Dịch vụ: <strong className="text-dark">{activeBooking.mainService}</strong>
                  </div>
                  <div className="text-secondary mb-1">
                    <i className="fas fa-motorcycle me-1.5 text-muted"></i>
                    Biển số: <strong className="text-dark font-monospace">{activeBooking.vehicle}</strong>
                  </div>
                  <div className="text-secondary">
                    <i className="fas fa-info-circle me-1.5 text-muted"></i>
                    Trạng thái: <strong className="text-success">Đã xác nhận</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 rounded-4 border bg-light bg-opacity-50">
                <i className="far fa-calendar-minus text-muted opacity-40 fa-2x mb-2"></i>
                <h6 className="fw-bold text-dark small mb-1">Chưa có lịch hẹn nào</h6>
                <p className="text-secondary small mb-3 px-3" style={{ fontSize: '0.7rem' }}>Lên lịch rửa ngay để trải nghiệm quy trình nhận diện LPR cực nhanh.</p>
                <Link
                  to="/customer/booking"
                  className="app-btn-primary text-dark fw-bold text-decoration-none d-inline-block"
                  style={{
                    fontSize: '0.75rem',
                    padding: '8px 22px',
                    borderRadius: '10px',
                    width: 'auto',
                    minWidth: '160px',
                    letterSpacing: '0.4px'
                  }}
                >
                  ĐẶT LỊCH NGAY <i className="fas fa-arrow-right ms-1"></i>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
