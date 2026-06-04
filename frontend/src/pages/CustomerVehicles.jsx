import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/profile.css';

export const CustomerVehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState('');
  const [vehicleOtpMode, setVehicleOtpMode] = useState(false);
  const [vehicleOtp, setVehicleOtp] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);

  const fetchVehicles = async () => {
    try {
      const response = await customerService.getVehicles();
      if (response.success) {
        setVehicles(response.vehicles);
      }
    } catch (err) {
      console.error(err);
      setVehicles([]);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

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

  const handleVerifyVehicleOtp = async () => {
    if (!vehicleOtp.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền mã OTP xác thực!', 'warning');
      return;
    }

    setVehicleLoading(true);
    try {
      const response = await customerService.verifyVehicleOtpAndSave(newPlate, newType, vehicleOtp);
      if (response.success) {
        // Reset inputs
        setNewPlate('');
        setVehicleOtp('');
        setVehicleOtpMode(false);
        if (window.showToast) window.showToast('Đăng ký phương tiện thành công!', 'success');
        fetchVehicles();
      } else {
        if (window.showToast) window.showToast(response.message || 'Mã xác thực không hợp lệ!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.response?.data?.message || 'Lỗi xác thực OTP!', 'error');
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleDeleteVehicle = (plate) => {
    const performDelete = async () => {
      try {
        const response = await customerService.deleteVehicle(plate);
        if (response.success) {
          if (window.showToast) window.showToast('Xoá phương tiện thành công!', 'success');
          fetchVehicles();
        } else {
          if (window.showToast) window.showToast(response.message || 'Không thể xoá phương tiện!', 'error');
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast(err.response?.data?.message || 'Không thể xóa phương tiện đã có lịch sử đặt lịch.', 'error');
        }
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

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-motorcycle text-cyan me-2"></i>GARAGE XE MÁY ĐÃ ĐĂNG KÝ
            </h5>

            <div className="d-flex flex-column gap-2 mb-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-5 text-muted small bg-light rounded-4 border border-dashed" style={{ background: 'rgba(15,23,42,0.02)' }}>
                  <i className="fas fa-motorcycle fa-2x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                  <div>Bạn chưa đăng ký phương tiện nào.</div>
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
                        <small className="text-muted">{v.type || 'Chưa cập nhật'}</small>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-danger border-0 p-2 text-danger hover-bg-danger bg-opacity-10 rounded-circle" style={{ width: '36px', height: '36px' }} onClick={() => handleDeleteVehicle(v.plate)}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ))
              )}
            </div>

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
                        <option value="">-- Chọn loại xe (Không bắt buộc) --</option>
                        <option value="Xe tay ga">Xe tay ga</option>
                        <option value="Xe số">Xe số</option>
                        <option value="Xe côn tay">Xe côn tay</option>
                        <option value="Xe phân khối lớn">Xe phân khối lớn</option>
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

export default CustomerVehicles;
