/**
 * loyalty.js — Loyalty tier simulator, rewards grid, redeem modal
 */

const TIER_DATA = {
    'Standard Member': {
        color:       '#64748b',
        cardClass:   'tier-member',
        multiplier:  'x1.0',
        queuePerk:   'Xếp hàng theo thứ tự thông thường.',
        birthday:    'Không có ưu đãi sinh nhật.',
        nextTier:    'Silver',
        neededPts:   500
    },
    'Silver Member': {
        color:       '#94a3b8',
        cardClass:   'tier-silver',
        multiplier:  'x1.1',
        queuePerk:   'Ưu tiên hàng đợi trước khách thường.',
        birthday:    'Tặng 01 lần rửa xe phổ thông miễn phí.',
        nextTier:    'Gold',
        neededPts:   1000
    },
    'Gold Member': {
        color:       '#ffcf33',
        cardClass:   'tier-gold',
        multiplier:  'x1.2',
        queuePerk:   'Bypass hàng rửa xe thường. Vào thẳng ô rửa VIP.',
        birthday:    'Tặng 01 combo cao cấp rửa xe + vệ sinh sên miễn phí vào tháng sinh nhật.',
        nextTier:    'Platinum',
        neededPts:   2000
    },
    'Platinum Member': {
        color:       '#0ea5e9',
        cardClass:   'tier-platinum',
        multiplier:  'x1.5',
        queuePerk:   'Ưu tiên TUYỆT ĐỐI. Phục vụ ngay không chờ đợi.',
        birthday:    'Tặng gói chăm sóc xe toàn diện + bộ quà VIP tháng sinh nhật.',
        nextTier:    'Diamond Ultimate',
        neededPts:   null
    }
};

const ALL_REWARDS = [
    { id: 'rw_01', title: 'Giảm 10% lần rửa xe tiếp theo',   pts: 100, cat: 'Giảm giá',     icon: 'fa-percent',       tier: 'Standard Member',  status: 'active',  desc: 'Áp dụng cho tất cả gói dịch vụ.' },
    { id: 'rw_02', title: 'Rửa xe phổ thông miễn phí',        pts: 200, cat: 'Dịch vụ',      icon: 'fa-soap',          tier: 'Silver Member',    status: 'active',  desc: 'Tặng 1 lần rửa xe phổ thông.' },
    { id: 'rw_03', title: 'Vệ sinh sên chuyên nghiệp',        pts: 150, cat: 'Dịch vụ',      icon: 'fa-link',          tier: 'Standard Member',  status: 'active',  desc: 'Add-on vệ sinh sên miễn phí.' },
    { id: 'rw_04', title: 'Quà sinh nhật VIP',                pts: 0,   cat: 'Ưu đãi sinh nhật', icon: 'fa-birthday-cake', tier: 'Gold Member', status: 'warning', desc: 'Tặng khi vào tháng sinh nhật.' },
    { id: 'rw_05', title: 'Wax bóng nano miễn phí',           pts: 300, cat: 'Dịch vụ',      icon: 'fa-shield-alt',    tier: 'Gold Member',      status: 'active',  desc: 'Phủ sáp wax bóng 1 lần.' },
    { id: 'rw_06', title: 'Combo rửa xe cao cấp',             pts: 500, cat: 'Combo đặc biệt', icon: 'fa-star',         tier: 'Platinum Member',  status: 'active',  desc: 'Combo cao cấp đầy đủ.' },
    { id: 'rw_07', title: 'Giảm 20% đặt lịch cuối tuần',     pts: 250, cat: 'Giảm giá',     icon: 'fa-calendar-alt',  tier: 'Silver Member',    status: 'active',  desc: 'Áp dụng thứ Bảy và Chủ Nhật.' },
    { id: 'rw_08', title: 'Vệ sinh nội thất xe miễn phí',     pts: 350, cat: 'Dịch vụ',      icon: 'fa-couch',         tier: 'Gold Member',      status: 'active',  desc: 'Dọn sạch khoang cabin.' },
    { id: 'rw_09', title: 'Voucher 50.000đ',                  pts: 400, cat: 'Quà tặng',     icon: 'fa-ticket-alt',    tier: 'Gold Member',      status: 'active',  desc: 'Dùng cho lần rửa tiếp theo.' },
    { id: 'rw_10', title: 'Gói chăm sóc VIP platinum',        pts: 800, cat: 'Combo đặc biệt', icon: 'fa-crown',        tier: 'Platinum Member',  status: 'empty',   desc: 'Toàn bộ dịch vụ cao cấp nhất.' },
    { id: 'rw_11', title: 'Ưu tiên hàng đợi tháng',          pts: 200, cat: 'Dịch vụ',      icon: 'fa-clock',         tier: 'Silver Member',    status: 'active',  desc: 'Bypass queue trong 30 ngày.' },
    { id: 'rw_12', title: 'Tặng 100 điểm bonus',              pts: 0,   cat: 'Quà tặng',     icon: 'fa-gift',          tier: 'Standard Member',  status: 'warning', desc: 'Điều kiện: đánh giá 3 lần liên tiếp.' }
];

