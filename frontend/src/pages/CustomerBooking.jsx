import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/booking.css';

const DEFAULT_TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];



export const CustomerBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [mainServices, setMainServices] = useState([]);
  const [addonServices, setAddonServices] = useState([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    setSelectedAddons({});
  }, [selectedVehicle]);
  
  const [selectedMain, setSelectedMain] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  
  const [promoCode, setPromoCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);

  const [bookingDaysWindow, setBookingDaysWindow] = useState(7);
  const [minDateStr, setMinDateStr] = useState('');
  const [maxDateStr, setMaxDateStr] = useState('');

  useEffect(() => {
    // Determine booking days window based on membership tier
    const tier = (user?.tier || 'Standard Member').toUpperCase();
    let days = 7;
    if (tier.includes('PLATINUM')) days = 14;
    else if (tier.includes('GOLD')) days = 12;
    else if (tier.includes('SILVER')) days = 10;
    setBookingDaysWindow(days);

    // Calculate min/max dates
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    setMinDateStr(todayStr);
    setBookingDate(todayStr);

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + days);
    const maxYear = maxDate.getFullYear();
    const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDay = String(maxDate.getDate()).padStart(2, '0');
    const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;
    setMaxDateStr(maxDateStr);

    // Load vehicles
    const fetchVehicles = async () => {
      try {
        const response = await customerService.getVehicles();
        if (response.success) {
          if (response.vehicles && response.vehicles.length > 0) {
            const list = response.vehicles.map(v => ({
              vehicleId: v.vehicleId,
              licensePlate: v.licensePlate,
              brand: v.brand,
              model: v.model,
              vehicleClass: v.vehicleClass,
              plate: v.licensePlate,
              type: `${v.brand} ${v.model} (${v.vehicleClass})`,
              lastWash: 'Vừa xong',
              totalWashes: 0
            }));
            setVehicles(list);
            setSelectedVehicle(list[0].plate);
          } else {
            setVehicles([]);
            setSelectedVehicle(null);
          }
        }
      } catch (err) {
        console.error(err);
        setVehicles([]);
        setSelectedVehicle(null);
      }
    };

    fetchVehicles();

    // Set default main service
    // Load services (checking Custom services in DB)
    const fetchServices = async () => {
      try {
        const response = await customerService.getServices();
        if (response.success && response.services && response.services.length > 0) {
          const mains = response.services.filter(s => s.isAddon === false && s.isActive === true)
            .map(s => ({
              id: s.id,
              name: s.name,
              desc: s.desc,
              price: s.price,
              time: s.estimatedMinutes + ' phút',
              icon: 'fa-soap'
            }));
          setMainServices(mains);
          if (mains.length > 0) {
            setSelectedMain(mains[0]);
          }

          const addons = response.services.filter(s => s.isAddon === true && s.isActive === true)
            .map(s => ({
              id: s.id,
              name: s.name,
              desc: s.desc,
              price: s.price,
              icon: 'fa-plus-circle'
            }));
          setAddonServices(addons);
        } else {
          setMainServices([]);
          setAddonServices([]);
          setSelectedMain(null);
        }
      } catch (err) {
        console.error(err);
        setMainServices([]);
        setAddonServices([]);
        setSelectedMain(null);
      }
    };

    fetchServices();

    // Load claimed vouchers from DB
    const fetchVouchers = async () => {
      try {
        const response = await customerService.getVouchers();
        if (response.success && response.vouchers) {
          const availableVouchers = response.vouchers.filter(v => v.status === 1);
          setMyVouchers(availableVouchers);

          const selectedCode = sessionStorage.getItem('selected_voucher_code');
          const selectedVoucher = availableVouchers.find(v => v.code === selectedCode);
          if (selectedVoucher) {
            setPromoCode(selectedVoucher.code);
            setAppliedVoucher({
              redemptionId: selectedVoucher.redemptionId,
              code: selectedVoucher.code,
              title: selectedVoucher.title,
              rewardType: selectedVoucher.rewardType,
              rewardValue: selectedVoucher.rewardValue
            });
          }
          sessionStorage.removeItem('selected_voucher_code');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchVouchers();
  }, [user]);

  const availableTimeSlots = useMemo(() => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');

    if (bookingDate === todayStr) {
      const minAllowedTime = new Date(today.getTime() + 15 * 60 * 1000);
      return DEFAULT_TIME_SLOTS.filter(t => {
        const [hours, minutes] = t.split(':').map(Number);
        const slotDate = new Date();
        slotDate.setHours(hours, minutes, 0, 0);
        return slotDate > minAllowedTime;
      });
    }
    return DEFAULT_TIME_SLOTS;
  }, [bookingDate]);

  useEffect(() => {
    if (bookingTime && bookingDate) {
      if (!availableTimeSlots.includes(bookingTime)) {
        setBookingTime('');
      }
    }
  }, [availableTimeSlots, bookingDate, bookingTime]);

  const handleSelectVehicle = (plate) => {
    setSelectedVehicle(plate);
  };

  const handleSelectMain = (svc) => {
    setSelectedMain(svc);
  };

  const handleToggleAddon = (addon) => {
    const updated = { ...selectedAddons };
    if (updated[addon.id]) {
      delete updated[addon.id];
    } else {
      updated[addon.id] = addon;
    }
    setSelectedAddons(updated);
  };

  // Promo operations
  const applyPromo = (codeStr = promoCode) => {
    const code = codeStr.trim().toUpperCase();
    if (!code) {
      if (window.showToast) window.showToast('Vui lòng nhập mã ưu đãi!', 'warning');
      return;
    }

    // Check in my vouchers loaded from DB
    const voucher = myVouchers.find(v => v.code.toUpperCase() === code);

    if (voucher) {
      if (voucher.status === 2 || voucher.status === 'used') {
        if (window.showToast) window.showToast('Mã voucher này đã được sử dụng trước đây!', 'warning');
        return;
      }

      setAppliedVoucher({
        redemptionId: voucher.redemptionId,
        code: voucher.code,
        title: voucher.title,
        rewardType: voucher.rewardType,
        rewardValue: voucher.rewardValue
      });
      if (window.showToast) window.showToast(`Áp dụng voucher "${voucher.title}" thành công!`, 'success');
    } else {
      if (window.showToast) window.showToast('Mã ưu đãi không hợp lệ hoặc đã hết hạn trong ví.', 'warning');
    }
  };

  const handleSelectVoucherFromModal = (code) => {
    setPromoCode(code);
    applyPromo(code);
    setVoucherModalOpen(false);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setPromoCode('');
    if (window.showToast) {
      window.showToast('Đã hủy voucher.', 'success');
    }
  };

  // Pricing calculations
  const addonTotal = Object.values(selectedAddons).reduce((s, a) => s + Number(a.price), 0);
  const mainPrice = selectedMain ? Number(selectedMain.price) : 0;
  const baseTotal = mainPrice + addonTotal;

  // Voucher discount
  const promoDiscountAmount = appliedVoucher && baseTotal > 0
    ? (appliedVoucher.rewardType === 'DiscountPercent' 
        ? baseTotal * (Number(appliedVoucher.rewardValue) / 100) 
        : Number(appliedVoucher.rewardValue))
    : 0;

  const finalTotal = Math.max(0, baseTotal - promoDiscountAmount);

  // Earned points (+1 point for every 10,000đ spent)
  const earnedPoints = Math.round(finalTotal / 10000);

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedVehicle) {
      if (window.showToast) window.showToast('Vui lòng chọn phương tiện!', 'warning');
      return;
    }
    if (!selectedMain) {
      if (window.showToast) window.showToast('Vui lòng chọn gói dịch vụ chính!', 'warning');
      return;
    }
    if (!bookingDate || !bookingTime) {
      if (window.showToast) window.showToast('Vui lòng chọn ngày và khung giờ!', 'warning');
      return;
    }

    try {
      // Call real backend booking API (do not send final price or points earned)
      const result = await customerService.createBooking({
        LicensePlate: selectedVehicle,
        MainServiceName: selectedMain.name,
        AddonServiceNames: Object.values(selectedAddons).map(a => a.name),
        BookingDate: bookingDate,
        BookingTime: bookingTime,
        AppliedRedemptionId: appliedVoucher ? appliedVoucher.redemptionId : null,
        Notes: ''
      });

      if (result.success) {
        if (window.showToast) window.showToast(`Đặt lịch thành công cho xe ${selectedVehicle}!`, 'success');
        setTimeout(() => {
          navigate('/customer/dashboard');
        }, 1200);
      } else {
        if (window.showToast) window.showToast(result.message || 'Đặt lịch thất bại!', 'warning');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Đặt lịch thất bại. Vui lòng thử lại!', 'warning');
    }
  };

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row g-4">
        {/* Left Column: Form booking */}
        <div className="col-lg-8">
          
          {/* Step 1: Chọn phương tiện */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">1</span> Chọn phương tiện rửa
            </h5>
            <div className="row g-3" id="vehicles-list">
              {vehicles.length === 0 ? (
                <div className="col-12 text-center py-4">
                  <div className="alert alert-warning py-3 mb-3 fw-medium">
                    Bạn chưa có phương tiện nào. Vui lòng thêm phương tiện trước khi đặt lịch.
                  </div>
                  <button
                    type="button"
                    className="app-btn-primary px-4 py-2 border-0 text-dark fw-bold"
                    style={{ borderRadius: '10px' }}
                    onClick={() => navigate('/customer/vehicles')}
                  >
                    Đi đến trang Phương tiện của tôi
                  </button>
                </div>
              ) : (
                vehicles.map((v, i) => (
                  <div key={i} className="col-md-6">
                    <div
                      className={`selectable-card p-3 rounded-4 border h-100 ${selectedVehicle === v.plate ? 'selected' : 'bg-light border-light'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectVehicle(v.plate)}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-sm" style={{ width: '44px', height: '44px' }}>
                          <i className="fas fa-car-side text-muted"></i>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.9rem' }}>{v.plate}</div>
                          <small className="text-muted">{v.type}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Step 2: Chọn gói chính */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">2</span> Chọn gói dịch vụ chính
            </h5>
            <div className="row g-3" id="main-services-list">
              {mainServices.map((s) => {
                const isSelected = selectedMain?.id === s.id;
                return (
                  <div key={s.id} className="col-md-6">
                    <div
                      className={`service-selectable-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectMain(s)}
                    >
                      <div className="selected-tick-badge">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div className="d-flex align-items-start gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ background: 'rgba(15,23,42,0.06)', width: '42px', height: '42px' }}>
                          <i className={`fas ${s.icon || 'fa-soap'} text-cyan`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold small" style={{ color: 'var(--navy-dark)' }}>{s.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>{s.desc}</div>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="fw-bold text-cyan" style={{ fontSize: '0.85rem' }}>{Number(s.price).toLocaleString()}đ</span>
                            <span className="text-muted small" style={{ fontSize: '0.7rem' }}><i className="far fa-clock me-1"></i>{s.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Chọn dịch vụ đi kèm (Add-ons Cards Grid) */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">3</span> Chọn dịch vụ đi kèm
            </h5>
            <div className="addons-grid-layout" id="addon-services-list">
              {addonServices.map((a) => {
                const isSelected = !!selectedAddons[a.id];
                return (
                  <div
                    key={a.id}
                    className={`addon-selectable-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleAddon(a)}
                  >
                    <div>
                      <div className="addon-card-header">
                        <div className="addon-card-icon">
                          <i className={`fas ${a.icon || 'fa-plus-circle'}`}></i>
                        </div>
                        <div className="addon-card-checkbox">
                          {isSelected ? (
                            <i className="fas fa-check-circle"></i>
                          ) : (
                            <i className="far fa-circle text-muted"></i>
                          )}
                        </div>
                      </div>
                      <div className="addon-card-name">{a.name}</div>
                      <div className="addon-card-desc">{a.desc}</div>
                    </div>
                    <div className="addon-card-price">+{Number(a.price).toLocaleString()}đ</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4: Chọn ngày & giờ */}
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">4</span> Chọn ngày & khung giờ hẹn
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary">NGÀY HẸN RỬA</label>
                <input
                  type="date"
                  id="booking-date"
                  className="form-control bg-light border-0 py-2.5 rounded-3 fw-semibold text-dark"
                  min={minDateStr}
                  max={maxDateStr}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
                <small className="text-muted d-block mt-2">
                  AutoWash Loyalty (hạng {user?.tier.replace(' Member', '') || 'Silver'}): đặt trước tối đa {bookingDaysWindow} ngày
                </small>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary mb-2">KHUNG GIỜ</label>
                <div className="row g-2" id="time-slots">
                  {availableTimeSlots.length === 0 ? (
                    <div className="col-12 text-center text-danger py-2 small fw-bold">
                      Không còn khung giờ trống cho hôm nay. Vui lòng chọn ngày khác!
                    </div>
                  ) : (
                    availableTimeSlots.map((t) => (
                      <div key={t} className="col-4">
                        <div
                          className={`text-center py-2.5 rounded-3 border fw-bold selectable-card ${
                            bookingTime === t ? 'selected' : 'bg-light border-light text-muted'
                          }`}
                          style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                          onClick={() => setBookingTime(t)}
                        >
                          {t}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (Realtime updates) */}
        <div className="col-lg-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 booking-summary-fixed">
            <h5 className="fw-bold mb-3 border-bottom pb-2.5" style={{ color: 'var(--navy-dark)', fontSize: '0.95rem' }}>
              <i className="fas fa-receipt text-cyan me-2"></i> TÓM TẮT ĐƠN HÀNG
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Xe:</span>
                <span className="fw-bold text-dark font-monospace" id="summary-vehicle" style={{ fontSize: '0.88rem' }}>
                  {selectedVehicle || 'Chưa có phương tiện'}
                </span>
              </div>
              
              <div className="d-flex justify-content-between align-items-start">
                <div className="text-start">
                  <span className="text-muted small d-block">Gói dịch vụ chính:</span>
                  <strong className="small text-dark" id="summary-main-service">
                    {selectedMain ? selectedMain.name : 'Chưa chọn'}
                  </strong>
                </div>
                <span className="fw-bold text-cyan" id="summary-main-price" style={{ fontSize: '0.85rem' }}>
                  {selectedMain ? `${Number(selectedMain.price).toLocaleString()}đ` : '0đ'}
                </span>
              </div>

              {Object.values(selectedAddons).length > 0 && (
                <div className="text-start" id="summary-addons-block">
                  <span className="text-muted small d-block mb-1">Dịch vụ đi kèm (Add-ons):</span>
                  <div id="summary-addons-list" className="d-flex flex-column gap-1 border-start ps-3">
                    {Object.values(selectedAddons).map((a, idx) => (
                      <div key={idx} className="d-flex justify-content-between" style={{ fontSize: '0.78rem', color: '#475569' }}>
                        <span>✓ {a.name}</span>
                        <span>+{Number(a.price).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="my-0 opacity-5" />
              
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Ngày đặt:</span>
                <span className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                  {bookingDate ? bookingDate.split('-').reverse().join('/') : '—'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Khung giờ:</span>
                <span className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                  {bookingTime || '—'}
                </span>
              </div>
            </div>

            {/* Discounts and Loyalty calculations */}
            <div className="d-flex flex-column gap-2 mb-4 bg-light p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              {appliedVoucher && baseTotal > 0 && (
                <div className="d-flex justify-content-between align-items-center" id="promo-applied-msg">
                  <small className="text-muted fw-bold" style={{ fontSize: '0.68rem' }}>VOUCHER ({appliedVoucher.code}):</small>
                  <span className="fw-bold text-success" id="promo-discount-display" style={{ fontSize: '0.78rem' }}>
                    -{Number(promoDiscountAmount).toLocaleString()}đ
                  </span>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tạm tính:</span>
                <span className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>{Number(baseTotal).toLocaleString()}đ</span>
              </div>
            </div>

            {/* Voucher input form */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-bold text-muted mb-0">MÃ GIẢM GIÁ / VOUCHER</label>
                <button
                  type="button"
                  className="btn btn-link p-0 text-cyan small fw-bold text-decoration-none"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setVoucherModalOpen(true)}
                >
                  <i className="fas fa-ticket-alt me-1"></i>Ví Voucher
                </button>
              </div>
              {appliedVoucher ? (
                <div className="d-flex align-items-center justify-content-between p-2.5 px-3 rounded-3 border border-success border-opacity-30 bg-success bg-opacity-10 text-success">
                  <div className="d-flex align-items-center gap-2">
                    <i className="fas fa-ticket-alt"></i>
                    <div>
                      <div className="fw-bold small">{appliedVoucher.code}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem', color: '#15803d' }}>{appliedVoucher.title}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger border-0 p-1 px-2 text-danger rounded-3"
                    style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                    onClick={handleRemoveVoucher}
                  >
                    Hủy Voucher <i className="fas fa-times ms-1"></i>
                  </button>
                </div>
              ) : (
                <div className="input-group promo-input-group">
                  <input
                    type="text"
                    id="promo-code-input"
                    className="form-control font-monospace promo-code-input"
                    placeholder="VÍ DỤ: WASH10K"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="promo-apply-btn"
                    onClick={() => applyPromo()}
                  >
                    ÁP DỤNG <i className="fas fa-check ms-1"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Final Cost & Points */}
            <div className="d-flex justify-content-between align-items-center border-top pt-4 mb-4">
              <div>
                <span className="text-muted small d-block">TỔNG CỘNG</span>
                <span className="small text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>
                  Điểm nhận: <strong className="text-warning">+{earnedPoints} PTS</strong>
                </span>
              </div>
              <h3 className="fw-bold text-dark mb-0">
                {Number(finalTotal).toLocaleString()}đ
              </h3>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={vehicles.length === 0}
              className="app-btn-primary w-100 border-0 fw-bold"
              style={{
                borderRadius: '12px',
                padding: '14px',
                fontSize: '0.88rem',
                letterSpacing: '0.5px',
                opacity: vehicles.length === 0 ? 0.45 : 1,
                cursor: vehicles.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(14,165,233,0.28)'
              }}
            >
              XÁC NHẬN ĐẶT LỊCH <i className="fas fa-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Voucher Selector Modal */}
      {voucherModalOpen && (
        <div id="voucher-modal-backdrop" className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="confirm-modal-header">
              <h5 className="confirm-modal-title"><i className="fas fa-ticket-alt text-cyan me-2"></i>Ví Voucher của bạn</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setVoucherModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body text-center" id="voucher-selector-list">
              {myVouchers.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="fas fa-info-circle mb-2 fa-lg d-block" style={{ color: 'var(--cyan-electric)' }}></i>
                  Bạn không có voucher khả dụng nào trong ví.<br />
                  Hãy tích điểm để đổi quà nhé!
                </div>
              ) : (
                myVouchers.map((v, i) => {
                  let badgeText = v.rewardType === 'DiscountPercent' ? `Giảm ${v.rewardValue}%` : `Giảm ₫${Number(v.rewardValue).toLocaleString()}`;
                  return (
                    <div
                      key={i}
                      className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between mb-2 select-voucher-item"
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <div className="text-start">
                        <div className="fw-bold text-dark small mb-0.5">{v.title}</div>
                        <div className="font-monospace text-secondary small" style={{ fontSize: '0.7rem' }}>Mã: {v.code}</div>
                        <span className="badge bg-cyan text-dark small mt-1" style={{ fontSize: '0.6rem', fontWeight: 700 }}>{badgeText}</span>
                      </div>
                      <button
                        type="button"
                        className="ticket-btn"
                        style={{ padding: '4px 10px', fontSize: '0.68rem', borderRadius: '8px' }}
                        onClick={() => handleSelectVoucherFromModal(v.code)}
                      >
                        Chọn
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="confirm-modal-footer justify-content-center">
              <button className="confirm-cancel-btn w-50" onClick={() => setVoucherModalOpen(false)}>ĐÓNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerBooking;
