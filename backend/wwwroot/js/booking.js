/**
 * booking.js — Booking flow: vehicles, services, date/time, confirmation
 */

const MAIN_SERVICES = [
    { id: 'svc_01', name: 'Rửa xe phổ thông',     desc: 'Rửa vỏ bọt tuyết cơ bản, sấy khô nhanh.',         price: 35000,  time: '20 phút',  icon: 'fa-soap' },
    { id: 'svc_02', name: 'Combo Rửa xe cao cấp', desc: 'Bọt tuyết chi tiết + sáp nano + vệ sinh nội thất.', price: 85000,  time: '45 phút',  icon: 'fa-star' },
    { id: 'svc_03', name: 'Rửa xe siêu nhanh',    desc: 'Rửa vỏ cơ bản dành cho giờ cao điểm.',             price: 25000,  time: '10 phút',  icon: 'fa-bolt' }
];

const ADDON_SERVICES = [
    { id: 'add_01', name: 'Vệ sinh sên chuyên nghiệp', price: 20000, icon: 'fa-link' },
    { id: 'add_02', name: 'Wax bóng nano bảo vệ sơn',  price: 25000, icon: 'fa-shield-alt' },
    { id: 'add_03', name: 'Chăm sóc dưỡng nhựa nhám',  price: 30000, icon: 'fa-spray-can' },
    { id: 'add_04', name: 'Vệ sinh nội thất',           price: 30000, icon: 'fa-couch' }
];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];

let selectedVehicle = null;
let selectedMain    = null;
let selectedAddons  = {};
let selectedDate    = '';
let selectedTime    = '';
let appliedVoucher  = null;

document.addEventListener('DOMContentLoaded', function () {
    renderVehicles();
    renderMainServices();
    renderAddonServices();
    renderTimeSlots();
    initDatePicker();
    updateSummary();

    // Sync VIP status
    const tier    = localStorage.getItem('user_tier') || 'Standard Member';
    const vipEl   = document.getElementById('summary-vip-status');
    if (vipEl) vipEl.textContent = tier;

    window.addEventListener('storage', () => {
        renderVehicles();
        const t = localStorage.getItem('user_tier') || 'Standard Member';
        if (vipEl) vipEl.textContent = t;
    });
});

