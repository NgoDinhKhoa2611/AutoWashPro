import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import Modal from '../components/Modal';
import '../styles/shared.css';
import '../styles/customer/booking.css';

const DEFAULT_TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00', '23:00'
];

export const CustomerBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [mainServices, setMainServices] = useState([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const [selectedMain, setSelectedMain] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  
  const [promoCode, setPromoCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookingDaysWindow, setBookingDaysWindow] = useState(7);
  const [minDateStr, setMinDateStr] = useState('');
  const [maxDateStr, setMaxDateStr] = useState('');

  const [slotsStatus, setSlotsStatus] = useState({});
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [earliestAvailableDate, setEarliestAvailableDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);

  useEffect(() => {
    // Fetch dynamic slots configuration
    const fetchConfig = async () => {
      try {
        const res = await customerService.getBookingConfig();
        if (res.success && res.slots) {
          setTimeSlots(res.slots);
        }
      } catch (err) {
        console.error("Error loading booking config:", err);
      }
    };
    fetchConfig();

    // Calculate min/max dates with a fallback booking window of 7 days
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    setMinDateStr(todayStr);
    setBookingDate(todayStr);

    const fallbackMaxDate = new Date();
    fallbackMaxDate.setDate(today.getDate() + 7);
    const fallbackMaxYear = fallbackMaxDate.getFullYear();
    const fallbackMaxMonth = String(fallbackMaxDate.getMonth() + 1).padStart(2, '0');
    const fallbackMaxDay = String(fallbackMaxDate.getDate()).padStart(2, '0');
    setMaxDateStr(`${fallbackMaxYear}-${fallbackMaxMonth}-${fallbackMaxDay}`);

    // Determine booking days window dynamically from backend
    const fetchLoyaltyStatus = async () => {
      try {
        const res = await customerService.getLoyaltyStatus();
        if (res.success && res.status?.bookingWindowDays) {
          setBookingDaysWindow(res.status.bookingWindowDays);
          const maxDate = new Date();
          maxDate.setDate(today.getDate() + res.status.bookingWindowDays);
          const maxYear = maxDate.getFullYear();
          const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
          const maxDay = String(maxDate.getDate()).padStart(2, '0');
          setMaxDateStr(`${maxYear}-${maxMonth}-${maxDay}`);
        }
      } catch (err) {
        console.error("Error loading loyalty status:", err);
      }
    };
    fetchLoyaltyStatus();

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
              totalWashes: 0,
              hasActiveBooking: v.hasActiveBooking
            }));
            setVehicles(list);
            const firstAvailable = list.find(v => !v.hasActiveBooking);
            setSelectedVehicle(firstAvailable ? firstAvailable.plate : null);
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

    // Set default main service (Standard Car Wash ID 999)
    const fetchServices = async () => {
      try {
        const response = await customerService.getServices();
        if (response.success && response.services && response.services.length > 0) {
          const standard = response.services.find(s => s.id === "999" || s.name === "Standard Car Wash");
          const standardMapped = standard ? {
            id: standard.id,
            name: standard.name,
            desc: standard.desc,
            price: standard.price,
            time: standard.estimatedMinutes + ' phút',
            icon: 'fa-soap'
          } : {
            id: "999",
            name: "Standard Car Wash",
            desc: "Dịch vụ rửa xe tiêu chuẩn bao gồm: Rửa ngoại thất, vệ sinh bánh xe, hút bụi nội thất, lau kính, lau taplo, dưỡng nội thất cơ bản, kiểm tra cuối.",
            price: 250000,
            time: "60 phút",
            icon: 'fa-soap'
          };
          setMainServices([standardMapped]);
          setSelectedMain(standardMapped);
        } else {
          const fallback = {
            id: "999",
            name: "Standard Car Wash",
            desc: "Dịch vụ rửa xe tiêu chuẩn bao gồm: Rửa ngoại thất, vệ sinh bánh xe, hút bụi nội thất, lau kính, lau taplo, dưỡng nội thất cơ bản, kiểm tra cuối.",
            price: 250000,
            time: "60 phút",
            icon: 'fa-soap'
          };
          setMainServices([fallback]);
          setSelectedMain(fallback);
        }
      } catch (err) {
        console.error(err);
        const fallback = {
          id: "999",
          name: "Standard Car Wash",
          desc: "Dịch vụ rửa xe tiêu chuẩn bao gồm: Rửa ngoại thất, vệ sinh bánh xe, hút bụi nội thất, lau kính, lau taplo, dưỡng nội thất cơ bản, kiểm tra cuối.",
          price: 250000,
          time: "60 phút",
          icon: 'fa-soap'
        };
        setMainServices([fallback]);
        setSelectedMain(fallback);
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

  // Load occupied slots for selected date
  const fetchSlots = useCallback(async () => {
    if (!bookingDate) return;
    setLoadingSlots(true);
    setEarliestAvailableDate(null);
    try {
      const res = await customerService.getOccupiedSlots(bookingDate);
      if (res.success) {
        setSlotsStatus(res.slotsStatus || {});
        setOccupiedSlots(res.occupiedSlots || []);
      }
    } catch (err) {
      console.error("Error fetching slots status:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [bookingDate]);

  useEffect(() => {
    fetchSlots();
    // 30s Polling
    const interval = setInterval(() => {
      if (bookingDate) {
        customerService.getOccupiedSlots(bookingDate).then(res => {
          if (res.success) {
            setSlotsStatus(res.slotsStatus || {});
            setOccupiedSlots(res.occupiedSlots || []);
          }
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [bookingDate, fetchSlots]);

  const availableTimeSlots = useMemo(() => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');

    let slots = timeSlots;
    if (bookingDate === todayStr) {
      const minAllowedTime = new Date(today.getTime() + 15 * 60 * 1000);
      slots = timeSlots.filter(t => {
        const [hours, minutes] = t.split(':').map(Number);
        const slotDate = new Date();
        slotDate.setHours(hours, minutes, 0, 0);
        return slotDate > minAllowedTime;
      });
    }
    // Filter out occupied slots
    return slots.filter(t => !occupiedSlots.includes(t));
  }, [bookingDate, occupiedSlots, timeSlots]);

  // Find earliest available date if this date has no slots
  useEffect(() => {
    if (!loadingSlots && bookingDate && availableTimeSlots.length === 0) {
      const fetchEarliestDate = async () => {
        try {
          const res = await customerService.getEarliestAvailableDate(bookingDate, bookingDaysWindow);
          if (res.success && res.earliestDate) {
            setEarliestAvailableDate(res.earliestDate);
          }
        } catch (err) {
          console.error("Error fetching earliest available date:", err);
        }
      };
      fetchEarliestDate();
    }
  }, [bookingDate, availableTimeSlots, loadingSlots, bookingDaysWindow]);

  useEffect(() => {
    if (bookingTime && bookingDate) {
      if (!availableTimeSlots.includes(bookingTime)) {
        setBookingTime('');
      }
    }
  }, [availableTimeSlots, bookingDate, bookingTime]);

  const handleSelectVehicle = useCallback((plate) => {
    setSelectedVehicle(plate);
  }, []);

  const handleSelectMain = useCallback((svc) => {
    setSelectedMain(svc);
  }, []);

  // Promo operations
  const applyPromo = useCallback((codeStr = promoCode) => {
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
  }, [promoCode, myVouchers]);

  const handleSelectVoucherFromModal = useCallback((code) => {
    setPromoCode(code);
    applyPromo(code);
    setVoucherModalOpen(false);
  }, [applyPromo]);

  const handleRemoveVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setPromoCode('');
    if (window.showToast) {
      window.showToast('Đã hủy voucher.', 'success');
    }
  }, []);

  // Pricing calculations
  const mainPrice = selectedMain ? Number(selectedMain.price) : 0;
  const baseTotal = mainPrice;

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
  const handleConfirmBooking = useCallback(async () => {
    if (isSubmitting) return;

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

    if (bookingDate) {
      const selDate = new Date(bookingDate + 'T00:00:00');
      const minD = new Date(minDateStr + 'T00:00:00');
      const maxD = new Date(maxDateStr + 'T00:00:00');
      if (selDate < minD || selDate > maxD) {
        if (window.showToast) {
          window.showToast(`Ngày chọn không hợp lệ. Hạng thành viên của bạn chỉ được đặt lịch từ ${minD.toLocaleDateString('vi-VN')} đến ${maxD.toLocaleDateString('vi-VN')}.`, 'warning');
        }
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await customerService.createBooking({
        LicensePlate: selectedVehicle,
        MainServiceName: selectedMain.name,
        BookingDate: bookingDate,
        BookingTime: bookingTime,
        AppliedRedemptionId: appliedVoucher ? appliedVoucher.redemptionId : null,
        VoucherCode: promoCode,
        Notes: ''
      });

      if (result.success) {
        if (window.showToast) window.showToast(`Đặt lịch thành công cho xe ${selectedVehicle}!`, 'success');
        navigate('/customer/dashboard');
      } else {
        if (window.showToast) window.showToast(result.message || 'Đặt lịch thất bại!', 'warning');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Đặt lịch thất bại. Vui lòng thử lại!';
      if (window.showToast) window.showToast(errMsg, 'warning');
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedVehicle, selectedMain, bookingDate, bookingTime, minDateStr, maxDateStr, appliedVoucher, promoCode, navigate]);

  return (
    <div className="container-fluid py-4 text-start">
      <div className="row g-4">
        {/* Left Column: Form booking */}
        <div className="col-lg-8">
          
          {/* Step 1: Chọn phương tiện */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)', fontSize: '0.92rem' }}>
              <span className="step-num-badge" style={{ width: '22px', height: '22px', fontSize: '0.75rem', marginRight: '6px' }}>1</span> Chọn phương tiện rửa
            </h6>
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
                vehicles.map((v, i) => {
                  const isDisabled = v.hasActiveBooking;
                  return (
                    <div key={i} className="col-md-6">
                      <div
                        className={`selectable-card p-3 rounded-4 border h-100 ${
                          selectedVehicle === v.plate 
                            ? 'selected' 
                            : isDisabled 
                              ? 'border-light bg-light opacity-60' 
                              : 'bg-light border-light'
                        }`}
                        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                        onClick={() => !isDisabled && handleSelectVehicle(v.plate)}
                      >
                        <div className="d-flex align-items-start gap-3">
                          <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-sm" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                            <i className="fas fa-car-side text-muted"></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.9rem' }}>{v.plate}</div>
                            <small className="text-muted d-block">{v.type}</small>
                            {isDisabled && (
                              <div className="text-danger small mt-2 fw-medium" style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
                                <i className="fas fa-exclamation-circle me-1"></i>
                                Phương tiện này đang có lịch hẹn chưa hoàn tất. Vui lòng hoàn thành hoặc hủy lịch hẹn hiện tại trước khi đặt lịch mới.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Thông tin dịch vụ (Read-Only) */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6 className="fw-bold mb-2.5" style={{ color: 'var(--navy-dark)', fontSize: '0.92rem' }}>
              <span className="step-num-badge" style={{ width: '22px', height: '22px', fontSize: '0.75rem', marginRight: '6px' }}>2</span> Thông tin gói dịch vụ
            </h6>
            <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
              <div className="text-start">
                <strong className="text-dark" style={{ fontSize: '0.88rem' }}>
                  {selectedMain ? selectedMain.name : 'Standard Car Wash'}
                </strong>
                <p className="mb-0 text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.4', marginTop: '2px' }}>
                  {selectedMain ? selectedMain.desc : 'Dịch vụ rửa xe tiêu chuẩn'}
                </p>
              </div>
              <div className="text-end flex-shrink-0 ms-3">
                <span className="badge bg-white text-dark border fw-bold px-2.5 py-1.5 rounded-pill" style={{ fontSize: '0.78rem' }}>
                  {selectedMain ? selectedMain.time : '60 phút'} • {selectedMain ? Number(selectedMain.price).toLocaleString() : '250.000'}đ
                </span>
              </div>
            </div>
          </div>
          
          {/* Step 3: Chọn ngày & giờ */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)', fontSize: '0.92rem' }}>
              <span className="step-num-badge" style={{ width: '22px', height: '22px', fontSize: '0.75rem', marginRight: '6px' }}>3</span> Chọn ngày & khung giờ hẹn
            </h6>
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
                  {loadingSlots ? (
                    <div className="col-12 text-center py-4 small text-secondary">
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang tải danh sách slot...
                    </div>
                  ) : availableTimeSlots.length === 0 ? (
                    <div className="col-12 text-start">
                      <div className="text-danger py-3 px-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-3 small fw-bold mb-2">
                        <i className="fas fa-exclamation-triangle me-1.5 animate-bounce"></i>
                        {bookingDate === minDateStr 
                          ? "Hôm nay đã hết slot. Vui lòng chọn ngày khác." 
                          : "Tất cả khung giờ ngày này đã được đặt. Vui lòng chọn ngày khác."}
                      </div>
                      {earliestAvailableDate && (
                        <div className="p-3 bg-info bg-opacity-10 border border-info border-opacity-20 rounded-3 small text-secondary">
                          <i className="fas fa-info-circle text-info me-1.5"></i>
                          Ngày sớm nhất có slot trống: <strong className="text-dark">{earliestAvailableDate.split('-').reverse().join('/')}</strong>.
                          <button 
                            type="button" 
                            className="btn btn-link p-0 ms-2 text-cyan fw-bold text-decoration-none small align-baseline"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => setBookingDate(earliestAvailableDate)}
                          >
                            [Chọn ngày này]
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    availableTimeSlots.map((t) => {
                      const remaining = slotsStatus[t] ?? 3;
                      return (
                        <div key={t} className="col-4">
                          <div
                            className={`text-center py-2 rounded-3 border fw-bold selectable-card ${
                              bookingTime === t ? 'selected' : 'bg-light border-light text-muted'
                            }`}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                            onClick={() => setBookingTime(t)}
                          >
                            <span style={{ fontSize: '0.82rem' }}>{t}</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 'normal', opacity: 0.75 }}>
                              {remaining > 0 ? `Còn ${remaining} slot` : 'Hết slot'}
                            </span>
                          </div>
                        </div>
                      );
                    })
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
              {appliedVoucher && (
                <div className="d-flex justify-content-between align-items-center" id="promo-applied-msg">
                  <small className="text-muted fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                    VOUCHER ({appliedVoucher.code}):
                    <button
                      type="button"
                      className="btn btn-link p-0 text-danger border-0 ms-1"
                      onClick={handleRemoveVoucher}
                      title="Hủy voucher"
                      style={{ fontSize: '0.75rem', lineHeight: 1 }}
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  </small>
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
                    className="form-control font-monospace promo-code-input text-dark fw-bold"
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
              disabled={vehicles.length === 0 || isSubmitting}
              className="app-btn-primary w-100 border-0 fw-bold text-dark"
              style={{
                borderRadius: '12px',
                padding: '14px',
                fontSize: '0.88rem',
                letterSpacing: '0.5px',
                opacity: (vehicles.length === 0 || isSubmitting) ? 0.45 : 1,
                cursor: (vehicles.length === 0 || isSubmitting) ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(14,165,233,0.28)'
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ĐANG TẠO LỊCH...
                </>
              ) : (
                <>
                  XÁC NHẬN ĐẶT LỊCH <i className="fas fa-arrow-right ms-2"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Voucher Selector Modal */}
      <Modal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        title="Ví Voucher của bạn"
        maxWidth="440px"
      >
        <div className="text-center" id="voucher-selector-list">
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
        <div className="d-flex justify-content-center mt-3 pt-3 border-top">
          <button className="confirm-cancel-btn w-50" onClick={() => setVoucherModalOpen(false)}>ĐÓNG</button>
        </div>
      </Modal>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div 
          className="confirm-modal-backdrop show" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)'
          }}
        >
          <div className="text-center p-4 bg-white rounded-4 shadow-lg animate-confirm-in" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="spinner-border text-info mb-4" role="status" style={{ width: '3.5rem', height: '3.5rem', borderWidth: '4px' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h4 className="fw-bold text-dark mb-2">Đang tạo lịch hẹn...</h4>
            <p className="text-secondary small mb-0">Vui lòng không đóng trình duyệt.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBooking;