let currentTier   = localStorage.getItem('user_tier') || 'Gold Member';
let currentFilter = 'Tất cả';
let pendingRedeem = null;

document.addEventListener('DOMContentLoaded', function () {
    loadTierData();
    renderMemberCard();
    renderRewardsGrid();
    renderExpiryBatches();

    window.addEventListener('storage', function () {
        currentTier = localStorage.getItem('user_tier') || 'Gold Member';
        loadTierData();
        renderMemberCard();
        renderRewardsGrid();
        renderExpiryBatches();
    });
});

// ── Tier Simulator ───────────────────────────────────────
function changeTier(tier) {
    currentTier = tier;
    loadTierData();
    renderMemberCard();
    renderRewardsGrid();

    document.querySelectorAll('[id^="tier-btn-"]').forEach(btn => btn.classList.remove('selected', 'bg-navy', 'text-cyan'));

    const keyMap = {
        'Standard Member': 'standard',
        'Silver Member':   'silver',
        'Gold Member':     'gold',
        'Platinum Member': 'platinum'
    };
    const key = keyMap[tier];
    const btn = document.getElementById('tier-btn-' + key);
    if (btn) btn.classList.add('selected');
}

function loadTierData() {
    const data = TIER_DATA[currentTier] || TIER_DATA['Gold Member'];
    const perksLabel = document.getElementById('tier-perks-label');
    const perkQueue  = document.getElementById('perk-queue');
    const perkMult   = document.getElementById('perk-multiplier');
    const perkBday   = document.getElementById('perk-birthday');

    if (perksLabel) perksLabel.textContent = currentTier.replace(' Member', '');
    if (perkQueue)  perkQueue.innerHTML  = `<strong>Ưu tiên hàng đợi:</strong> ${data.queuePerk}`;
    if (perkMult)   perkMult.innerHTML   = `<strong>Hệ số tích điểm:</strong> Nhân hệ số ${data.multiplier} điểm thưởng.`;
    if (perkBday)   perkBday.innerHTML   = `<strong>Quà sinh nhật:</strong> ${data.birthday}`;
}

function renderMemberCard() {
    const container = document.getElementById('loyalty-member-card');
    if (!container) return;

    const data  = TIER_DATA[currentTier] || TIER_DATA['Gold Member'];
    const pts   = Number(localStorage.getItem('user_points') || 550);
    const name  = localStorage.getItem('user_display_name') || 'Lê Tuấn Kiệt';
    const next  = data.nextTier;
    const remaining = data.neededPts ? Math.max(0, data.neededPts - pts) + ' PTS' : 'Tối cao';

    container.innerHTML = `
        <div class="member-card ${data.cardClass}">
            <span class="tier-label"><i class="fas fa-crown me-2"></i>${currentTier}</span>
            <h2 class="fw-bold text-white mb-1">${pts.toLocaleString()} <small style="font-size:1rem;font-weight:600;">PTS</small></h2>
            <p class="text-white mb-3" style="opacity:0.7;font-size:0.85rem;">S-Member Loyalty Points</p>
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <small style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:0.6;">HẠNG TIẾP THEO</small>
                    <div class="fw-bold text-cyan mt-1" style="font-size:0.88rem;">${next} — còn ${remaining}</div>
                </div>
                <div class="text-end">
                    <small style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:0.6;">MÃ THÀNH VIÊN</small>
                    <div class="fw-bold text-white mt-1" style="font-size:0.75rem;letter-spacing:1px;">AW-2026-${currentTier.replace(' Member','').toUpperCase()}</div>
                </div>
            </div>
        </div>
    `;
}