// ── Vehicles ─────────────────────────────────────────────
function renderVehicles() {
    const saved = localStorage.getItem('user_vehicles');
    let vehicles = [];
    try { vehicles = saved ? JSON.parse(saved) : []; } catch (e) {}

    if (vehicles.length === 0) {
        vehicles = [
            { plate: '51G - 123.45', type: 'Honda Vision' },
            { plate: '51A - 999.99', type: 'SH Mode' }
        ];
        localStorage.setItem('user_vehicles', JSON.stringify(vehicles));
    }

    // Auto-select first vehicle to streamline mobile UX
    if (vehicles.length > 0 && !selectedVehicle) {
        selectedVehicle = vehicles[0].plate;
    }

    const container = document.getElementById('vehicles-list');
    if (!container) return;

    container.innerHTML = vehicles.map((v, i) => `
        <div class="col-md-6">
            <div class="selectable-card p-3 rounded-4 border h-100 ${selectedVehicle === v.plate ? 'selected' : 'bg-light border-light'}"
                 style="cursor:pointer;" onclick="selectVehicle('${v.plate}', this)">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-sm"
                         style="width:44px;height:44px;">
                        <i class="fas fa-motorcycle text-muted"></i>
                    </div>
                    <div>
                        <div class="fw-bold" style="color:var(--navy-dark);font-size:0.9rem;">${v.plate}</div>
                        <small class="text-muted">${v.type}</small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function selectVehicle(plate, el) {
    selectedVehicle = plate;
    renderVehicles();
    updateSummary();
}

// ── Main Services ────────────────────────────────────────
function renderMainServices() {
    const container = document.getElementById('main-services-list');
    if (!container) return;

    // Also check localStorage for custom services
    let extraServices = [];
    try {
        const appSvc = JSON.parse(localStorage.getItem('app_services') || '[]');
        extraServices = appSvc
            .filter(s => (s.isActive !== undefined ? s.isActive : s.status === 'Active')
                      && (s.category === 'Rửa xe cơ bản' || s.category === 'Rửa xe cao cấp'))
            .map(s => ({
                id: s.id,
                name: s.name,
                desc: s.description || '',
                price: s.price,
                time: (s.estimatedMinutes || 15) + ' phút',
                icon: 'fa-soap'
            }));
    } catch (e) {}

    const services = extraServices.length > 0 ? extraServices : MAIN_SERVICES;

    container.innerHTML = services.map(s => `
        <div class="col-md-6">
            <div class="selectable-card p-3 rounded-4 border h-100 ${selectedMain === s.id ? 'selected' : 'bg-light border-light'}"
                 style="cursor:pointer;" onclick="selectMainService('${s.id}', '${s.name}', ${s.price})">
                <div class="d-flex align-items-start gap-3">
                    <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                         style="background:rgba(15,23,42,0.06);width:42px;height:42px;">
                        <i class="fas ${s.icon} text-cyan"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold small" style="color:var(--navy-dark);">${s.name}</div>
                        <div class="text-muted" style="font-size:0.72rem;">${s.desc}</div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="fw-bold text-cyan">${Number(s.price).toLocaleString()}đ</span>
                            <span class="text-muted small"><i class="far fa-clock me-1"></i>${s.time}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function selectMainService(id, name, price) {
    selectedMain = id;
    renderMainServices();
    updateSummary();
}

// ── Add-ons ──────────────────────────────────────────────
function renderAddonServices() {
    const container = document.getElementById('addon-services-list');
    if (!container) return;

    let addons = ADDON_SERVICES;
    try {
        const appSvc = JSON.parse(localStorage.getItem('app_services') || '[]');
        const custom = appSvc
            .filter(s => (s.isActive !== undefined ? s.isActive : s.status === 'Active')
                      && (s.category === 'Dịch vụ đi kèm' || s.category === 'Chăm sóc nội thất' || s.category === 'Phủ bóng / Wax'))
            .map(s => ({ id: s.id, name: s.name, price: s.price, icon: 'fa-plus-circle' }));
        if (custom.length > 0) addons = custom;
    } catch (e) {}

    container.innerHTML = addons.map(a => `
        <div class="d-flex align-items-center justify-content-between p-3 rounded-4 border mb-1 addon-row ${selectedAddons[a.id] ? 'border-cyan bg-navy-light' : 'border-light bg-light'}"
             style="cursor:pointer;" onclick="toggleAddon('${a.id}', '${a.name}', ${a.price})">
            <div class="d-flex align-items-center gap-3">
                <div class="form-check m-0" style="pointer-events: none;">
                    <input class="form-check-input" type="checkbox" id="addon-${a.id}"
                           ${selectedAddons[a.id] ? 'checked' : ''} />
                </div>
                <i class="fas ${a.icon} text-cyan"></i>
                <span class="fw-bold small" style="color:var(--navy-dark);">${a.name}</span>
            </div>
            <span class="fw-bold text-cyan small">+${Number(a.price).toLocaleString()}đ</span>
        </div>
    `).join('');
}

function toggleAddon(id, name, price) {
    if (selectedAddons[id]) {
        delete selectedAddons[id];
    } else {
        selectedAddons[id] = { name, price };
    }
    renderAddonServices();
    updateSummary();
}

// ── Time Slots ───────────────────────────────────────────
function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container) return;

    container.innerHTML = TIME_SLOTS.map(t => `
        <div class="col-4">
            <div class="text-center py-2 rounded-3 border fw-bold selectable-card ${selectedTime === t ? 'selected' : 'bg-light border-light text-muted'}"
                 style="cursor:pointer;font-size:0.8rem;" onclick="selectTime('${t}')">
                ${t}
            </div>
        </div>
    `).join('');
}

