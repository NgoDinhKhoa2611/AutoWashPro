/**
 * dashboard.js — Customer Dashboard logic (Premium Overhaul)
 */

const STEP_BADGES = [
    'Đã nhận diện LPR',
    'Đang phun rửa vỏ',
    'Đang sấy khí áp lực',
    'Đã rửa sạch & Check-out'
];

document.addEventListener('DOMContentLoaded', function () {
    renderDashboard();
    loadNotifications();
    updateConciergeGreeting();

    window.addEventListener('storage', function () {
        renderDashboard();
        loadNotifications();
        updateConciergeGreeting();
    });
});

function updateConciergeGreeting() {
    const greetingEl = document.getElementById('concierge-greeting');
    const weatherEl = document.getElementById('concierge-weather');
    if (!greetingEl) return;

    // 1. Time of day greeting
    const hour = new Date().getHours();
    let prefix = 'Xin chào';
    if (hour >= 5 && hour < 12) prefix = 'Chào buổi sáng ☀️';
    else if (hour >= 12 && hour < 18) prefix = 'Chào buổi chiều 🌤️';
    else prefix = 'Chào buổi tối 🌙';

    const savedName = localStorage.getItem('user_name') || 'Lê Tuấn Kiệt';
    greetingEl.textContent = `${prefix}, ${savedName}!`;

    // 2. Weather suitability status
    if (weatherEl) {
        const statuses = [
            'Thời tiết nắng ráo lý tưởng để rửa xe hôm nay! ☀️✨',
            'Trời dịu mát thích hợp dưỡng nhựa nhám và wax bóng! 🌤️🛡️',
            'Độ ẩm cao - Rửa sấy khí áp lực giữ bóng sơn hiệu quả! 💧✨',
            'Hàng đợi VIP đang mở - Đặt lịch rửa nhanh chỉ mất 30s! ⚡🚗'
        ];
        // Select status based on day of month
        const index = new Date().getDate() % statuses.length;
        weatherEl.textContent = statuses[index];
    }
}

