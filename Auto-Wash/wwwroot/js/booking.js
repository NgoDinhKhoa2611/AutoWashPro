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
    
    // VIP perks discount calculation
    const tier = (localStorage.getItem('user_tier') || 'Standard Member').toUpperCase();
    let discountPercent = 0;
    let tierText = 'Standard';
    if (tier.includes('PLATINUM')) { discountPercent = 10; tierText = 'Platinum'; }
    else if (tier.includes('GOLD')) { discountPercent = 5; tierText = 'Gold'; }
    else if (tier.includes('SILVER')) { discountPercent = 2; tierText = 'Silver'; }
    
    const discountAmount = Math.round(baseTotal * (discountPercent / 100));
    const finalTotal = baseTotal - discountAmount;
    
    // Display total price
    const totalEl = document.getElementById('summary-total');
    if (totalEl) {
        if (discountPercent > 0) {
            totalEl.innerHTML = `<span style="font-size:0.75rem;color:#94a3b8;text-decoration:line-through;display:block;line-height:1.2;">${Number(baseTotal).toLocaleString()}đ</span>${Number(finalTotal).toLocaleString()}đ <small style="font-size:0.62rem;display:block;color:var(--cyan-electric);font-weight:bold;margin-top:2px;">(Đã giảm ${discountPercent}% VIP ${tierText})</small>`;
        } else {
            totalEl.textContent = baseTotal ? Number(baseTotal).toLocaleString() + 'đ' : '0đ';
        }
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

    // Apply VIP tier discount
    let discountPercent = 0;
    if (tierUp.includes('PLATINUM')) discountPercent = 10;
    else if (tierUp.includes('GOLD')) discountPercent = 5;
    else if (tierUp.includes('SILVER')) discountPercent = 2;
    const discountAmount = Math.round(basePrice * (discountPercent / 100));
    const totalPrice = basePrice - discountAmount;

    let multiplier = 1.0;
    if (tierUp.includes('PLATINUM')) multiplier = 1.5;
    else if (tierUp.includes('GOLD')) multiplier = 1.2;
    else if (tierUp.includes('SILVER')) multiplier = 1.1;

    const earnedPoints = Math.round((totalPrice / 1000) * multiplier);

    const booking = {
        id:          'book_' + Date.now(),
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