function selectTime(time) {
    selectedTime = time;
    renderTimeSlots();
    updateSummary();
}

function initDatePicker() {
    const dateInput = document.getElementById('booking-date');
    if (!dateInput) return;

    // Set minimum date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    dateInput.min = todayStr;
    dateInput.value = todayStr;
    selectedDate = todayStr;

    // Tier-based booking window (eg. Member: 7 days, Silver: 10 days, Gold: 12 days, Platinum: 14 days)
    const tier = (localStorage.getItem('user_tier') || 'Standard Member').toUpperCase();
    let days = 7;
    if (tier.includes('PLATINUM')) days = 14;
    else if (tier.includes('GOLD')) days = 12;
    else if (tier.includes('SILVER')) days = 10;

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + days);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    dateInput.max = maxDateStr;

    // Show booking window info text
    const windowTextEl = document.getElementById('booking-window-text');
    if (windowTextEl) {
        const tierLabel = tier.includes('PLATINUM') ? 'Platinum' :
                          tier.includes('GOLD')     ? 'Gold'     :
                          tier.includes('SILVER')   ? 'Silver'   : 'Member';
        windowTextEl.textContent = `${tierLabel} Member: đặt trước tối đa ${days} ngày`;
    }

    dateInput.addEventListener('change', function () {
        selectedDate = this.value;
        updateSummary();
    });
}