// ── Rewards Grid ─────────────────────────────────────────
function filterCategory(cat) {
    currentFilter = cat;

    document.querySelectorAll('[id^="cat-"]').forEach(btn => {
        btn.className = 'btn btn-sm px-4 rounded-pill py-2 border-0 app-card w-auto shadow-sm text-muted bg-white';
        btn.style.fontSize = '0.78rem';
        btn.style.fontWeight = '700';
    });

    const catMap = {
        'Tất cả': 'cat-all',
        'Giảm giá': 'cat-discount',
        'Dịch vụ': 'cat-service',
        'Quà tặng': 'cat-gift',
        'Combo đặc biệt': 'cat-combo',
        'Ưu đãi sinh nhật': 'cat-birthday'
    };
    const activeBtn = document.getElementById(catMap[cat]);
    if (activeBtn) {
        activeBtn.className = 'btn btn-sm px-4 rounded-pill py-2 border-0 app-btn-primary w-auto text-dark';
    }

    renderRewardsGrid();
}

function renderRewardsGrid() {
    const container = document.getElementById('rewards-grid');
    const countEl   = document.getElementById('rewards-count');
    if (!container) return;

    const userPts = Number(localStorage.getItem('user_points') || 0);

    let filtered = ALL_REWARDS;
    if (currentFilter !== 'Tất cả') {
        filtered = filtered.filter(r => r.cat === currentFilter);
    }

    if (countEl) countEl.textContent = filtered.length;

    const statusLabels = { active: 'Đổi ngay', warning: 'Điều kiện', empty: 'Chưa mở khóa' };
    const statusClasses = { active: 'reward-status-active', warning: 'reward-status-warning', empty: 'reward-status-empty' };

    container.innerHTML = filtered.map(r => {
        const canRedeem = userPts >= r.pts && r.status === 'active';
        return `
        <div class="col-md-6">
            <div class="reward-card-item">
                <div class="reward-icon-box">
                    <i class="fas ${r.icon}"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="fw-bold small mb-1" style="color:var(--navy-dark);">${r.title}</div>
                    <div class="text-muted" style="font-size:0.72rem;">${r.desc}</div>
                    <div class="d-flex align-items-center justify-content-between mt-2 gap-2 flex-wrap">
                        <span class="reward-badge-status ${statusClasses[r.status]}">${statusLabels[r.status]}</span>
                        ${r.pts > 0 ? `<span class="fw-bold text-warning small">${r.pts} PTS</span>` : '<span class="fw-bold text-success small">Miễn phí</span>'}
                    </div>
                </div>
                ${canRedeem
                    ? `<button class="reward-btn-redeem flex-shrink-0" onclick="openRedeemModal('${r.id}')">
                           <i class="fas fa-exchange-alt me-1"></i>ĐỔI
                       </button>`
                    : `<div class="text-muted small text-center flex-shrink-0" style="width:50px;font-size:0.7rem;">
                           ${userPts < r.pts ? (r.pts - userPts) + '<br>PTS nữa' : '—'}
                       </div>`
                }
            </div>
        </div>
        `;
    }).join('');
}