function renderDashboard() {
    const activeStr = localStorage.getItem('active_booking');
    const emptyBlock  = document.getElementById('empty-state-block');
    const activeBlock = document.getElementById('active-booking-block');

    if (activeStr) {
        try {
            const booking  = JSON.parse(activeStr);
            const washStep = Number(localStorage.getItem('wash_step') || 0);

            if (emptyBlock)  emptyBlock.style.display  = 'none';
            if (activeBlock) activeBlock.style.display = 'block';

            renderActiveBooking(booking, washStep);
        } catch (e) {
            showEmptyState();
        }
    } else {
        showEmptyState();
    }

    // Sync stats
    let tier = localStorage.getItem('user_tier');
    if (!tier || tier === 'Standard Member' || tier === 'Member') {
        tier = 'Gold Member';
        localStorage.setItem('user_tier', 'Gold Member');
        localStorage.setItem('user_points', '550');
        localStorage.setItem('user_next_tier', 'Platinum');
        localStorage.setItem('user_remaining_spend', '250k');
    }
    const pts  = Number(localStorage.getItem('user_points') || '550');
    
    let vehicles = [];
    try {
        vehicles = JSON.parse(localStorage.getItem('user_vehicles') || '[]');
    } catch (e) {}
    if (vehicles.length === 0) {
        vehicles = [
            { plate: '51G - 123.45', type: 'Honda Vision' },
            { plate: '51A - 999.99', type: 'SH Mode' }
        ];
        localStorage.setItem('user_vehicles', JSON.stringify(vehicles));
    }

    const statPts  = document.getElementById('stat-points');
    const statTier = document.getElementById('stat-tier');
    const statVehCount = document.getElementById('stat-vehicles-count');
    const statPlatesContainer = document.getElementById('stat-garage-plates');

    if (statPts)  statPts.innerHTML  = `${pts.toLocaleString()} <small class="fs-6 text-muted fw-normal">PTS</small>`;
    if (statTier) statTier.textContent = tier.replace(' Member', '');
    if (statVehCount) statVehCount.textContent = `${vehicles.length} xe`;

    // Render plates as mini glass tags
    if (statPlatesContainer) {
        statPlatesContainer.innerHTML = vehicles.map(v => 
            `<span class="badge bg-light text-dark border font-monospace py-1.5 px-2.5" style="font-size:0.65rem;border-color:rgba(15,23,42,0.08)!important;">
                <i class="fas fa-motorcycle text-muted me-1"></i>${v.plate}
             </span>`
        ).join(' ');
    }

    const statPlatesMobile = document.getElementById('stat-garage-plates-mobile');
    if (statPlatesMobile && vehicles.length > 0) {
        statPlatesMobile.innerHTML = `<span class="text-dark fw-bold font-monospace" style="font-size:0.7rem;"><i class="fas fa-motorcycle text-cyan me-1"></i>${vehicles[0].plate}</span>${vehicles.length > 1 ? ` <span class="badge rounded bg-cyan text-white fw-bold px-1" style="font-size:0.55rem;vertical-align:middle;padding: 1px 3px;">+${vehicles.length - 1}</span>` : ''}`;
    }

    // Points progression bar calculations (VIP scale 0 to 1000 PTS)
    const statProgress = document.getElementById('stat-points-progress');
    if (statProgress) {
        const pct = Math.min((pts / 1000) * 100, 100);
        statProgress.style.width = `${pct}%`;
    }

    // Points expiry warning (simulated batch expiring soonest)
    const expiryWarningEl = document.getElementById('stat-expiry-warning');
    const expiryTextEl    = document.getElementById('stat-expiry-text');
    if (expiryWarningEl && expiryTextEl) {
        const config = JSON.parse(localStorage.getItem('loyalty_config') || '{}');
        const expiryMonths = config.expiryMonths || 12;
        const soonestExpiry = new Date();
        soonestExpiry.setMonth(soonestExpiry.getMonth() - (expiryMonths - 2)); // simulate ~2 months to expiry
        soonestExpiry.setMonth(soonestExpiry.getMonth() + expiryMonths);
        const daysLeft = Math.ceil((soonestExpiry - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 60) {
            expiryTextEl.textContent = `150 PTS hết hạn trong ${daysLeft} ngày`;
            expiryWarningEl.style.display = 'block';
        } else {
            expiryWarningEl.style.display = 'none';
        }
    }

    // Update VIP tier medal card aesthetics
    const tierMedal = document.getElementById('stat-tier-medal');
    const tierDesc = document.getElementById('stat-tier-desc');
    const tUp = tier.toUpperCase();
    
    if (tierMedal && tierDesc) {
        if (tUp.includes('PLATINUM')) {
            tierMedal.className = 'd-flex align-items-center justify-content-center rounded-circle';
            tierMedal.style.background = 'rgba(14, 165, 233, 0.12)';
            tierMedal.style.color = '#0ea5e9';
            tierMedal.innerHTML = '<i class="fas fa-crown"></i>';
            tierDesc.textContent = 'Đặc quyền nhân hệ số x1.5 điểm';
        } else if (tUp.includes('GOLD')) {
            tierMedal.className = 'd-flex align-items-center justify-content-center rounded-circle';
            tierMedal.style.background = 'rgba(245, 158, 11, 0.12)';
            tierMedal.style.color = '#f59e0b';
            tierMedal.innerHTML = '<i class="fas fa-award"></i>';
            tierDesc.textContent = 'Đặc quyền nhân hệ số x1.2 điểm';
        } else if (tUp.includes('SILVER')) {
            tierMedal.className = 'd-flex align-items-center justify-content-center rounded-circle';
            tierMedal.style.background = 'rgba(148, 163, 184, 0.12)';
            tierMedal.style.color = '#64748b';
            tierMedal.innerHTML = '<i class="fas fa-medal"></i>';
            tierDesc.textContent = 'Đặc quyền nhân hệ số x1.1 điểm';
        } else {
            tierMedal.className = 'd-flex align-items-center justify-content-center rounded-circle';
            tierMedal.style.background = 'rgba(15, 23, 42, 0.05)';
            tierMedal.style.color = '#475569';
            tierMedal.innerHTML = '<i class="fas fa-user"></i>';
            tierDesc.textContent = 'Hạng tiêu chuẩn tích lũy điểm';
        }
    }

    // Sync member card
    const dashPts = document.getElementById('dashboard-points');
    if (dashPts) dashPts.textContent = pts.toLocaleString();

    // Sync member card VIP class (metallic reflection)
    const cardEl = document.getElementById('member-card');
    if (cardEl) {
        cardEl.className = 'member-card mb-4 member-card-3d';
        if (tUp.includes('PLATINUM')) cardEl.classList.add('tier-platinum');
        else if (tUp.includes('GOLD')) cardEl.classList.add('tier-gold');
        else if (tUp.includes('SILVER')) cardEl.classList.add('tier-silver');
        else cardEl.classList.add('tier-standard');
        
        // Sync the top-left tier label text dynamically to match the actual tier
        const tierLabelEl = cardEl.querySelector('.tier-label');
        if (tierLabelEl) {
            tierLabelEl.innerHTML = `<i class="fas fa-crown me-2"></i>${tier}`;
        }
    }

    // Sync barcode and next tier details dynamically
    const nextTier = localStorage.getItem('user_next_tier') || 'Platinum';
    const remaining = localStorage.getItem('user_remaining_spend') || '250k';
    const cardCode = `AW-2026-${tier.replace(' Member','').toUpperCase()}`;
    
    const barcodeNumEl = document.querySelector('.barcode-number');
    if (barcodeNumEl) barcodeNumEl.textContent = cardCode;
    
    const cardCodeEl = document.getElementById('dashboard-card-code');
    if (cardCodeEl) cardCodeEl.textContent = cardCode;

    const nextTierEl = document.getElementById('dashboard-next-tier');
    if (nextTierEl) nextTierEl.textContent = `${nextTier} — còn ${remaining}`;
}

function showEmptyState() {
    const emptyBlock  = document.getElementById('empty-state-block');
    const activeBlock = document.getElementById('active-booking-block');
    if (emptyBlock)  emptyBlock.style.display  = 'block';
    if (activeBlock) activeBlock.style.display = 'none';
}

function renderActiveBooking(booking, step) {
    const block = document.getElementById('active-booking-block');
    if (!block) return;

    const badge = STEP_BADGES[Math.min(step, 3)] || STEP_BADGES[0];
    const progress = Math.round((step / 3) * 100);

    block.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
            <div class="d-flex align-items-center">
                <div class="rounded-4 p-3 me-3 d-flex align-items-center justify-content-center"
                     style="background:rgba(15, 23, 42, 0.04);width:52px;height:52px;border:1px solid rgba(15, 23, 42, 0.06);">
                    <i class="fas fa-car-side fa-lg text-cyan"></i>
                </div>
                <div>
                    <div class="fw-bold fs-5" style="color:var(--navy-dark);">${booking.plate || '—'}</div>
                    <small class="text-muted">${booking.service || '—'}</small>
                </div>
            </div>
            <span class="badge bg-info bg-opacity-10 text-cyan px-3 py-2 rounded-pill small fw-bold d-flex align-items-center gap-2">
                <span class="pulse-dot-washing"></span>${badge}
            </span>
        </div>

        <!-- Circular Wash Progress Ring (Premium Apple-Watch Inspired UX) -->
        <div class="progress-ring-container mt-4 mb-4">
            <div class="progress-ring-outer" style="background: conic-gradient(var(--cyan-electric) ${progress}%, rgba(15, 23, 42, 0.05) 0deg);">
                <div class="progress-ring-inner">
                    <div class="progress-ring-pct">${progress}%</div>
                    <div class="progress-ring-label">${badge}</div>
                </div>
            </div>
        </div>

        <!-- Detailed wash list checklist -->
        <div class="d-flex flex-column gap-2 mb-4">
            ${[0,1,2,3].map(i => {
                const isCompleted = i < step;
                const isActive = i === step;
                const stepNames = ['Nhận diện LPR tự động', 'Rửa bọt tuyết vỏ xe', 'Sấy khô khí nén cao áp', 'Hoàn tất & Checkout xe'];
                return `
                    <div class="d-flex align-items-center justify-content-between p-2.5 rounded-3" style="background:rgba(15, 23, 42, 0.02);border:1px solid ${isActive ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.03)'}">
                        <div class="d-flex align-items-center gap-2">
                            <div class="rounded-circle d-flex align-items-center justify-content-center" style="width:20px;height:20px;font-size:0.65rem;background:${isCompleted ? 'var(--cyan-electric)' : isActive ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.06)'};color:${isCompleted ? '#fff' : isActive ? 'var(--cyan-electric)' : '#94a3b8'}">
                                ${isCompleted ? '<i class="fas fa-check" style="font-size:0.55rem;"></i>' : (i + 1)}
                            </div>
                            <span class="small fw-semibold ${isActive ? 'text-dark' : isCompleted ? 'text-secondary' : 'text-muted'}">${stepNames[i]}</span>
                        </div>
                        <span class="badge ${isCompleted ? 'bg-success bg-opacity-10 text-success' : isActive ? 'bg-info bg-opacity-10 text-cyan animate-pulse' : 'bg-secondary bg-opacity-10 text-muted'} px-2 py-1" style="font-size:0.6rem;">
                            ${isCompleted ? 'Xong' : isActive ? 'Đang chạy' : 'Đang chờ'}
                        </span>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="row g-3 bg-light p-3 rounded-4" style="background:rgba(15, 23, 42, 0.02)!important;border:1px solid rgba(15, 23, 42, 0.04);">
            <div class="col-sm-4 col-6">
                <small class="text-muted d-block fw-bold" style="font-size:0.65rem;">GIỜ HẸN GIAO XE</small>
                <span class="fw-bold" style="color:var(--navy-dark);font-size:0.85rem;">${booking.bookingTime || '—'}</span>
            </div>
            <div class="col-sm-4 col-6">
                <small class="text-muted d-block fw-bold" style="font-size:0.65rem;">DỊCH VỤ RỬA</small>
                <span class="fw-bold text-truncate d-block" style="color:var(--navy-dark);font-size:0.85rem;max-width:140px;">${booking.service || '—'}</span>
            </div>
            <div class="col-sm-4 col-12">
                <small class="text-muted d-block fw-bold mb-1" style="font-size:0.65rem;">HÀNG ĐỢI ƯU TIÊN</small>
                <span class="badge fw-bold px-2.5 py-1.5 rounded" style="font-size:0.68rem;background:var(--cyan-electric);color:#fff;">
                    VIP ${(booking.tier || 'MEMBER')}
                </span>
            </div>
        </div>
    `;
}

// ── Notifications Concierge Timeline widget ─────────────────
function loadNotifications() {
    const container = document.getElementById('notif-widget-list');
    if (!container) return;

    const saved = localStorage.getItem('user_notifications');
    let list = [];
    if (saved) {
        try { list = JSON.parse(saved); } catch (e) {}
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="feed-timeline-line"></div><div class="text-center py-4 text-muted small" style="z-index:2;position:relative;">Không có thông báo hoạt động nào</div>';
        return;
    }

    const typeIcons = {
        points: 'fa-coins text-warning',
        status: 'fa-car-side text-cyan',
        info:   'fa-info-circle text-info'
    };

    container.innerHTML = `<div class="feed-timeline-line"></div>` + list.slice(0, 5).map(n => `
        <div class="concierge-feed-item d-flex gap-3 align-items-start p-3 rounded-4 shadow-sm position-relative ${n.read ? 'bg-white bg-opacity-70' : 'bg-white border-cyan-light'}"
             style="font-size:0.78rem;cursor:pointer;transition:all 0.25s;" onclick="markWidgetNotifRead('${n.id}')">
            <div class="feed-timeline-dot d-flex align-items-center justify-content-center rounded-circle bg-white border" 
                 style="width:28px;height:28px;z-index:2;box-shadow: 0 4px 10px rgba(15,23,42,0.03);flex-shrink:0;border-color:rgba(15,23,42,0.06)!important;">
                <i class="fas ${typeIcons[n.type] || 'fa-bell text-muted'}" style="font-size:0.75rem;"></i>
            </div>
            <div class="flex-grow-1 overflow-hidden" style="margin-top:2px;">
                <div class="fw-bold d-flex justify-content-between align-items-center mb-1">
                    <span style="color:var(--navy-dark);font-size:0.8rem;">${n.title}</span>
                    <small class="text-muted" style="font-size:0.62rem;font-weight:normal;">${n.time}</small>
                </div>
                <div class="text-muted" style="font-size:0.7rem;line-height:1.4;">${n.body}</div>
            </div>
            ${!n.read ? '<span class="rounded-circle bg-cyan position-absolute" style="width:6px;height:6px;top:15px;right:15px;background:var(--cyan-electric);"></span>' : ''}
        </div>
    `).join('');
}

function markWidgetNotifRead(id) {
    const saved = localStorage.getItem('user_notifications');
    if (!saved) return;
    try {
        const list = JSON.parse(saved).map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem('user_notifications', JSON.stringify(list));
        loadNotifications();
    } catch (e) {}
}

function markAllRead() {
    const saved = localStorage.getItem('user_notifications');
    if (!saved) return;
    try {
        const list = JSON.parse(saved).map(n => ({ ...n, read: true }));
        localStorage.setItem('user_notifications', JSON.stringify(list));
        loadNotifications();
        if (window.showToast) showToast('Đã đọc tất cả thông báo!', 'success');
    } catch (e) {}
}