// ── Summary ──────────────────────────────────────────────
function updateSummary() {
    // Vehicle
    const vehEl = document.getElementById('summary-vehicle');
    if (vehEl) vehEl.textContent = selectedVehicle || '—';

    // Main service
    const mainSvcEl   = document.getElementById('summary-main-service');
    const mainPriceEl = document.getElementById('summary-main-price');
    let mainPrice = 0;
    let mainName  = 'Chưa chọn';

    if (selectedMain) {
        const svc = MAIN_SERVICES.find(s => s.id === selectedMain) ||
                    (() => {
                        try {
                            return JSON.parse(localStorage.getItem('app_services') || '[]').find(s => s.id === selectedMain);
                        } catch (e) { return null; }
                    })();
        if (svc) { mainName = svc.name; mainPrice = svc.price; }
    }
    if (mainSvcEl)   mainSvcEl.textContent   = mainName;
    if (mainPriceEl) mainPriceEl.textContent = mainPrice ? Number(mainPrice).toLocaleString() + 'đ' : '0đ';

    // Add-ons
    const addonsBlock = document.getElementById('summary-addons-block');
    const addonsList  = document.getElementById('summary-addons-list');
    let addonTotal = 0;
    const addonEntries = Object.values(selectedAddons);

    if (addonEntries.length > 0 && addonsBlock && addonsList) {
        addonsBlock.style.display = 'block';
        addonsList.innerHTML = addonEntries.map(a =>
            `<div class="d-flex justify-content-between" style="font-size:0.78rem;color:#475569;">
                <span>${a.name}</span><span>+${Number(a.price).toLocaleString()}đ</span>
            </div>`
        ).join('');
        addonTotal = addonEntries.reduce((s, a) => s + Number(a.price), 0);
    } else if (addonsBlock) {
        addonsBlock.style.display = 'none';
    }

    // Time
    const timeEl = document.getElementById('summary-time');
    if (timeEl) {
        timeEl.textContent = (selectedDate && selectedTime)
            ? `${selectedDate.split('-').reverse().join('/')} — ${selectedTime}`
            : '—';
    }

    // Total & Auto-applied perks at checkout
    const baseTotal = mainPrice + addonTotal;

    // 1. Calculate VIP Tier discount
    const tier = (localStorage.getItem('user_tier') || 'Standard Member').toUpperCase();
    let tierDiscountPercent = 0;
    let tierText = 'Standard';
    if (tier.includes('PLATINUM')) { tierDiscountPercent = 10; tierText = 'Platinum'; }
    else if (tier.includes('GOLD')) { tierDiscountPercent = 5; tierText = 'Gold'; }
    else if (tier.includes('SILVER')) { tierDiscountPercent = 2; tierText = 'Silver'; }

    const tierDiscountAmount = Math.round(baseTotal * (tierDiscountPercent / 100));

    // 2. Calculate Voucher/Promo discount
    let promoDiscountAmount = 0;
    const msg   = document.getElementById('promo-applied-msg');
    const label = document.getElementById('promo-applied-label');
    const discEl = document.getElementById('promo-discount-display');

    if (appliedVoucher && baseTotal > 0) {
        if (appliedVoucher.rewardType === 'DiscountPercent') {
            promoDiscountAmount = Math.round(baseTotal * (Number(appliedVoucher.rewardValue) / 100));
            if (discEl) discEl.textContent = `-${appliedVoucher.rewardValue}%`;
        } else {
            // Fixed discount or free wash
            promoDiscountAmount = Math.min(baseTotal, Number(appliedVoucher.rewardValue));
            if (discEl) discEl.textContent = `-${Number(promoDiscountAmount).toLocaleString()}đ`;
        }
        if (msg) msg.classList.remove('d-none');
        if (label) label.textContent = appliedVoucher.title;
    } else {
        if (msg) msg.classList.add('d-none');
        appliedVoucher = null; // Clear if base total is 0
    }

    const totalDiscount = tierDiscountAmount + promoDiscountAmount;
    const finalTotal = Math.max(0, baseTotal - totalDiscount);

    // Show/hide tier perk row
    const tierPerkRow = document.getElementById('tier-perk-row');
    const tierPerkVal = document.getElementById('tier-perk-value');
    if (tierDiscountPercent > 0 && baseTotal > 0) {
        if (tierPerkRow) tierPerkRow.classList.remove('d-none');
        if (tierPerkVal) tierPerkVal.textContent = `-${Number(tierDiscountAmount).toLocaleString()}đ (${tierDiscountPercent}% ${tierText})`;
    } else {
        if (tierPerkRow) tierPerkRow.classList.add('d-none');
    }

    // Display total price
    const totalEl = document.getElementById('summary-total');
    if (totalEl) {
        if (totalDiscount > 0 && baseTotal > 0) {
            totalEl.innerHTML = `<span style="font-size:0.75rem;color:#94a3b8;text-decoration:line-through;display:block;line-height:1.2;">${Number(baseTotal).toLocaleString()}đ</span>${Number(finalTotal).toLocaleString()}đ`;
        } else {
            totalEl.textContent = baseTotal ? Number(baseTotal).toLocaleString() + 'đ' : '0đ';
        }
    }
}

// ── Promo Code ────────────────────────────────────────────
function applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    const msg   = document.getElementById('promo-applied-msg');
    const label = document.getElementById('promo-applied-label');
    const discEl = document.getElementById('promo-discount-display');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) { showToast('Nhập mã ưu đãi trước khi áp dụng.', 'warning'); return; }

    // 1. Check in claimed vouchers in localStorage (aligned with RewardRedemptions)
    const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    const voucher = claimedList.find(v => v.code.toUpperCase() === code);

    if (voucher) {
        if (voucher.status === 2 || voucher.status === 'used') {
            showToast('Mã voucher này đã được sử dụng trước đây!', 'warning');
            return;
        }

        appliedVoucher = {
            redemptionId: voucher.redemptionId,
            code: voucher.code,
            title: voucher.title,
            rewardType: voucher.rewardType,
            rewardValue: voucher.rewardValue
        };
        showToast(`Áp dụng voucher "${voucher.title}" thành công!`, 'success');
        updateSummary();
        return;
    }

    // 2. Check hardcoded promos fallback
    const promos = {
        'SILVER10': { label: 'Silver ưu đãi 10%',    rewardType: 'DiscountPercent', rewardValue: 10 },
        'GOLD15':   { label: 'Gold special 15%',      rewardType: 'DiscountPercent', rewardValue: 15 },
        'VIP20':    { label: 'Platinum VIP 20%',      rewardType: 'DiscountPercent', rewardValue: 20 },
        'WASH50K':  { label: 'Giảm 50.000đ mặc định', rewardType: 'FixedAmount',     rewardValue: 50000 }
    };

    if (promos[code]) {
        appliedVoucher = {
            code: code,
            title: promos[code].label,
            rewardType: promos[code].rewardType,
            rewardValue: promos[code].rewardValue
        };
        showToast(`Áp dụng mã khuyến mãi "${code}" thành công!`, 'success');
        updateSummary();
    } else {
        showToast('Mã ưu đãi không hợp lệ hoặc đã hết hạn.', 'warning');
    }
}

