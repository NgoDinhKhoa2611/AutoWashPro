import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/login.css';

export const Login = () => {
  const { user, loading, login, register, googleLogin, completeGoogleSignup } = useAuth();
  const navigate = useNavigate();

  const navigateByRole = (role) => {
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'staff') {
      navigate('/admin/queue');
    } else {
      navigate('/customer');
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigateByRole(user.role);
    }
  }, [user, loading, navigate]);

  // Panels: 'login' (controls both signin/signup sliders) | 'otp' | 'google-complete'
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
  const [tempRegData, setTempRegData] = useState({ name: '', phone: '', email: '' });

  // Otp States (Normal Register)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimerSec, setOtpTimerSec] = useState(59);
  const [showResendOtp, setShowResendOtp] = useState(false);
  const otpTimerRef = useRef(null);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotTimerSec, setForgotTimerSec] = useState(59);
  const [showForgotResend, setShowForgotResend] = useState(false);
  const forgotTimerRef = useRef(null);

  // Google completion
  const [googleUser, setGoogleUser] = useState(null);
  const [completePhone, setCompletePhone] = useState('');
  const [completePassword, setCompletePassword] = useState('');
  const [completeConfirm, setCompleteConfirm] = useState('');
  const [completeAgree, setCompleteAgree] = useState(false);

  useEffect(() => {
    // Google Sign-In button rendering inside the login panel
    const initGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn("[Google Sign-In Warning] VITE_GOOGLE_CLIENT_ID is not configured in the environment variables. Google login is disabled.");
        return;
      }
      if (window.google && panel === 'login') {
        window.google.accounts.id.initialize({
          client_id: clientId,
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
      clearInterval(forgotTimerRef.current);
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

      // Call useAuth's googleLogin instead of direct authService
      const data = await googleLogin(email, name, googleId);
      
      if (data && data.success) {
        if (data.isNewUser) {
          // Google signup is incomplete, prompt SĐT
          setGoogleUser({ email, name, googleId, avatar });
          setPanel('google-complete');
          if (window.showToast) window.showToast('Vui lòng hoàn tất số điện thoại và mật khẩu!', 'info');
        } else {
          // Returning user
          if (window.showToast) window.showToast(`Đăng nhập Google thành công! Chào mừng ${name}`, 'success');
          setTimeout(() => { navigateByRole(data.role); }, 1200);
        }
      } else {
        if (window.showToast) window.showToast("Xác thực hệ thống lỗi: " + (data?.message || ""), "error");
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
        navigateByRole(data.role);
      }, 700);
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Tài khoản hoặc mật khẩu không đúng!', 'error');
      setLoginLoading(false);
    }
  };

  // Registration submission (Simulating OTP sandbox check)
  // Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      if (window.showToast) window.showToast('Vui lòng điền đầy đủ tất cả các trường!', 'warning');
      return;
    }
    if (!regAgree) {
      if (window.showToast) window.showToast('Vui lòng đồng ý với điều khoản sử dụng!', 'warning');
      return;
    }
    const cleanPhone = regPhone.trim();
    if (!/^0(3[2-9]|5[2569]|7[06-9]|8[1-9]|9[0-9])\d{7}$/.test(cleanPhone)) {
      if (window.showToast) window.showToast('Số điện thoại không hợp lệ! Vui lòng nhập đúng số di động Việt Nam (ví dụ: 0912345678).', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      if (window.showToast) window.showToast('Địa chỉ email không hợp lệ!', 'warning');
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
    try {
      const res = await authService.sendRegisterOtp(regEmail.trim());
      if (res.success) {
        setTempRegData({ name: regName, phone: regPhone, email: regEmail });
        setPanel('otp');
        startOtpTimer();
        if (window.showToast) window.showToast('Mã OTP đã được gửi về Gmail của bạn!', 'success');
      } else {
        if (window.showToast) window.showToast(res.message || 'Lỗi gửi mã OTP!', 'error');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi OTP!', 'error');
    } finally {
      setRegLoading(false);
    }
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


  // Normal OTP inputs
  const handleOtpInput = (idx, val) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[idx] = clean.substring(0, 1);
    setOtpDigits(newDigits);

    if (clean && idx < 6) {
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

    const name = tempRegData.name || regName || 'Người dùng mới';
    const phone = tempRegData.phone || regPhone;
    const email = tempRegData.email || regEmail;

    try {
      // Gọi API đăng ký thực tế
      await register(email, name, phone, regPassword, code);

      setTempRegData({ name: '', phone: '', email: '' });

      setSuccessMsg(`Chào mừng ${name} gia nhập AutoWash Pro`);
      setSuccessScreen(true);
      setPanel('none');

      setTimeout(() => {
        navigateByRole('customer');
      }, 2000);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Lỗi đăng ký tài khoản mới lên cơ sở dữ liệu!';
      if (window.showToast) window.showToast(errMsg, 'error');
      startOtpTimer();
    }
  };

  const handleResendOtp = async () => {
    const email = tempRegData.email || regEmail;
    try {
      await authService.sendRegisterOtp(email.trim());
      startOtpTimer();
      if (window.showToast) window.showToast('Đã gửi lại mã OTP mới qua Gmail!', 'info');
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi khi gửi lại OTP!', 'error');
    }
  };

  // Google Profile completion Form
  const handleGoogleCompleteSubmit = async (e) => {
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
    if (!/^0(3[2-9]|5[2569]|7[06-9]|8[1-9]|9[0-9])\d{7}$/.test(cleanPhone)) {
      if (window.showToast) window.showToast('Số điện thoại không hợp lệ! Vui lòng nhập đúng số di động Việt Nam (ví dụ: 0912345678).', 'warning');
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

    if (window.showToast) window.showToast('Đang hoàn tất hồ sơ...', 'info');

    try {
      const response = await completeGoogleSignup(
        googleUser.email,
        googleUser.name,
        googleUser.googleId,
        cleanPhone,
        completePassword
      );

      if (response.success) {
        setSuccessMsg(`Chào mừng ${googleUser.name} gia nhập AutoWash Pro`);
        setSuccessScreen(true);
        setPanel('none');

        setTimeout(() => {
          navigateByRole('customer');
        }, 2000);
      } else {
        if (window.showToast) window.showToast(response.message || 'Có lỗi xảy ra!', 'error');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi đồng bộ dữ liệu với máy chủ!', 'error');
    }
  };



  // Forgot password — step 1: send OTP
  const startForgotTimer = () => {
    setForgotTimerSec(59);
    setShowForgotResend(false);
    clearInterval(forgotTimerRef.current);
    forgotTimerRef.current = setInterval(() => {
      setForgotTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(forgotTimerRef.current);
          setShowForgotResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      if (window.showToast) window.showToast('Vui lòng nhập địa chỉ email!', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (window.showToast) window.showToast('Địa chỉ email không hợp lệ!', 'warning');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await customerService.sendEmailOtp(email);
      if (res.success) {
        setForgotOtpDigits(['', '', '', '', '', '']);
        setForgotNewPassword('');
        setForgotConfirm('');
        setPanel('forgot-otp');
        startForgotTimer();
        if (window.showToast) window.showToast('Mã OTP đã được gửi về Gmail của bạn!', 'success');
      } else {
        if (window.showToast) window.showToast(res.message || 'Lỗi gửi mã OTP!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi OTP!', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpKeyDown = (idx, e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const newDigits = [...forgotOtpDigits];
      newDigits[idx] = e.key;
      setForgotOtpDigits(newDigits);
      if (idx < 5) {
        document.getElementById(`fotp-${idx + 1}`)?.focus();
      }
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...forgotOtpDigits];
      if (newDigits[idx]) {
        newDigits[idx] = '';
        setForgotOtpDigits(newDigits);
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        setForgotOtpDigits(newDigits);
        document.getElementById(`fotp-${idx - 1}`)?.focus();
      }
    }
  };

  const handleForgotOtpInput = (idx, val) => {
    // Only handles paste (onKeyDown + preventDefault covers individual keystrokes)
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      const newDigits = [...forgotOtpDigits];
      clean.split('').slice(0, 6 - idx).forEach((d, i) => { newDigits[idx + i] = d; });
      setForgotOtpDigits(newDigits);
      document.getElementById(`fotp-${Math.min(idx + clean.length - 1, 5)}`)?.focus();
    }
  };

  // Forgot password — step 2: verify OTP + reset password
  const handleForgotVerify = async () => {
    const code = forgotOtpDigits.join('');
    if (code.length < 6) {
      if (window.showToast) window.showToast('Vui lòng nhập đầy đủ mã 6 chữ số!', 'warning');
      return;
    }
    if (!forgotNewPassword || !forgotConfirm) {
      if (window.showToast) window.showToast('Vui lòng nhập mật khẩu mới!', 'warning');
      return;
    }
    if (forgotNewPassword !== forgotConfirm) {
      if (window.showToast) window.showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }
    if (forgotNewPassword.length < 6) {
      if (window.showToast) window.showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await customerService.verifyEmailAndChangePassword(forgotEmail.trim(), code, '', forgotNewPassword);
      if (res.success) {
        clearInterval(forgotTimerRef.current);
        if (window.showToast) window.showToast('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
        setForgotEmail('');
        setForgotOtpDigits(['', '', '', '', '', '']);
        setForgotNewPassword('');
        setForgotConfirm('');
        setPanel('login');
      } else {
        if (window.showToast) window.showToast(res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!', 'error');
    } finally {
      setForgotLoading(false);
    }
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

              <a href="#" onClick={(e) => { e.preventDefault(); setForgotEmail(''); setPanel('forgot'); }} className="auth-link">
                Quên mật khẩu?
              </a>

              <button type="submit" disabled={loginLoading} className="auth-btn">
                {loginLoading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
              </button>

              {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <>
                  <div className="auth-separator">
                    <span>Hoặc đăng nhập bằng</span>
                  </div>

                  <div className="google-btn-container">
                    <div id="google-login-btn-login"></div>
                  </div>
                </>
              )}

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
            <i className="fas fa-envelope"></i>
          </div>
          <h4 className="fw-bold mt-2">Xác thực mã OTP</h4>
          <p className="text-secondary small px-2 mt-2">
            Hệ thống đã gửi một mã xác thực 6 chữ số tới địa chỉ email: <span className="text-cyan fw-bold">{regEmail}</span>
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

      {/* PANEL: FORGOT PASSWORD — STEP 1: EMAIL INPUT */}
      {panel === 'forgot' && (
        <div className="glass-card animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="success-checkmark-wrapper mb-3" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <i className="fas fa-key"></i>
          </div>
          <h4 className="fw-bold mt-2 text-center">Quên mật khẩu</h4>
          <p className="text-secondary small px-2 mt-2 text-center">
            Nhập địa chỉ email đã đăng ký. Hệ thống sẽ gửi mã OTP để xác thực và đặt lại mật khẩu mới.
          </p>

          <form onSubmit={handleForgotSendOtp} className="mt-4">
            <div className="auth-input-group">
              <label className="auth-label">ĐỊA CHỈ EMAIL</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><i className="fas fa-envelope"></i></span>
                <input
                  type="email"
                  className="auth-input-field"
                  placeholder="email@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={forgotLoading} className="app-btn-primary mb-3 py-3 w-100 border-0 mt-2" style={{ borderRadius: '12px', fontSize: '0.85rem' }}>
              {forgotLoading ? 'Đang gửi...' : 'GỬI MÃ OTP'} <i className="fas fa-paper-plane ms-1"></i>
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setPanel('login')} className="btn btn-link text-secondary text-decoration-none small p-0">
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      )}

      {/* PANEL: FORGOT PASSWORD — STEP 2: OTP + NEW PASSWORD */}
      {panel === 'forgot-otp' && (
        <div className="glass-card text-center animate-up" style={{ width: '100%', maxWidth: '420px', zIndex: 10 }}>
          <div className="success-checkmark-wrapper mb-3" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <h4 className="fw-bold mt-2">Đặt lại mật khẩu</h4>
          <p className="text-secondary small px-2 mt-2">
            Nhập mã OTP 6 chữ số đã gửi đến <span className="text-cyan fw-bold">{forgotEmail}</span> và mật khẩu mới của bạn.
          </p>

          <div className="d-flex justify-content-center gap-2 mb-4 mt-4">
            {forgotOtpDigits.map((val, idx) => (
              <input
                key={idx}
                type="text"
                id={`fotp-${idx}`}
                inputMode="numeric"
                autoComplete="off"
                className="otp-input"
                value={val}
                placeholder=""
                onChange={(e) => handleForgotOtpInput(idx, e.target.value)}
                onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <div className="auth-input-group text-start mb-3">
            <label className="auth-label">MẬT KHẨU MỚI</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><i className="fas fa-lock-open"></i></span>
              <input
                type="password"
                className="auth-input-field"
                placeholder="Mật khẩu mới ít nhất 6 ký tự"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-input-group text-start mb-4">
            <label className="auth-label">XÁC NHẬN MẬT KHẨU MỚI</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon"><i className="fas fa-lock"></i></span>
              <input
                type="password"
                className="auth-input-field"
                placeholder="Nhập lại mật khẩu mới"
                value={forgotConfirm}
                onChange={(e) => setForgotConfirm(e.target.value)}
              />
            </div>
          </div>

          <button onClick={handleForgotVerify} disabled={forgotLoading} className="app-btn-primary mb-3 py-3 w-100 border-0" style={{ borderRadius: '12px', fontSize: '0.85rem' }}>
            {forgotLoading ? 'Đang xử lý...' : 'ĐẶT LẠI MẬT KHẨU'} <i className="fas fa-check-circle ms-1"></i>
          </button>

          <div className="text-center mt-1">
            {!showForgotResend ? (
              <p className="text-secondary small">
                Gửi lại mã sau <span className="text-cyan fw-bold">{forgotTimerSec}</span>s
              </p>
            ) : (
              <button
                className="btn btn-link text-cyan text-decoration-none small fw-bold p-0"
                onClick={async () => {
                  try {
                    const res = await customerService.sendEmailOtp(forgotEmail.trim());
                    if (res.success) {
                      startForgotTimer();
                      if (window.showToast) window.showToast('Đã gửi lại mã OTP mới!', 'info');
                    }
                  } catch {
                    if (window.showToast) window.showToast('Lỗi khi gửi lại OTP!', 'error');
                  }
                }}
              >
                Gửi lại mã OTP
              </button>
            )}
            <br />
            <button onClick={() => setPanel('forgot')} className="btn btn-link text-secondary text-decoration-none small mt-2 p-0">
              Đổi email khác
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
              HOÀN TẤT HỒ SƠ <i className="fas fa-check-circle ms-1"></i>
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default Login;
