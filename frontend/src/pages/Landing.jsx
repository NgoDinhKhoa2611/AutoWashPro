import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styles/shared.css";
import "../styles/landing.css";

export const Landing = () => {
  const [demoState, setDemoState] = useState("idle"); // 'idle' | 'scanning' | 'recognized' | 'washing_snow' | 'washing_dry' | 'completed'
  const [progressWidth, setProgressWidth] = useState("0%");
  const [progressLabel, setProgressLabel] = useState("Chưa bắt đầu");
  const [scannerStatus, setScannerStatus] = useState("HỆ THỐNG OFFLINE");
  const [scrollingNavbar, setScrollingNavbar] = useState(false);

  // Real-time Wash Pipeline active step (0: idle, 1: LPR, 2: Washing, 3: Completed)
  const [pipelineStep, setPipelineStep] = useState(0);

  // Newsletter Email input
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const demoTimeouts = useRef([]);
  const demoRunningRef = useRef(false);

  const clearDemoTimeouts = useCallback(() => {
    demoTimeouts.current.forEach((t) => clearTimeout(t));
    demoTimeouts.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback, ms) => {
    const t = setTimeout(callback, ms);
    demoTimeouts.current.push(t);
  }, []);

  const startDemoSimulation = useCallback(() => {
    if (demoRunningRef.current) return;
    demoRunningRef.current = true;

    clearDemoTimeouts();

    setDemoState("scanning");
    setPipelineStep(1);
    setScannerStatus("ĐANG ĐỌC BIỂN SỐ XE...");
    setProgressWidth("0%");
    setProgressLabel("Đang quét biển số...");

    scheduleTimeout(() => {
      setDemoState("recognized");
      setScannerStatus("XÁC MINH PHƯƠNG TIỆN THÀNH CÔNG");
      setProgressWidth("15%");
      setProgressLabel("Đã xếp hàng (15%)");
    }, 2000);

    scheduleTimeout(() => {
      setDemoState("washing_snow");
      setPipelineStep(2);
      setScannerStatus("TIẾN TRÌNH: RỬA VỎ & PHUN BỌT TUYẾT");
      setProgressWidth("50%");
      setProgressLabel("Đang phun bọt tuyết (50%)");
    }, 4000);

    scheduleTimeout(() => {
      setDemoState("washing_dry");
      setScannerStatus("TIẾN TRÌNH: SẤY KHÔ & HIỆU CHỈNH BÓNG");
      setProgressWidth("85%");
      setProgressLabel("Đang sấy khô (85%)");
    }, 6500);

    scheduleTimeout(() => {
      setDemoState("completed");
      setPipelineStep(3);
      setScannerStatus("HOÀN THÀNH RỬA XE - HẸN GẶP LẠI!");
      setProgressWidth("100%");
      setProgressLabel("Đã hoàn thành (100%)");
    }, 9000);

    scheduleTimeout(() => {
      setDemoState("idle");
      setPipelineStep(0);
      setScannerStatus("HỆ THỐNG OFFLINE");
      setProgressWidth("0%");
      setProgressLabel("Chưa bắt đầu");
      demoRunningRef.current = false;
    }, 13000);
  }, [clearDemoTimeouts, scheduleTimeout]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrollingNavbar(true);
      } else {
        setScrollingNavbar(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // Auto-trigger demo once after 1.2 seconds
    const initialDemoTimer = setTimeout(() => {
      startDemoSimulation();
    }, 1200);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(initialDemoTimer);
      clearDemoTimeouts();
      demoRunningRef.current = false;
    };
  }, [clearDemoTimeouts, startDemoSimulation]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    if (window.showToast) {
      window.showToast(
        "Cảm ơn bạn đã đăng ký nhận tin tức từ AutoWash Pro!",
        "success",
      );
    } else {
      alert("Đăng ký nhận tin tức thành công!");
    }
    setNewsletterEmail("");
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }

    // Auto-close mobile navbar collapse menu if open
    const navbarCollapse = document.getElementById("landingNavbar");
    if (navbarCollapse && navbarCollapse.classList.contains("show")) {
      const toggleButton = document.querySelector(".navbar-toggler");
      if (toggleButton) {
        toggleButton.click();
      }
    }
  };

  const isDemoRunning = demoState !== "idle";

  return (
    <div className="landing-wrapper">
      {/* Ambient Background Glow Blobs */}
      <div className="landing-bg-glow-1"></div>
      <div className="landing-bg-glow-2"></div>

      {/* NAVBAR */}
      <nav
        className={`navbar navbar-expand-lg fixed-top landing-nav ${
          scrollingNavbar ? "scrolling shadow-sm py-2" : "py-3"
        }`}
        style={{ transition: "all 0.3s ease" }}
      >
        <div className="container">
          <a
            className="navbar-brand d-flex align-items-center text-dark fw-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="brand-logo-icon me-2 d-flex align-items-center justify-content-center">
              <i className="fas fa-car-side text-white"></i>
            </div>
            <span style={{ fontSize: "1.2rem", letterSpacing: "-0.5px" }}>
              AutoWash{" "}
              <span className="text-primary-blue" style={{ color: "#0284c7" }}>
                Pro
              </span>
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
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("how-it-works");
                  }}
                >
                  Quy trình
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("services");
                  }}
                >
                  Dịch vụ
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#loyalty"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("loyalty");
                  }}
                >
                  Hạng VIP
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#benefits"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("benefits");
                  }}
                >
                  Đặc quyền
                </a>
              </li>
            </ul>
            <div className="d-flex justify-content-center">
              <Link
                to="/login"
                className="hero-cta-btn-primary w-auto px-4 py-2 fw-bold"
                style={{
                  fontSize: "0.85rem",
                  padding: "11px 22px",
                  borderRadius: "12px",
                }}
              >
                Đăng nhập / Đăng ký <i className="fas fa-sign-in-alt"></i>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO SECTION */}
      <header className="container landing-hero">
        <div className="row align-items-center g-5">
          {/* Left: Title & Text & CTAs */}
          <div className="col-lg-6 text-start animate-up">
            <div className="hero-badge">
              <i className="fas fa-robot me-2"></i> Công nghệ nhận diện thông
              minh LPR
            </div>

            <h1 className="hero-title fw-bold mb-3">
              Hệ Thống Rửa Xe <br />
              <span className="text-primary-blue" style={{ color: "#0284c7" }}>
                Thế Hệ Mới Siêu Tốc
              </span>
            </h1>

            <p className="hero-desc">
              Tiết kiệm 90% thời gian chờ đợi với quy trình nhận diện biển số AI
              tự động, thanh toán trực tuyến bảo mật và theo dõi tiến trình thực
              tế ngay trên thiết bị của bạn.
            </p>

            <div className="d-flex flex-wrap gap-3">
              <Link to="/login" className="hero-cta-btn-primary">
                Bắt đầu ngay <i className="fas fa-arrow-right"></i>
              </Link>
              <button
                onClick={startDemoSimulation}
                disabled={isDemoRunning}
                className="hero-cta-btn-secondary"
              >
                <i
                  className={`fas ${isDemoRunning ? "fa-spinner fa-spin" : "fa-play"} me-2`}
                ></i>
                <span>
                  {isDemoRunning
                    ? "Đang mô phỏng..."
                    : "Mô phỏng quy trình LPR"}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Interactive Real-time Wash Simulator */}
          <div
            className="col-lg-6 animate-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="lpr-mockup-card">
              {/* Simulator Camera Viewport */}
              <div
                className={`scanner-viewport-landing ${
                  demoState === "scanning"
                    ? "scanning"
                    : demoState !== "idle"
                      ? "success"
                      : ""
                }`}
              >
                <div className="scanner-grid"></div>
                {demoState === "scanning" && (
                  <div className="scanner-line"></div>
                )}

                {/* Bubble animations when washing */}
                {(demoState === "washing_snow" ||
                  demoState === "washing_dry") && (
                  <div className="bubble-animation-overlay">
                    <div
                      className="bubble"
                      style={{
                        left: "10%",
                        width: "15px",
                        height: "15px",
                        animationDelay: "0s",
                        animationDuration: "2s",
                      }}
                    ></div>
                    <div
                      className="bubble"
                      style={{
                        left: "25%",
                        width: "25px",
                        height: "25px",
                        animationDelay: "0.5s",
                        animationDuration: "2.5s",
                      }}
                    ></div>
                    <div
                      className="bubble"
                      style={{
                        left: "40%",
                        width: "10px",
                        height: "10px",
                        animationDelay: "0.2s",
                        animationDuration: "1.8s",
                      }}
                    ></div>
                    <div
                      className="bubble"
                      style={{
                        left: "60%",
                        width: "20px",
                        height: "20px",
                        animationDelay: "0.8s",
                        animationDuration: "3s",
                      }}
                    ></div>
                    <div
                      className="bubble"
                      style={{
                        left: "75%",
                        width: "30px",
                        height: "30px",
                        animationDelay: "0.1s",
                        animationDuration: "2.2s",
                      }}
                    ></div>
                    <div
                      className="bubble"
                      style={{
                        left: "88%",
                        width: "12px",
                        height: "12px",
                        animationDelay: "0.4s",
                        animationDuration: "2.7s",
                      }}
                    ></div>
                  </div>
                )}

                {/* Sparkle star animations on Complete */}
                {demoState === "completed" && (
                  <div className="bubble-animation-overlay">
                    <i
                      className="fas fa-star sparkle-icon"
                      style={{ top: "20%", left: "20%", animationDelay: "0s" }}
                    ></i>
                    <i
                      className="fas fa-star sparkle-icon"
                      style={{
                        top: "65%",
                        left: "75%",
                        animationDelay: "0.4s",
                      }}
                    ></i>
                    <i
                      className="fas fa-star sparkle-icon"
                      style={{
                        top: "40%",
                        left: "45%",
                        animationDelay: "0.8s",
                      }}
                    ></i>
                  </div>
                )}

                {/* Corner Reticles */}
                <div className="scanner-reticle reticle-tl"></div>
                <div className="scanner-reticle reticle-tr"></div>
                <div className="scanner-reticle reticle-bl"></div>
                <div className="scanner-reticle reticle-br"></div>

                <div className="w-100 h-100 d-flex align-items-center justify-content-center flex-column">
                  {demoState === "idle" && (
                    <div className="text-center" style={{ opacity: 0.35 }}>
                      <i className="fas fa-video text-white fa-3x mb-3"></i>
                      <div
                        className="text-white small fw-bold"
                        style={{
                          fontSize: "0.72rem",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        Camera AI Sẵn Sàng Quét LPR
                      </div>
                    </div>
                  )}

                  {demoState === "scanning" && (
                    <div className="text-center" style={{ opacity: 0.7 }}>
                      <i className="fas fa-camera text-white fa-3x mb-3 fa-pulse"></i>
                      <div
                        className="text-white small fw-bold"
                        style={{
                          fontSize: "0.72rem",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        Nhận dạng biển số...
                      </div>
                    </div>
                  )}

                  {demoState !== "idle" && demoState !== "scanning" && (
                    <div className="scanner-plate-box">51G - 123.45</div>
                  )}
                </div>

                <div className="scanner-overlay-text">{scannerStatus}</div>
              </div>

              {/* Real-time Wash Pipeline Steps Flow */}
              <div className="pipeline-container">
                <div className="pipeline-line-progress"></div>
                <div
                  className="pipeline-line-active"
                  style={{
                    width:
                      pipelineStep === 1
                        ? "10%"
                        : pipelineStep === 2
                          ? "50%"
                          : pipelineStep === 3
                            ? "90%"
                            : "0%",
                  }}
                ></div>

                <div
                  className={`pipeline-step-node ${pipelineStep >= 1 ? "completed" : ""} ${pipelineStep === 1 ? "active" : ""}`}
                >
                  <div className="pipeline-node-circle">
                    {pipelineStep > 1 ? <i className="fas fa-check"></i> : "1"}
                  </div>
                  <div className="pipeline-node-label">1. Quét LPR</div>
                </div>

                <div
                  className={`pipeline-step-node ${pipelineStep >= 2 ? "completed" : ""} ${pipelineStep === 2 ? "active" : ""}`}
                >
                  <div className="pipeline-node-circle">
                    {pipelineStep > 2 ? <i className="fas fa-check"></i> : "2"}
                  </div>
                  <div className="pipeline-node-label">2. Đang rửa</div>
                </div>

                <div
                  className={`pipeline-step-node ${pipelineStep >= 3 ? "completed" : ""} ${pipelineStep === 3 ? "active" : ""}`}
                >
                  <div className="pipeline-node-circle">
                    {pipelineStep > 3 ? <i className="fas fa-check"></i> : "3"}
                  </div>
                  <div className="pipeline-node-label">3. Xong</div>
                </div>
              </div>

              {/* Progress Bar Label */}
              <div className="mt-3 text-start border-top pt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span
                    className="text-secondary small fw-bold"
                    style={{
                      fontSize: "0.65rem",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Tiến trình trực quan
                  </span>
                  <span
                    className="small fw-bold text-primary-blue"
                    style={{ fontSize: "0.8rem", color: "#0284c7" }}
                  >
                    {progressLabel}
                  </span>
                </div>
                <div
                  className="progress"
                  style={{
                    height: "8px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#e2e8f0",
                  }}
                >
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: progressWidth,
                      background: "linear-gradient(90deg,#0ea5e9,#0284c7)",
                      transition: "width 0.8s ease",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2: STATS */}
      <section className="stats-section pb-5 bg-light-gradient">
        <div className="container">
          <div className="row g-4">
            <div className="col-6 col-md-3 animate-up">
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div className="stat-number">99.8%</div>
                <div className="stat-label">Độ chính xác LPR</div>
              </div>
            </div>
            <div
              className="col-6 col-md-3 animate-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-stopwatch"></i>
                </div>
                <div className="stat-number">5 phút</div>
                <div className="stat-label">Thời gian rửa trung bình</div>
              </div>
            </div>
            <div
              className="col-6 col-md-3 animate-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-car-side"></i>
                </div>
                <div className="stat-number">15K+</div>
                <div className="stat-label">Lượt xe hoàn tất</div>
              </div>
            </div>
            <div
              className="col-6 col-md-3 animate-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-star"></i>
                </div>
                <div className="stat-number">4.92★</div>
                <div className="stat-label">Đánh giá hài lòng</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (Timeline 4 Bước Tối Giản Trực Quan) */}
      <section id="how-it-works" className="py-6 bg-white-pure">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Quy trình vận hành</small>
            <h2 className="section-title">Quy Trình 4 Bước Siêu Tốc</h2>
            <p
              className="text-secondary mx-auto mt-2"
              style={{ maxWidth: "560px", fontSize: "0.95rem" }}
            >
              Trải nghiệm dịch vụ nhanh gọn nhờ sự hỗ trợ của công nghệ nhận
              diện và quy trình tối ưu.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Bước 1 */}
            <div className="col-md-6 col-lg-3 animate-up">
              <div
                className="stat-card h-100"
                style={{ padding: "36px 20px", background: "#f8fafc" }}
              >
                <div className="stat-icon-wrapper">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    color: "#0284c7",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Bước 1
                </div>
                <h5
                  className="fw-bold text-dark mt-2 mb-2"
                  style={{ fontSize: "1.1rem" }}
                >
                  Đặt lịch
                </h5>
                <p
                  className="text-secondary small mb-0 text-center"
                  style={{ lineHeight: "1.5" }}
                >
                  Khách hàng chọn gói dịch vụ và đặt khung giờ trực tuyến trước
                  khi đến trạm.
                </p>
              </div>
            </div>

            {/* Bước 2 */}
            <div
              className="col-md-6 col-lg-3 animate-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div
                className="stat-card h-100"
                style={{ padding: "36px 20px", background: "#f8fafc" }}
              >
                <div className="stat-icon-wrapper">
                  <i className="fas fa-camera"></i>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    color: "#0284c7",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Bước 2
                </div>
                <h5
                  className="fw-bold text-dark mt-2 mb-2"
                  style={{ fontSize: "1.1rem" }}
                >
                  Nhận diện biển số LPR
                </h5>
                <p
                  className="text-secondary small mb-0 text-center"
                  style={{ lineHeight: "1.5" }}
                >
                  Camera AI tự động quét nhận diện biển số xe khi vào cổng để
                  sắp xếp làn rửa.
                </p>
              </div>
            </div>

            {/* Bước 3 */}
            <div
              className="col-md-6 col-lg-3 animate-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="stat-card h-100"
                style={{ padding: "36px 20px", background: "#f8fafc" }}
              >
                <div className="stat-icon-wrapper">
                  <i className="fas fa-soap"></i>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    color: "#0284c7",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Bước 3
                </div>
                <h5
                  className="fw-bold text-dark mt-2 mb-2"
                  style={{ fontSize: "1.1rem" }}
                >
                  Chăm sóc xe
                </h5>
                <p
                  className="text-secondary small mb-0 text-center"
                  style={{ lineHeight: "1.5" }}
                >
                  Xe được vệ sinh vỏ, hút bụi cabin và thực hiện các gói chuyên
                  sâu theo yêu cầu.
                </p>
              </div>
            </div>

            {/* Bước 4 */}
            <div
              className="col-md-6 col-lg-3 animate-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div
                className="stat-card h-100"
                style={{ padding: "36px 20px", background: "#f8fafc" }}
              >
                <div className="stat-icon-wrapper">
                  <i className="fas fa-credit-card"></i>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    color: "#0284c7",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Bước 4
                </div>
                <h5
                  className="fw-bold text-dark mt-2 mb-2"
                  style={{ fontSize: "1.1rem" }}
                >
                  Thanh toán & Tích điểm
                </h5>
                <p
                  className="text-secondary small mb-0 text-center"
                  style={{ lineHeight: "1.5" }}
                >
                  Khách hàng thanh toán nhanh chóng trực tuyến và tự động tích
                  lũy điểm thăng hạng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: LOYALTY (3 VIP cards với tích điểm tự động dựa trên chi tiêu thực tế) */}
      <section id="loyalty" className="py-6 bg-white-pure">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Chương trình tích điểm</small>
            <h2 className="section-title">Hạng Thành Viên Tích Điểm Tự Động</h2>
            <p
              className="text-secondary mx-auto mt-2"
              style={{ maxWidth: "560px", fontSize: "0.95rem" }}
            >
              Điểm thành viên được cộng tự động dựa trên chi phí thanh toán thực
              tế của mỗi lượt rửa xe. Hoàn toàn không có phí đăng ký thành viên
              hay phí duy trì hàng tháng.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Card 1: Silver */}
            <div className="col-md-4 animate-up">
              <div className="tier-card tier-silver">
                <div className="tier-badge">Silver Member</div>
                <div className="tier-points">100 - 499đ</div>

                {/* Progression Bar */}
                <div className="loyalty-progress-container">
                  <div className="loyalty-progress-label">
                    <span>Mức tích điểm thăng hạng</span>
                    <span>50% (250/500đ)</span>
                  </div>
                  <div className="loyalty-progress-bar">
                    <div
                      className="loyalty-progress-fill"
                      style={{ width: "50%" }}
                    ></div>
                  </div>
                  <div
                    className="text-muted mt-2"
                    style={{ fontSize: "0.72rem", fontWeight: "600" }}
                  >
                    *Cần tích lũy thêm 250đ chi tiêu để nâng hạng Vàng.
                  </div>
                </div>

                <div className="tier-perks-list border-top pt-3">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Tích lũy điểm thưởng x1.0 chi tiêu dịch vụ</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Quy đổi voucher giảm giá từ 5% hóa đơn</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Đặt lịch trực tuyến dễ dàng qua tài khoản</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Gold */}
            <div
              className="col-md-4 animate-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="tier-card tier-gold">
                <div className="tier-badge">Gold Member</div>
                <div className="tier-points">500 - 999đ</div>

                {/* Progression Bar */}
                <div className="loyalty-progress-container">
                  <div className="loyalty-progress-label">
                    <span>Mức tích điểm thăng hạng</span>
                    <span>75% (750/1000đ)</span>
                  </div>
                  <div className="loyalty-progress-bar">
                    <div
                      className="loyalty-progress-fill"
                      style={{ width: "75%" }}
                    ></div>
                  </div>
                  <div
                    className="text-muted mt-2"
                    style={{ fontSize: "0.72rem", fontWeight: "600" }}
                  >
                    *Cần tích lũy thêm 250đ chi tiêu để nâng hạng Bạch Kim.
                  </div>
                </div>

                <div className="tier-perks-list border-top pt-3">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Tích lũy điểm thưởng x1.2 chi tiêu dịch vụ</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Tự động sắp xếp làn rửa nhanh qua LPR biển số</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Voucher 10% dịp đặc biệt & quà tháng sinh nhật</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Platinum */}
            <div
              className="col-md-4 animate-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="tier-card tier-platinum">
                <div className="tier-badge">Platinum Member</div>
                <div className="tier-points">1,000+đ</div>

                {/* Progression Bar */}
                <div className="loyalty-progress-container">
                  <div className="loyalty-progress-label">
                    <span>Hạng thành viên hiện tại</span>
                    <span>MAX RANK (1,250đ)</span>
                  </div>
                  <div className="loyalty-progress-bar">
                    <div
                      className="loyalty-progress-fill"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                  <div
                    className="text-success mt-2"
                    style={{ fontSize: "0.72rem", fontWeight: "700" }}
                  >
                    *Đã đạt cấp độ thành viên cao nhất tại trạm!
                  </div>
                </div>

                <div className="tier-perks-list border-top pt-3">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>
                      Tích lũy điểm thưởng tối đa x1.5 chi tiêu dịch vụ
                    </span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>
                      Được dẫn thẳng vào làn rửa ưu tiên không cần xếp hàng
                    </span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Miễn phí trà/cafe phòng chờ chờ VIP của trạm</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Nhận mã giảm giá 15% trọn đời toàn bộ dịch vụ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: BENEFITS */}
      <section id="benefits" className="py-6 bg-light-gradient">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Đặc quyền vượt trội</small>
            <h2 className="section-title">
              Tại Sao Nên Lựa Chọn AutoWash Pro?
            </h2>
            <p
              className="text-secondary mx-auto mt-2"
              style={{ maxWidth: "560px", fontSize: "0.95rem" }}
            >
              Chúng tôi tối ưu hóa quy trình rửa xe truyền thống bằng các giải
              pháp thông minh tự động.
            </p>
          </div>

          <div className="row g-3">
            <div className="col-md-6 col-lg-4 animate-up">
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Tiết kiệm tới 90% thời gian chờ tại tiệm
                </span>
              </div>
            </div>
            <div
              className="col-md-6 col-lg-4 animate-up"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Nhận diện LPR biển số nhanh trong 2s
                </span>
              </div>
            </div>
            <div
              className="col-md-6 col-lg-4 animate-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Theo dõi trực tiếp tiến trình rửa realtime
                </span>
              </div>
            </div>
            <div
              className="col-md-6 col-lg-4 animate-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Tích điểm thăng hạng thành viên VIP
                </span>
              </div>
            </div>
            <div
              className="col-md-6 col-lg-4 animate-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Giá niêm yết rõ ràng, hóa đơn điện tử ngay
                </span>
              </div>
            </div>
            <div
              className="col-md-6 col-lg-4 animate-up"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">
                  Thanh toán đa ví điện tử bảo mật tuyệt đối
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: CTA BANNER */}
      <section className="container py-5 mb-5">
        <div className="cta-banner text-center py-5">
          <div className="position-relative py-3" style={{ zIndex: 3 }}>
            <h2 className="fw-bold text-white mb-3 fs-2">
              Sẵn sàng nâng tầm trải nghiệm chăm sóc xe?
            </h2>
            <p
              className="text-white opacity-85 mb-4 mx-auto"
              style={{
                maxWidth: "540px",
                fontSize: "0.95rem",
                lineHeight: "1.6",
              }}
            >
              Tạo tài khoản AutoWash Pro ngay hôm nay để nhận ưu đãi giảm giá
              20% cho lượt đặt lịch đầu tiên và tích lũy điểm thăng hạng VIP!
            </p>
            <Link to="/login" className="cta-btn-white">
              Đăng ký trải nghiệm ngay <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8: FOOTER */}
      <footer className="py-5 bg-white-pure border-top">
        <div className="container">
          <div className="row g-5 mb-5 text-start">
            {/* Col 1: Brand Info */}
            <div className="col-lg-4 col-md-6">
              <h5 className="fw-bold text-dark mb-3">
                AutoWash{" "}
                <span
                  className="text-primary-blue"
                  style={{ color: "#0284c7" }}
                >
                  Pro
                </span>
              </h5>
              <p
                className="text-secondary small mb-3"
                style={{ lineHeight: "1.6" }}
              >
                Hệ thống quản lý rửa xe thông minh tích hợp công nghệ AI nhận
                diện biển số LPR, đem lại trải nghiệm chăm sóc xe tự động, siêu
                tốc và đẳng cấp.
              </p>
              <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                SWP391 Project — FPT University Ho Chi Minh
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="col-lg-2 col-md-6 footer-link-group">
              <h6
                className="fw-bold text-dark small text-uppercase mb-2"
                style={{ letterSpacing: "0.5px" }}
              >
                Khám Phá
              </h6>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("how-it-works");
                }}
                className="footer-link"
              >
                Quy trình
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("services");
                }}
                className="footer-link"
              >
                Gói dịch vụ
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("loyalty");
                }}
                className="footer-link"
              >
                VIP Loyalty
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("benefits");
                }}
                className="footer-link"
              >
                Đặc quyền
              </a>
            </div>

            {/* Col 3: Company */}
            <div className="col-lg-2 col-md-6 footer-link-group">
              <h6
                className="fw-bold text-dark small text-uppercase mb-2"
                style={{ letterSpacing: "0.5px" }}
              >
                Trạm Rửa Xe
              </h6>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="footer-link"
              >
                Về chúng tôi
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="footer-link"
              >
                Liên hệ hỗ trợ
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="footer-link"
              >
                Tuyển dụng
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="footer-link"
              >
                Điều khoản dịch vụ
              </a>
            </div>

            {/* Col 4: Newsletter */}
            <div className="col-lg-4 col-md-6 text-start">
              <h6
                className="fw-bold text-dark small text-uppercase mb-2"
                style={{ letterSpacing: "0.5px" }}
              >
                Nhận Bản Tin Ưu Đãi
              </h6>
              <p className="text-secondary small mb-3">
                Đăng ký email để nhận thông báo về các ưu đãi dịch vụ và voucher
                mới từ trạm.
              </p>
              <form
                onSubmit={handleNewsletterSubmit}
                className="newsletter-input-group"
              >
                <input
                  type="email"
                  className="newsletter-input"
                  placeholder="Nhập email của bạn..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" className="newsletter-btn">
                  Đăng ký
                </button>
              </form>
            </div>
          </div>

          <div className="row g-4 align-items-center justify-content-between border-top pt-4">
            <div className="col-md-6 text-start">
              <small className="text-secondary" style={{ fontSize: "0.75rem" }}>
                &copy; {new Date().getFullYear()} AutoWash Pro. Bảo lưu mọi
                quyền.
              </small>
            </div>
            <div className="col-md-6 text-end">
              <div className="d-flex justify-content-md-end justify-content-start gap-3">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-secondary hover-text-cyan text-decoration-none"
                >
                  <i className="fab fa-facebook fa-lg"></i>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-secondary hover-text-cyan text-decoration-none"
                >
                  <i className="fab fa-twitter fa-lg"></i>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-secondary hover-text-cyan text-decoration-none"
                >
                  <i className="fas fa-envelope fa-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
