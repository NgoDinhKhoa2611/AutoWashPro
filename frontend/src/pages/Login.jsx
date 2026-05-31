import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import '../styles/shared.css';
import '../styles/login.css';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Panels: 'login' | 'register' | 'otp' | 'google-complete' | 'firebase-otp'
  const [panel, setPanel] = useState('login');
  const [successScreen, setSuccessScreen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Chào mừng bạn gia nhập AutoWash Pro');

  // Input states
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimerSec, setOtpTimerSec] = useState(59);
  const [showResendOtp, setShowResendOtp] = useState(false);
  const otpTimerRef = useRef(null);

  // Google completion & Firebase OTP
  const [googleUser, setGoogleUser] = useState(null);
  const [completePhone, setCompletePhone] = useState('');
  const [completePassword, setCompletePassword] = useState('');
  const [completeConfirm, setCompleteConfirm] = useState('');
  
  const [fbOtpDigits, setFbOtpDigits] = useState(['', '', '', '', '', '']);
  const [fbOtpTimerSec, setFbOtpTimerSec] = useState(300);
  const [showFbResendOtp, setShowFbResendOtp] = useState(false);
  const fbOtpTimerRef = useRef(null);

  useEffect(() => {
    // Google Sign-In button rendering
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "40329422268-s3m1sqlniabg1f8o7roo5pmfckb4j3te.apps.googleusercontent.com",
          callback: handleGoogleCredential
        });

        const renderBtns = () => {
          const containerLogin = document.getElementById("google-login-btn-login");
          if (containerLogin) {
            window.google.accounts.id.renderButton(containerLogin, {
              theme: "outline",
              size: "large",
              width: 360,
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left"
            });
          }
          const containerReg = document.getElementById("google-login-btn-register");
          if (containerReg) {
            window.google.accounts.id.renderButton(containerReg, {
              theme: "outline",
              size: "large",
              width: 360,
              text: "signup_with",
              shape: "pill",
              logo_alignment: "left"
            });
          }
        };

        // Render initially
        renderBtns();
        // Fallback for panel transitions
        setTimeout(renderBtns, 200);
      } else {
        setTimeout(initGoogle, 100);
      }
    };

    initGoogle();

    return () => {
      clearInterval(otpTimerRef.current);
      clearInterval(fbOtpTimerRef.current);
    };
  }, [panel]);

  // Google callback
  const handleGoogleCredential = async (response) => {
    try {
      const payload = decodeJwt(response.credential);
      console.log("Google Login Success! Raw payload:", payload);

      const email = payload.email;
      const name = payload.name || "Người dùng Google";
      const avatar = payload.picture || "";
      const googleId = payload.sub || "";

      // Call backend
      const data = await authService.googleLogin(email, name, googleId);
      
      if (data && data.success) {
        if (data.isNewUser) {
          // Google signup is incomplete
          setGoogleUser({ email, name, googleId, avatar });
          setPanel('google-complete');
          if (window.showToast) window.showToast('Vui lòng hoàn tất số điện thoại và mật khẩu đăng nhập!', 'info');
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

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginPassword.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền đầy đủ thông tin đăng nhập!', 'warning');
      return;
    }

    setLoginLoading(true);
    try {
      const data = await login(loginPhone, loginPassword);
      if (window.showToast) {
        window.showToast(
          data.role === 'admin' || data.role === 'staff'
            ? 'Đăng nhập Admin thành công!'
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

  // Registration handler
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regPassword || !regConfirm) {
      if (window.showToast) window.showToast('Vui lòng điền đầy đủ tất cả các trường!', 'warning');
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

    localStorage.setItem('reg_name_temp', regName);
    localStorage.setItem('reg_phone_temp', regPhone);
    setPanel('otp');
    startOtpTimer();
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

  // Local OTP inputs
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

  const handleVerifyOtp = () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      if (window.showToast) window.showToast('Vui lòng nhập đầy đủ mã 6 chữ số!', 'warning');
      return;
    }

    clearInterval(otpTimerRef.current);

    const name = localStorage.getItem('reg_name_temp') || 'Người dùng mới';
    const phone = localStorage.getItem('reg_phone_temp') || regPhone;

    localStorage.setItem('user_role', 'customer');
    localStorage.setItem('user_display_name', name);
    localStorage.setItem('user_phone', phone);
    localStorage.setItem('user_points', '550');
    localStorage.setItem('user_tier', 'Gold Member');
    localStorage.setItem('user_next_tier', 'Platinum');
    localStorage.setItem('user_remaining_spend', '250k');
    localStorage.removeItem('reg_name_temp');
    localStorage.removeItem('reg_phone_temp');
    window.dispatchEvent(new Event('storage'));

    setSuccessMsg(`Chào mừng ${name} gia nhập AutoWash Pro`);
    setSuccessScreen(true);
    setPanel('none');
    
    // Simulate setting session variables on backend
    document.cookie = "UserPhone=" + phone + "; path=/; max-age=" + (30*24*60*60);

    setTimeout(() => {
      navigate('/customer/dashboard');
    }, 2200);
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

    const cleanPhone = completePhone.replace(/[-\s]/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) {
      if (window.showToast) window.showToast('Số điện thoại không hợp lệ! Định dạng 10 chữ số (ví dụ: 0912345678).', 'warning');
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

    // Simulate sending SMS, trigger Firebase OTP screen
    setTimeout(() => {
      if (window.showToast) window.showToast('Mã OTP (Firebase Sandbox) đã gửi: 123456', 'success');
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
      if (window.showToast) window.showToast('Mã OTP Sandbox không hợp lệ! Vui lòng dùng: 123456', 'error');
      return;
    }

    clearInterval(fbOtpTimerRef.current);
    if (window.showToast) window.showToast('Xác thực OTP thành công! Đang đồng bộ tài khoản...', 'info');

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
        }, 2200);
      } else {
        if (window.showToast) window.showToast(response.message || 'Có lỗi xảy ra!', 'error');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Không thể kết nối đến máy chủ C#!', 'error');
    }
  };

  const handleResendFbOtp = () => {
    startFbOtpTimer();
    if (window.showToast) window.showToast('Đã gửi lại mã xác thực Firebase mới!', 'info');
  };

  return (
    <div className="login-page-wrapper" id="login-page">
      <div className="login-bg-glow-1"></div>
      <div className="login-bg-glow-2"></div>

      {/* Success Screen */}
      {successScreen && (
        <div className="login-success-screen animate-up" id="success-screen" style={{ display: 'flex' }}>
          <div className="success-checkmark-wrapper mb-4">
            <i className="fas fa-check-circle fa-5x text-success" style={{ textShadow: '0 4px 15px rgba(16,185,129,0.2)' }}></i>
          </div>
          <h3 className="fw-bold text-success text-center">ĐĂNG KÝ THÀNH CÔNG!</h3>
          <p className="text-secondary text-center small mt-2" id="success-msg">{successMsg}</p>
        </div>
      )}

      {/* Brand Header */}
      {panel !== 'otp' && panel !== 'firebase-otp' && !successScreen && (
        <div className="text-center mb-4 animate-up animate-delay-1" style={{ zIndex: 10 }}>
          <div className="login-brand-icon">
            <i className="fas fa-car-side text-cyan fa-2x"></i>
          </div>
          <h3 className="fw-bold text-dark mb-0">AutoWash <span className="text-cyan">Pro</span></h3>
          <p className="text-secondary small" style={{ fontSize: '0.75rem' }}>Hệ Thống Quản Lý Rửa Xe Thông Minh</p>
        </div>
      )}

      {/* PANEL: LOGIN */}
      {panel === 'login' && (
        <div id="panel-login" className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <h4 className="mb-4 text-center fw-bold" style={{ letterSpacing: '1px', fontSize: '1.15rem' }}>
            ĐĂNG NHẬP HỆ THỐNG
          </h4>
          <form id="login-form" onSubmit={handleLoginSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">TÀI KHOẢN / SỐ ĐIỆN THOẠI</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-user"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tài khoản hoặc SĐT"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">MẬT KHẨU</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-lock"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="********"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="text-center mb-3">
              <small className="text-secondary" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-info-circle text-cyan me-1"></i>
                Hệ thống sẽ tự nhận diện vai trò tài khoản
              </small>
            </div>
            <button type="submit" disabled={loginLoading} className="app-btn-primary mb-3 py-3" style={{ fontSize: '0.85rem' }}>
              {loginLoading ? (
                <>Đang xử lý... <i className="fas fa-spinner fa-spin ms-2"></i></>
              ) : (
                <>ĐĂNG NHẬP <i className="fas fa-sign-in-alt ms-2"></i></>
              )}
            </button>
          </form>

          <div className="auth-separator my-3">
            <span>Hoặc đăng nhập bằng</span>
          </div>
          <div id="google-login-btn-login" className="d-flex justify-content-center mb-3 w-100"></div>

          <div className="text-center mt-3">
            <p className="text-secondary small mb-0">
              Chưa có tài khoản?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setPanel('register'); }} className="text-cyan text-decoration-none fw-bold">
                Đăng ký ngay
              </a>
            </p>
          </div>
        </div>
      )}

      {/* PANEL: REGISTER */}
      {panel === 'register' && (
        <div id="panel-register" className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <h4 className="mb-4 text-center fw-bold" style={{ letterSpacing: '1px', fontSize: '1.15rem' }}>
            ĐĂNG KÝ TÀI KHOẢN
          </h4>
          <form id="register-form" onSubmit={handleRegisterSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">HỌ VÀ TÊN</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-user"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">SỐ ĐIỆN THOẠI</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-phone"></i></span>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Nhập số điện thoại đăng ký"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">MẬT KHẨU</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-lock"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">XÁC NHẬN MẬT KHẨU</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-shield-alt"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="app-btn-primary mb-3 py-3" style={{ fontSize: '0.85rem' }}>
              ĐĂNG KÝ NGAY <i className="fas fa-user-plus ms-2"></i>
            </button>
          </form>

          <div className="auth-separator my-3">
            <span>Hoặc đăng ký bằng</span>
          </div>
          <div id="google-login-btn-register" className="d-flex justify-content-center mb-3 w-100"></div>

          <div className="text-center mt-2">
            <a href="#" onClick={(e) => { e.preventDefault(); setPanel('login'); }} className="text-cyan text-decoration-none small fw-bold">
              <i className="fas fa-arrow-left me-2"></i> Quay lại Đăng nhập
            </a>
          </div>
        </div>
      )}

      {/* PANEL: OTP VERIFICATION */}
      {panel === 'otp' && (
        <div id="panel-otp" className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="text-center mb-4">
            <div className="login-brand-icon d-inline-flex align-items-center justify-content-center" style={{ width: '65px', height: '65px' }}>
              <i className="fas fa-mobile-alt text-cyan fa-lg"></i>
            </div>
            <h4 className="fw-bold mt-2">Xác Thực Mã OTP</h4>
            <p className="text-secondary small px-2 mt-2">
              Chúng tôi đã gửi mã xác thực 6 chữ số tới số điện thoại{' '}
              <span className="text-cyan fw-bold">{regPhone}</span>
            </p>
          </div>

          <div className="d-flex justify-content-center gap-2 mb-4">
            {otpDigits.map((val, idx) => (
              <input
                key={idx}
                type="text"
                id={`otp-${idx}`}
                maxLength="1"
                className={`otp-input ${val ? 'filled' : ''}`}
                value={val}
                onChange={(e) => handleOtpInput(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              />
            ))}
          </div>

          <button onClick={handleVerifyOtp} className="app-btn-primary mb-3 py-3" style={{ fontSize: '0.85rem' }}>
            XÁC NHẬN MÃ <i className="fas fa-check-circle ms-2"></i>
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
            <button onClick={() => setPanel('register')} className="btn btn-link text-secondary text-decoration-none small mt-2 p-0">
              <i className="fas fa-edit me-1"></i> Thay đổi số điện thoại
            </button>
          </div>
        </div>
      )}

      {/* PANEL: GOOGLE SIGNUP COMPLETE */}
      {panel === 'google-complete' && googleUser && (
        <div id="panel-google-complete" className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <h4 className="mb-4 text-center fw-bold" style={{ letterSpacing: '1px', fontSize: '1.15rem' }}>
            HOÀN TẤT ĐĂNG KÝ
          </h4>
          <p className="text-secondary text-center small mb-4">
            Vui lòng cung cấp số điện thoại và mật khẩu để hoàn tất liên kết tài khoản Google của bạn.
          </p>

          <form id="google-complete-form" onSubmit={handleGoogleCompleteSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">HỌ VÀ TÊN (GOOGLE)</label>
              <div className="input-group glass-input-group form-group-disabled" style={{ opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <span className="input-group-text"><i className="fas fa-user-circle"></i></span>
                <input type="text" className="form-control" readOnly value={googleUser.name} style={{ pointerEvents: 'none' }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">ĐỊA CHỈ EMAIL</label>
              <div className="input-group glass-input-group form-group-disabled" style={{ opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                <input type="email" className="form-control" readOnly value={googleUser.email} style={{ pointerEvents: 'none' }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">SỐ ĐIỆN THOẠI</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-phone"></i></span>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Ví dụ: 0901234567"
                  value={completePhone}
                  onChange={(e) => setCompletePhone(e.target.value)}
                  required
                />
              </div>
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>Định dạng 10 chữ số: 0912345678</small>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">MẬT KHẨU ĐĂNG NHẬP</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-lock"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu tối thiểu 6 ký tự"
                  value={completePassword}
                  onChange={(e) => setCompletePassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">XÁC NHẬN MẬT KHẨU</label>
              <div className="input-group glass-input-group">
                <span className="input-group-text"><i className="fas fa-shield-alt"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  value={completeConfirm}
                  onChange={(e) => setCompleteConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="app-btn-primary mb-3 py-3" style={{ fontSize: '0.85rem' }} id="google-complete-submit-btn">
              GỬI MÃ XÁC THỰC OTP <i className="fas fa-paper-plane ms-2"></i>
            </button>
          </form>
        </div>
      )}

      {/* PANEL: FIREBASE OTP */}
      {panel === 'firebase-otp' && googleUser && (
        <div id="panel-firebase-otp" className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="text-center mb-4">
            <div className="login-brand-icon d-inline-flex align-items-center justify-content-center" style={{ width: '65px', height: '65px' }}>
              <i className="fas fa-shield-alt text-cyan fa-lg"></i>
            </div>
            <h4 className="fw-bold mt-2">Xác Thực Firebase OTP</h4>
            <p className="text-secondary small px-2 mt-2">
              Chúng tôi đã gửi mã xác thực 6 chữ số tới số điện thoại{' '}
              <span className="text-cyan fw-bold">{googleUser.phone}</span>
            </p>
          </div>

          <div className="d-flex justify-content-center gap-2 mb-4">
            {fbOtpDigits.map((val, idx) => (
              <input
                key={idx}
                type="text"
                id={`fb-otp-${idx}`}
                maxLength="1"
                className={`otp-input ${val ? 'filled' : ''}`}
                value={val}
                onChange={(e) => handleFbOtpInput(idx, e.target.value)}
                onKeyDown={(e) => handleFbOtpKeyDown(idx, e)}
              />
            ))}
          </div>

          <button onClick={handleVerifyFbOtp} className="app-btn-primary mb-3 py-3" style={{ fontSize: '0.85rem' }} id="firebase-otp-verify-btn">
            XÁC NHẬN MÃ <i className="fas fa-check-circle ms-2"></i>
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
              <i className="fas fa-edit me-1"></i> Thay đổi thông tin liên hệ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Login;
