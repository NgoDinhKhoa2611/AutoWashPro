import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import '../styles/shared.css';
import '../styles/login.css';

export const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Panels: 'login' (controls both signin/signup sliders) | 'otp' | 'google-complete' | 'firebase-otp'
  const [panel, setPanel] = useState('login');
  const [isRegisterActive, setIsRegisterActive] = useState(false); // Controls slide panel
  const [successScreen, setSuccessScreen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Chào mừng bạn gia nhập AutoWash Pro');

  // Input states (Login)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Input states (Register)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regAgree, setRegAgree] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Otp States (Normal Register)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimerSec, setOtpTimerSec] = useState(59);
  const [showResendOtp, setShowResendOtp] = useState(false);
  const otpTimerRef = useRef(null);

  // Google completion & Firebase OTP
  const [googleUser, setGoogleUser] = useState(null);
  const [completePhone, setCompletePhone] = useState('');
  const [completePassword, setCompletePassword] = useState('');
  const [completeConfirm, setCompleteConfirm] = useState('');
  const [completeAgree, setCompleteAgree] = useState(false);
  
  const [fbOtpDigits, setFbOtpDigits] = useState(['', '', '', '', '', '']);
  const [fbOtpTimerSec, setFbOtpTimerSec] = useState(300);
  const [showFbResendOtp, setShowFbResendOtp] = useState(false);
  const fbOtpTimerRef = useRef(null);

  useEffect(() => {
    // Google Sign-In button rendering inside the login panel
    const initGoogle = () => {
      if (window.google && panel === 'login') {
        window.google.accounts.id.initialize({
          client_id: "822970711625-j7g9i1mvivrff2djnv0gi96bsqn28t4c.apps.googleusercontent.com",
          callback: handleGoogleCredential
        });

        const renderBtns = () => {
          const containerLogin = document.getElementById("google-login-btn-login");
          if (containerLogin) {
            window.google.accounts.id.renderButton(containerLogin, {
              theme: "outline",
              size: "large",
              width: 320,
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left"
            });
          }
        };

        renderBtns();
        // Fallback timeout in case element rendering is delayed by slide animation transition
        setTimeout(renderBtns, 300);
      } else {
        setTimeout(initGoogle, 100);
      }
    };

    if (panel === 'login') {
      initGoogle();
    }

    return () => {
      clearInterval(otpTimerRef.current);
      clearInterval(fbOtpTimerRef.current);
    };
  }, [panel, isRegisterActive]);

  // Google callback
  const handleGoogleCredential = async (response) => {
    try {
      const payload = decodeJwt(response.credential);
      const email = payload.email;
      const name = payload.name || "Người dùng Google";
      const avatar = payload.picture || "";
      const googleId = payload.sub || "";

      // Call backend API
      const data = await authService.googleLogin(email, name, googleId);
      
      if (data && data.success) {
        if (data.isNewUser) {
          // Google signup is incomplete, prompt SĐT
          setGoogleUser({ email, name, googleId, avatar });
          setPanel('google-complete');
          if (window.showToast) window.showToast('Vui lòng hoàn tất số điện thoại và mật khẩu!', 'info');
        } else {
          // Returning user
          document.cookie = "UserEmail=" + email + "; path=/; max-age=" + (30*24*60*60);
          if (avatar) {
            document.cookie = "UserAvatar=" + encodeURIComponent(avatar) + "; path=/; max-age=" + (30*24*60*60);
          }

          localStorage.setItem('user_role', 'customer');
          localStorage.setItem('user_display_name', name);
          localStorage.setItem('user_email', email);
          localStorage.setItem('user_avatar', avatar);
          localStorage.setItem('user_points', '550');
          localStorage.setItem('user_tier', 'Gold Member');
          window.dispatchEvent(new Event('storage'));

          if (window.showToast) window.showToast(`Đăng nhập Google thành công! Chào mừng ${name}`, 'success');
          setTimeout(() => { navigate('/customer/dashboard'); }, 1200);
        }
      } else {
        if (window.showToast) window.showToast("Xác thực hệ thống lỗi: " + (data.message || ""), "error");
      }
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast("Có lỗi xảy ra khi đăng nhập bằng Google!", "error");
    }
  };

  const decodeJwt = (token) => {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  // Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginPassword.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    setLoginLoading(true);
    try {
      const data = await login(loginPhone, loginPassword);
      if (window.showToast) {
        window.showToast(
          data.role === 'admin' || data.role === 'staff'
            ? 'Đăng nhập Quản trị thành công!'
            : 'Đăng nhập thành công!',
          'success'
        );
      }
      
      setTimeout(() => {
        if (data.role === 'admin' || data.role === 'staff') {
          navigate('/admin/dashboard');
        } else {
          navigate('/customer/dashboard');
        }
      }, 700);
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Tài khoản hoặc mật khẩu không đúng!', 'error');
      setLoginLoading(false);
    }
  };

  // Registration submission (Simulating OTP sandbox check)
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      if (window.showToast) window.showToast('Vui lòng điền đầy đủ tất cả các trường!', 'warning');
      return;
    }
    if (!regAgree) {
      if (window.showToast) window.showToast('Vui lòng đồng ý với điều khoản sử dụng!', 'warning');
      return;
    }
    if (regPassword !== regConfirm) {
      if (window.showToast) window.showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }
    if (regPassword.length < 6) {
      if (window.showToast) window.showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
      return;
    }

    setRegLoading(true);
    setTimeout(() => {
      localStorage.setItem('reg_name_temp', regName);
      localStorage.setItem('reg_phone_temp', regPhone);
      localStorage.setItem('reg_email_temp', regEmail);
      setRegLoading(false);
      setPanel('otp');
      startOtpTimer();
      if (window.showToast) window.showToast('Mã OTP đã được gửi về số điện thoại của bạn!', 'success');
    }, 1000);
  };

  // Otp Timers
  const startOtpTimer = () => {
    setOtpTimerSec(59);
    setShowResendOtp(false);
    clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(otpTimerRef.current);
          setShowResendOtp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startFbOtpTimer = () => {
    setFbOtpTimerSec(300);
    setShowFbResendOtp(false);
    clearInterval(fbOtpTimerRef.current);
    fbOtpTimerRef.current = setInterval(() => {
      setFbOtpTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(fbOtpTimerRef.current);
          setShowFbResendOtp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Normal OTP inputs
  const handleOtpInput = (idx, val) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[idx] = clean.substring(0, 1);
    setOtpDigits(newDigits);

    if (clean && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`otp-${idx - 1}`);
      if (prevInput) {
        const newDigits = [...otpDigits];
        newDigits[idx - 1] = '';
        setOtpDigits(newDigits);
        prevInput.focus();
      }
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      if (window.showToast) window.showToast('Vui lòng nhập đầy đủ mã 6 chữ số!', 'warning');
      return;
    }

    clearInterval(otpTimerRef.current);

    const name = localStorage.getItem('reg_name_temp') || 'Người dùng mới';
    const phone = localStorage.getItem('reg_phone_temp') || regPhone;
    const email = localStorage.getItem('reg_email_temp') || regEmail;

    try {
      // Gọi API đăng ký thực tế
      await register(email, name, phone, regPassword);

      localStorage.removeItem('reg_name_temp');
      localStorage.removeItem('reg_phone_temp');
      localStorage.removeItem('reg_email_temp');

      setSuccessMsg(`Chào mừng ${name} gia nhập AutoWash Pro`);
      setSuccessScreen(true);
      setPanel('none');
      
      // Ghi cookie phiên bản
      document.cookie = "UserPhone=" + phone + "; path=/; max-age=" + (30*24*60*60);
      document.cookie = "UserEmail=" + email + "; path=/; max-age=" + (30*24*60*60);

      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast(err.message || 'Lỗi đăng ký tài khoản mới lên cơ sở dữ liệu!', 'error');
      startOtpTimer();
    }
  };

  const handleResendOtp = () => {
    startOtpTimer();
    if (window.showToast) window.showToast('Đã gửi lại mã OTP mới!', 'info');
  };

  // Google Profile completion Form
  const handleGoogleCompleteSubmit = (e) => {
    e.preventDefault();
    if (!completePhone || !completePassword || !completeConfirm) {
      if (window.showToast) window.showToast('Vui lòng nhập đầy đủ các trường!', 'warning');
      return;
    }
    if (!completeAgree) {
      if (window.showToast) window.showToast('Vui lòng đồng ý với điều khoản sử dụng!', 'warning');
      return;
    }

    const cleanPhone = completePhone.replace(/[-\s]/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) {
      if (window.showToast) window.showToast('Số điện thoại không hợp lệ! Định dạng 10 chữ số.', 'warning');
      return;
    }
    if (completePassword !== completeConfirm) {
      if (window.showToast) window.showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }
    if (completePassword.length < 6) {
      if (window.showToast) window.showToast('Mật khẩu phải chứa ít nhất 6 chữ số!', 'error');
      return;
    }

    setGoogleUser(prev => ({
      ...prev,
      phone: cleanPhone,
      password: completePassword
    }));

    if (window.showToast) window.showToast('Đang gửi mã OTP đến số điện thoại ' + cleanPhone + '...', 'info');

    // Simulate SMS, trigger Firebase OTP screen
    setTimeout(() => {
      if (window.showToast) window.showToast('Mã OTP đã gửi: 123456', 'success');
      setPanel('firebase-otp');
      startFbOtpTimer();
    }, 800);
  };

  // Firebase OTP inputs
  const handleFbOtpInput = (idx, val) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...fbOtpDigits];
    newDigits[idx] = clean.substring(0, 1);
    setFbOtpDigits(newDigits);

    if (clean && idx < 5) {
      const nextInput = document.getElementById(`fb-otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleFbOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !fbOtpDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`fb-otp-${idx - 1}`);
      if (prevInput) {
        const newDigits = [...fbOtpDigits];
        newDigits[idx - 1] = '';
        setFbOtpDigits(newDigits);
        prevInput.focus();
      }
    }
  };

  const handleVerifyFbOtp = async () => {
    const code = fbOtpDigits.join('');
    if (code.length < 6) {
      if (window.showToast) window.showToast('Vui lòng nhập mã xác thực OTP 6 chữ số!', 'warning');
      return;
    }

    if (code !== '123456') {
      if (window.showToast) window.showToast('Mã OTP không hợp lệ! Vui lòng dùng mã sandbox: 123456', 'error');
      return;
    }

    clearInterval(fbOtpTimerRef.current);
    if (window.showToast) window.showToast('Xác thực OTP thành công! Đang hoàn tất hồ sơ...', 'info');

    try {
      const response = await authService.completeGoogleSignup(
        googleUser.email,
        googleUser.name,
        googleUser.googleId,
        googleUser.phone,
        googleUser.password
      );

      if (response.success) {
        localStorage.setItem('user_role', 'customer');
        localStorage.setItem('user_display_name', googleUser.name);
        localStorage.setItem('user_phone', googleUser.phone);
        localStorage.setItem('user_email', googleUser.email);
        localStorage.setItem('user_avatar', googleUser.avatar || '');
        localStorage.setItem('user_points', '100');
        localStorage.setItem('user_tier', 'Standard Member');
        window.dispatchEvent(new Event('storage'));

        // Write cookies
        document.cookie = "UserEmail=" + googleUser.email + "; path=/; max-age=" + (30*24*60*60);
        document.cookie = "UserPhone=" + googleUser.phone + "; path=/; max-age=" + (30*24*60*60);
        if (googleUser.avatar) {
          document.cookie = "UserAvatar=" + encodeURIComponent(googleUser.avatar) + "; path=/; max-age=" + (30*24*60*60);
        }

        setSuccessMsg(`Chào mừng ${googleUser.name} gia nhập AutoWash Pro`);
        setSuccessScreen(true);
        setPanel('none');

        setTimeout(() => {
          navigate('/customer/dashboard');
        }, 2000);
      } else {
        if (window.showToast) window.showToast(response.message || 'Có lỗi xảy ra!', 'error');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi đồng bộ dữ liệu với máy chủ!', 'error');
    }
  };

  const handleResendFbOtp = () => {
    startFbOtpTimer();
    if (window.showToast) window.showToast('Đã gửi lại mã xác thực SMS mới!', 'info');
  };

  return (
    <div className="login-page-wrapper" id="login-page">
      <div className="login-bg-glow-1"></div>
      <div className="login-bg-glow-2"></div>

      {/* Success Screen */}
      {successScreen && (
        <div className="login-success-screen animate-up" id="success-screen">
          <div className="success-checkmark-wrapper mb-3">
            <i className="fas fa-check"></i>
          </div>
          <h4 className="fw-bold text-success text-center">TẠO TÀI KHOẢN THÀNH CÔNG!</h4>
          <p className="text-secondary text-center small mt-2">{successMsg}</p>
        </div>
      )}

      {/* PANEL: LOGIN/REGISTER MAIN SLIDER CONTAINER */}
      {panel === 'login' && (
        <div className={`auth-container ${isRegisterActive ? 'right-panel-active' : ''}`} id="auth-container">
          
          {/* SIGN UP FORM (SLIDES FROM RIGHT ON DESKTOP, CONDITIONAL ON MOBILE) */}
          <div className="form-container sign-up-container">
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <h2 className="auth-title">Tạo tài khoản</h2>
              
              <div className="auth-input-group">
                <label className="auth-label">HỌ VÀ TÊN</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className="auth-input-field"
                    placeholder="Nguyễn Văn A"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">SỐ ĐIỆN THOẠI</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-phone"></i></span>
                  <input
                    type="tel"
                    className="auth-input-field"
                    placeholder="0912345678"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">ĐỊA CHỈ EMAIL</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-envelope"></i></span>
                  <input
                    type="email"
                    className="auth-input-field"
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">MẬT KHẨU</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-lock"></i></span>
                  <input
                    type="password"
                    className="auth-input-field"
                    placeholder="Min. 6 ký tự"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">XÁC NHẬN MẬT KHẨU</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-shield-alt"></i></span>
                  <input
                    type="password"
                    className="auth-input-field"
                    placeholder="Nhập lại mật khẩu"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-checkbox-group">
                <input
                  type="checkbox"
                  id="reg-agree"
                  checked={regAgree}
                  onChange={(e) => setRegAgree(e.target.checked)}
                />
                <label htmlFor="reg-agree">
                  Tôi đồng ý với <a href="#" onClick={(e) => e.preventDefault()}>điều khoản sử dụng</a>
                </label>
              </div>

              <button type="submit" disabled={regLoading} className="auth-btn">
                {regLoading ? 'Đang xử lý...' : 'ĐĂNG KÝ'}
              </button>

              {/* Mobile text for switching */}
              <p className="auth-switch-text d-md-none">
                Đã có tài khoản?{' '}
                <a href="#" className="auth-switch-link" onClick={(e) => { e.preventDefault(); setIsRegisterActive(false); }}>
                  Đăng nhập
                </a>
              </p>
            </form>
          </div>

          {/* SIGN IN FORM (SLIDES FROM LEFT ON DESKTOP) */}
          <div className="form-container sign-in-container">
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <h2 className="auth-title">Chào mừng trở lại</h2>
              <p className="auth-desc">Đăng nhập để quản lý lịch rửa xe, theo dõi trạng thái xe và nhận ưu đãi thành viên.</p>

              <div className="auth-input-group">
                <label className="auth-label">SỐ ĐIỆN THOẠI HOẶC EMAIL</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-envelope"></i></span>
                  <input
                    type="text"
                    className="auth-input-field"
                    placeholder="Nhập SĐT hoặc email"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">MẬT KHẨU</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><i className="fas fa-lock"></i></span>
                  <input
                    type="password"
                    className="auth-input-field"
                    placeholder="********"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <a href="#" onClick={(e) => { e.preventDefault(); if (window.showToast) window.showToast('Vui lòng liên hệ quản trị viên hoặc sử dụng Đổi mật khẩu qua Email OTP trong Hồ sơ!', 'info'); }} className="auth-link">
                Quên mật khẩu?
              </a>

              <button type="submit" disabled={loginLoading} className="auth-btn">
                {loginLoading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
              </button>

              <div className="auth-separator">
                <span>Hoặc đăng nhập bằng</span>
              </div>

              <div className="google-btn-container">
                <div id="google-login-btn-login"></div>
              </div>

              {/* Mobile text for switching */}
              <p className="auth-switch-text d-md-none">
                Chưa có tài khoản?{' '}
                <a href="#" className="auth-switch-link" onClick={(e) => { e.preventDefault(); setIsRegisterActive(true); }}>
                  Đăng ký ngay
                </a>
              </p>
            </form>
          </div>

          {/* SLIDER OVERLAY PANEL (DESKTOP ONLY) */}
          <div className="overlay-container">
            <div className="overlay">
              <div className="overlay-panel overlay-left">
                {/* LPR scanning camera illustration */}
                <div className="auth-illustration-box">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 3 }}>
                    <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2" strokeDasharray="6 6" className="pulsing-radar" opacity="0.6" />
                    <circle cx="50" cy="50" r="32" stroke="#38bdf8" strokeWidth="2" opacity="0.8" />
                    <rect x="30" y="38" width="40" height="28" rx="4" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="2" />
                    <circle cx="50" cy="52" r="10" fill="#0ea5e9" fillOpacity="0.2" stroke="white" strokeWidth="2" />
                    <circle cx="50" cy="52" r="4" fill="#38bdf8" />
                    <path d="M42 30h16v8H42z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
                    <circle cx="64" cy="44" r="1.5" fill="#ef4444" />
                  </svg>
                  <div className="scanning-laser" style={{
                    position: 'absolute',
                    left: '-10px',
                    width: '120px',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                    boxShadow: '0 0 10px #38bdf8'
                  }}></div>
                </div>
                <h3 className="overlay-title">Đã có tài khoản?</h3>
                <p className="overlay-desc">Đăng nhập ngay để quản lý phương tiện và theo dõi trực tiếp tiến trình lịch rửa xe của bạn.</p>
                <button className="overlay-btn" onClick={() => setIsRegisterActive(false)}>ĐĂNG NHẬP</button>
              </div>
              <div className="overlay-panel overlay-right">
                {/* Sleek floating car illustration */}
                <div className="auth-illustration-box">
                  <svg width="130" height="90" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="floating-car" style={{ zIndex: 3 }}>
                    <circle cx="35" cy="55" r="10" fill="#1e293b" stroke="white" strokeWidth="2"/>
                    <circle cx="35" cy="55" r="4" fill="#94a3b8"/>
                    <circle cx="85" cy="55" r="10" fill="#1e293b" stroke="white" strokeWidth="2"/>
                    <circle cx="85" cy="55" r="4" fill="#94a3b8"/>
                    <path d="M15 45c0 0 5-17 20-20 15-3 35-3 50 3 10 4 20 17 20 17l3 3c0 0 0 7-6 7H95c0-5-5-10-10-10s-10 5-10 10H45c0-5-5-10-10-10s-10 5-10 10H18c-6 0-6-7-6-7l3-3z" fill="#0ea5e9" stroke="white" strokeWidth="2"/>
                    <path d="M42 30h20l10 10H38l4-10z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5"/>
                    <circle cx="98" cy="46" r="2.5" fill="#fbbf24"/>
                  </svg>
                </div>
                <h3 className="overlay-title">Chưa có tài khoản?</h3>
                <p className="overlay-desc">Tạo tài khoản AutoWash Pro miễn phí để nhận ngay đặc quyền tích điểm thưởng thành viên AutoWash Loyalty.</p>
                <button className="overlay-btn" onClick={() => setIsRegisterActive(true)}>ĐĂNG KÝ NGAY</button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* PANEL: OTP VERIFICATION (NORMAL SIGNUP FLOW) */}
      {panel === 'otp' && (
        <div className="glass-card text-center animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="success-checkmark-wrapper mb-3" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <i className="fas fa-mobile-alt"></i>
          </div>
          <h4 className="fw-bold mt-2">Xác thực mã OTP</h4>
          <p className="text-secondary small px-2 mt-2">
            Hệ thống đã gửi một mã xác thực 6 chữ số tới số điện thoại: <span className="text-cyan fw-bold">{regPhone}</span>
          </p>

          <div className="d-flex justify-content-center gap-2 mb-4 mt-4">
            {otpDigits.map((val, idx) => (
              <input
                key={idx}
                type="text"
                id={`otp-${idx}`}
                maxLength="1"
                className="otp-input"
                value={val}
                onChange={(e) => handleOtpInput(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              />
            ))}
          </div>

          <button onClick={handleVerifyOtp} className="app-btn-primary mb-3 py-3 w-100 border-0" style={{ borderRadius: '12px', fontSize: '0.85rem' }}>
            XÁC NHẬN MÃ <i className="fas fa-check-circle ms-1"></i>
          </button>

          <div className="text-center mt-3">
            {!showResendOtp ? (
              <p className="text-secondary small">
                Gửi lại mã sau <span className="text-cyan fw-bold">{otpTimerSec}</span>s
              </p>
            ) : (
              <button className="btn btn-link text-cyan text-decoration-none small fw-bold p-0" onClick={handleResendOtp}>
                Gửi lại mã OTP
              </button>
            )}
            <br />
            <button onClick={() => setPanel('login')} className="btn btn-link text-secondary text-decoration-none small mt-2 p-0">
              Quay lại đăng ký
            </button>
          </div>
        </div>
      )}

      {/* PANEL: GOOGLE SIGNUP COMPLETE */}
      {panel === 'google-complete' && googleUser && (
        <div className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <h4 className="mb-3 text-center fw-bold" style={{ fontSize: '1.2rem' }}>Hoàn tất đăng ký</h4>
          <p className="text-secondary text-center small mb-4">
            Vui lòng cung cấp số điện thoại và mật khẩu để đồng bộ tài khoản Google của bạn.
          </p>

          <form onSubmit={handleGoogleCompleteSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">HỌ VÀ TÊN (GOOGLE)</label>
              <div className="auth-input-wrapper" style={{ opacity: 0.8, backgroundColor: '#f8fafc' }}>
                <span className="auth-input-icon"><i className="fas fa-user-circle"></i></span>
                <input type="text" className="auth-input-field" readOnly value={googleUser.name} style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">ĐỊA CHỈ EMAIL</label>
              <div className="auth-input-wrapper" style={{ opacity: 0.8, backgroundColor: '#f8fafc' }}>
                <span className="auth-input-icon"><i className="fas fa-envelope"></i></span>
                <input type="email" className="auth-input-field" readOnly value={googleUser.email} style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">SỐ ĐIỆN THOẠI</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><i className="fas fa-phone"></i></span>
                <input
                  type="tel"
                  className="auth-input-field"
                  placeholder="Ví dụ: 0901234567"
                  value={completePhone}
                  onChange={(e) => setCompletePhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">MẬT KHẨU</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><i className="fas fa-lock"></i></span>
                <input
                  type="password"
                  className="auth-input-field"
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  value={completePassword}
                  onChange={(e) => setCompletePassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">XÁC NHẬN MẬT KHẨU</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><i className="fas fa-shield-alt"></i></span>
                <input
                  type="password"
                  className="auth-input-field"
                  placeholder="Nhập lại mật khẩu mới"
                  value={completeConfirm}
                  onChange={(e) => setCompleteConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-checkbox-group">
              <input
                type="checkbox"
                id="complete-agree"
                checked={completeAgree}
                onChange={(e) => setCompleteAgree(e.target.checked)}
              />
              <label htmlFor="complete-agree">
                Tôi đồng ý với <a href="#" onClick={(e) => e.preventDefault()}>điều khoản sử dụng</a>
              </label>
            </div>

            <button type="submit" className="auth-btn border-0 py-3 mt-2 w-100">
              GỬI MÃ XÁC THỰC OTP <i className="fas fa-paper-plane ms-1"></i>
            </button>
          </form>
        </div>
      )}

      {/* PANEL: FIREBASE OTP (FOR GOOGLE SIGNUP FLOW) */}
      {panel === 'firebase-otp' && googleUser && (
        <div className="glass-card text-center animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="success-checkmark-wrapper mb-3" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <h4 className="fw-bold mt-2">Xác thực OTP</h4>
          <p className="text-secondary small px-2 mt-2">
            Hệ thống đã gửi mã OTP xác nhận về số điện thoại: <span className="text-cyan fw-bold">{googleUser.phone}</span>
          </p>

          <div className="d-flex justify-content-center gap-2 mb-4 mt-4">
            {fbOtpDigits.map((val, idx) => (
              <input
                key={idx}
                type="text"
                id={`fb-otp-${idx}`}
                maxLength="1"
                className="otp-input"
                value={val}
                onChange={(e) => handleFbOtpInput(idx, e.target.value)}
                onKeyDown={(e) => handleFbOtpKeyDown(idx, e)}
              />
            ))}
          </div>

          <button onClick={handleVerifyFbOtp} className="app-btn-primary mb-3 py-3 w-100 border-0" style={{ borderRadius: '12px', fontSize: '0.85rem' }}>
            XÁC NHẬN MÃ <i className="fas fa-check-circle ms-1"></i>
          </button>

          <div className="text-center mt-3">
            {!showFbResendOtp ? (
              <p className="text-secondary small">
                Gửi lại mã sau <span className="text-cyan fw-bold">
                  {Math.floor(fbOtpTimerSec / 60)}:{(fbOtpTimerSec % 60) < 10 ? '0' : ''}{fbOtpTimerSec % 60}
                </span>s
              </p>
            ) : (
              <button className="btn btn-link text-cyan text-decoration-none small fw-bold p-0" onClick={handleResendFbOtp}>
                Gửi lại mã OTP qua SMS
              </button>
            )}
            <br />
            <button onClick={() => setPanel('google-complete')} className="btn btn-link text-secondary text-decoration-none small mt-2 p-0">
              Thay đổi thông tin liên hệ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
