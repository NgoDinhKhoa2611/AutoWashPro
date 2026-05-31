import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/shared.css';
import '../styles/customer/booking.css';

const DEFAULT_MAIN_SERVICES = [
  { id: 'svc_01', name: 'Rửa xe phổ thông', desc: 'Rửa vỏ bọt tuyết cơ bản, sấy khô nhanh.', price: 35000, time: '20 phút', icon: 'fa-soap' },
  { id: 'svc_02', name: 'Combo Rửa xe cao cấp', desc: 'Bọt tuyết chi tiết + sáp nano + vệ sinh nội thất.', price: 85000, time: '45 phút', icon: 'fa-star' },
  { id: 'svc_03', name: 'Rửa xe siêu nhanh', desc: 'Rửa vỏ cơ bản dành cho giờ cao điểm.', price: 25000, time: '10 phút', icon: 'fa-bolt' }
];

const DEFAULT_ADDON_SERVICES = [
  { id: 'add_01', name: 'Vệ sinh sên chuyên nghiệp', price: 20000, icon: 'fa-link' },
  { id: 'add_02', name: 'Wax bóng nano bảo vệ sơn', price: 25000, icon: 'fa-shield-alt' },
  { id: 'add_03', name: 'Chăm sóc dưỡng nhựa nhám', price: 30000, icon: 'fa-spray-can' },
  { id: 'add_04', name: 'Vệ sinh nội thất', price: 30000, icon: 'fa-couch' }
];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];

