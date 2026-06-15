import { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/profile.css';

const BRANDS = [
  'Toyota', 'Honda', 'Mazda', 'Hyundai', 'Kia',
  'Ford', 'VinFast', 'Mercedes-Benz', 'BMW', 'Audi',
  'Lexus', 'Mitsubishi', 'Nissan', 'Isuzu', 'Peugeot',
  'Subaru', 'Suzuki', 'Volkswagen', 'Volvo', 'Porsche',
  'Khác'
];

const VEHICLE_CLASSES = [
  'Sedan', 'SUV', 'MPV', 'Pickup', 'Coupe',
  'Convertible', 'Hatchback', 'Wagon', 'Khác'
];

export const CustomerVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  
  // Registration Form State
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: '',
    brand: '',
    customBrand: '',
    model: '',
    vehicleClass: ''
  });
  
  // OTP Verification State
  const [vehicleOtpMode, setVehicleOtpMode] = useState(false);
  const [vehicleOtp, setVehicleOtp] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);

  // Editing State
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editBrand, setEditBrand] = useState('');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editVehicleClass, setEditVehicleClass] = useState('');

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

  const normalizePlate = (plate) =>
    plate.trim().toUpperCase().replace(/[\s\-.]/g, '');

  const handleApiError = (err, defaultMsg) => {
    if (err.response) {
      const { status, data } = err.response;
      if (status === 409) {
        if (window.showToast) {
          window.showToast('Biển số xe đã được đăng ký.', 'error');
        }
      } else if (status === 400) {
        if (window.showToast) {
          window.showToast(data?.message || data || 'Dữ liệu không hợp lệ.', 'error');
        }
      } else {
        if (window.showToast) {
          window.showToast(data?.message || defaultMsg || 'Có lỗi xảy ra!', 'error');
        }
      }
    } else {
      if (window.showToast) {
        window.showToast('Lỗi kết nối mạng, vui lòng thử lại.', 'error');
      }
    }
  };

  const handleSendVehicleOtp = async (e) => {
    e.preventDefault();

    const plateVal = newVehicle.licensePlate.trim();
    const brandVal = newVehicle.brand;
    const modelVal = newVehicle.model.trim();
    const classVal = newVehicle.vehicleClass;
    const customBrandVal = newVehicle.customBrand.trim();

    if (!plateVal || !brandVal || !modelVal || !classVal) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập đầy đủ thông tin phương tiện.', 'warning');
      }
      return;
    }

    if (brandVal === 'Khác' && !customBrandVal) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập đầy đủ thông tin phương tiện.', 'warning');
      }
      return;
    }

    const cleanPlate = normalizePlate(plateVal);
    const finalBrand = brandVal === 'Khác' ? customBrandVal : brandVal;

    setVehicleLoading(true);
    try {
      const response = await customerService.sendVehicleOtp(
        cleanPlate,
        finalBrand,
        modelVal,
        classVal
      );
      if (response.success) {
        setVehicleOtpMode(true);
        if (window.showToast) {
          window.showToast(response.message || 'Mã OTP đã được gửi đến email!', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast(response.message || 'Lỗi gửi mã OTP!', 'error');
        }
      }
    } catch (err) {
      handleApiError(err, 'Lỗi gửi mã OTP!');
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleVerifyVehicleOtp = async () => {
    if (!vehicleOtp.trim()) {
      if (window.showToast) {
        window.showToast('Vui lòng điền mã OTP xác thực!', 'warning');
      }
      return;
    }

    const cleanPlate = normalizePlate(newVehicle.licensePlate);
    const finalBrand = newVehicle.brand === 'Khác' ? newVehicle.customBrand.trim() : newVehicle.brand;

    setVehicleLoading(true);
    try {
      const response = await customerService.verifyVehicleOtpAndSave(
        cleanPlate,
        finalBrand,
        newVehicle.model.trim(),
        newVehicle.vehicleClass,
        vehicleOtp.trim()
      );
      if (response.success) {
        // Reset state
        setNewVehicle({
          licensePlate: '',
          brand: '',
          customBrand: '',
          model: '',
          vehicleClass: ''
        });
        setVehicleOtp('');
        setVehicleOtpMode(false);
        if (window.showToast) {
          window.showToast('Đăng ký phương tiện thành công!', 'success');
        }
        fetchVehicles();
      } else {
        if (window.showToast) {
          window.showToast(response.message || 'Mã xác thực không hợp lệ!', 'error');
        }
      }
    } catch (err) {
      handleApiError(err, 'Lỗi xác thực OTP!');
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleEditClick = (vehicle) => {
    setEditingVehicle(vehicle);
    
    // Check if the brand exists in standard BRANDS list
    const isPredefined = BRANDS.includes(vehicle.brand);
    if (isPredefined && vehicle.brand !== 'Khác') {
      setEditBrand(vehicle.brand);
      setEditCustomBrand('');
    } else {
      setEditBrand('Khác');
      setEditCustomBrand(vehicle.brand || '');
    }
    
    setEditModel(vehicle.model || '');
    setEditVehicleClass(vehicle.vehicleClass || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;

    if (!editBrand || !editModel.trim() || !editVehicleClass) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập đầy đủ thông tin phương tiện.', 'warning');
      }
      return;
    }

    if (editBrand === 'Khác' && !editCustomBrand.trim()) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập đầy đủ thông tin phương tiện.', 'warning');
      }
      return;
    }

    const finalBrand = editBrand === 'Khác' ? editCustomBrand.trim() : editBrand;

    setVehicleLoading(true);
    try {
      const response = await customerService.editVehicle(
        editingVehicle.vehicleId,
        finalBrand,
        editModel.trim(),
        editVehicleClass
      );
      if (response.success) {
        if (window.showToast) {
          window.showToast('Cập nhật phương tiện thành công!', 'success');
        }
        setEditingVehicle(null);
        fetchVehicles();
      } else {
        if (window.showToast) {
          window.showToast(response.message || 'Cập nhật thất bại!', 'error');
        }
      }
    } catch (err) {
      handleApiError(err, 'Có lỗi xảy ra khi sửa phương tiện!');
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleDeleteVehicle = (vehicleId) => {
    const performDelete = async () => {
      try {
        const response = await customerService.deleteVehicle(vehicleId);
        if (response.success) {
          if (window.showToast) {
            window.showToast('Xoá phương tiện thành công!', 'success');
          }
          fetchVehicles();
        } else {
          if (window.showToast) {
            window.showToast(response.message || 'Không thể xoá phương tiện!', 'error');
          }
        }
      } catch (err) {
        handleApiError(err, 'Không thể xóa phương tiện đã có lịch đặt lịch đang chờ xử lý.');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xóa phương tiện', 'Bạn có chắc muốn xóa phương tiện này?', performDelete);
    } else {
      if (window.confirm('Bạn có chắc muốn xóa phương tiện này?')) {
        performDelete();
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <i className="fas fa-car-side text-cyan me-2"></i>GARAGE PHƯƠNG TIỆN ĐÃ ĐĂNG KÝ
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-5 text-muted small bg-light rounded-4 border border-dashed" style={{ background: 'rgba(15,23,42,0.02)' }}>
                  <i className="fas fa-car-side fa-2x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                  <div>Bạn chưa đăng ký phương tiện nào.</div>
                </div>
              ) : (
                vehicles.map((v, i) => (
                  <div key={v.vehicleId || i} className="d-flex justify-content-between align-items-center p-3 border border-light rounded-4 bg-light bg-opacity-30">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                        <i className="fas fa-car text-muted"></i>
                      </div>
                      <div className="text-start">
                        <div className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '1rem' }}>
                          🚗 {v.brand} {v.model}
                        </div>
                        <div className="small text-muted mt-1">
                          <strong>Biển số:</strong> <span className="font-monospace fw-bold">{v.licensePlate}</span>
                        </div>
                        <div className="small text-muted">
                          <strong>Loại xe:</strong> {v.vehicleClass}
                        </div>
                        <div className="small text-muted">
                          <strong>Ngày đăng ký:</strong> {formatDate(v.registeredAt)}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary border-0 p-2 text-primary hover-bg-primary bg-opacity-10 rounded-circle" style={{ width: '36px', height: '36px' }} onClick={() => handleEditClick(v)} title="Chỉnh sửa">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger border-0 p-2 text-danger hover-bg-danger bg-opacity-10 rounded-circle" style={{ width: '36px', height: '36px' }} onClick={() => handleDeleteVehicle(v.vehicleId)} title="Xóa">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
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
                    Hệ thống đã gửi một mã xác thực OTP đến Email đăng ký của bạn. Vui lòng nhập mã để xác nhận biển số <strong>{normalizePlate(newVehicle.licensePlate)}</strong>.
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
                      <label className="form-label small fw-bold text-muted">BIỂN SỐ XE *</label>
                      <input
                        type="text"
                        className="form-control py-2.5 font-monospace uppercase fw-bold"
                        placeholder="Ví dụ: 51H-888.88"
                        value={newVehicle.licensePlate}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, licensePlate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6 text-start">
                      <label className="form-label small fw-bold text-muted">HÃNG XE *</label>
                      <select className="form-select py-2.5" value={newVehicle.brand} onChange={(e) => {
                        setNewVehicle(prev => ({
                          ...prev,
                          brand: e.target.value,
                          customBrand: e.target.value !== 'Khác' ? '' : prev.customBrand
                        }));
                      }} required>
                        <option value="">-- Chọn hãng xe --</option>
                        {BRANDS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {newVehicle.brand === 'Khác' && (
                    <div className="mb-3 text-start animate-up">
                      <label className="form-label small fw-bold text-muted">NHẬP HÃNG XE *</label>
                      <input
                        type="text"
                        className="form-control py-2.5"
                        placeholder="Ví dụ: Rolls-Royce"
                        value={newVehicle.customBrand}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, customBrand: e.target.value }))}
                        required
                      />
                    </div>
                  )}

                  <div className="row g-2 mb-3">
                    <div className="col-md-6 text-start">
                      <label className="form-label small fw-bold text-muted">MODEL XE *</label>
                      <input
                        type="text"
                        className="form-control py-2.5"
                        placeholder="Ví dụ: Vios, CX5"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6 text-start">
                      <label className="form-label small fw-bold text-muted">LOẠI XE *</label>
                      <select className="form-select py-2.5" value={newVehicle.vehicleClass} onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicleClass: e.target.value }))} required>
                        <option value="">-- Chọn loại xe --</option>
                        {VEHICLE_CLASSES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={vehicleLoading} className="app-btn-primary py-2.5 shadow-none w-100" style={{ borderRadius: '12px' }}>
                    {vehicleLoading ? 'ĐANG XỬ LÝ...' : 'GỬI MÃ XÁC THỰC'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingVehicle && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 bg-light p-3 px-4 d-flex justify-content-between align-items-center">
                <h6 className="modal-title fw-bold m-0" style={{ color: 'var(--navy-dark)' }}>
                  <i className="fas fa-edit text-cyan me-2"></i>CHỈNH SỬA PHƯƠNG TIỆN
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setEditingVehicle(null)}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body p-4 text-start">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">BIỂN SỐ XE</label>
                    <input
                      type="text"
                      className="form-control py-2.5 font-monospace uppercase fw-bold bg-light"
                      value={editingVehicle.licensePlate}
                      disabled
                      readOnly
                    />
                    <small className="text-muted mt-1 d-block text-secondary" style={{ fontSize: '0.75rem' }}>Biển số xe không được phép thay đổi.</small>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">HÃNG XE *</label>
                    <select
                      className="form-select py-2.5"
                      value={editBrand}
                      onChange={(e) => {
                        setEditBrand(e.target.value);
                        if (e.target.value !== 'Khác') setEditCustomBrand('');
                      }}
                      required
                    >
                      <option value="">-- Chọn hãng xe --</option>
                      {BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {editBrand === 'Khác' && (
                    <div className="mb-3 animate-up">
                      <label className="form-label small fw-bold text-muted">NHẬP HÃNG XE *</label>
                      <input
                        type="text"
                        className="form-control py-2.5"
                        placeholder="Ví dụ: Rolls-Royce"
                        value={editCustomBrand}
                        onChange={(e) => setEditCustomBrand(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">MODEL XE *</label>
                    <input
                      type="text"
                      className="form-control py-2.5"
                      placeholder="Ví dụ: Vios, CX5, Ghost"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">LOẠI XE *</label>
                    <select
                      className="form-select py-2.5"
                      value={editVehicleClass}
                      onChange={(e) => setEditVehicleClass(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn loại xe --</option>
                      {VEHICLE_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0 p-3 px-4 bg-light d-flex gap-2">
                  <button type="button" className="btn btn-secondary py-2 px-4 rounded-3 text-sm fw-bold border-0" style={{ backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => setEditingVehicle(null)}>HỦY BỎ</button>
                  <button type="submit" className="app-btn-primary py-2 px-4 text-dark fw-bold m-0" disabled={vehicleLoading}>
                    {vehicleLoading ? 'ĐANG LƯU...' : 'CẬP NHẬT'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerVehicles;
