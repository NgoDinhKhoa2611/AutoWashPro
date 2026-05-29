/**
 * loyalty.js — Loyalty tier simulator, premium rewards ticket grid, redeem modal
 * Aligned with setup_database.sql schema: Rewards & RewardRedemptions
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

// Aligned with Table Rewards (setup_database.sql): RewardId, RewardName, Description, PointsRequired, RewardType, RewardValue, IsActive
const ALL_REWARDS = [
    { rewardId: 1, rewardName: 'Voucher giảm 10%', description: 'Áp dụng cho mọi hóa đơn rửa xe.', pointsRequired: 100, rewardType: 'DiscountPercent', rewardValue: 10, isActive: 1, icon: 'fa-percent' },
    { rewardId: 2, rewardName: 'Miễn phí rửa vỏ bọt tuyết', description: 'Tặng 1 lần rửa vỏ ngoài bọt tuyết.', pointsRequired: 200, rewardType: 'FreeWash', rewardValue: 100000, isActive: 1, icon: 'fa-soap' },
    { rewardId: 3, rewardName: 'Voucher giảm 20%', description: 'Áp dụng cho khách hàng Gold & Platinum.', pointsRequired: 500, rewardType: 'DiscountPercent', rewardValue: 20, isActive: 1, icon: 'fa-percent' },
    { rewardId: 4, rewardName: 'Vệ sinh sên chuyên sâu', description: 'Gói chăm sóc sên và nhông xích xe máy.', pointsRequired: 150, rewardType: 'AddOnService', rewardValue: 50000, isActive: 1, icon: 'fa-link' },
    { rewardId: 5, rewardName: 'Phủ Wax bóng Nano', description: 'Bảo vệ bề mặt sơn xe sáng bóng.', pointsRequired: 300, rewardType: 'AddOnService', rewardValue: 120000, isActive: 1, icon: 'fa-shield-alt' },
    { rewardId: 6, rewardName: 'Hút bụi & Vệ sinh nội thất', description: 'Vệ sinh cabin, dọn dẹp sạch sẽ nội thất.', pointsRequired: 400, rewardType: 'AddOnService', rewardValue: 150000, isActive: 1, icon: 'fa-couch' },
    { rewardId: 7, rewardName: 'Combo chăm sóc VIP', description: 'Dịch vụ dọn xe chuyên sâu cho Platinum.', pointsRequired: 800, rewardType: 'FreeWash', rewardValue: 350000, isActive: 1, icon: 'fa-crown' }
];

let currentTier   = localStorage.getItem('user_tier') || 'Gold Member';
let currentFilter = 'Tất cả';
let pendingRedeem = null;

document.addEventListener('DOMContentLoaded', function () {
    loadTierData();
    renderMemberCard();
    renderRewardsGrid();
    renderExpiryBatches();
    renderMyVouchers();

    window.addEventListener('storage', function () {
        currentTier = localStorage.getItem('user_tier') || 'Gold Member';
        loadTierData();
        renderMemberCard();
        renderRewardsGrid();
        renderExpiryBatches();
        renderMyVouchers();
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
        btn.className = 'btn btn-sm px-4 rounded-pill py-2 border-0 app-card w-auto shadow-sm text-muted bg-white loyalty-filter-btn';
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
        activeBtn.className = 'btn btn-sm px-4 rounded-pill py-2 border-0 app-btn-primary w-auto text-dark loyalty-filter-btn';
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
        if (currentFilter === 'Giảm giá') {
            filtered = filtered.filter(r => r.rewardType === 'DiscountPercent');
        } else if (currentFilter === 'Dịch vụ') {
            filtered = filtered.filter(r => r.rewardType === 'FreeWash' || r.rewardType === 'AddOnService');
        } else if (currentFilter === 'Quà tặng' || currentFilter === 'Combo đặc biệt') {
            filtered = filtered.filter(r => r.rewardType === 'FreeWash' || r.rewardType === 'AddOnService');
        } else if (currentFilter === 'Ưu đãi sinh nhật') {
            filtered = filtered.filter(r => r.pointsRequired === 0);
        }
    }

    if (countEl) countEl.textContent = filtered.length;

    container.innerHTML = filtered.map(r => {
        const canRedeem = userPts >= r.pointsRequired;
        
        let leftVal = '';
        let leftLabel = '';
        if (r.rewardType === 'DiscountPercent') {
            leftVal = `${r.rewardValue}%`;
            leftLabel = 'GIẢM GIÁ';
        } else if (r.rewardType === 'FreeWash') {
            leftVal = 'FREE';
            leftLabel = 'RỬA XE';
        } else {
            leftVal = 'PLUS';
            leftLabel = 'TẶNG KÈM';
        }

        return `
        <div class="col-md-6">
            <div class="ticket-card">
                <div class="ticket-left">
                    <div class="ticket-value">${leftVal}</div>
                    <div class="ticket-type-label">${leftLabel}</div>
                </div>
                <div class="ticket-right">
                    <div class="ticket-divider"></div>
                    <div>
                        <div class="ticket-title">${r.rewardName}</div>
                        <div class="ticket-desc">${r.description}</div>
                        ${r.rewardType !== 'DiscountPercent' ? `<div class="small fw-bold text-cyan mt-1" style="font-size: 0.68rem;">Trị giá: ₫${Number(r.rewardValue).toLocaleString()}</div>` : ''}
                    </div>
                    <div class="ticket-footer">
                        <span class="ticket-points-badge">${r.pointsRequired} PTS</span>
                        ${canRedeem
                            ? `<button class="ticket-btn" onclick="openRedeemModal(${r.rewardId})">
                                   <i class="fas fa-exchange-alt me-1"></i>ĐỔI
                               </button>`
                            : `<span class="small text-muted" style="font-size: 0.68rem; font-weight:600;">
                                   Cần thêm ${r.pointsRequired - userPts} PTS
                               </span>`
                        }
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// ── Redeem Modal ─────────────────────────────────────────
function openRedeemModal(rewardId) {
    pendingRedeem = ALL_REWARDS.find(r => r.rewardId === Number(rewardId));
    if (!pendingRedeem) return;

    const overlay = document.getElementById('redeem-modal-overlay');
    const content = document.getElementById('redeem-modal-content');
    if (!overlay || !content) return;

    content.innerHTML = `
        <div class="text-center mb-4">
            <div class="reward-icon-box mx-auto mb-3" style="width:64px;height:64px;font-size:1.5rem; background: rgba(14, 165, 233, 0.08); color: var(--cyan-electric); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${pendingRedeem.icon}"></i>
            </div>
            <h5 class="fw-bold mb-1" style="color:var(--navy-dark); font-family: 'Be Vietnam Pro', sans-serif;">Xác nhận đổi thẻ quà tặng</h5>
            <p class="text-muted small px-3">${pendingRedeem.rewardName}</p>
        </div>
        <div class="app-card bg-light border-0 p-3 rounded-4 mb-4">
            <div class="d-flex justify-content-between">
                <span class="text-muted small fw-bold">Điểm cần dùng:</span>
                <span class="fw-bold text-warning">${pendingRedeem.pointsRequired} PTS</span>
            </div>
            <div class="d-flex justify-content-between mt-2">
                <span class="text-muted small fw-bold">Điểm hiện có:</span>
                <span class="fw-bold text-cyan">${Number(localStorage.getItem('user_points') || 0).toLocaleString()} PTS</span>
            </div>
        </div>
        <div class="d-flex gap-2">
            <button class="app-btn-secondary w-50 py-2" style="border-radius:12px;" onclick="closeRedeemModal()">HỦY BỎ</button>
            <button class="app-btn-primary w-50 py-2 text-dark fw-bold" style="border-radius:12px;" onclick="confirmRedeem()">XÁC NHẬN ĐỔI</button>
        </div>
    `;

    overlay.style.display = 'flex';
}

function closeRedeemModal() {
    const overlay = document.getElementById('redeem-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    pendingRedeem = null;
}

// Aligned with RewardRedemptions structure
function confirmRedeem() {
    if (!pendingRedeem) return;

    const currentPts = Number(localStorage.getItem('user_points') || 0);
    if (currentPts < pendingRedeem.pointsRequired) {
        showToast('Bạn không đủ điểm để đổi phần thưởng này!', 'error');
        return;
    }

    const newPts = Math.max(0, currentPts - pendingRedeem.pointsRequired);
    localStorage.setItem('user_points', String(newPts));

    // Generate a random voucher code in DB format
    const randCode = 'AW-RED-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Expire date is 30 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Add to claimed vouchers list (Status = 1 (Available) matching setup_database.sql)
    const claimed = {
        redemptionId: 'red_' + Date.now(),
        rewardId: pendingRedeem.rewardId,
        title: pendingRedeem.rewardName,
        rewardType: pendingRedeem.rewardType,
        rewardValue: pendingRedeem.rewardValue,
        icon: pendingRedeem.icon,
        code: randCode,
        status: 1, // 1 = Available, 2 = Used, 3 = Expired
        redeemedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        expiredAt: expiryStr
    };

    const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    localStorage.setItem('user_claimed_vouchers', JSON.stringify([claimed, ...claimedList]));

    // Add notification
    const notif = {
        id: 'notif_redeem_' + Date.now(),
        title: 'Đổi thưởng thành công',
        body: `Bạn đã đổi "${pendingRedeem.rewardName}" (Mã: ${randCode}). Hạn sử dụng đến ${expiryStr}.`,
        time: 'Vừa xong',
        type: 'points',
        read: false
    };
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifs]));

    window.dispatchEvent(new Event('storage'));
    closeRedeemModal();
    showToast(`Đổi quà thành công! Đã trừ ${pendingRedeem.pointsRequired} PTS.`, 'success');
}

// ── Points Expiry Batches ────────────────────────────────
function renderExpiryBatches() {
    const container = document.getElementById('expiry-batches');
    if (!container) return;

    const config = JSON.parse(localStorage.getItem('loyalty_config') || '{}');
    const expiryMonths = config.expiryMonths || 12;
    const now = new Date();

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
    showToast('Quy định: Mỗi 1.000đ chi tiêu = 1 PTS. Hạng VIP nhân hệ số: Bạc x1.1, Vàng x1.2, Kim Cương x1.5.', 'info');
}

// ── Claimed Vouchers Management (Simulating RewardRedemptions) ──
function renderMyVouchers() {
    const container = document.getElementById('my-vouchers-grid');
    const countEl   = document.getElementById('my-vouchers-count');
    const section   = document.getElementById('my-vouchers-section');
    if (!container || !section) return;

    const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    if (countEl) countEl.textContent = claimedList.length;

    if (claimedList.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    container.innerHTML = claimedList.map(v => {
        const isUsed = v.status === 2; // 2 = Used in database enum
        
        let leftVal = '';
        let leftLabel = '';
        if (v.rewardType === 'DiscountPercent') {
            leftVal = `${v.rewardValue}%`;
            leftLabel = 'GIẢM GIÁ';
        } else if (v.rewardType === 'FreeWash') {
            leftVal = 'FREE';
            leftLabel = 'RỬA XE';
        } else {
            leftVal = 'PLUS';
            leftLabel = 'TẶNG KÈM';
        }

        return `
        <div class="col-md-6">
            <div class="ticket-card claimed-ticket ${isUsed ? 'used' : ''}">
                <div class="ticket-left">
                    <div class="ticket-value">${leftVal}</div>
                    <div class="ticket-type-label">${leftLabel}</div>
                </div>
                <div class="ticket-right">
                    <div class="ticket-divider"></div>
                    <div>
                        <div class="ticket-title">${v.title}</div>
                        <div class="claimed-ticket-code mt-1">Mã: <strong>${v.code}</strong></div>
                        <div class="text-muted mt-1" style="font-size:0.67rem;">
                            Đổi: ${v.redeemedAt} — Hạn dùng: ${v.expiredAt}
                        </div>
                    </div>
                    <div class="ticket-footer justify-content-end">
                        ${isUsed 
                            ? `<span class="badge bg-secondary rounded px-2 py-1 text-white small" style="font-size: 0.62rem; font-weight: 700;">ĐÃ SỬ DỤNG</span>`
                            : `<button class="ticket-btn" style="padding: 4px 12px; border-radius: 8px;" onclick="useVoucher('${v.redemptionId}')">SỬ DỤNG</button>`
                        }
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function useVoucher(redemptionId) {
    if (window.showConfirm) {
        window.showConfirm('Áp dụng ưu đãi', 'Bạn có chắc chắn muốn sử dụng voucher này cho lượt đặt lịch rửa xe tiếp theo?', () => {
            applyVoucherLogic(redemptionId);
        });
    } else {
        if (confirm('Bạn có chắc chắn muốn sử dụng voucher này?')) {
            applyVoucherLogic(redemptionId);
        }
    }
}

function applyVoucherLogic(redemptionId) {
    const claimedList = JSON.parse(localStorage.getItem('user_claimed_vouchers') || '[]');
    const voucherIndex = claimedList.findIndex(v => v.redemptionId === redemptionId);
    if (voucherIndex !== -1) {
        claimedList[voucherIndex].status = 2; // 2 = Used in database enum
        localStorage.setItem('user_claimed_vouchers', JSON.stringify(claimedList));
        window.dispatchEvent(new Event('storage'));
        if (window.showToast) showToast('Áp dụng voucher thành công!', 'success');
        else alert('Áp dụng voucher thành công!');
    }
}
