/**
 * queue.js — Admin Live Queue Management (API-connected)
 */

let queue              = [];
let statusFilter       = 'ALL';
let activeManageItem   = null;
let selectedCheckoutId = null;
let isScanning         = false;
let scannedPlate       = '';

const STATUS_FLOW = { Waiting: 'LPR_Scan', LPR_Scan: 'Washing', Washing: 'Drying' };
const NEXT_LABEL  = { Waiting: 'Quét LPR', LPR_Scan: 'Bắt đầu rửa', Washing: 'Sấy khô' };

document.addEventListener('DOMContentLoaded', () => {
    loadQueue();
    // Auto-refresh mỗi 30 giây, bỏ qua nếu đang mở modal
    setInterval(() => {
        if (!document.querySelector('.modal.show')) loadQueue(true);
    }, 30000);
});

// ── Queue API ─────────────────────────────────────────────

async function loadQueue(silent = false) {
    try {
        const res = await fetch('/Admin/GetQueue');
        if (!res.ok) {
            if (!silent) showToast(res.status === 401 ? 'Phiên đăng nhập hết hạn.' : `Lỗi tải hàng đợi (${res.status}).`, 'error');
            return;
        }
        queue = await res.json();
        renderQueue();
        updateCountBadges();
        _updateRefreshBtn();
    } catch {
        if (!silent) showToast('Không thể kết nối server!', 'error');
    }
}

function _updateRefreshBtn() {
    const btn = document.querySelector('button[onclick="loadQueue()"]');
    if (!btn) return;
    const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    btn.innerHTML = `<i class="fas fa-sync-alt me-1 text-muted"></i>Cập nhật ${t}`;
}

async function handleAdvanceQueue(queueId, plate) {
    const item = queue.find(q => q.queueId === queueId);
    if (!item || !NEXT_LABEL[item.status]) return;

    window.showConfirm(
        'Cập nhật trạng thái',
        `Chuyển xe ${plate} sang "${NEXT_LABEL[item.status]}"?`,
        async () => {
            try {
                const res  = await fetch(`/Admin/AdvanceQueue/${queueId}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast(`Đã chuyển sang: ${getStatusLabel(data.newStatus)}`, 'success');
                    await loadQueue();
                } else {
                    showToast(data.message || 'Cập nhật thất bại!', 'error');
                }
            } catch { showToast('Không thể kết nối server!', 'error'); }
        }
    );
}

async function handleCancelQueue(queueId, plate) {
    window.showConfirm(
        'Hủy xe',
        `Xác nhận hủy xe ${plate} khỏi hàng đợi?`,
        async () => {
            try {
                const res  = await fetch(`/Admin/CancelQueue/${queueId}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('Đã hủy xe khỏi hàng đợi.', 'info');
                    await loadQueue();
                } else {
                    showToast('Hủy thất bại!', 'error');
                }
            } catch { showToast('Không thể kết nối server!', 'error'); }
        }
    );
}

// ── Manage Modal ──────────────────────────────────────────

function openManageServices(queueId) {
    activeManageItem = queue.find(q => q.queueId === queueId) || null;
    if (!activeManageItem) return;
    renderManageModal();
}

