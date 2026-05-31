import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared.css';
import '../styles/customer/dashboard.css';

const STEP_BADGES = [
  'Đã nhận diện LPR',
  'Đang phun rửa vỏ',
  'Đang sấy khí áp lực',
  'Đã rửa sạch & Check-out'
];

const STEP_NAMES = [
  'Nhận diện LPR tự động',
  'Rửa bọt tuyết vỏ xe',
  'Sấy khô khí nén cao áp',
  'Hoàn tất & Checkout xe'
];

export const CustomerDashboard = () => {
  const { user, updateUser } = useAuth();
  const [greeting, setGreeting] = useState('Xin chào');
  const [weatherStatus, setWeatherStatus] = useState('');
  const [activeBooking, setActiveBooking] = useState(null);
  const [washStep, setWashStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 1. Concierge Greeting
    const hour = new Date().getHours();
    let prefix = 'Xin chào';
    if (hour >= 5 && hour < 12) prefix = 'Chào buổi sáng ☀️';
    else if (hour >= 12 && hour < 18) prefix = 'Chào buổi chiều 🌤️';
    else prefix = 'Chào buổi tối 🌙';
    setGreeting(prefix);

    // 2. Weather status
    const statuses = [
      'Thời tiết nắng ráo lý tưởng để rửa xe hôm nay! ☀️✨',
      'Trời dịu mát thích hợp dưỡng nhựa nhám và wax bóng! 🌤️🛡️',
      'Độ ẩm cao - Rửa sấy khí áp lực giữ bóng sơn hiệu quả! 💧✨',
      'Hàng đợi VIP đang mở - Đặt lịch rửa nhanh chỉ mất 30s! ⚡🚗'
    ];
    const index = new Date().getDate() % statuses.length;
    setWeatherStatus(statuses[index]);

    // 3. Load data
    const loadDashboardData = () => {
      // Booking
      const activeStr = localStorage.getItem('active_booking');
      if (activeStr) {
        try {
          setActiveBooking(JSON.parse(activeStr));
          setWashStep(Number(localStorage.getItem('wash_step') || 0));
        } catch (e) {
          setActiveBooking(null);
        }
      } else {
        setActiveBooking(null);
      }

      // Vehicles
      let savedVehicles = [];
      try {
        savedVehicles = JSON.parse(localStorage.getItem('user_vehicles') || '[]');
      } catch (e) {}
      if (savedVehicles.length === 0) {
        savedVehicles = [
          { plate: '51G - 123.45', type: 'Honda Vision' },
          { plate: '51A - 999.99', type: 'SH Mode' }
        ];
        localStorage.setItem('user_vehicles', JSON.stringify(savedVehicles));
      }
      setVehicles(savedVehicles);

      // Points & Tier Sync with LocalStorage
      const pts = Number(localStorage.getItem('user_points') || 550);
      const tier = localStorage.getItem('user_tier') || 'Gold Member';
      const nextTier = localStorage.getItem('user_next_tier') || 'Platinum';
      const remaining = localStorage.getItem('user_remaining_spend') || '250k';

      if (user && (user.points !== pts || user.tier !== tier)) {
        updateUser({ points: pts, tier });
      }

      // Notifications
      try {
        const savedNotifs = localStorage.getItem('user_notifications');
        if (savedNotifs) {
          setNotifications(JSON.parse(savedNotifs));
        }
      } catch (e) {}
    };

    loadDashboardData();
    window.addEventListener('storage', loadDashboardData);

    return () => {
      window.removeEventListener('storage', loadDashboardData);
    };
  }, []);

  const markNotifRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem('user_notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const getTierDetails = (tierName) => {
    const t = (tierName || '').toUpperCase();
    if (t.includes('PLATINUM')) {
      return {
        icon: 'fa-crown',
        bg: 'rgba(14, 165, 233, 0.12)',
        color: '#0ea5e9',
        perk: 'Đặc quyền nhân hệ số x1.5 điểm',
        cardClass: 'tier-platinum'
      };
    } else if (t.includes('GOLD')) {
      return {
        icon: 'fa-award',
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#f59e0b',
        perk: 'Đặc quyền nhân hệ số x1.2 điểm',
        cardClass: 'tier-gold'
      };
    } else if (t.includes('SILVER')) {
      return {
        icon: 'fa-medal',
        bg: 'rgba(148, 163, 184, 0.12)',
        color: '#64748b',
        perk: 'Đặc quyền nhân hệ số x1.1 điểm',
        cardClass: 'tier-silver'
      };
    } else {
      return {
        icon: 'fa-user',
        bg: 'rgba(15, 23, 42, 0.05)',
        color: '#475569',
        perk: 'Hạng tiêu chuẩn tích lũy điểm',
        cardClass: 'tier-standard'
      };
    }
  };

  const points = user?.points || 550;
  const tier = user?.tier || 'Gold Member';
  const nextTier = localStorage.getItem('user_next_tier') || 'Platinum';
  const remaining = localStorage.getItem('user_remaining_spend') || '250k';
  const cardCode = `AW-2026-${(tier || '').replace(' Member', '').toUpperCase()}`;
  const tierInfo = getTierDetails(tier);

  const progressPct = Math.min((points / 1000) * 100, 100);
  const activeProgress = activeBooking ? Math.round((washStep / 3) * 100) : 0;
  const activeBadge = activeBooking ? (STEP_BADGES[Math.min(washStep, 3)] || STEP_BADGES[0]) : '';

  const typeIcons = {
    points: 'fa-coins text-warning',
    status: 'fa-car-side text-cyan',
    info: 'fa-info-circle text-info'
  };

  return (
    <div className="container-fluid py-4">
      {/* Concierge Greeting */}
      <div className="row mb-4">
        <div className="col-12 text-start">
          <h3 className="fw-bold mb-1" id="concierge-greeting" style={{ color: 'var(--navy-dark)' }}>
            {greeting}, {user?.name || 'Khách hàng'}!
          </h3>
          <p className="text-secondary small mb-0" id="concierge-weather" style={{ fontSize: '0.85rem' }}>
            {weatherStatus}
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Member Card & Stats */}
        <div className="col-lg-7">
          {/* Metallic 3D Member Card */}
          <div className={`member-card mb-4 member-card-3d ${tierInfo.cardClass}`} id="member-card">
            <span className="tier-label">
              <i className="fas fa-crown me-2"></i>
              {tier}
            </span>
            <h2 className="fw-bold text-white mb-1" style={{ fontSize: '2.5rem' }}>
              <span id="dashboard-points">{points.toLocaleString()}</span>{' '}
              <small style={{ fontSize: '1rem', fontWeight: 600 }}>PTS</small>
            </h2>
            <p className="text-white mb-4" style={{ opacity: 0.7, fontSize: '0.85rem' }}>
              S-Member Loyalty Card
            </p>
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div>
                <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                  HẠNG TIẾP THEO
                </small>
                <div className="fw-bold text-cyan mt-1" id="dashboard-next-tier" style={{ fontSize: '0.88rem' }}>
                  {nextTier} — còn {remaining}
                </div>
              </div>
              <div className="text-end">
                <small style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                  MÃ THÀNH VIÊN
                </small>
                <div className="fw-bold text-white mt-1 font-monospace" id="dashboard-card-code" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                  {cardCode}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-3">
            {/* VIP Tier Details */}
            <div className="col-md-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white h-100 rounded-4 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  id="stat-tier-medal"
                  style={{
                    width: '46px',
                    height: '46px',
                    fontSize: '1.2rem',
                    background: tierInfo.bg,
                    color: tierInfo.color,
                    flexShrink: 0
                  }}
                >
                  <i className={`fas ${tierInfo.icon}`}></i>
                </div>
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                    PHÂN HẠNG CỦA BẠN
                  </small>
                  <span className="fw-bold text-dark fs-6" id="stat-tier">
                    {tier.replace(' Member', '')}
                  </span>
                  <small className="text-muted d-block mt-0.5" id="stat-tier-desc" style={{ fontSize: '0.68rem' }}>
                    {tierInfo.perk}
                  </small>
                </div>
              </div>
            </div>

            {/* Garage Plates */}
            <div className="col-md-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white h-100 rounded-4 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: '46px', height: '46px', fontSize: '1.2rem', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--cyan-electric)', flexShrink: 0 }}
                >
                  <i className="fas fa-motorcycle"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                      GARAGE PHƯƠNG TIỆN
                    </small>
                    <span className="badge bg-light text-dark border px-2 py-0.5 fw-bold" id="stat-vehicles-count" style={{ fontSize: '0.62rem' }}>
                      {vehicles.length} xe
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mt-1.5" id="stat-garage-plates">
                    {vehicles.map((v, idx) => (
                      <span
                        key={idx}
                        className="badge bg-light text-dark border font-monospace py-1.5 px-2.5"
                        style={{ fontSize: '0.65rem', borderColor: 'rgba(15,23,42,0.08)' }}
                      >
                        <i className="fas fa-motorcycle text-muted me-1"></i>
                        {v.plate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Booking Progress / Empty State & Feed */}
        <div className="col-lg-5">
          {/* Active Booking status */}
          <div className="app-card border-0 shadow-sm p-4 bg-white mb-4 rounded-4" style={{ minHeight: '320px' }}>
            <h5 className="fw-bold mb-3 border-bottom pb-2.5" style={{ color: 'var(--navy-dark)', fontSize: '0.95rem' }}>
              <i className="fas fa-satellite-dish text-cyan me-2"></i>TIẾN ĐỘ THEO DÕI LIVE
            </h5>

            {!activeBooking ? (
              <div id="empty-state-block" className="text-center py-5">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-light mx-auto mb-3"
                  style={{ width: '64px', height: '64px', border: '1px solid rgba(15,23,42,0.05)' }}
                >
                  <i className="fas fa-car-side text-muted opacity-40 fa-lg"></i>
                </div>
                <h6 className="fw-bold text-dark small mb-1">Không có xe đang rửa</h6>
                <p className="text-muted small mb-4 px-4" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                  Bạn không có lịch rửa xe nào đang chạy lúc này. Hãy đặt lịch ngay để trải nghiệm quy trình AI LPR nhé!
                </p>
                <Link
                  to="/customer/booking"
                  className="app-btn-primary w-auto px-4 py-2 text-dark fw-bold"
                  style={{ fontSize: '0.8rem', borderRadius: '10px', textDecoration: 'none', display: 'inline-block' }}
                >
                  ĐẶT LỊCH RỬA XE <i className="fas fa-calendar-alt ms-1"></i>
                </Link>
              </div>
            ) : (
              <div id="active-booking-block" className="animate-up">
                <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-4 p-3 me-3 d-flex align-items-center justify-content-center"
                      style={{
                        background: 'rgba(15, 23, 42, 0.04)',
                        width: '52px',
                        height: '52px',
                        border: '1px solid rgba(15, 23, 42, 0.06)'
                      }}
                    >
                      <i className="fas fa-car-side fa-lg text-cyan"></i>
                    </div>
                    <div>
                      <div className="fw-bold fs-5" style={{ color: 'var(--navy-dark)' }}>
                        {activeBooking.plate}
                      </div>
                      <small className="text-muted">{activeBooking.service}</small>
                    </div>
                  </div>
                  <span className="badge bg-info bg-opacity-10 text-cyan px-3 py-2 rounded-pill small fw-bold d-flex align-items-center gap-2">
                    <span className="pulse-dot-washing"></span>
                    {activeBadge}
                  </span>
                </div>

                {/* Circular Wash Progress Ring */}
                <div className="progress-ring-container mt-4 mb-4">
                  <div
                    className="progress-ring-outer"
                    style={{
                      background: `conic-gradient(var(--cyan-electric) ${activeProgress}%, rgba(15, 23, 42, 0.05) 0deg)`
                    }}
                  >
                    <div className="progress-ring-inner">
                      <div className="progress-ring-pct">{activeProgress}%</div>
                      <div className="progress-ring-label">{activeBadge}</div>
                    </div>
                  </div>
                </div>

                {/* Wash Checklist */}
                <div className="d-flex flex-column gap-2 mb-4">
                  {[0, 1, 2, 3].map(i => {
                    const isCompleted = i < washStep;
                    const isActive = i === washStep;
                    return (
                      <div
                        key={i}
                        className="d-flex align-items-center justify-content-between p-2.5 rounded-3"
                        style={{
                          background: 'rgba(15, 23, 42, 0.02)',
                          border: `1px solid ${isActive ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.03)'}`
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              width: '20px',
                              height: '20px',
                              fontSize: '0.65rem',
                              background: isCompleted ? 'var(--cyan-electric)' : isActive ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.06)',
                              color: isCompleted ? '#fff' : isActive ? 'var(--cyan-electric)' : '#94a3b8'
                            }}
                          >
                            {isCompleted ? <i className="fas fa-check" style={{ fontSize: '0.55rem' }}></i> : (i + 1)}
                          </div>
                          <span className={`small fw-semibold ${isActive ? 'text-dark' : isCompleted ? 'text-secondary' : 'text-muted'}`}>
                            {STEP_NAMES[i]}
                          </span>
                        </div>
                        <span
                          className={`badge ${
                            isCompleted ? 'bg-success bg-opacity-10 text-success' :
                            isActive ? 'bg-info bg-opacity-10 text-cyan animate-pulse' : 'bg-secondary bg-opacity-10 text-muted'
                          } px-2 py-1`}
                          style={{ fontSize: '0.6rem' }}
                        >
                          {isCompleted ? 'Xong' : isActive ? 'Đang chạy' : 'Đang chờ'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="row g-3 bg-light p-3 rounded-4" style={{ background: 'rgba(15, 23, 42, 0.02) !important', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
                  <div className="col-sm-4 col-6">
                    <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>GIỜ HẸN GIAO XE</small>
                    <span className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.85rem' }}>
                      {activeBooking.bookingTime}
                    </span>
                  </div>
                  <div className="col-sm-4 col-6">
                    <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>DỊCH VỤ RỬA</small>
                    <span className="fw-bold text-truncate d-block" style={{ color: 'var(--navy-dark)', fontSize: '0.85rem', maxWidth: '140px' }}>
                      {activeBooking.service}
                    </span>
                  </div>
                  <div className="col-sm-4 col-12">
                    <small className="text-muted d-block fw-bold mb-1" style={{ fontSize: '0.65rem' }}>HÀNG ĐỢI ƯU TIÊN</small>
                    <span className="badge fw-bold px-2.5 py-1.5 rounded" style={{ fontSize: '0.68rem', background: 'var(--cyan-electric)', color: '#fff' }}>
                      VIP {activeBooking.tier}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Feed widget */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 timeline-feed-widget position-relative">
            <h5 className="fw-bold mb-3 border-bottom pb-2.5" style={{ color: 'var(--navy-dark)', fontSize: '0.95rem' }}>
              <i className="fas fa-concierge-bell text-cyan me-2"></i>NHẬT KÝ THÔNG BÁO GẦN ĐÂY
            </h5>
            <div className="position-relative" id="notif-widget-list" style={{ minHeight: '120px' }}>
              <div className="feed-timeline-line"></div>
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted small" style={{ zIndex: 2, position: 'relative' }}>
                  Không có thông báo hoạt động nào
                </div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <div
                    key={n.id}
                    className={`concierge-feed-item d-flex gap-3 align-items-start p-3 rounded-4 shadow-sm position-relative mb-2 ${
                      n.read ? 'bg-white bg-opacity-70' : 'bg-white border-cyan-light'
                    }`}
                    style={{ fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.25s' }}
                    onClick={() => markNotifRead(n.id)}
                  >
                    <div
                      className="feed-timeline-dot d-flex align-items-center justify-content-center rounded-circle bg-white border"
                      style={{
                        width: '28px',
                        height: '28px',
                        zIndex: 2,
                        boxShadow: '0 4px 10px rgba(15,23,42,0.03)',
                        flexShrink: 0,
                        borderColor: 'rgba(15,23,42,0.06)'
                      }}
                    >
                      <i className={`fas ${typeIcons[n.type] || 'fa-bell text-muted'}`} style={{ fontSize: '0.75rem' }}></i>
                    </div>
                    <div className="flex-grow-1 overflow-hidden" style={{ marginTop: '2px' }}>
                      <div className="fw-bold d-flex justify-content-between align-items-center mb-1">
                        <span style={{ color: 'var(--navy-dark)', fontSize: '0.8rem' }}>{n.title}</span>
                        <small className="text-muted" style={{ fontSize: '0.62rem', fontWeight: 'normal' }}>{n.time}</small>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>{n.body}</div>
                    </div>
                    {!n.read && (
                      <span
                        className="rounded-circle bg-cyan position-absolute"
                        style={{ width: '6px', height: '6px', top: '15px', right: '15px', background: 'var(--cyan-electric)' }}
                      ></span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerDashboard;
