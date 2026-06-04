import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/profile.css';

export const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  
  // Profile Update State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtpMode, setEmailOtpMode] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
    }
  }, [user]);

  // Profile Update
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập họ và tên!', 'warning');
      return;
    }

    setProfileLoading(true);
    try {
      const response = await customerService.updateProfile(profileName, profilePhone);
      if (response.success) {
        updateUser({ name: profileName, phone: profilePhone });
        // Update cookies
        document.cookie = "UserPhone=" + profilePhone + "; path=/; max-age=" + (30*24*60*60);
        if (window.showToast) window.showToast('Cập nhật hồ sơ thành công vào cơ sở dữ liệu!', 'success');
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi cập nhật hồ sơ!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Lỗi kết nối máy chủ!', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change Password
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      if (window.showToast) window.showToast('Vui lòng điền mật khẩu mới!', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      if (window.showToast) window.showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      if (window.showToast) window.showToast('Mật khẩu phải chứa ít nhất 6 ký tự!', 'error');
      return;
    }

    setPwLoading(true);

    // Method 1: Email OTP (if verified email OTP before)
    if (emailOtpMode) {
      try {
        const response = await customerService.verifyEmailAndChangePassword(user.email, emailOtp, newPassword);
        if (response.success) {
          if (window.showToast) window.showToast('Thay đổi mật khẩu thành công!', 'success');
          setEmailOtpMode(false);
          setEmailOtp('');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          if (window.showToast) window.showToast(response.message || 'Lỗi đổi mật khẩu OTP!', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(err.response?.data?.message || 'Mã OTP không đúng hoặc hết hạn!', 'error');
      } finally {
        setPwLoading(false);
      }
      return;
    }

    // Method 2: Phone OTP / Current password directly
    try {
      const response = await customerService.changePasswordWithPhoneOtp(user.phone, currentPassword, newPassword);
      if (response.success) {
        if (window.showToast) window.showToast('Thay đổi mật khẩu thành công!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi đổi mật khẩu!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác!', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  // Send Email OTP for password change
  const handleSendEmailOtp = async () => {
    setPwLoading(true);
    try {
      const response = await customerService.sendEmailOtp(user.email);
      if (response.success) {
        setEmailOtpMode(true);
        if (window.showToast) window.showToast(response.message || 'Mã OTP đã được gửi đến Email!', 'success');
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi gửi Email OTP!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Không thể kết nối máy chủ gửi Email!', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          {/* Profile Form */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-id-card text-cyan me-2"></i>THÔNG TIN CÁ NHÂN
            </h5>
            <form onSubmit={handleUpdateProfileSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">HỌ VÀ TÊN</label>
                <div className="input-group glass-input-group">
                  <span className="input-group-text"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">SỐ ĐIỆN THOẠI</label>
                <div className="input-group glass-input-group">
                  <span className="input-group-text"><i className="fas fa-phone"></i></span>
                  <input
                    type="tel"
                    className="form-control"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">ĐỊA CHỈ EMAIL</label>
                <div className="input-group glass-input-group form-group-disabled" style={{ opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                  <input type="email" className="form-control" readOnly value={user?.email || ''} style={{ pointerEvents: 'none' }} />
                </div>
              </div>
              <button type="submit" disabled={profileLoading} className="app-btn-primary py-2.5 shadow-none w-100" style={{ borderRadius: '12px' }}>
                {profileLoading ? 'ĐANG LƯU...' : 'CẬP NHẬT HỒ SƠ'}
              </button>
            </form>
          </div>

          {/* Password Form */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-shield-alt text-cyan me-2"></i>THAY ĐỔI MẬT KHẨU
              </h5>
              {!emailOtpMode && (
                <button
                  type="button"
                  className="btn btn-link p-0 text-cyan small fw-bold text-decoration-none"
                  style={{ fontSize: '0.75rem' }}
                  onClick={handleSendEmailOtp}
                >
                  Đổi qua Email OTP
                </button>
              )}
            </div>

            <form onSubmit={handleChangePasswordSubmit}>
              {emailOtpMode ? (
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">MÃ EMAIL OTP</label>
                  <div className="input-group glass-input-group">
                    <span className="input-group-text"><i className="fas fa-key"></i></span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="Nhập mã 6 chữ số gửi qua email"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">MẬT KHẨU HIỆN TẠI</label>
                  <div className="input-group glass-input-group">
                    <span className="input-group-text"><i className="fas fa-lock"></i></span>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">MẬT KHẨU MỚI</label>
                <div className="input-group glass-input-group">
                  <span className="input-group-text"><i className="fas fa-lock-open"></i></span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Mật khẩu mới ít nhất 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">XÁC NHẬN MẬT KHẨU MỚI</label>
                <div className="input-group glass-input-group">
                  <span className="input-group-text"><i className="fas fa-lock-open"></i></span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                {emailOtpMode && (
                  <button
                    type="button"
                    className="app-btn-secondary py-2.5 w-50"
                    style={{ borderRadius: '12px' }}
                    onClick={() => {
                      setEmailOtpMode(false);
                      setEmailOtp('');
                    }}
                  >
                    HỦY OTP
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className={`app-btn-primary py-2.5 shadow-none ${emailOtpMode ? 'w-50' : 'w-100'}`}
                  style={{ borderRadius: '12px' }}
                >
                  {pwLoading ? 'ĐANG LƯU...' : 'ĐỔI MẬT KHẨU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerProfile;