// ── Redeem Modal ─────────────────────────────────────────
function openRedeemModal(rewardId) {
    pendingRedeem = ALL_REWARDS.find(r => r.id === rewardId);
    if (!pendingRedeem) return;

    const overlay = document.getElementById('redeem-modal-overlay');
    const content = document.getElementById('redeem-modal-content');
    if (!overlay || !content) return;

    content.innerHTML = `
        <div class="text-center mb-4">
            <div class="reward-icon-box mx-auto mb-3" style="width:64px;height:64px;font-size:1.5rem;">
                <i class="fas ${pendingRedeem.icon}"></i>
            </div>
            <h5 class="fw-bold mb-1" style="color:var(--navy-dark);">Xác nhận đổi thưởng</h5>
            <p class="text-muted small">${pendingRedeem.title}</p>
        </div>
        <div class="app-card bg-light border-0 p-3 rounded-4 mb-4">
            <div class="d-flex justify-content-between">
                <span class="text-muted small fw-bold">Điểm cần dùng:</span>
                <span class="fw-bold text-warning">${pendingRedeem.pts} PTS</span>
            </div>
            <div class="d-flex justify-content-between mt-2">
                <span class="text-muted small fw-bold">Điểm hiện có:</span>
                <span class="fw-bold text-cyan">${Number(localStorage.getItem('user_points') || 0).toLocaleString()} PTS</span>
            </div>
        </div>
        <div class="d-flex gap-2">
            <button class="app-btn-secondary w-50 py-2" style="border-radius:12px;" onclick="closeRedeemModal()">HỦY BỎ</button>
            <button class="app-btn-primary w-50 py-2" style="border-radius:12px;" onclick="confirmRedeem()">XÁC NHẬN ĐỔI</button>
        </div>
    `;

    overlay.style.display = 'flex';
}

function closeRedeemModal() {
    const overlay = document.getElementById('redeem-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    pendingRedeem = null;
}

function confirmRedeem() {
    if (!pendingRedeem) return;

    const currentPts = Number(localStorage.getItem('user_points') || 0);
    const newPts = Math.max(0, currentPts - pendingRedeem.pts);
    localStorage.setItem('user_points', String(newPts));

    // Add notification
    const notif = {
        id: 'notif_redeem_' + Date.now(),
        title: 'Đổi thưởng thành công',
        body: `Bạn đã đổi "${pendingRedeem.title}" với ${pendingRedeem.pts} PTS. Ưu đãi có hiệu lực trong 30 ngày.`,
        time: 'Vừa xong',
        type: 'points',
        read: false
    };
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifs]));

    window.dispatchEvent(new Event('storage'));
    closeRedeemModal();
    showToast(`Đổi thưởng thành công! Trừ ${pendingRedeem.pts} PTS.`, 'success');
}

// ── Points Expiry Batches ────────────────────────────────
function renderExpiryBatches() {
    const container = document.getElementById('expiry-batches');
    if (!container) return;

    const config = JSON.parse(localStorage.getItem('loyalty_config') || '{}');
    const expiryMonths = config.expiryMonths || 12;
    const now = new Date();

    // Simulated earned-point batches (oldest first)
    const earnedDaysAgo = [305, 210, 95];
    const ptsAmounts    = [150, 220, 180];

    const batches = earnedDaysAgo.map((daysAgo, i) => {
        const earned = new Date(now);
        earned.setDate(earned.getDate() - daysAgo);
        const expiry = new Date(earned);
        expiry.setMonth(expiry.getMonth() + expiryMonths);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return { pts: ptsAmounts[i], expiry, daysLeft };
    });

    container.innerHTML = batches.map(b => {
        const isWarn  = b.daysLeft <= 60;
        const expiryStr = b.expiry.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `
        <div class="expiry-item">
            <div>
                <div class="fw-bold" style="color:var(--navy-dark);font-size:0.8rem;">${b.pts} PTS</div>
                <small class="text-muted" style="font-size:0.67rem;">Hết hạn: ${expiryStr}</small>
            </div>
            <span class="expiry-badge ${isWarn ? 'expiry-badge-warn' : 'expiry-badge-ok'}">
                ${isWarn ? `Còn ${b.daysLeft} ngày` : 'Còn hạn'}
            </span>
        </div>`;
    }).join('');
}

// ── Loyalty Rules ────────────────────────────────────────
function showLoyaltyRules() {
    showToast('Quy định: Mỗi 1.000đ chi tiêu = 1 PTS. Hệ số nhân tùy theo hạng thành viên.', 'info');
}