// ── Confirm Booking ──────────────────────────────────────
function handleConfirmBooking() {
    if (!selectedVehicle) {
        showToast('Vui lòng chọn phương tiện!', 'warning');
        return;
    }
    if (!selectedMain) {
        showToast('Vui lòng chọn gói dịch vụ chính!', 'warning');
        return;
    }
    if (!selectedDate || !selectedTime) {
        showToast('Vui lòng chọn ngày và khung giờ!', 'warning');
        return;
    }

    const svc = MAIN_SERVICES.find(s => s.id === selectedMain) ||
                (() => {
                    try {
                        return JSON.parse(localStorage.getItem('app_services') || '[]').find(s => s.id === selectedMain);
                    } catch (e) { return null; }
                })() || { name: 'Rửa xe phổ thông', price: 35000, time: '20 phút' };
    const addonEntries = Object.values(selectedAddons);
    const addonTotal   = addonEntries.reduce((s, a) => s + Number(a.price), 0);
    const basePrice    = svc.price + addonTotal;

    const tier  = localStorage.getItem('user_tier') || 'Standard Member';
    const tierUp = tier.replace(' Member', '').toUpperCase();

    // Calculate VIP tier discount
    let tierDiscountPercent = 0;
    if (tierUp.includes('PLATINUM')) tierDiscountPercent = 10;
    else if (tierUp.includes('GOLD')) tierDiscountPercent = 5;
    else if (tierUp.includes('SILVER')) tierDiscountPercent = 2;
    const tierDiscountAmount = Math.round(basePrice * (tierDiscountPercent / 100));

    // Calculate Voucher/Promo discount
    let promoDiscountAmount = 0;
    if (appliedVoucher) {
        if (appliedVoucher.rewardType === 'DiscountPercent') {
            promoDiscountAmount = Math.round(basePrice * (Number(appliedVoucher.rewardValue) / 100));
        } else {
            promoDiscountAmount = Math.min(basePrice, Number(appliedVoucher.rewardValue));
        }
    }

    const totalPrice = Math.max(0, basePrice - (tierDiscountAmount + promoDiscountAmount));

    let multiplier = 1.0;
    if (tierUp.includes('PLATINUM')) multiplier = 1.5;
    else if (tierUp.includes('GOLD')) multiplier = 1.2;
    else if (tierUp.includes('SILVER')) multiplier = 1.1;

    const earnedPoints = Math.round((totalPrice / 1000) * multiplier);

    const booking = {
        id:          'book_' + Date.now(),
        name:        localStorage.getItem('user_display_name') || localStorage.getItem('user_name') || 'Lê Tuấn Kiệt',
        plate:       selectedVehicle,
        service:     svc.name,
        addons:      addonEntries.map(a => a.name),
        price:       totalPrice,
        points:      earnedPoints,
        bookingTime: selectedTime,
        bookingDate: selectedDate,
        tier:        tierUp,
        status:      'Arrived',
        queueStatus: 'Waiting',
        overallProgress: 0,
        currentServiceId: null,
        services: [
            { id: 'sub_0', name: 'Quét LPR', status: 'Waiting', duration: '2 phút', startedAt: null, completedAt: null },
            { id: 'sub_1', name: svc.name,   status: 'Waiting', duration: (svc.time || '20 phút'), startedAt: null, completedAt: null },
            { id: 'sub_2', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null },
            ...addonEntries.map((a, i) => ({
                id: 'sub_addon_' + i,
                name: a.name,
                status: 'Waiting',
                duration: '10 phút',
                startedAt: null,
                completedAt: null
            }))
        ]
    };

    // Mark voucher as used in localStorage (representing RewardRedemptions status = 2)
    if (appliedVoucher && appliedVoucher.redemptionId) {
        const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
        const idx = claimedList.findIndex(v => v.redemptionId === appliedVoucher.redemptionId);
        if (idx !== -1) {
            claimedList[idx].status = 2; // 2 = Used in database enum
            localStorage.setItem('user_claimed_vouchers', JSON.stringify(claimedList));
        }
    }

    localStorage.setItem('active_booking', JSON.stringify(booking));
    localStorage.setItem('wash_step', '0');
    window.dispatchEvent(new Event('storage'));

    // Add notification
    const notif = {
        id: 'notif_book_' + Date.now(),
        title: 'Đặt lịch thành công',
        body: `Xe ${selectedVehicle} đã được thêm vào hàng đợi ưu tiên ${tierUp}. Giờ hẹn: ${selectedTime}.`,
        time: 'Vừa xong',
        type: 'status',
        read: false
    };
    const existingNotifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    localStorage.setItem('user_notifications', JSON.stringify([notif, ...existingNotifs]));

    showToast(`Đặt lịch thành công! Xe ${selectedVehicle} đã vào hàng đợi.`, 'success');
    setTimeout(() => { window.location.href = '/Customer/Dashboard'; }, 1200);
}

