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
  const [emailOtp, setEmailOtp] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Profile Update
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập họ và tên!', 'warning');
      return;
    }

    if (profilePhone && !/^0(3[2-9]|5[2569]|7[06-9]|8[1-9]|9[0-9])\d{7}$/.test(profilePhone.trim())) {
      if (window.showToast) window.showToast('Số điện thoại không hợp lệ! Vui lòng nhập đúng số di động Việt Nam (ví dụ: 0912345678).', 'warning');
      return;
    }

    setProfileLoading(true);
    try {
      const response = await customerService.updateProfile(profileName, profilePhone);
      if (response.success) {
        updateUser({ name: profileName, phone: profilePhone });
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
    if (!currentPassword.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập mật khẩu hiện tại!', 'warning');
      return;
    }
    if (!emailOtp.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập mã OTP Gmail!', 'warning');
      return;
    }
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
    try {
      const response = await customerService.verifyEmailAndChangePassword(user.email, emailOtp, currentPassword, newPassword);
      if (response.success) {
        if (window.showToast) window.showToast('Thay đổi mật khẩu thành công!', 'success');
        setEmailOtp('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi đổi mật khẩu!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Mã OTP không đúng hoặc mật khẩu cũ không chính xác!', 'error');
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
        setOtpCooldown(60);
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
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-shield-alt text-cyan me-2"></i>THAY ĐỔI MẬT KHẨU
            </h5>

            <form onSubmit={handleChangePasswordSubmit}>
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

              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">MÃ EMAIL OTP</label>
                <div className="d-flex gap-2">
                  <div className="input-group glass-input-group flex-grow-1">
                    <span className="input-group-text"><i className="fas fa-key"></i></span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="Nhập mã 6 chữ số"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-info"
                    style={{ borderRadius: '12px', minWidth: '110px', fontSize: '0.85rem' }}
                    onClick={handleSendEmailOtp}
                    disabled={pwLoading || otpCooldown > 0}
                  >
                    {otpCooldown > 0 ? `${otpCooldown}s` : 'Gửi OTP'}
                  </button>
                </div>
              </div>

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

              <button
                type="submit"
                disabled={pwLoading}
                className="app-btn-primary py-2.5 shadow-none w-100"
                style={{ borderRadius: '12px' }}
              >
                {pwLoading ? 'ĐANG LƯU...' : 'ĐỔI MẬT KHẨU'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerProfile;
