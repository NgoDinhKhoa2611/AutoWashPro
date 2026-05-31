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

  // Vehicles CRUD State
  const [vehicles, setVehicles] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState('Honda Vision');
  const [vehicleOtpMode, setVehicleOtpMode] = useState(false);
  const [vehicleOtp, setVehicleOtp] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);

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

    // Load vehicles
    const fetchVehicles = async () => {
      try {
        const response = await customerService.getVehicles();
        if (response.success) {
          setVehicles(response.vehicles);
          localStorage.setItem('user_vehicles', JSON.stringify(response.vehicles));
        } else {
          loadVehiclesFromLocal();
        }
      } catch (err) {
        loadVehiclesFromLocal();
      }
    };

    const loadVehiclesFromLocal = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('user_vehicles') || '[]');
        setVehicles(saved);
      } catch (e) {}
    };

    fetchVehicles();
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

  // Add Vehicle: Phase 1 (Send OTP)
  const handleSendVehicleOtp = async (e) => {
    e.preventDefault();
    if (!newPlate.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền biển số xe!', 'warning');
      return;
    }

    setVehicleLoading(true);
    try {
      const response = await customerService.sendVehicleOtp(newPlate);
      if (response.success) {
        setVehicleOtpMode(true);
        if (window.showToast) window.showToast(response.message || 'Mã OTP đã được gửi!', 'success');
      } else {
        if (window.showToast) window.showToast(response.message || 'Lỗi gửi OTP xe!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Biển số không hợp lệ hoặc đã được đăng ký!', 'error');
    } finally {
      setVehicleLoading(false);
    }
  };

  // Add Vehicle: Phase 2 (Verify OTP & Save)
  const handleVerifyVehicleOtp = async () => {
    if (!vehicleOtp.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền mã OTP xác thực!', 'warning');
      return;
    }

    setVehicleLoading(true);
    try {
      const response = await customerService.verifyVehicleOtpAndSave(newPlate, newType, vehicleOtp);
      if (response.success) {
        const newVehicle = { plate: newPlate.toUpperCase().trim(), type: newType };
        const updated = [...vehicles, newVehicle];
        setVehicles(updated);
        localStorage.setItem('user_vehicles', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));

        // Reset inputs
        setNewPlate('');
        setVehicleOtp('');
        setVehicleOtpMode(false);
        if (window.showToast) window.showToast('Đăng ký phương tiện thành công!', 'success');
      } else {
        if (window.showToast) window.showToast(response.message || 'Mã xác thực không hợp lệ!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Lỗi xác thực OTP!', 'error');
    } finally {
      setVehicleLoading(false);
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = (plate) => {
    const performDelete = async () => {
      try {
        const response = await customerService.deleteVehicle(plate);
        if (response.success) {
          const updated = vehicles.filter(v => v.plate !== plate);
          setVehicles(updated);
          localStorage.setItem('user_vehicles', JSON.stringify(updated));
          window.dispatchEvent(new Event('storage'));
          if (window.showToast) window.showToast('Xoá phương tiện thành công!', 'success');
        } else {
          if (window.showToast) window.showToast(response.message || 'Không thể xoá phương tiện!', 'error');
        }
      } catch (err) {
        // Local fallback
        const updated = vehicles.filter(v => v.plate !== plate);
        setVehicles(updated);
        localStorage.setItem('user_vehicles', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        if (window.showToast) window.showToast('Xoá phương tiện thành công! (Mô phỏng offline)', 'success');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xóa phương tiện', `Bạn có chắc chắn muốn xoá biển số ${plate} khỏi tài khoản?`, performDelete);
    } else {
      if (window.confirm('Bạn có chắc chắn muốn xoá phương tiện này?')) {
        performDelete();
      }
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

  const isGoogleAccount = !user?.phone; // Simple check if logged in via Google but profile incomplete, or google user
  const cardCode = `AW-2026-${(user?.tier || '').replace(' Member', '').toUpperCase()}`;

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row g-4">
        {/* Left Column: Profile form & Password form */}
        <div className="col-lg-6">
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

        {/* Right Column: Garage Section */}
        <div className="col-lg-6">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4" style={{ minHeight: '380px' }}>
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-motorcycle text-cyan me-2"></i>GARAGE XE MÁY ĐÃ ĐĂNG KÝ
            </h5>

            {/* List vehicles */}
            <div className="d-flex flex-column gap-2 mb-4" id="vehicles-list-profile">
              {vehicles.length === 0 ? (
                <div className="text-center py-4 text-muted small bg-light rounded-3" style={{ background: 'rgba(15,23,42,0.02)' }}>
                  Chưa đăng ký phương tiện nào
                </div>
              ) : (
                vehicles.map((v, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center p-3 border border-light rounded-4 bg-light bg-opacity-30">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                        <i className="fas fa-motorcycle text-muted"></i>
                      </div>
                      <div>
                        <div className="fw-bold font-monospace" style={{ color: 'var(--navy-dark)', fontSize: '0.88rem' }}>{v.plate}</div>
                        <small className="text-muted">{v.type || 'Honda Vision'}</small>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-danger border-0 p-2 text-danger hover-bg-danger bg-opacity-10 rounded-circle" style={{ width: '36px', height: '36px' }} onClick={() => handleDeleteVehicle(v.plate)}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add vehicle form */}
            <div className="border-top pt-4">
              <h6 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)' }}>
                Đăng ký phương tiện mới
              </h6>
              {vehicleOtpMode ? (
                <div className="animate-up">
                  <div className="alert alert-info py-2 small mb-3">
                    Hệ thống đã gửi một mã xác thực OTP đến Email đăng ký của bạn. Vui lòng nhập mã để xác nhận biển số <strong>{newPlate.toUpperCase()}</strong>.
                  </div>
                  <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-muted">MÃ OTP XÁC MINH</label>
                    <input
                      type="text"
                      className="form-control py-2.5 font-monospace text-center fs-5"
                      placeholder="Mã 6 chữ số"
                      value={vehicleOtp}
                      onChange={(e) => setVehicleOtp(e.target.value)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="app-btn-secondary py-2.5 w-50" style={{ borderRadius: '12px' }} onClick={() => setVehicleOtpMode(false)}>HỦY BỎ</button>
                    <button className="app-btn-primary py-2.5 w-50 text-dark fw-bold" style={{ borderRadius: '12px' }} disabled={vehicleLoading} onClick={handleVerifyVehicleOtp}>
                      {vehicleLoading ? 'ĐANG LƯU...' : 'XÁC NHẬN LƯU'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendVehicleOtp}>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6 text-start">
                      <label className="form-label small fw-bold text-muted">BIỂN SỐ XE</label>
                      <input
                        type="text"
                        className="form-control py-2.5 font-monospace uppercase fw-bold"
                        placeholder="Ví dụ: 59A-12345"
                        value={newPlate}
                        onChange={(e) => setNewPlate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 text-start">
                      <label className="form-label small fw-bold text-muted">LOẠI XE</label>
                      <select className="form-select py-2.5" value={newType} onChange={(e) => setNewType(e.target.value)}>
                        <option value="Honda Vision">Honda Vision</option>
                        <option value="SH Mode">SH Mode</option>
                        <option value="Air Blade">Air Blade</option>
                        <option value="Yamaha Exciter">Yamaha Exciter</option>
                        <option value="Vespa Sprint">Vespa Sprint</option>
                        <option value="Xe số phổ thông">Xe số phổ thông</option>
                        <option value="Xe côn tay / Moto">Xe côn tay / Moto</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={vehicleLoading} className="app-btn-primary py-2.5 shadow-none w-100" style={{ borderRadius: '12px' }}>
                    {vehicleLoading ? 'ĐANG XỬ LÝ...' : 'GỬI MÃ XÁC THỰC BIỂN SỐ'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerProfile;
