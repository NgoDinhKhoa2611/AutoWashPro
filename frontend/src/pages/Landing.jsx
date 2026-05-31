import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/shared.css';
import '../styles/landing.css';

export const Landing = () => {
  const [demoState, setDemoState] = useState('idle'); // 'idle' | 'scanning' | 'recognized' | 'washing_snow' | 'washing_dry' | 'completed'
  const [progressWidth, setProgressWidth] = useState('0%');
  const [progressLabel, setProgressLabel] = useState('Chưa bắt đầu');
  const [scannerStatus, setScannerStatus] = useState('HỆ THỐNG OFFLINE');
  const [scrollingNavbar, setScrollingNavbar] = useState(false);

  const demoTimeouts = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrollingNavbar(true);
      } else {
        setScrollingNavbar(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // Auto-trigger demo once after 1 second
    const initialDemoTimer = setTimeout(() => {
      startDemoSimulation();
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialDemoTimer);
      clearDemoTimeouts();
    };
  }, []);

  const clearDemoTimeouts = () => {
    demoTimeouts.current.forEach(t => clearTimeout(t));
    demoTimeouts.current = [];
  };

  const scheduleTimeout = (callback, ms) => {
    const t = setTimeout(callback, ms);
    demoTimeouts.current.push(t);
  };

  const startDemoSimulation = () => {
    if (demoState !== 'idle' && demoState !== 'completed') return;

    clearDemoTimeouts();

    // STEP 1: Scanning LPR (0s)
    setDemoState('scanning');
    setScannerStatus('ĐANG ĐỌC BIỂN SỐ XE...');
    setProgressWidth('0%');
    setProgressLabel('Đang nhận dạng...');

    // STEP 2: Recognized Plate (2.0s)
    scheduleTimeout(() => {
      setDemoState('recognized');
      setScannerStatus('XÁC MINH PHƯƠNG TIỆN THÀNH CÔNG');
      setProgressWidth('15%');
      setProgressLabel('Đã xếp hàng (15%)');
    }, 2000);

    // STEP 3: Washing step 1 - Snow Foam (4.0s)
    scheduleTimeout(() => {
      setDemoState('washing_snow');
      setScannerStatus('TIẾN TRÌNH: PHUN BỌT TUYẾT VÀO VỎ');
      setProgressWidth('45%');
      setProgressLabel('Đang rửa vỏ (45%)');
    }, 4000);

    // STEP 4: Washing step 2 - Air Drying (6.5s)
    scheduleTimeout(() => {
      setDemoState('washing_dry');
      setScannerStatus('TIẾN TRÌNH: SẤY KHÔ & ĐÁNH BÓNG');
      setProgressWidth('80%');
      setProgressLabel('Đang sấy khô (80%)');
    }, 6500);

    // STEP 5: Completed (9.0s)
    scheduleTimeout(() => {
      setDemoState('completed');
      setScannerStatus('HOÀN THÀNH RỬA XE - HẸN GẶP LẠI!');
      setProgressWidth('100%');
      setProgressLabel('Đã hoàn tất (100%)');
    }, 9000);

    // STEP 6: Reset to idle (12.5s)
    scheduleTimeout(() => {
      setDemoState('idle');
      setScannerStatus('HỆ THỐNG OFFLINE');
      setProgressWidth('0%');
      setProgressLabel('Chưa bắt đầu');
    }, 12500);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const isDemoRunning = demoState !== 'idle';

  return (
    <div className="landing-wrapper">
      {/* Ambient Background Blobs */}
      <div className="landing-bg-glow-1"></div>
      <div className="landing-bg-glow-2"></div>
      <div className="landing-bg-glow-3"></div>

      {/* NAVBAR */}
      <nav
        className={`navbar navbar-expand-lg fixed-top landing-nav ${
          scrollingNavbar ? 'shadow-sm py-2 bg-white bg-opacity-95' : 'py-3 bg-white bg-opacity-85'
        }`}
        style={{ transition: 'all 0.3s ease' }}
      >
        <div className="container">
          <a
            className="navbar-brand d-flex align-items-center text-dark fw-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="brand-logo-icon me-2 d-flex align-items-center justify-content-center">
              <i className="fas fa-car-side text-dark"></i>
            </div>
            <span style={{ fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
              AutoWash <span className="text-cyan">Pro</span>
            </span>
          </a>

          <button
            className="navbar-toggler border-0 text-dark"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#landingNavbar"
          >
            <i className="fas fa-bars"></i>
          </button>

          <div className="collapse navbar-collapse" id="landingNavbar">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-1 gap-lg-4 text-center mt-3 mt-lg-0">
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#technology"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('technology');
                  }}
                >
                  Công nghệ
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#loyalty"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('loyalty');
                  }}
                >
                  Tích điểm
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('services');
                  }}
                >
                  Dịch vụ
                </a>
              </li>
            </ul>
            <div className="d-flex justify-content-center">
              <Link
                to="/login"
                className="app-btn-primary w-auto px-4 py-2 text-dark fw-bold"
                style={{
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Đăng nhập / Đăng ký <i className="fas fa-sign-in-alt"></i>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="container landing-hero">
        <div className="row align-items-center g-5">
          {/* Left: Promo text */}
          <div className="col-lg-6 text-start animate-up">
            <div
              className="d-inline-flex align-items-center px-3 py-2 rounded-pill mb-4"
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.5px',
                background: 'rgba(16,185,129,0.1)',
                border: '1.5px solid rgba(16,185,129,0.2)',
              }}
            >
              <span className="text-dark fw-bold">
                <i className="fas fa-robot me-2 text-cyan"></i> Công nghệ nhận diện thông minh LPR
              </span>
            </div>

            <h1 className="fw-bold text-dark mb-3" style={{ fontSize: '3.2rem', lineHeight: '1.15', letterSpacing: '-1px' }}>
              Hệ Thống Rửa Xe <br />
              <span className="text-cyan" style={{ textShadow: '0 0 30px rgba(16,185,129,0.15)' }}>
                Thế Hệ Mới Siêu Tốc
              </span>
            </h1>

            <p className="text-secondary fs-5 mb-4 fw-light" style={{ maxWidth: '520px', lineHeight: '1.6' }}>
              Tiết kiệm 90% thời gian chờ đợi với quy trình nhận diện biển số AI tự động,
              thanh toán thông minh và theo dõi tiến trình thực tế ngay trên thiết bị của bạn.
            </p>

            <div className="d-flex flex-wrap gap-3">
              <button
                onClick={startDemoSimulation}
                id="demo-btn"
                disabled={isDemoRunning && demoState !== 'completed'}
                className="app-btn-secondary w-auto px-5 py-3 fw-bold"
                style={{ borderRadius: '16px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <i className={`fas ${isDemoRunning && demoState !== 'completed' ? 'fa-spinner fa-spin' : 'fa-play'} me-2 text-cyan`}></i>
                <span id="demo-btn-text">
                  {isDemoRunning && demoState !== 'completed' ? 'Đang chạy demo...' : 'Xem demo tính năng'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Interactive LPR Scanner Mockup */}
          <div className="col-lg-6 animate-up" style={{ animationDelay: '0.15s' }}>
            <div className="lpr-mockup-card p-4 mx-auto" style={{ maxWidth: '500px' }}>
              {/* Scanner Viewport */}
              <div
                className={`scanner-viewport-landing ${
                  demoState === 'scanning' ? 'scanning' :
                  demoState !== 'idle' ? 'success' : ''
                }`}
                id="scanner-viewport"
              >
                <div className="scanner-grid"></div>
                {demoState === 'scanning' && <div className="scanner-line" id="scanner-line"></div>}

                {/* Corner Reticles */}
                <div className="scanner-reticle reticle-tl"></div>
                <div className="scanner-reticle reticle-tr"></div>
                <div className="scanner-reticle reticle-bl"></div>
                <div className="scanner-reticle reticle-br"></div>

                <div className="w-100 h-100 d-flex align-items-center justify-content-center flex-column" id="scanner-content">
                  {demoState === 'idle' && (
                    <div className="text-center" style={{ opacity: 0.4 }}>
                      <i className="fas fa-camera text-white fa-3x mb-3"></i>
                      <div className="text-white small fw-bold" style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Bấm nút "Xem demo" để kích hoạt
                      </div>
                    </div>
                  )}

                  {demoState === 'scanning' && (
                    <div className="text-center opacity-40">
                      <i className="fas fa-camera text-white fa-3x mb-3 fa-pulse" style={{ color: 'var(--cyan-electric)' }}></i>
                      <div className="text-white small fw-bold" style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Hệ thống Camera AI đang quét...
                      </div>
                    </div>
                  )}

                  {demoState !== 'idle' && demoState !== 'scanning' && (
                    <div className="scanner-plate-box">51G - 123.45</div>
                  )}
                </div>

                <div className="scanner-overlay-text" id="scanner-status">
                  {scannerStatus}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 text-start border-top pt-3 lpr-status-bar">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Trạng thái xe đang rửa
                  </span>
                  <span className="text-cyan small fw-bold" id="progress-label" style={{ fontSize: '0.8rem' }}>
                    {progressLabel}
                  </span>
                </div>
                <div className="progress" style={{ height: '8px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0' }}>
                  <div
                    className="progress-bar"
                    id="demo-progress"
                    role="progressbar"
                    style={{
                      width: progressWidth,
                      background: 'linear-gradient(90deg,#0ea5e9,#0284c7)',
                      boxShadow: 'var(--cyan-glow)',
                      transition: 'width 0.8s ease',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TECHNOLOGY / FEATURES SECTION */}
      <section id="technology" className="container py-6">
        <div className="text-center mb-5">
          <small className="text-cyan fw-bold" style={{ letterSpacing: '1.5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Tính năng đột phá
          </small>
          <h2 className="fw-bold text-dark mt-1 mb-3 fs-1">Tại Sao Chọn AutoWash Pro?</h2>
          <p className="text-secondary mx-auto" style={{ maxWidth: '560px', fontSize: '0.95rem' }}>
            Ứng dụng các giải pháp tự động hóa thông minh nhằm kiến tạo quy trình chăm sóc xe
            nhanh gọn, tối ưu và minh bạch nhất.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-calendar-check text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">Đặt lịch rửa xe</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Đặt chỗ trước nhanh chóng chỉ với 3 bước, lựa chọn khung giờ và gói dịch vụ tùy thích.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-robot text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">AI nhận diện biển số</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Camera AI quét biển số xe LPR tự động khi vào tiệm, đưa ngay xe vào hàng chờ không cần khai báo.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-eye text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">Theo dõi trạng thái xe</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Giám sát tiến độ rửa trực quan theo thời gian thực (Đang quét → Rửa vỏ → Sấy khô → Hoàn tất).
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-crown text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">Tích điểm VIP & Loyalty</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Quy chế tích lũy điểm thưởng Smember đa phân hạng với hơn 12 loại quà tặng, voucher cao cấp.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-credit-card text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">Thanh toán thông minh</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Hỗ trợ đa dạng phương thức thanh toán trực tuyến bảo mật cao, nhận hóa đơn điện tử tức thì.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="feature-neon-card p-4">
              <div className="feature-neon-icon mb-4"><i class="fas fa-history text-cyan"></i></div>
              <h5 className="fw-bold text-dark mb-2">Lịch sử & Đánh giá</h5>
              <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                Tra cứu đầy đủ nhật ký rửa xe, đánh giá chất lượng dịch vụ để nhận thêm các ưu đãi bất ngờ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LOYALTY SECTION */}
      <section
        id="loyalty"
        className="py-6"
        style={{
          background: '#ffffff',
          borderTop: '1px solid rgba(16,185,129,0.12)',
          borderBottom: '1px solid rgba(16,185,129,0.12)',
        }}
      >
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-5 text-start animate-up">
              <small className="text-cyan fw-bold" style={{ letterSpacing: '1.5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                VIP Loyalty Program
              </small>
              <h2 className="fw-bold text-dark mt-1 mb-3 fs-1">Tích Điểm VIP Smember</h2>
              <p className="text-secondary mb-4" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                Trở thành thành viên thân thiết AutoWash Pro để nhận các đặc quyền ưu đãi vượt trội.
                Hệ thống tự động nâng hạng dựa trên mức chi tiêu thực tế của bạn.
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center text-cyan flex-shrink-0"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                    }}
                  >
                    <i className="fas fa-award"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">Hạng vàng & Platinum được ưu tiên</h6>
                    <p className="text-secondary small mb-0">Không cần xếp hàng rửa vỏ, được dẫn thẳng vào phòng VIP chờ.</p>
                  </div>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center text-cyan flex-shrink-0"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                    }}
                  >
                    <i className="fas fa-percent"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">Hệ số nhân điểm thưởng tới x1.5</h6>
                    <p className="text-secondary small mb-0">Tích lũy điểm thưởng nhanh chóng để đổi voucher và quà tặng giá trị.</p>
                  </div>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center text-cyan flex-shrink-0"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                    }}
                  >
                    <i className="fas fa-birthday-cake"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">Quà tặng sinh nhật độc quyền</h6>
                    <p className="text-secondary small mb-0">Nhận lượt chăm sóc xe chuyên sâu miễn phí vào tháng sinh nhật.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Cards Preview */}
            <div className="col-lg-7 text-center">
              <div className="row justify-content-center g-3">
                <div className="col-sm-6">
                  <div
                    className="p-4 text-start text-white rounded-4 shadow-lg position-relative overflow-hidden h-100"
                    style={{ background: 'linear-gradient(135deg,#0f172a 0%,#854d0e 50%,#ffc107 100%)' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <span className="small fw-bold" style={{ color: '#ffc107', letterSpacing: '1.5px', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          GOLD MEMBER
                        </span>
                        <h4 className="fw-bold mt-1 text-white">550 PTS</h4>
                      </div>
                      <i className="fas fa-crown fa-lg" style={{ color: '#ffc107' }}></i>
                    </div>
                    <div className="mt-5 pt-3 d-flex justify-content-between align-items-center">
                      <div className="small fw-bold" style={{ opacity: 0.75 }}>AutoWash Pro VIP</div>
                      <span className="badge bg-white text-dark small" style={{ fontSize: '0.6rem' }}>ACTIVE</span>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div
                    className="p-4 text-start text-white rounded-4 shadow-lg position-relative overflow-hidden h-100"
                    style={{ background: 'linear-gradient(135deg,#0f172a 0%,#0369a1 50%,#0ea5e9 100%)' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <span className="small fw-bold" style={{ color: '#0ea5e9', letterSpacing: '1.5px', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          PLATINUM MEMBER
                        </span>
                        <h4 className="fw-bold mt-1 text-white">1,250 PTS</h4>
                      </div>
                      <i className="fas fa-crown fa-lg" style={{ color: '#0ea5e9' }}></i>
                    </div>
                    <div className="mt-5 pt-3 d-flex justify-content-between align-items-center">
                      <div className="small fw-bold" style={{ opacity: 0.75 }}>AutoWash Pro VIP</div>
                      <span className="badge bg-white text-dark small" style={{ fontSize: '0.6rem' }}>ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES / BENEFITS SECTION */}
      <section id="services" className="container py-6">
        <div className="text-center mb-5">
          <small className="text-cyan fw-bold" style={{ letterSpacing: '1.5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Lợi ích mang lại
          </small>
          <h2 className="fw-bold text-dark mt-1 mb-3 fs-1">Trải Nghiệm Rửa Xe Đẳng Cấp</h2>
          <p className="text-secondary mx-auto" style={{ maxWidth: '560px', fontSize: '0.95rem' }}>
            Chúng tôi thay đổi hoàn toàn cách thức chăm sóc xe truyền thống, mang lại trải nghiệm tiện nghi tuyệt đối cho chủ xe.
          </p>
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-sm-6 col-lg-3">
            <div className="feature-neon-card p-4 text-center d-flex flex-column align-items-center h-100">
              <div className="feature-neon-icon mb-4" style={{ width: '56px', height: '56px' }}>
                <i className="fas fa-clock text-cyan"></i>
              </div>
              <h6 className="fw-bold text-dark mb-2">Tiết kiệm thời gian</h6>
              <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                Không còn phải đứng chờ vô ích. Quy trình AI tự động tối ưu hóa công suất hoạt động tại trạm.
              </p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="feature-neon-card p-4 text-center d-flex flex-column align-items-center h-100">
              <div className="feature-neon-icon mb-4" style={{ width: '56px', height: '56px' }}>
                <i className="fas fa-ban text-cyan"></i>
              </div>
              <h6 className="fw-bold text-dark mb-2">Không cần xếp hàng</h6>
              <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                Đặt trước khung giờ tiện lợi và được hệ thống phân làn vào ô rửa trống tự động khi nhận diện LPR.
              </p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="feature-neon-card p-4 text-center d-flex flex-column align-items-center h-100">
              <div className="feature-neon-icon mb-4" style={{ width: '56px', height: '56px' }}>
                <i className="fas fa-broadcast-tower text-cyan"></i>
              </div>
              <h6 className="fw-bold text-dark mb-2">Theo dõi realtime</h6>
              <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                Nhận thông báo tiến trình rửa xe trực tiếp trên điện thoại qua hệ thống Toast và Live Progress Bar.
              </p>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="feature-neon-card p-4 text-center d-flex flex-column align-items-center h-100">
              <div className="feature-neon-icon mb-4" style={{ width: '56px', height: '56px' }}>
                <i className="fas fa-percent text-cyan"></i>
              </div>
              <h6 className="fw-bold text-dark mb-2">Nhận ưu đãi thành viên</h6>
              <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                Được tích lũy chi tiêu đổi voucher giảm giá, dịch vụ bổ sung và các phần quà giá trị từ đối tác.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="container py-5 mb-5">
        <div
          className="p-5 text-center rounded-4 position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#ffffff 0%,#e6f7ee 100%)',
            border: '1.5px solid rgba(16,185,129,0.25)',
            boxShadow: 'var(--premium-shadow)',
          }}
        >
          <div className="position-relative py-3" style={{ zIndex: 3 }}>
            <h2 className="fw-bold text-dark mb-3 fs-2">Sẵn sàng trải nghiệm dịch vụ thế hệ mới?</h2>
            <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '520px', fontSize: '0.92rem' }}>
              Đăng nhập tài khoản của bạn ngay để trải nghiệm đặt lịch và hệ thống quản trị rửa xe thông minh!
            </p>
            <Link
              to="/login"
              className="app-btn-primary w-auto px-5 py-3 text-dark fw-bold shadow-lg"
              style={{
                borderRadius: '16px',
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Bắt đầu Trải nghiệm ngay <i className="fas fa-sign-in-alt"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-5" style={{ background: '#ffffff', borderTop: '1px solid rgba(16,185,129,0.15)' }}>
        <div className="container">
          <div className="row g-4 align-items-center justify-content-between">
            <div className="col-md-6 text-start">
              <h5 className="fw-bold text-dark mb-1">AutoWash <span class="text-cyan">Pro</span></h5>
              <p className="text-secondary small mb-0">Hệ thống quản lý rửa xe thông minh tích hợp công nghệ AI</p>
              <p className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>SWP391 Project — FPT University</p>
            </div>
            <div className="col-md-6 text-end">
              <div className="d-flex justify-content-end gap-3 mb-2">
                <a href="#" className="text-secondary hover-text-cyan text-decoration-none">
                  <i className="fab fa-facebook fa-lg"></i>
                </a>
                <a href="#" className="text-secondary hover-text-cyan text-decoration-none">
                  <i className="fas fa-envelope fa-lg"></i>
                </a>
              </div>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                &copy; {new Date().getFullYear()} AutoWash Pro. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
