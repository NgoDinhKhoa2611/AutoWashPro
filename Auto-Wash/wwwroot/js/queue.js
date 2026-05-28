/**
 * queue.js — Admin Live Queue Management
 */

let queue          = [];
let statusFilter   = 'ALL';
let activeManageItem = null;
let tempServices   = [];
let tempQueueStatus = 'Waiting';
let selectedAddSvc = '';
let selectedCheckoutItem = null;

// LPR scanner states
let isScanning  = false;
let scanSuccess = false;
let scannedPlate = '';

document.addEventListener('DOMContentLoaded', function () {
    loadQueue();
    window.addEventListener('storage', loadQueue);
});

// ── Queue loading ────────────────────────────────────────
function loadQueue() {
    const queueStr = localStorage.getItem('active_queue');
    let activeQueue = [];
    if (queueStr) {
        try { activeQueue = JSON.parse(queueStr); } catch (e) {}
    }

    if (activeQueue.length === 0) {
        activeQueue = defaultMockQueue();
        localStorage.setItem('active_queue', JSON.stringify(activeQueue));
    }

    // Merge user's active_booking if not already in queue
    const bookingStr = localStorage.getItem('active_booking');
    if (bookingStr) {
        try {
            const booking = JSON.parse(bookingStr);
            const exists = activeQueue.some(q => q.id === booking.id || normalizeplate(q.plate) === normalizeplate(booking.plate));
            if (!exists) {
                activeQueue.push(buildQueueItem(booking));
                localStorage.setItem('active_queue', JSON.stringify(activeQueue));
            }
        } catch (e) {}
    }

    // Fill missing queueStatus
    activeQueue = activeQueue.map(item => {
        if (!item.queueStatus) {
            const svcs = item.services || [];
            const allDone = svcs.length > 0 && svcs.every(s => s.status === 'Completed' || s.status === 'Skipped');
            if (allDone) item.queueStatus = 'Ready';
            else if (svcs.some(s => s.status === 'In Progress' || s.status === 'Completed')) item.queueStatus = 'In Progress';
            else item.queueStatus = 'Waiting';
        }
        return item;
    });

    queue = sortQueue(activeQueue);
    renderQueue();
    updateCountBadges();
}

function normalizeplate(p) { return (p || '').replace(/[\s-]/g, '').toUpperCase(); }

function buildQueueItem(booking) {
    return {
        id: booking.id || 'book_' + Date.now(),
        customerName: booking.name || 'Lê Tuấn Kiệt (Bạn)',
        name:         booking.name || 'Lê Tuấn Kiệt (Bạn)',
        bookingTime:  booking.bookingTime || 'Vừa xong',
        vehiclePlate: booking.plate || '',
        plate:        booking.plate || '',
        membershipTier: booking.tier || 'GOLD',
        tier:           booking.tier || 'GOLD',
        service:  booking.service || 'Rửa xe phổ thông',
        services: booking.services || defaultServices(booking.service),
        price:    booking.price || 35000,
        points:   booking.points || 35,
        overallProgress: booking.overallProgress || 0,
        currentServiceId: booking.currentServiceId || null,
        status: 'Arrived',
        queueStatus: booking.queueStatus || 'Waiting',
        isUser: true
    };
}

function defaultServices(serviceName) {
    return [
        { id: 'sub_0', name: 'Quét LPR', status: 'Waiting', duration: '2 phút', startedAt: null, completedAt: null },
        { id: 'sub_1', name: serviceName || 'Rửa xe phổ thông', status: 'Waiting', duration: '20 phút', startedAt: null, completedAt: null },
        { id: 'sub_2', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null }
    ];
}