// ── Voucher Modal Selector ───────────────────────────────
function showMyVouchersSelector() {
    const backdrop = document.getElementById('voucher-modal-backdrop');
    const listContainer = document.getElementById('voucher-selector-list');
    if (!backdrop || !listContainer) return;

    const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    const availableVouchers = claimedList.filter(v => v.status === 1); // 1 = Available

    if (availableVouchers.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <i class="fas fa-info-circle mb-2 fa-lg d-block" style="color: var(--cyan-electric);"></i>
                Bạn không có voucher khả dụng nào trong ví.<br>
                Hãy vào trang <strong>Tích điểm & Ưu đãi</strong> để đổi quà!
            </div>
        `;
    } else {
        listContainer.innerHTML = availableVouchers.map(v => {
            let badgeText = '';
            if (v.rewardType === 'DiscountPercent') badgeText = `Giảm ${v.rewardValue}%`;
            else badgeText = `Giảm ₫${Number(v.rewardValue).toLocaleString()}`;

            return `
            <div class="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between mb-2 select-voucher-item" style="transition: all 0.2s ease;">
                <div class="text-start">
                    <div class="fw-bold text-dark small mb-0.5">${v.title}</div>
                    <div class="font-monospace text-secondary small" style="font-size:0.7rem;">Mã: ${v.code}</div>
                    <span class="badge bg-cyan text-dark small mt-1" style="font-size:0.6rem; font-weight:700;">${badgeText}</span>
                </div>
                <button type="button" class="ticket-btn" style="padding: 4px 10px; font-size: 0.68rem; border-radius: 8px;" onclick="selectVoucherFromModal('${v.code}')">Chọn</button>
            </div>
            `;
        }).join('');
    }

    backdrop.style.display = 'flex';
}

function selectVoucherFromModal(code) {
    const input = document.getElementById('promo-code-input');
    if (input) {
        input.value = code;
        applyPromoCode();
    }
    closeVoucherModal();
}

function closeVoucherModal() {
    const backdrop = document.getElementById('voucher-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
}