function renderManageModal() {
    const body = document.getElementById('manage-modal-body');
    if (!body || !activeManageItem) return;
    const item = activeManageItem;

    const serviceRows = item.services?.length > 0
        ? item.services.map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;">
                <span style="font-size:0.85rem;font-weight:600;color:#0f172a;">${s.name}</span>
                <span style="font-size:0.82rem;font-weight:700;color:#475569;">${s.price.toLocaleString('vi-VN')}đ</span>
            </div>`).join('')
        : '<div style="text-align:center;padding:12px;font-size:0.82rem;color:#94a3b8;background:#f8fafc;border-radius:10px;">Khách vãng lai — không có dịch vụ đặt trước</div>';

    const validStatuses = ['Waiting', 'LPR_Scan', 'Washing', 'Drying'];
    const statusOptions = validStatuses.map(s =>
        `<option value="${s}" ${item.status === s ? 'selected' : ''}>${getStatusLabel(s)}</option>`
    ).join('');

    body.innerHTML = `
        <div style="background:#f8fafc;border-radius:14px;padding:16px;margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                <div style="border-right:1px solid #e2e8f0;padding-right:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#94a3b8;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;">Khách hàng</div>
                    <div style="font-size:0.88rem;font-weight:700;color:#0f172a;">${item.customerName}</div>
                </div>
                <div style="border-right:1px solid #e2e8f0;padding:0 12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#94a3b8;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Biển số xe</div>
                    <span style="background:#0f172a;color:#ffffff;font-family:monospace;font-weight:700;padding:3px 10px;border-radius:6px;font-size:0.82rem;letter-spacing:1px;">${item.licensePlate}</span>
                </div>
                <div style="padding-left:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#94a3b8;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Hạng thành viên</div>
                    <span class="badge tier-badge ${getTierBadgeClass(item.tierName)} border-0" style="font-size:0.65rem;">${item.tierName.toUpperCase()}</span>
                </div>
            </div>
        </div>

        <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:10px;">
            <i class="fas fa-list-ul" style="color:#0ea5e9;margin-right:8px;"></i>Dịch vụ đặt trước
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">${serviceRows}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div>
                <label style="display:block;font-size:0.76rem;font-weight:700;color:#374151;margin-bottom:6px;">Trạng thái hàng đợi</label>
                <select id="manage-status-select" style="width:100%;border:1.5px solid #d1d5db;border-radius:10px;padding:8px 12px;font-weight:600;font-size:0.85rem;color:#0f172a;background:#ffffff;outline:none;">
                    ${statusOptions}
                </select>
            </div>
            <div>
                <label style="display:block;font-size:0.76rem;font-weight:700;color:#374151;margin-bottom:6px;">Ghi chú nhân viên</label>
                <input type="text" id="manage-staff-note"
                       value="${item.staffNote || ''}" placeholder="Ghi chú thêm..."
                       style="width:100%;border:1.5px solid #d1d5db;border-radius:10px;padding:8px 12px;font-size:0.85rem;color:#0f172a;background:#ffffff;outline:none;box-sizing:border-box;" />
            </div>
        </div>`;
}

async function saveQueueUpdate() {
    if (!activeManageItem) return;

    const status    = document.getElementById('manage-status-select')?.value;
    const staffNote = document.getElementById('manage-staff-note')?.value ?? '';

    try {
        const res  = await fetch(`/Admin/UpdateQueue/${activeManageItem.queueId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, staffNote })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Đã cập nhật thông tin xe!', 'success');
            await loadQueue();
        } else {
            showToast('Cập nhật thất bại!', 'error');
        }
    } catch { showToast('Không thể kết nối server!', 'error'); }

    activeManageItem = null;
}

// ── Checkout Modal ────────────────────────────────────────

function openCheckoutModal(queueId) {
    const item = queue.find(q => q.queueId === queueId);
    if (!item) return;
    selectedCheckoutId = queueId;

    const body = document.getElementById('checkout-modal-body');
    if (!body) return;

    const serviceRows = item.services?.length > 0
        ? item.services.map(s => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:0.85rem;color:#475569;">${s.name}</span>
                <span style="font-size:0.85rem;font-weight:700;color:#0f172a;">${s.price.toLocaleString('vi-VN')}đ</span>
            </div>`).join('')
        : '';

    body.innerHTML = `
        <div style="background:#f8fafc;border-radius:14px;padding:16px;margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div style="border-right:1px solid #e2e8f0;padding-right:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Khách hàng</div>
                    <div style="font-size:0.9rem;font-weight:700;color:#0f172a;">${item.customerName}</div>
                </div>
                <div style="padding-left:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Biển số xe</div>
                    <span style="background:#0f172a;color:#ffffff;font-family:monospace;font-weight:700;padding:4px 12px;border-radius:6px;font-size:0.85rem;letter-spacing:1px;">${item.licensePlate}</span>
                </div>
            </div>
        </div>
        ${serviceRows ? `<div style="margin-bottom:20px;">${serviceRows}</div>` : ''}
        <div style="margin-bottom:16px;">
            <div style="font-size:0.72rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Tổng tiền thực thu</div>
            <div style="background:#f0f9ff;border-radius:14px;padding:16px 20px;text-align:center;font-size:1.8rem;font-weight:800;color:#0284c7;border:2px solid #bae6fd;">
                ${item.finalPrice > 0 ? item.finalPrice.toLocaleString('vi-VN') + 'đ' : 'Walk-in — chưa có hóa đơn'}
            </div>
        </div>
        ${item.pointsEarned > 0 ? `
        <div style="background:#f0fdf4;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.82rem;font-weight:700;color:#166534;">TÍCH ĐIỂM DỰ KIẾN</span>
            <span style="font-size:1.1rem;font-weight:800;color:#166534;">+${item.pointsEarned} PTS</span>
        </div>` : ''}`;
}

async function checkoutComplete() {
    if (!selectedCheckoutId) return;

    try {
        const res  = await fetch(`/Admin/CheckoutQueue/${selectedCheckoutId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            const pts = data.pointsEarned > 0 ? ` · +${data.pointsEarned} PTS` : '';
            showToast(`Check-out thành công!${pts}`, 'success');
            await loadQueue();
        } else {
            showToast(data.message || 'Check-out thất bại!', 'error');
        }
    } catch { showToast('Không thể kết nối server!', 'error'); }

    selectedCheckoutId = null;
}

// ── Filters ──────────────────────────────────────────────