function defaultMockQueue() {
    return [
        {
            id: 'book_mock_1', customerName: 'Lê Văn C', name: 'Lê Văn C',
            bookingTime: '14:00', vehiclePlate: '51H-555.55', plate: '51H-555.55',
            membershipTier: 'PLATINUM', tier: 'PLATINUM',
            service: 'Combo Rửa xe cao cấp',
            services: [
                { id: 'sc_1', name: 'Quét LPR', status: 'Completed', duration: '2 phút', startedAt: '14:00', completedAt: '14:02' },
                { id: 'sc_2', name: 'Combo Rửa xe cao cấp', status: 'In Progress', duration: '45 phút', startedAt: '14:02', completedAt: null },
                { id: 'sc_3', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null }
            ],
            price: 85000, points: 128, overallProgress: 33, currentServiceId: 'sc_2',
            status: 'Arrived', queueStatus: 'In Progress', isUser: false
        },
        {
            id: 'book_mock_2', customerName: 'Nguyễn Văn A', name: 'Nguyễn Văn A',
            bookingTime: '14:30', vehiclePlate: '51G-123.45', plate: '51G-123.45',
            membershipTier: 'SILVER', tier: 'SILVER',
            service: 'Rửa xe phổ thông',
            services: [
                { id: 'sa_1', name: 'Quét LPR', status: 'Waiting', duration: '2 phút', startedAt: null, completedAt: null },
                { id: 'sa_2', name: 'Rửa xe phổ thông', status: 'Waiting', duration: '20 phút', startedAt: null, completedAt: null },
                { id: 'sa_3', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null }
            ],
            price: 35000, points: 39, overallProgress: 0, currentServiceId: null,
            status: 'Arrived', queueStatus: 'Waiting', isUser: false
        }
    ];
}

const TIER_PRIORITY = { PLATINUM: 1, GOLD: 2, SILVER: 3, MEMBER: 4, STANDARD: 4 };

function sortQueue(list) {
    return [...list].sort((a, b) => {
        const pa = TIER_PRIORITY[(a.tier || '').toUpperCase()] || 5;
        const pb = TIER_PRIORITY[(b.tier || '').toUpperCase()] || 5;
        if (pa !== pb) return pa - pb;
        return (a.bookingTime || '').localeCompare(b.bookingTime || '');
    });
}

// ── Filters ──────────────────────────────────────────────
function setQueueFilter(filter) {
    statusFilter = filter;
    document.querySelectorAll('.queue-filter-btn').forEach(btn => {
        btn.classList.remove('bg-navy', 'text-white', 'shadow-sm', 'active');
        btn.classList.add('text-muted');
    });
    const btn = document.getElementById('qf-' + filter.replace(' ', ''));
    if (btn) {
        btn.classList.add('bg-navy', 'text-white', 'shadow-sm', 'active');
        btn.classList.remove('text-muted');
    }
    renderQueue();
}

function filterQueue() {
    renderQueue();
}

function updateCountBadges() {
    const counts = { ALL: queue.length, Waiting: 0, 'In Progress': 0, Ready: 0 };
    queue.forEach(q => { if (counts[q.queueStatus] !== undefined) counts[q.queueStatus]++; });

    setElText('cnt-ALL',        counts.ALL);
    setElText('cnt-Waiting',    counts.Waiting);
    setElText('cnt-InProgress', counts['In Progress']);
    setElText('cnt-Ready',      counts.Ready);
}