export const CustomerBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [mainServices, setMainServices] = useState([]);
  const [addonServices, setAddonServices] = useState([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
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
    const todayStr = today.toISOString().split('T')[0];
    setMinDateStr(todayStr);
    setBookingDate(todayStr);

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + days);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    setMaxDateStr(maxDateStr);

    // Load vehicles
    let savedVehicles = [];
    try {
      savedVehicles = JSON.parse(localStorage.getItem('user_vehicles') || '[]');
    } catch (e) {}
    if (savedVehicles.length === 0) {
      savedVehicles = [
        { plate: '51G - 123.45', type: 'Honda Vision' },
        { plate: '51A - 999.99', type: 'SH Mode' }
      ];
      localStorage.setItem('user_vehicles', JSON.stringify(savedVehicles));
    }
    setVehicles(savedVehicles);
    if (savedVehicles.length > 0) {
      setSelectedVehicle(savedVehicles[0].plate);
    }

    // Load services (checking custom services in local storage first)
    let appSvc = [];
    try {
      appSvc = JSON.parse(localStorage.getItem('app_services') || '[]');
    } catch (e) {}

    const customMains = appSvc
      .filter(s => (s.isActive !== undefined ? s.isActive : s.status === 'Active') && 
                   (s.category === 'Rửa xe cơ bản' || s.category === 'Rửa xe cao cấp'))
      .map(s => ({
        id: s.id,
        name: s.name,
        desc: s.description || '',
        price: s.price,
        time: (s.estimatedMinutes || 15) + ' phút',
        icon: 'fa-soap'
      }));
    setMainServices(customMains.length > 0 ? customMains : DEFAULT_MAIN_SERVICES);

    const customAddons = appSvc
      .filter(s => (s.isActive !== undefined ? s.isActive : s.status === 'Active') && 
                   (s.category === 'Dịch vụ đi kèm' || s.category === 'Chăm sóc nội thất' || s.category === 'Phủ bóng / Wax'))
      .map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        icon: 'fa-plus-circle'
      }));
    setAddonServices(customAddons.length > 0 ? customAddons : DEFAULT_ADDON_SERVICES);

    // Load claimed vouchers
    try {
      const claimed = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
      setMyVouchers(claimed.filter(v => v.status === 1)); // 1 = Available
    } catch (e) {}
  }, [user]);

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

    // 1. Check in claimed vouchers in local storage
    let claimedList = [];
    try {
      claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    } catch (e) {}
    const voucher = claimedList.find(v => v.code.toUpperCase() === code);

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
      return;
    }

    // 2. Hardcoded fallback promos
    const hardcodedPromos = {
      'SILVER10': { title: 'Silver ưu đãi 10%', rewardType: 'DiscountPercent', rewardValue: 10 },
      'GOLD15': { title: 'Gold special 15%', rewardType: 'DiscountPercent', rewardValue: 15 },
      'VIP20': { title: 'Platinum VIP 20%', rewardType: 'DiscountPercent', rewardValue: 20 },
      'WASH50K': { title: 'Giảm 50.000đ', rewardType: 'FixedAmount', rewardValue: 50000 }
    };

    if (hardcodedPromos[code]) {
      setAppliedVoucher({
        code: code,
        title: hardcodedPromos[code].title,
        rewardType: hardcodedPromos[code].rewardType,
        rewardValue: hardcodedPromos[code].rewardValue
      });
      if (window.showToast) window.showToast(`Áp dụng mã khuyến mãi "${code}" thành công!`, 'success');
    } else {
      if (window.showToast) window.showToast('Mã ưu đãi không hợp lệ hoặc đã hết hạn.', 'warning');
    }
  };

  const handleSelectVoucherFromModal = (code) => {
    setPromoCode(code);
    applyPromo(code);
    setVoucherModalOpen(false);
  };

  // Pricing calculations
  const addonTotal = Object.values(selectedAddons).reduce((s, a) => s + Number(a.price), 0);
  const mainPrice = selectedMain ? Number(selectedMain.price) : 0;
  const baseTotal = mainPrice + addonTotal;

  // VIP discount
  const tier = (user?.tier || 'Standard Member').toUpperCase();
  let tierDiscountPercent = 0;
  let tierText = 'Standard';
  if (tier.includes('PLATINUM')) { tierDiscountPercent = 10; tierText = 'Platinum'; }
  else if (tier.includes('GOLD')) { tierDiscountPercent = 5; tierText = 'Gold'; }
  else if (tier.includes('SILVER')) { tierDiscountPercent = 2; tierText = 'Silver'; }
  const tierDiscountAmount = Math.round(baseTotal * (tierDiscountPercent / 100));

  // Voucher discount
  let promoDiscountAmount = 0;
  if (appliedVoucher && baseTotal > 0) {
    if (appliedVoucher.rewardType === 'DiscountPercent') {
      promoDiscountAmount = Math.round(baseTotal * (Number(appliedVoucher.rewardValue) / 100));
    } else {
      promoDiscountAmount = Math.min(baseTotal, Number(appliedVoucher.rewardValue));
    }
  }

  const totalDiscount = tierDiscountAmount + promoDiscountAmount;
  const finalTotal = Math.max(0, baseTotal - totalDiscount);

  // Points multiplier
  let multiplier = 1.0;
  if (tier.includes('PLATINUM')) multiplier = 1.5;
  else if (tier.includes('GOLD')) multiplier = 1.2;
  else if (tier.includes('SILVER')) multiplier = 1.1;
  const earnedPoints = Math.round((finalTotal / 1000) * multiplier);

  // Confirm booking
  const handleConfirmBooking = () => {
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

    const booking = {
      id: 'book_' + Date.now(),
      name: user?.name || 'Khách hàng',
      plate: selectedVehicle,
      service: selectedMain.name,
      addons: Object.values(selectedAddons).map(a => a.name),
      price: finalTotal,
      points: earnedPoints,
      bookingTime: bookingTime,
      bookingDate: bookingDate,
      tier: tier.replace(' MEMBER', ''),
      status: 'Arrived',
      queueStatus: 'Waiting',
      overallProgress: 0,
      currentServiceId: null,
      services: [
        { id: 'sub_0', name: 'Quét LPR', status: 'Waiting', duration: '2 phút', startedAt: null, completedAt: null },
        { id: 'sub_1', name: selectedMain.name, status: 'Waiting', duration: selectedMain.time || '20 phút', startedAt: null, completedAt: null },
        { id: 'sub_2', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null },
        ...Object.values(selectedAddons).map((a, i) => ({
          id: 'sub_addon_' + i,
          name: a.name,
          status: 'Waiting',
          duration: '10 phút',
          startedAt: null,
          completedAt: null
        }))
      ]
    };

    // Mark claimed voucher as used in local storage
    if (appliedVoucher && appliedVoucher.redemptionId) {
      let claimedList = [];
      try {
        claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
      } catch (e) {}
      const idx = claimedList.findIndex(v => v.redemptionId === appliedVoucher.redemptionId);
      if (idx !== -1) {
        claimedList[idx].status = 2; // 2 = Used
        localStorage.setItem('user_claimed_vouchers', JSON.stringify(claimedList));
      }
    }

    // Save booking state
    localStorage.setItem('active_booking', JSON.stringify(booking));
    localStorage.setItem('wash_step', '0');

    // Create notifications
    const notif = {
      id: 'notif_book_' + Date.now(),
      title: 'Đặt lịch thành công',
      body: `Xe ${selectedVehicle} đã được thêm vào hàng đợi ưu tiên ${tier.replace(' MEMBER', '')}. Giờ hẹn: ${bookingTime}.`,
      time: 'Vừa xong',
      type: 'status',
      read: false
    };
    let notifications = [];
    try {
      notifications = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    } catch (e) {}
    localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifications]));
    window.dispatchEvent(new Event('storage'));

    if (window.showToast) window.showToast(`Đặt lịch thành công! Xe ${selectedVehicle} đã vào hàng đợi.`, 'success');
    
    setTimeout(() => {
      navigate('/customer/dashboard');
    }, 1200);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">
        {/* Left Column: Form booking */}
        <div className="col-lg-8">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">1</span> Chọn phương tiện rửa
            </h5>
            <div className="row g-3" id="vehicles-list">
              {vehicles.map((v, i) => (
                <div key={i} className="col-md-6">
                  <div
                    className={`selectable-card p-3 rounded-4 border h-100 ${selectedVehicle === v.plate ? 'selected' : 'bg-light border-light'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectVehicle(v.plate)}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-sm" style={{ width: '44px', height: '44px' }}>
                        <i className="fas fa-motorcycle text-muted"></i>
                      </div>
                      <div>
                        <div className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.9rem' }}>{v.plate}</div>
                        <small className="text-muted">{v.type}</small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">2</span> Chọn gói dịch vụ chính
            </h5>
            <div className="row g-3" id="main-services-list">
              {mainServices.map((s) => (
                <div key={s.id} className="col-md-6">
                  <div
                    className={`selectable-card p-3 rounded-4 border h-100 ${selectedMain?.id === s.id ? 'selected' : 'bg-light border-light'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectMain(s)}
                  >
                    <div className="d-flex align-items-start gap-3">
                      <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ background: 'rgba(15,23,42,0.06)', width: '42px', height: '42px' }}>
                        <i className={`fas ${s.icon || 'fa-soap'} text-cyan`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold small text-start" style={{ color: 'var(--navy-dark)' }}>{s.name}</div>
                        <div className="text-muted text-start" style={{ fontSize: '0.72rem' }}>{s.desc}</div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="fw-bold text-cyan">{Number(s.price).toLocaleString()}đ</span>
                          <span className="text-muted small"><i className="far fa-clock me-1"></i>{s.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">3</span> Chọn dịch vụ đi kèm (Add-ons)
            </h5>
            <div className="d-flex flex-column gap-2" id="addon-services-list">
              {addonServices.map((a) => (
                <div
                  key={a.id}
                  className={`d-flex align-items-center justify-content-between p-3 rounded-4 border addon-row ${
                    selectedAddons[a.id] ? 'border-cyan bg-navy-light' : 'border-light bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggleAddon(a)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="form-check m-0" style={{ pointerEvents: 'none' }}>
                      <input className="form-check-input" type="checkbox" checked={!!selectedAddons[a.id]} readOnly />
                    </div>
                    <i className={`fas ${a.icon || 'fa-plus-circle'} text-cyan`}></i>
                    <span className="fw-bold small" style={{ color: 'var(--navy-dark)' }}>{a.name}</span>
                  </div>
                  <span className="fw-bold text-cyan small">+{Number(a.price).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 mb-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              <span className="step-num-badge">4</span> Chọn ngày & khung giờ hẹn
            </h5>
            <div className="row g-3">
              <div className="col-md-6 text-start">
                <label className="form-label small fw-bold text-secondary">NGÀY HẸN RỬA</label>
                <input
                  type="date"
                  id="booking-date"
                  className="form-control bg-light border-0 py-2.5 rounded-3 fw-semibold"
                  min={minDateStr}
                  max={maxDateStr}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
                <small className="text-muted d-block mt-2" id="booking-window-text">
                  Hạng {user?.tier.replace(' Member', '') || 'Member'}: đặt trước tối đa {bookingDaysWindow} ngày
                </small>
              </div>
              <div className="col-md-6 text-start">
                <label className="form-label small fw-bold text-secondary mb-2">KHUNG GIỜ</label>
                <div className="row g-2" id="time-slots">
                  {TIME_SLOTS.map((t) => (
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
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout summary */}
        <div className="col-lg-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 sticky-lg-top" style={{ top: '90px' }}>
            <h5 className="fw-bold mb-4 border-bottom pb-2.5" style={{ color: 'var(--navy-dark)', fontSize: '0.95rem' }}>
              <i className="fas fa-receipt text-cyan me-2"></i> TÓM TẮT ĐƠN HÀNG
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Biển số xe:</span>
                <span className="fw-bold" id="summary-vehicle" style={{ color: 'var(--navy-dark)' }}>
                  {selectedVehicle || '—'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Khách hàng VIP:</span>
                <span className="badge bg-cyan text-dark fw-bold" id="summary-vip-status" style={{ fontSize: '0.65rem' }}>
                  {user?.tier || 'Gold Member'}
                </span>
              </div>
              <hr className="my-1 opacity-5" />

              <div className="d-flex justify-content-between align-items-start">
                <div className="text-start">
                  <span className="text-muted small d-block">Gói dịch vụ chính:</span>
                  <strong className="small" id="summary-main-service" style={{ color: 'var(--navy-dark)' }}>
                    {selectedMain ? selectedMain.name : 'Chưa chọn'}
                  </strong>
                </div>
                <span className="fw-bold text-cyan" id="summary-main-price">
                  {selectedMain ? `${Number(selectedMain.price).toLocaleString()}đ` : '0đ'}
                </span>
              </div>

              {Object.values(selectedAddons).length > 0 && (
                <div className="text-start" id="summary-addons-block">
                  <span className="text-muted small d-block mb-1">Dịch vụ đi kèm (Add-ons):</span>
                  <div id="summary-addons-list" className="d-flex flex-column gap-1 border-start ps-3">
                    {Object.values(selectedAddons).map((a, idx) => (
                      <div key={idx} className="d-flex justify-content-between" style={{ fontSize: '0.78rem', color: '#475569' }}>
                        <span>{a.name}</span>
                        <span>+{Number(a.price).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="my-1 opacity-5" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Thời gian hẹn rửa:</span>
                <span className="fw-bold" id="summary-time" style={{ color: 'var(--navy-dark)', fontSize: '0.8rem' }}>
                  {bookingDate && bookingTime
                    ? `${bookingDate.split('-').reverse().join('/')} — ${bookingTime}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Loyalty and voucher discount rows */}
            <div className="d-flex flex-column gap-2 mb-4 bg-light p-3 rounded-3" style={{ background: 'rgba(15,23,42,0.02)' }}>
              {tierDiscountAmount > 0 && baseTotal > 0 && (
                <div className="d-flex justify-content-between align-items-center" id="tier-perk-row">
                  <small className="text-muted fw-bold" style={{ fontSize: '0.68rem' }}>ĐẶC QUYỀN VIP TIER ({tierDiscountPercent}%):</small>
                  <span className="fw-bold text-success" id="tier-perk-value" style={{ fontSize: '0.78rem' }}>
                    -{Number(tierDiscountAmount).toLocaleString()}đ
                  </span>
                </div>
              )}

              {appliedVoucher && baseTotal > 0 && (
                <div className="d-flex justify-content-between align-items-center" id="promo-applied-msg">
                  <small className="text-muted fw-bold" style={{ fontSize: '0.68rem' }}>
                    MÃ ĐÃ ÁP DỤNG (<span id="promo-applied-label">{appliedVoucher.title}</span>):
                  </small>
                  <span className="fw-bold text-success" id="promo-discount-display" style={{ fontSize: '0.78rem' }}>
                    {appliedVoucher.rewardType === 'DiscountPercent' ? `-${appliedVoucher.rewardValue}%` : `-${Number(promoDiscountAmount).toLocaleString()}đ`}
                  </span>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tổng hóa đơn gốc:</span>
                <span className="fw-semibold" style={{ fontSize: '0.8rem' }}>{Number(baseTotal).toLocaleString()}đ</span>
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
                  <i className="fas fa-ticket-alt me-1"></i>Ví Voucher của tôi
                </button>
              </div>
              <div className="input-group">
                <input
                  type="text"
                  id="promo-code-input"
                  className="form-control bg-light border-0 py-2 font-monospace"
                  placeholder="VÍ DỤ: SILVER10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button className="btn btn-dark fw-bold px-3" style={{ fontSize: '0.8rem' }} onClick={() => applyPromo()}>
                  ÁP DỤNG
                </button>
              </div>
            </div>

            {/* Final Cost & Points */}
            <div className="d-flex justify-content-between align-items-center border-top pt-4 mb-4">
              <div>
                <span className="text-muted small d-block">TỔNG CHI PHÍ</span>
                <span className="small text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>
                  Tích điểm VIP: <strong className="text-warning">+{earnedPoints} PTS</strong>
                </span>
              </div>
              <h3 className="fw-bold text-dark mb-0" id="summary-total" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {totalDiscount > 0 && baseTotal > 0 ? (
                  <>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through', display: 'block', lineHeight: 1.2 }}>
                      {Number(baseTotal).toLocaleString()}đ
                    </span>
                    {Number(finalTotal).toLocaleString()}đ
                  </>
                ) : (
                  `${Number(baseTotal).toLocaleString()}đ`
                )}
              </h3>
            </div>

            <button onClick={handleConfirmBooking} className="app-btn-primary w-100 py-3 shadow-lg fs-6">
              XÁC NHẬN ĐẶT LỊCH <i className="fas fa-chevron-right ms-1"></i>
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
                  Hãy vào trang <strong>Hạng thành viên VIP</strong> để đổi quà!
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
