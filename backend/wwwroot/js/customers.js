/**
 * customers.js — Admin Customer Relationship Management
 */

let customers        = [];
let selectedCustomer = null;
let adjustAction     = 'add';
let adjustPoints     = 0;
let adjustReason     = '';

document.addEventListener('DOMContentLoaded', function () {
    loadCustomers();
});

function loadCustomers() {
    const userPoints = Number(localStorage.getItem('user_points') || 1250);
    const userTier   = (localStorage.getItem('user_tier') || 'Gold Member').replace(' Member', '').toUpperCase();
    const userName   = localStorage.getItem('user_display_name') || 'Lê Tuấn Kiệt';
    const userPhone  = localStorage.getItem('user_phone')  || '0901234567';

    customers = [
        { id: 'cus_user', name: `${userName} (Bạn)`, phone: userPhone, tier: userTier, points: userPoints, joined: '19/05/2026', spend: userPoints.toLocaleString() + 'đ', isUser: true },
        { id: 'cus_01',   name: 'Nguyễn Văn A',       phone: '0902345678',  tier: 'SILVER',   points: 450,  joined: '10/05/2026', spend: '120.000đ', isUser: false },
        { id: 'cus_02',   name: 'Lê Văn C',            phone: '0988888888',  tier: 'PLATINUM', points: 2150, joined: '01/01/2026', spend: '850.000đ', isUser: false }
    ];

    renderCustomers();
}

function filterCustomers() {
    renderCustomers();
}

function renderCustomers() {
    const search  = (document.getElementById('customer-search') || {}).value || '';
    const tbody   = document.getElementById('customers-tbody');
    const badge   = document.getElementById('customer-total-badge');

    const filtered = customers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
    );

    if (badge) badge.textContent = `TOTAL: ${filtered.length} CUSTOMERS`;
    if (!tbody) return;

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td class="ps-4">
                <div class="fw-bold" style="color:var(--navy-dark);">
                    ${c.name}
                    ${c.isUser ? '<span class="badge ms-1 fw-bold" style="font-size:0.6rem;background:var(--navy-dark);color:var(--cyan-electric);">BẠN</span>' : ''}
                </div>
                <small class="text-muted">Joined: ${c.joined}</small>
            </td>
            <td class="fw-bold" style="color:var(--navy-dark);">${c.phone}</td>
            <td><span class="badge tier-pill ${getTierBadgeClass(c.tier)} px-3 py-1 border-0" style="font-size:0.65rem;color:black">${c.tier}</span></td>
            <td><span class="fw-bold" style="color:var(--navy-dark);">${Number(c.points).toLocaleString()} PTS</span></td>
            <td class="fw-bold text-cyan">${c.spend}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm me-1 rounded-3 px-3 py-2 shadow-sm fw-bold"
                        style="font-size:0.7rem;background:var(--navy-dark);color:var(--cyan-electric);"
                        data-bs-toggle="modal" data-bs-target="#pointModal"
                        onclick="openPointsModal('${c.id}')">
                    <i class="fas fa-plus-circle me-1"></i> POINTS
                </button>
                <button class="btn btn-sm bg-light text-muted border-0 rounded-3 p-2 shadow-sm" style="width:35px;"
                        onclick="viewCustomerProfile('${c.name}')">
                    <i class="fas fa-user-cog"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getTierBadgeClass(tier) {
    switch ((tier || '').toUpperCase()) {
        case 'PLATINUM': return 'tier-pill-platinum active';
        case 'GOLD':     return 'tier-pill-gold active';
        case 'SILVER':   return 'tier-pill-silver active';
        default:         return 'tier-pill-member active';
    }
}

// ── Points modal ─────────────────────────────────────────
function openPointsModal(id) {
    selectedCustomer = customers.find(c => c.id === id);
    adjustAction = 'add'; adjustPoints = 0; adjustReason = '';

    const body = document.getElementById('point-modal-body');
    if (!body || !selectedCustomer) return;

    body.innerHTML = `
        <div class="app-card bg-light border-0 p-3 mb-4 rounded-4">
            <div class="row">
                <div class="col-6 border-end">
                    <small class="text-muted fw-bold small mb-1">KHÁCH HÀNG</small>
                    <div class="fw-bold" style="color:var(--navy-dark);">${selectedCustomer.name}</div>
                </div>
                <div class="col-6">
                    <small class="text-muted fw-bold small mb-1">ĐIỂM HIỆN TẠI</small>
                    <div class="fw-bold text-cyan fs-5">${Number(selectedCustomer.points).toLocaleString()} PTS</div>
                </div>
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label small fw-bold text-muted">HÀNH ĐỘNG</label>
            <select id="adjust-action" class="form-select bg-light border-0 py-2" onchange="adjustAction=this.value">
                <option value="add">Cộng điểm (+)</option>
                <option value="sub">Trừ điểm (-)</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label small fw-bold text-muted">SỐ ĐIỂM</label>
            <input type="number" id="adjust-pts" class="form-control bg-light border-0 py-2" value="0"
                   oninput="adjustPoints=Number(this.value)" />
        </div>
        <div class="mb-0">
            <label class="form-label small fw-bold text-muted">LÝ DO ĐIỀU CHỈNH</label>
            <textarea id="adjust-reason" class="form-control bg-light border-0 py-2" rows="3"
                      placeholder="Ví dụ: Đền bù dịch vụ lỗi, Tặng quà sinh nhật..."
                      oninput="adjustReason=this.value"></textarea>
        </div>
    `;
}

function applyPointAdjustment() {
    if (!selectedCustomer) return;

    const change = adjustPoints * (adjustAction === 'add' ? 1 : -1);
    const newPts = Math.max(0, selectedCustomer.points + change);

    customers = customers.map(c => {
        if (c.id !== selectedCustomer.id) return c;
        let newTier = c.tier;
        if (c.isUser) {
            const tierInfo = window.getTierInfo ? window.getTierInfo(newPts) : { tier: 'Gold Member', nextTier: 'Platinum', remaining: '250k' };
            newTier = tierInfo.tier.replace(' Member', '').toUpperCase();
            localStorage.setItem('user_points', String(newPts));
            localStorage.setItem('user_tier', tierInfo.tier);
            localStorage.setItem('user_next_tier', tierInfo.nextTier || '');
            localStorage.setItem('user_remaining_spend', tierInfo.remaining || '');
            window.dispatchEvent(new Event('storage'));
        }
        return { ...c, points: newPts, tier: newTier };
    });

    renderCustomers();
    showToast(`Đã cập nhật điểm thành công cho ${selectedCustomer.name}!`, 'success');
    selectedCustomer = null;
}

function viewCustomerProfile(name) {
    showToast(`Đang tải hồ sơ chi tiết của ${name}...`, 'info');
}

function handleExportCustomers() {
    showToast('Đang xuất dữ liệu khách hàng ra file Excel...', 'success');
}