function setQueueFilter(filter) {
    statusFilter = filter;
    document.querySelectorAll('.queue-filter-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById('qf-' + filter);
    if (btn) btn.classList.add('active');
    renderQueue();
}

function filterQueue() { renderQueue(); }

function updateCountBadges() {
    const c = { ALL: 0, Waiting: 0, Active: 0, Completed: 0 };
    queue.forEach(q => {
        if (q.status === 'Cancelled') return;
        c.ALL++;
        if (q.status === 'Waiting') c.Waiting++;
        else if (['LPR_Scan', 'Washing', 'Drying'].includes(q.status)) c.Active++;
        else if (q.status === 'Completed') c.Completed++;
    });
    setElText('cnt-ALL',       c.ALL);
    setElText('cnt-Waiting',   c.Waiting);
    setElText('cnt-Active',    c.Active);
    setElText('cnt-Completed', c.Completed);
}

// ── Render ────────────────────────────────────────────────

function renderQueue() {
    const search = (document.getElementById('queue-search')?.value || '').toLowerCase();

    const filtered = queue.filter(item => {
        if (item.status === 'Cancelled') return false;
        const matchSearch = !search
            || item.customerName.toLowerCase().includes(search)
            || item.licensePlate.toLowerCase().includes(search)
            || (item.services || []).some(s => s.name.toLowerCase().includes(search));
        const matchStatus = statusFilter === 'ALL'
            || (statusFilter === 'Active' && ['LPR_Scan', 'Washing', 'Drying'].includes(item.status))
            || item.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const badge  = document.getElementById('queue-count-badge');
    const empty  = document.getElementById('queue-empty-state');
    const tableW = document.getElementById('queue-table-wrapper');
    const tbody  = document.getElementById('queue-tbody');

    if (badge) badge.textContent = `${filtered.length} xe`;

    if (filtered.length === 0) {
        if (empty)  empty.style.display  = 'block';
        if (tableW) tableW.style.display = 'none';
        return;
    }
    if (empty)  empty.style.display  = 'none';
    if (tableW) tableW.style.display = 'block';
    if (!tbody) return;

    tbody.innerHTML = filtered.map(item => {
        const isDrying  = item.status === 'Drying';
        const isWaiting = item.status === 'Waiting';
        const isDone    = item.status === 'Completed';
        const canAdv    = !isDone && !isDrying && NEXT_LABEL[item.status];
        const svcStr    = (item.services || []).map(s => s.name).join(', ') || '—';
        const priceStr  = item.finalPrice > 0 ? item.finalPrice.toLocaleString('vi-VN') + 'đ' : '—';

        return `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td class="ps-4 fw-bold" style="font-size:0.82rem;color:#94a3b8;">#${item.position}</td>
            <td>
                <div style="font-weight:700;font-size:0.85rem;color:#0f172a;">${item.customerName}</div>
                <small style="color:#94a3b8;font-size:0.75rem;"><i class="far fa-clock me-1"></i>${formatTime(item.checkInAt)}</small>
            </td>
            <td>
                <span style="background:#0f172a;color:#ffffff;font-family:monospace;font-weight:700;padding:5px 10px;border-radius:8px;font-size:0.82rem;letter-spacing:1px;">${item.licensePlate}</span>
            </td>
            <td>
                <span class="badge tier-badge ${getTierBadgeClass(item.tierName)} px-3 py-1 border-0">${item.tierName.toUpperCase()}</span>
            </td>
            <td>${getStatusBadge(item.status)}</td>
            <td style="font-size:0.82rem;color:#64748b;max-width:150px;word-break:break-word;">${svcStr}</td>
            <td style="font-weight:700;color:#0f172a;">${priceStr}</td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2 flex-wrap">
                    ${canAdv ? `
                        <button class="btn btn-sm fw-bold px-3 py-2"
                                style="font-size:0.72rem;border-radius:10px;background:var(--navy-dark);color:var(--cyan-electric);border:none;"
                                onclick="handleAdvanceQueue(${item.queueId},'${item.licensePlate}')">
                            <i class="fas fa-forward me-1"></i>${NEXT_LABEL[item.status]}
                        </button>` : ''}
                    ${!isDone ? `
                        <button class="btn btn-sm fw-bold px-3 py-2"
                                style="font-size:0.72rem;border-radius:10px;border:1.5px solid var(--cyan-electric);color:var(--cyan-electric);"
                                data-bs-toggle="modal" data-bs-target="#manageServicesModal"
                                onclick="openManageServices(${item.queueId})">
                            <i class="fas fa-sliders-h"></i>
                        </button>` : ''}
                    ${isDrying ? `
                        <button class="app-btn-primary btn-sm py-2 px-3 w-auto shadow-none fw-bold"
                                style="font-size:0.72rem;border-radius:10px;"
                                data-bs-toggle="modal" data-bs-target="#checkoutModal"
                                onclick="openCheckoutModal(${item.queueId})">
                            <i class="fas fa-cash-register me-1"></i>CHECK-OUT
                        </button>` : ''}
                    ${isWaiting ? `
                        <button class="btn btn-sm text-danger border-0 px-2 py-2"
                                style="font-size:0.72rem;border-radius:10px;opacity:0.7;"
                                onclick="handleCancelQueue(${item.queueId},'${item.licensePlate}')">
                            <i class="fas fa-times"></i>
                        </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── LPR Scanner ──────────────────────────────────────────

function startScanner() {
    isScanning = true; scannedPlate = '';
    const els = {
        viewport:   document.getElementById('lpr-viewport'),
        scanLine:   document.getElementById('lpr-scan-line'),
        scanText:   document.getElementById('lpr-scanning-text'),
        plateBox:   document.getElementById('lpr-plate-result'),
        successTxt: document.getElementById('lpr-success-text'),
        addBtn:     document.getElementById('lpr-add-btn'),
        waitBtn:    document.getElementById('lpr-waiting-btn')
    };

    els.viewport?.classList.add('scanning');
    els.viewport?.classList.remove('success');
    if (els.scanLine)   els.scanLine.style.display   = 'block';
    if (els.scanText)   els.scanText.style.display   = 'flex';
    if (els.plateBox)   els.plateBox.style.display   = 'none';
    if (els.successTxt) els.successTxt.style.display = 'none';
    if (els.addBtn)     els.addBtn.style.display     = 'none';
    if (els.waitBtn)    els.waitBtn.style.display    = 'block';

    setTimeout(() => {
        scannedPlate = '51H-888.88';
        isScanning = false;

        els.viewport?.classList.remove('scanning');
        els.viewport?.classList.add('success');
        if (els.scanLine)   els.scanLine.style.display   = 'none';
        if (els.scanText)   els.scanText.style.display   = 'none';
        if (els.plateBox)   { els.plateBox.textContent   = scannedPlate; els.plateBox.style.display = 'block'; }
        if (els.successTxt) els.successTxt.style.display = 'flex';
        if (els.addBtn)     els.addBtn.style.display     = 'block';
        if (els.waitBtn)    els.waitBtn.style.display    = 'none';
    }, 2000);
}

function resetScanner() { isScanning = false; scannedPlate = ''; }

async function addScannedToQueue() {
    if (!scannedPlate) return;

    try {
        const res  = await fetch('/Admin/AddWalkIn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licensePlate: scannedPlate })
        });
        const data = await res.json();
        if (data.success) {
            if (data.hasBooking) {
                const svcs = data.bookingServices ? ` — ${data.bookingServices}` : '';
                showToast(`Check-in booking: ${data.customerName} (${scannedPlate})${svcs}`, 'success');
            } else {
                showToast(`Đã thêm walk-in ${data.customerName} (${scannedPlate}) vào hàng đợi!`, 'success');
            }
            await loadQueue();
        } else {
            showToast(data.message || 'Thêm vào hàng đợi thất bại!', 'error');
        }
    } catch { showToast('Không thể kết nối server!', 'error'); }

    scannedPlate = '';
}

// ── Helpers ──────────────────────────────────────────────

function getStatusLabel(status) {
    return { Waiting: 'Đang chờ', LPR_Scan: 'Quét LPR', Washing: 'Đang rửa', Drying: 'Sấy khô', Completed: 'Hoàn tất', Cancelled: 'Đã hủy' }[status] || status;
}

function getStatusBadge(status) {
    const map = {
        Waiting:   '<span class="q-badge q-badge-waiting"><i class="fas fa-hourglass-half"></i>Đang chờ</span>',
        LPR_Scan:  '<span class="q-badge q-badge-lpr"><i class="fas fa-camera"></i>Quét LPR</span>',
        Washing:   '<span class="q-badge q-badge-washing"><i class="fas fa-water"></i>Đang rửa</span>',
        Drying:    '<span class="q-badge q-badge-drying"><i class="fas fa-wind"></i>Sấy khô</span>',
        Completed: '<span class="q-badge q-badge-completed"><i class="fas fa-check-circle"></i>Hoàn tất</span>',
        Cancelled: '<span class="q-badge q-badge-cancelled"><i class="fas fa-times-circle"></i>Đã hủy</span>',
    };
    return map[status] || `<span class="q-badge" style="background:#f1f5f9;color:#64748b;">${status}</span>`;
}

function getTierBadgeClass(tierName) {
    const t = (tierName || '').toLowerCase();
    if (t.includes('platinum')) return 'tier-badge-platinum';
    if (t.includes('gold'))     return 'tier-badge-gold';
    if (t.includes('silver'))   return 'tier-badge-silver';
    return 'tier-badge-member';
}

function formatTime(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