// ── Render table ─────────────────────────────────────────
function renderQueue() {
    const searchTerm = (document.getElementById('queue-search') || {}).value || '';
    const filtered = queue.filter(item => {
        const matchSearch = !searchTerm ||
            (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.service || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = statusFilter === 'ALL' || item.queueStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const badge = document.getElementById('queue-count-badge');
    const empty = document.getElementById('queue-empty-state');
    const tableW = document.getElementById('queue-table-wrapper');
    const tbody  = document.getElementById('queue-tbody');

    if (badge) badge.textContent = `Có ${filtered.length} xe được hiển thị`;

    if (filtered.length === 0) {
        if (empty) empty.style.display = 'block';
        if (tableW) tableW.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    if (tableW) tableW.style.display = 'block';
    if (!tbody) return;

    tbody.innerHTML = filtered.map((item, idx) => {
        const isReady   = item.queueStatus === 'Ready';
        const isWaiting = item.queueStatus === 'Waiting';
        return `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td class="ps-4 fw-bold" style="color:var(--navy-dark);">${idx + 1}</td>
            <td>
                <div class="fw-bold" style="color:var(--navy-dark);font-size:0.85rem;">
                    ${item.name}
                    ${item.isUser ? '<span class="badge ms-1 fw-bold" style="font-size:0.6rem;background:var(--navy-dark);color:var(--cyan-electric);">BẠN</span>' : ''}
                </div>
                <small class="text-muted d-block"><i class="far fa-clock me-1"></i>Đặt lịch: ${item.bookingTime}</small>
            </td>
            <td><span class="badge fw-bold px-3 py-2" style="background:var(--navy-dark);color:white;font-family:monospace;border-radius:8px;">${item.plate}</span></td>
            <td><span class="badge tier-pill ${getTierBadgeClass(item.tier)} px-3 py-1 border-0" style="font-size:0.65rem;">${item.tier}</span></td>
            <td>${getOverallStatusDisplay(item.queueStatus)}</td>
            <td class="fw-bold" style="color:var(--navy-dark);">${item.service}</td>
            <td>${getCurrentServiceDisplay(item)}</td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2">
                    ${isWaiting
                        ? `<button class="btn btn-sm btn-outline-success fw-bold px-3 py-2" style="font-size:0.72rem;border-radius:10px;"
                                   onclick="handleStartProcessing('${item.plate}')">
                               <i class="fas fa-play me-1"></i>BẮT ĐẦU
                           </button>`
                        : ''}
                    <button class="btn btn-sm fw-bold px-3 py-2" style="font-size:0.72rem;border-radius:10px;border:1px solid var(--cyan-electric);color:var(--cyan-electric);"
                            data-bs-toggle="modal" data-bs-target="#manageServicesModal"
                            onclick="openManageServices('${item.plate}')">
                        <i class="fas fa-tasks me-1"></i>QUẢN LÝ
                    </button>
                    ${isReady
                        ? `<button class="app-btn-primary btn-sm py-2 px-3 w-auto shadow-none" style="font-size:0.72rem;border-radius:10px;"
                                   data-bs-toggle="modal" data-bs-target="#checkoutModal"
                                   onclick="openCheckoutModal('${item.plate}')">CHECK-OUT</button>`
                        : (!isWaiting
                            ? `<span class="badge bg-secondary bg-opacity-10 text-muted px-3 py-2 rounded-pill fw-bold" style="font-size:0.7rem;">ĐANG RỬA</span>`
                            : '')
                    }
                </div>
            </td>
        </tr>`;
    }).join('');
}

function getTierBadgeClass(tier) {
    switch ((tier || '').toUpperCase()) {
        case 'PLATINUM': return 'tier-pill-platinum active';
        case 'GOLD':     return 'tier-pill-gold active';
        case 'SILVER':   return 'tier-pill-silver active';
        default:         return 'tier-pill-member active';
    }
}

function getOverallStatusDisplay(qStatus) {
    switch (qStatus) {
        case 'Ready':       return '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3 fw-bold">Sẵn sàng</span>';
        case 'In Progress': return '<span class="badge bg-info bg-opacity-10 text-info rounded-pill px-3 fw-bold"><i class="fas fa-spinner fa-spin me-1"></i>Đang xử lý</span>';
        default:            return '<span class="badge bg-warning bg-opacity-10 text-warning rounded-pill px-3 fw-bold">Đang chờ</span>';
    }
}

function getCurrentServiceDisplay(item) {
    const svcs = item.services || [];
    const active = svcs.find(s => s.status === 'In Progress');
    if (active) return `<div><span class="fw-bold" style="color:var(--navy-dark);font-size:0.8rem;">${active.name}</span><br><small class="text-info fw-bold" style="font-size:0.7rem;"><i class="fas fa-spinner fa-spin me-1"></i>Đang làm</small></div>`;
    if (svcs.length > 0 && svcs.every(s => s.status === 'Completed' || s.status === 'Skipped'))
        return '<span class="text-success fw-bold" style="font-size:0.8rem;"><i class="fas fa-check-circle me-1"></i>Hoàn tất cả</span>';
    const first = svcs.find(s => s.status === 'Waiting');
    if (first) return `<div><span class="text-muted" style="font-size:0.8rem;">${first.name}</span><br><small class="text-muted fw-bold" style="font-size:0.7rem;">Chờ thực hiện</small></div>`;
    return '<span class="text-muted small">-</span>';
}

// ── Actions ──────────────────────────────────────────────
function handleStartProcessing(plate) {
    window.showConfirm('Xử lý xe', `Xác nhận chuyển xe ${plate} sang trạng thái "Đang xử lý"?`, () => {
        queue = queue.map(q => {
            if (q.plate !== plate) return q;
            const svcs = [...(q.services || [])];
            const first = svcs.find(s => s.status === 'Waiting');
            if (first) { first.status = 'In Progress'; first.startedAt = now(); }
            const done = svcs.filter(s => s.status === 'Completed' || s.status === 'Skipped').length;
            const progress = svcs.length > 0 ? Math.round((done / svcs.length) * 100) : 0;
            const activeS = svcs.find(s => s.status === 'In Progress');
            const updated = { ...q, services: svcs, queueStatus: 'In Progress', overallProgress: progress, currentServiceId: activeS ? activeS.id : null };
            if (q.isUser) {
                const bk = getActiveBooking();
                if (bk) { bk.services = svcs; bk.queueStatus = 'In Progress'; bk.overallProgress = progress; localStorage.setItem('active_booking', JSON.stringify(bk)); }
                pushNotif(q, 'Bắt đầu xử lý xe', `Phương tiện ${q.plate} đã được đưa vào khu vực rửa xe.`);
            }
            return updated;
        });
        saveQueue();
        showToast(`Bắt đầu xử lý xe ${plate}`, 'success');
    });
}

function openManageServices(plate) {
    activeManageItem = queue.find(q => q.plate === plate);
    if (!activeManageItem) return;
    tempServices    = JSON.parse(JSON.stringify(activeManageItem.services || []));
    tempQueueStatus = activeManageItem.queueStatus || 'Waiting';
    renderManageModal();
}

function renderManageModal() {
    const body = document.getElementById('manage-modal-body');
    if (!body || !activeManageItem) return;

    const badgeClass = getTierBadgeClass(activeManageItem.tier);

    body.innerHTML = `
        <div class="app-card bg-light border-0 p-3 mb-4 rounded-4">
            <div class="row g-3">
                <div class="col-sm-4 border-end">
                    <small class="text-muted fw-bold small">KHÁCH HÀNG</small>
                    <div class="fw-bold" style="color:var(--navy-dark);font-size:0.88rem;">${activeManageItem.name}</div>
                </div>
                <div class="col-sm-4 border-end ps-sm-3">
                    <small class="text-muted fw-bold small">BIỂN SỐ XE</small>
                    <div><span class="badge fw-bold py-1 px-2" style="background:var(--navy-dark);color:white;font-family:monospace;">${activeManageItem.plate}</span></div>
                </div>
                <div class="col-sm-4 ps-sm-3">
                    <small class="text-muted fw-bold small">HẠNG THÀNH VIÊN</small>
                    <div><span class="badge tier-pill ${badgeClass} py-1 px-2 border-0" style="font-size:0.65rem;">${activeManageItem.tier}</span></div>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <label class="form-label small fw-bold mb-1" style="color:var(--navy-dark);">Trạng thái tổng của xe</label>
                <select id="temp-queue-status" class="form-select border rounded-4 py-2 px-3 bg-light fw-semibold"
                        style="color:var(--navy-dark);" onchange="tempQueueStatus=this.value">
                    <option value="Waiting" ${tempQueueStatus === 'Waiting' ? 'selected' : ''}>Đang chờ (Waiting)</option>
                    <option value="In Progress" ${tempQueueStatus === 'In Progress' ? 'selected' : ''}>Đang xử lý (In Progress)</option>
                    <option value="Ready" ${tempQueueStatus === 'Ready' ? 'selected' : ''}>Sẵn sàng / Chờ Checkout (Ready)</option>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold mb-1" style="color:var(--navy-dark);">Tiến độ hoàn thành chung</label>
                <div class="d-flex align-items-center gap-3 py-2">
                    <div class="progress flex-grow-1" style="height:10px;border-radius:5px;">
                        <div class="progress-bar" style="width:${activeManageItem.overallProgress}%;background:var(--cyan-electric);border-radius:5px;box-shadow:var(--cyan-glow);"></div>
                    </div>
                    <span class="fw-bold" style="color:var(--navy-dark);">${activeManageItem.overallProgress}%</span>
                </div>
            </div>
        </div>

        <h6 class="fw-bold mb-3" style="color:var(--navy-dark);"><i class="fas fa-list text-cyan me-2"></i>Tiến trình thực hiện các dịch vụ</h6>

        <div class="d-flex flex-column gap-2 mb-4" id="manage-services-list" style="max-height:300px;overflow-y:auto;">
            ${renderManageServiceItems()}
        </div>

        <div class="p-3 bg-light rounded-4 border border-light">
            <h6 class="fw-bold mb-2" style="font-size:0.85rem;color:var(--navy-dark);"><i class="fas fa-plus-circle text-cyan me-1"></i>Thêm dịch vụ tùy chỉnh cho xe</h6>
            <div class="row g-2 align-items-center">
                <div class="col-sm-8">
                    <select id="add-service-select" class="form-select border-0 bg-white" style="border-radius:10px;font-size:0.85rem;">
                        <option value="">-- Chọn dịch vụ từ Catalog --</option>
                        ${getCatalogServices().map(s => `<option value="${s.name}">${s.name} (${s.estimatedTime} - ${s.defaultPrice > 0 ? s.defaultPrice.toLocaleString() + 'đ' : 'Miễn phí'})</option>`).join('')}
                    </select>
                </div>
                <div class="col-sm-4">
                    <button class="app-btn-primary py-2 w-100 shadow-none fw-bold" style="font-size:0.82rem;border-radius:10px;" onclick="addServiceToTemp()">
                        <i class="fas fa-plus me-1"></i>Thêm
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderManageServiceItems() {
    const statusBadge = { Completed: 'bg-success bg-opacity-10 text-success', 'In Progress': 'bg-info bg-opacity-10 text-info', Skipped: 'bg-secondary bg-opacity-10 text-secondary', Waiting: 'bg-warning bg-opacity-10 text-warning' };
    const statusLabel = { Completed: 'Đã xong', 'In Progress': 'Đang làm', Skipped: 'Đã bỏ qua', Waiting: 'Chờ' };

    return tempServices.map((s, idx) => `
        <div class="p-3 bg-white border border-light rounded-4 d-flex align-items-center justify-content-between shadow-sm">
            <div class="d-flex align-items-center gap-3">
                <div class="d-flex flex-column align-items-center">
                    <button class="btn btn-link text-muted p-0 border-0" ${idx === 0 ? 'disabled' : ''} onclick="moveService(${idx}, -1)" style="opacity:${idx === 0 ? '0.2' : '0.8'}"><i class="fas fa-caret-up"></i></button>
                    <button class="btn btn-link text-muted p-0 border-0" ${idx === tempServices.length - 1 ? 'disabled' : ''} onclick="moveService(${idx}, 1)" style="opacity:${idx === tempServices.length - 1 ? '0.2' : '0.8'}"><i class="fas fa-caret-down"></i></button>
                </div>
                <div>
                    <div class="fw-bold" style="color:var(--navy-dark);font-size:0.88rem;">${idx + 1}. ${s.name}</div>
                    <small class="text-muted" style="font-size:0.72rem;">
                        Dự kiến: ${s.estimatedTime || s.duration || '15 phút'}
                        ${s.startedAt   ? `<span class="ms-2 text-cyan fw-bold">Bắt đầu: ${s.startedAt}</span>`    : ''}
                        ${s.completedAt ? `<span class="ms-2 text-success fw-bold">Xong: ${s.completedAt}</span>` : ''}
                    </small>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <div class="btn-group btn-group-sm rounded-pill overflow-hidden border">
                    ${['Waiting','In Progress','Completed','Skipped'].map(st =>
                        `<button type="button" class="btn border-0 fw-bold py-1 px-2 ${s.status === st ? getStatusBtnClass(st) : 'btn-light text-muted'}"
                                 onclick="setServiceStatus(${idx},'${st}')" style="font-size:0.68rem;">
                            ${st === 'Waiting' ? 'Chờ' : st === 'In Progress' ? 'Làm' : st === 'Completed' ? 'Xong' : 'Bỏ qua'}
                         </button>`
                    ).join('')}
                </div>
                <button class="btn btn-outline-danger border-0 rounded-circle d-flex align-items-center justify-content-center p-0"
                        style="width:28px;height:28px;" onclick="removeService(${idx})">
                    <i class="fas fa-trash-alt small"></i>
                </button>
            </div>
        </div>
    `).join('') || '<div class="text-center py-4 text-muted bg-light rounded-4">Không có dịch vụ con nào.</div>';
}

function getStatusBtnClass(st) {
    switch (st) {
        case 'Waiting':     return 'btn-warning text-white';
        case 'In Progress': return 'btn-info text-white';
        case 'Completed':   return 'btn-success text-white';
        case 'Skipped':     return 'btn-secondary text-white';
        default: return 'btn-light';
    }
}

function moveService(idx, dir) {
    const copy = [...tempServices];
    const temp = copy[idx];
    copy[idx] = copy[idx + dir];
    copy[idx + dir] = temp;
    tempServices = copy;
    const list = document.getElementById('manage-services-list');
    if (list) list.innerHTML = renderManageServiceItems();
}

function setServiceStatus(idx, status) {
    tempServices[idx].status = status;
    if (status === 'In Progress') { tempServices[idx].startedAt = now(); tempServices[idx].completedAt = null; }
    if (status === 'Completed') {
        if (!tempServices[idx].startedAt) tempServices[idx].startedAt = now();
        tempServices[idx].completedAt = now();
    }
    if (status === 'Waiting') { tempServices[idx].startedAt = null; tempServices[idx].completedAt = null; }
    if (status === 'Skipped') { tempServices[idx].completedAt = now(); }
    const list = document.getElementById('manage-services-list');
    if (list) list.innerHTML = renderManageServiceItems();
}

function removeService(idx) {
    tempServices.splice(idx, 1);
    const list = document.getElementById('manage-services-list');
    if (list) list.innerHTML = renderManageServiceItems();
}

function addServiceToTemp() {
    const sel = document.getElementById('add-service-select');
    if (!sel || !sel.value) return;
    const match = getCatalogServices().find(s => s.name === sel.value);
    if (match) {
        tempServices.push({ id: 'sub_added_' + Date.now(), name: match.name, status: 'Waiting', duration: match.estimatedTime, estimatedTime: match.estimatedTime, startedAt: null, completedAt: null });
        sel.value = '';
        const list = document.getElementById('manage-services-list');
        if (list) list.innerHTML = renderManageServiceItems();
    }
}

function saveServices() {
    if (!activeManageItem) return;

    const totalSvcs = tempServices.length;
    const doneSvcs  = tempServices.filter(s => s.status === 'Completed' || s.status === 'Skipped').length;
    const progress  = totalSvcs > 0 ? Math.round((doneSvcs / totalSvcs) * 100) : 0;
    const activeSvc = tempServices.find(s => s.status === 'In Progress');
    let finalStatus = tempQueueStatus;
    if (totalSvcs > 0 && doneSvcs === totalSvcs) finalStatus = 'Ready';

    queue = queue.map(q => {
        if (q.plate !== activeManageItem.plate) return q;
        const updated = { ...q, services: tempServices, overallProgress: progress, queueStatus: finalStatus, currentServiceId: activeSvc ? activeSvc.id : null };
        if (q.isUser) {
            const bk = getActiveBooking();
            if (bk) {
                bk.services = tempServices; bk.overallProgress = progress; bk.queueStatus = finalStatus;
                bk.currentServiceId = activeSvc ? activeSvc.id : null;
                const incIdx = tempServices.findIndex(s => s.status !== 'Completed' && s.status !== 'Skipped');
                localStorage.setItem('wash_step', incIdx !== -1 ? String(incIdx) : '3');
                localStorage.setItem('active_booking', JSON.stringify(bk));
                tempServices.forEach((ns, i) => {
                    const os = (bk.services || [])[i];
                    if (!os || os.status !== ns.status) pushNotif(q, `Tiến trình: ${ns.name}`, `Dịch vụ "${ns.name}" đã cập nhật thành: ${ns.status}.`);
                });
            }
        }
        return updated;
    });

    saveQueue();
    showToast('Cập nhật thông tin đặt lịch thành công!', 'success');
    activeManageItem = null;
}

// ── Checkout ─────────────────────────────────────────────
function openCheckoutModal(plate) {
    selectedCheckoutItem = queue.find(q => q.plate === plate);
    if (!selectedCheckoutItem) return;

    const body = document.getElementById('checkout-modal-body');
    if (!body) return;

    body.innerHTML = `
        <div class="app-card bg-light border-0 p-3 mb-4 rounded-4">
            <div class="row g-2">
                <div class="col-6 border-end">
                    <small class="text-muted fw-bold small mb-1">KHÁCH HÀNG</small>
                    <div class="fw-bold" style="color:var(--navy-dark);">${selectedCheckoutItem.name}</div>
                </div>
                <div class="col-6 ps-3">
                    <small class="text-muted fw-bold small mb-1">HẠNG THÀNH VIÊN</small>
                    <div><span class="badge tier-pill ${getTierBadgeClass(selectedCheckoutItem.tier)} py-1 px-2 border-0" style="font-size:0.65rem;">${selectedCheckoutItem.tier}</span></div>
                </div>
            </div>
        </div>
        <div class="mb-4">
            <label class="form-label small fw-bold text-muted mb-1">TỔNG TIỀN THỰC THU (VND)</label>
            <input type="text" class="form-control form-control-lg fw-bold border-0 bg-light py-3 rounded-4 text-cyan"
                   readonly value="${Number(selectedCheckoutItem.price).toLocaleString()}đ" style="font-size:1.4rem;" />
        </div>
        <div class="app-card border-0 py-3 px-4 rounded-4" style="background:#f0fdf4;color:#166534;">
            <div class="d-flex justify-content-between align-items-center">
                <span class="small fw-bold">TÍCH ĐIỂM DỰ KIẾN:</span>
                <span class="fw-bold fs-5">+${selectedCheckoutItem.points} PTS</span>
            </div>
        </div>
    `;
}

function checkoutComplete() {
    if (!selectedCheckoutItem) return;

    const item = selectedCheckoutItem;
    queue = queue.filter(q => q.plate !== item.plate);
    saveQueue();

    const rev = Number(localStorage.getItem('admin_revenue') || 12500000);
    localStorage.setItem('admin_revenue', String(rev + item.price));

    if (item.isUser) {
        const pts  = Number(localStorage.getItem('user_points') || 0) + item.points;
        const tier = window.getTierInfo ? window.getTierInfo(pts) : { tier: 'Gold Member', nextTier: 'Platinum', remaining: '250k' };
        localStorage.setItem('user_points', String(pts));
        localStorage.setItem('user_tier',   tier.tier);
        localStorage.setItem('user_next_tier',       tier.nextTier || '');
        localStorage.setItem('user_remaining_spend', tier.remaining || '');
        localStorage.setItem('wash_step', '3');
        localStorage.removeItem('active_booking');

        let vehicleType = 'Xe máy';
        try {
            const vehs = JSON.parse(localStorage.getItem('user_vehicles') || '[]');
            const match = vehs.find(v => v.plate === item.plate);
            if (match) vehicleType = match.type;
        } catch (e) {}

        const histItem = {
            id: 'hist_' + Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            plate: item.plate, type: vehicleType, service: item.service,
            price: item.price, points: item.points, status: 'Hoàn tất', surveyStatus: 'pending'
        };
        const hist = JSON.parse(localStorage.getItem('user_history_bookings') || '[]');
        localStorage.setItem('user_history_bookings', JSON.stringify([histItem, ...hist]));

        const notifList = JSON.parse(localStorage.getItem('user_notifications') || '[]');
        const n1 = { id: 'notif_pts_' + Date.now(), title: 'Tích điểm dịch vụ', body: `+${item.points} PTS từ dịch vụ ${item.service}.`, time: 'Vừa xong', type: 'points', read: false };
        const n2 = { id: 'notif_done_' + Date.now(), title: 'Tiến độ: Hoàn tất', body: `Xe ${item.plate} đã hoàn tất dịch vụ.`, time: 'Vừa xong', type: 'status', read: false };
        localStorage.setItem('user_notifications', JSON.stringify([n1, n2, ...notifList]));
    }

    window.dispatchEvent(new Event('storage'));
    showToast(`Check-out thành công cho ${item.name}! +${item.points} PTS.`, 'success');
    selectedCheckoutItem = null;
}

// ── LPR Scanner ──────────────────────────────────────────
function startScanner() {
    isScanning = true; scanSuccess = false; scannedPlate = '';
    const viewport = document.getElementById('lpr-viewport');
    const scanLine = document.getElementById('lpr-scan-line');
    const scanText = document.getElementById('lpr-scanning-text');
    const plateBox = document.getElementById('lpr-plate-result');
    const successTxt = document.getElementById('lpr-success-text');
    const addBtn = document.getElementById('lpr-add-btn');
    const waitBtn = document.getElementById('lpr-waiting-btn');

    if (viewport) { viewport.classList.add('scanning'); viewport.classList.remove('success'); }
    if (scanLine) scanLine.style.display = 'block';
    if (scanText) scanText.style.display = 'flex';
    if (plateBox) plateBox.style.display = 'none';
    if (successTxt) successTxt.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (waitBtn) waitBtn.style.display = 'block';

    setTimeout(() => {
        scannedPlate = '51H - 888.88';
        isScanning = false; scanSuccess = true;

        if (viewport) { viewport.classList.remove('scanning'); viewport.classList.add('success'); }
        if (scanLine) scanLine.style.display = 'none';
        if (scanText) scanText.style.display = 'none';
        if (plateBox) { plateBox.textContent = scannedPlate; plateBox.style.display = 'block'; }
        if (successTxt) successTxt.style.display = 'flex';
        if (addBtn) addBtn.style.display = 'block';
        if (waitBtn) waitBtn.style.display = 'none';
    }, 2000);
}

function resetScanner() {
    isScanning = false; scanSuccess = false; scannedPlate = '';
}

function addScannedToQueue() {
    if (!scannedPlate) return;
    const catalog = getCatalogServices();
    const def = catalog.find(c => c.name.includes('Rửa xe phổ thông')) || catalog[0] || { name: 'Rửa xe phổ thông', defaultPrice: 35000, estimatedTime: '20 phút' };

    const newItem = {
        id: 'book_' + Date.now(), customerName: 'Khách vãng lai LPR', name: 'Khách vãng lai LPR',
        bookingTime: now(), vehiclePlate: scannedPlate.replace(/\s+/g, ''), plate: scannedPlate.replace(/\s+/g, ''),
        membershipTier: 'MEMBER', tier: 'MEMBER', service: def.name,
        services: [
            { id: 'sub_d1', name: 'Quét LPR', status: 'Completed', duration: '2 phút', startedAt: now(), completedAt: now() },
            { id: 'sub_d2', name: def.name, status: 'Waiting', duration: def.estimatedTime, startedAt: null, completedAt: null },
            { id: 'sub_d3', name: 'Sấy khô khí nén', status: 'Waiting', duration: '5 phút', startedAt: null, completedAt: null }
        ],
        price: def.defaultPrice, points: Math.round(def.defaultPrice / 1000),
        overallProgress: 33, currentServiceId: 'sub_d2',
        status: 'Arrived', queueStatus: 'In Progress', isUser: false
    };

    queue = sortQueue([...queue, newItem]);
    saveQueue();
    showToast('Đã thêm phương tiện quét LPR vào hàng đợi!', 'success');
    scanSuccess = false; scannedPlate = '';
}

// ── Helpers ──────────────────────────────────────────────
function saveQueue() {
    localStorage.setItem('active_queue', JSON.stringify(queue));
    window.dispatchEvent(new Event('storage'));
    renderQueue();
    updateCountBadges();
}

function getActiveBooking() {
    try { return JSON.parse(localStorage.getItem('active_booking')); } catch (e) { return null; }
}

function pushNotif(item, title, body) {
    const list = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    list.unshift({ id: 'notif_' + Date.now(), title, body, time: 'Vừa xong', type: 'status', read: false });
    localStorage.setItem('user_notifications', JSON.stringify(list));
}

function getCatalogServices() {
    try {
        const parsed = JSON.parse(localStorage.getItem('app_services') || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(s => s.isActive !== undefined ? s.isActive : s.status === 'Active')
                         .map(s => ({ name: s.name, estimatedTime: (s.estimatedMinutes || 15) + ' phút', defaultPrice: s.price }));
        }
    } catch (e) {}
    return [
        { name: 'Quét LPR', estimatedTime: '2 phút', defaultPrice: 0 },
        { name: 'Rửa vỏ bọt tuyết', estimatedTime: '15 phút', defaultPrice: 35000 },
        { name: 'Sấy khô khí nén', estimatedTime: '5 phút', defaultPrice: 0 },
        { name: 'Sáp phủ bóng Wax', estimatedTime: '10 phút', defaultPrice: 25000 },
        { name: 'Vệ sinh nội thất', estimatedTime: '15 phút', defaultPrice: 30000 },
        { name: 'Vệ sinh sên chuyên nghiệp', estimatedTime: '10 phút', defaultPrice: 20000 }
    ];
}

function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
