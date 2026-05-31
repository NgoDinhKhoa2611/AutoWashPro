/**
 * history.js — Wash history list, stats, survey/rating modal
 */

const STEP_BADGES = ['Đã nhận diện LPR', 'Đang phun rửa vỏ', 'Đang sấy khí áp lực', 'Đã rửa sạch & Check-out'];

let surveyTargetId = null;
let surveyRating   = 5;
let surveyEmoji    = 5;
let surveyTags     = [];

document.addEventListener('DOMContentLoaded', function () {
    initHistory();

    window.addEventListener('storage', function () {
        initHistory();
    });
});

function initHistory() {
    loadHistoryData();
    loadActiveBooking();
    renderStats();
}

// ── Load / seed history ──────────────────────────────────
function getHistory() {
    const saved = localStorage.getItem('user_history_bookings');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    const initial = [
        { id: 'hist_01', date: '18/05/2026', plate: '51G - 123.45', type: 'Honda Vision', service: 'Combo Cao cấp',       price: 85000, points: 85, status: 'Hoàn tất', surveyStatus: 'pending' },
        { id: 'hist_02', date: '12/05/2026', plate: '51G - 123.45', type: 'Honda Vision', service: 'Rửa xe phổ thông', price: 35000, points: 35, status: 'Hoàn tất', surveyStatus: 'rated', rating: 5 },
        { id: 'hist_03', date: '05/05/2026', plate: '51A - 999.99', type: 'SH Mode',      service: 'Rửa xe phổ thông', price: 35000, points: 35, status: 'Hoàn tất', surveyStatus: 'rated', rating: 4 }
    ];
    localStorage.setItem('user_history_bookings', JSON.stringify(initial));
    return initial;
}

function loadHistoryData() {
    const list = getHistory();
    const container = document.getElementById('history-list');
    const countEl   = document.getElementById('history-count');
    if (!container) return;

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-icon"><i class="fas fa-history fa-2x"></i></div>
                <h5 class="fw-bold mb-2" style="color:var(--navy-dark);">Chưa có lịch sử rửa xe</h5>
                <p class="text-muted small mb-4">Sau khi hoàn tất dịch vụ, lịch sử sẽ tự động xuất hiện tại đây.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map(item => `
        <div class="app-card border-0 shadow-sm p-4 bg-white" style="border-radius:20px;" id="hist-card-${item.id}">
            <div class="d-flex flex-wrap justify-content-between align-items-start border-bottom pb-3 mb-3 gap-2">
                <div>
                    <div class="fw-bold fs-6" style="color:var(--navy-dark);">${item.plate}</div>
                    <small class="text-muted" style="font-size:0.75rem;">${item.date} • ${item.type}</small>
                </div>
                <span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-bold">
                    <i class="fas fa-check-circle me-1"></i>${item.status}
                </span>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-6">
                    <small class="text-muted d-block" style="font-size:0.68rem;">Gói dịch vụ</small>
                    <span class="fw-bold" style="color:var(--navy-dark);font-size:0.85rem;">${item.service}</span>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted d-block" style="font-size:0.68rem;">Chi phí</small>
                    <span class="fw-bold text-cyan" style="font-size:1rem;">${Number(item.price).toLocaleString()}đ</span>
                </div>
            </div>

            <div class="d-flex flex-wrap align-items-center justify-content-between pt-3 border-top gap-2">
                <span class="text-muted small" style="font-size:0.78rem;">
                    Điểm nhận được: <strong class="text-warning">+${item.points} PTS</strong>
                </span>
                ${item.surveyStatus === 'pending'
                    ? `<button class="app-btn-primary py-2 px-3 shadow-none border-0"
                               style="font-size:0.78rem;border-radius:10px;" onclick="openSurveyModal('${item.id}')">
                           <i class="fas fa-comment-alt me-1"></i> ĐÁNH GIÁ +50 PTS
                       </button>`
                    : `<div class="d-flex align-items-center gap-1 text-warning" style="font-size:0.82rem;">
                           <span class="text-muted me-1">Đánh giá:</span>
                           ${[1,2,3,4,5].map(s =>
                               `<i class="${s <= (item.rating || 5) ? 'fas' : 'far'} fa-star" style="color:#ffcf33;font-size:0.82rem;"></i>`
                           ).join('')}
                       </div>`
                }
            </div>
        </div>
    `).join('');
}

function renderStats() {
    const list = getHistory();
    const totalWash  = list.length;
    const totalSpent = list.reduce((s, i) => s + i.price, 0);
    const totalPts   = list.reduce((s, i) => s + i.points, 0);

    const washEl  = document.getElementById('stat-wash-count');
    const spentEl = document.getElementById('stat-total-spent');
    const ptsEl   = document.getElementById('stat-total-pts');

    if (washEl)  washEl.textContent  = totalWash + ' lần';
    if (spentEl) spentEl.textContent = totalSpent.toLocaleString() + 'đ';
    if (ptsEl)   ptsEl.textContent   = '+' + totalPts + ' PTS';
}

function loadActiveBooking() {
    const block     = document.getElementById('history-active-block');
    const activeStr = localStorage.getItem('active_booking');

    if (!activeStr || !block) {
        if (block) block.style.display = 'none';
        return;
    }

    try {
        const booking  = JSON.parse(activeStr);
        const washStep = Number(localStorage.getItem('wash_step') || 0);

        block.style.display = 'block';

        const plateEl    = document.getElementById('active-plate');
        const serviceEl  = document.getElementById('active-service');
        const badgeEl    = document.getElementById('active-step-badge');
        const timeEl     = document.getElementById('active-time');
        const tierBadge  = document.getElementById('active-tier-badge');

        if (plateEl)   plateEl.textContent   = booking.plate   || '—';
        if (serviceEl) serviceEl.textContent = booking.service || '—';
        if (badgeEl)   badgeEl.textContent   = STEP_BADGES[Math.min(washStep, 3)];
        if (timeEl)    timeEl.textContent    = booking.bookingTime || '—';
        if (tierBadge) tierBadge.textContent = (booking.tier || 'MEMBER') + ' PRIORITY';
    } catch (e) {
        if (block) block.style.display = 'none';
    }
}

// ── Survey Modal ─────────────────────────────────────────
function openSurveyModal(id) {
    surveyTargetId = id;
    surveyRating   = 5;
    surveyEmoji    = 5;
    surveyTags     = [];

    const backdrop = document.getElementById('survey-modal-backdrop');
    const form     = document.getElementById('survey-form-view');
    const success  = document.getElementById('survey-success-view');
    const textarea = document.getElementById('survey-review-text');

    if (!backdrop) return;

    if (form)     form.style.display    = 'block';
    if (success)  success.style.display = 'none';
    if (textarea) textarea.value = '';

    updateStarDisplay();
    updateEmojiDisplay();
    resetTagDisplay();

    backdrop.style.display = 'flex';
}

function closeSurveyModal() {
    const backdrop = document.getElementById('survey-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    surveyTargetId = null;
}

function setSurveyStars(n) {
    surveyRating = n;
    updateStarDisplay();
}

function updateStarDisplay() {
    document.querySelectorAll('.survey-star').forEach(el => {
        const val = Number(el.getAttribute('data-star'));
        el.style.color      = val <= surveyRating ? '#ffcf33' : '#cbd5e1';
        el.style.textShadow = val <= surveyRating ? '0 0 12px rgba(255,207,51,0.4)' : 'none';
        el.classList.toggle('fas', true);
    });
}

function setSurveyEmoji(n) {
    surveyEmoji = n;
    surveyRating = n;
    updateEmojiDisplay();
    updateStarDisplay();
}

function updateEmojiDisplay() {
    document.querySelectorAll('.survey-emoji-item').forEach(el => {
        const val = Number(el.getAttribute('data-val'));
        const emoji = el.querySelector('.survey-emoji');
        const label = el.querySelector('.survey-emoji-label');
        if (emoji) {
            emoji.style.transform = val === surveyEmoji ? 'scale(1.25)' : 'scale(1)';
            emoji.style.filter    = val === surveyEmoji ? 'none' : 'grayscale(60%)';
        }
        if (label) {
            label.style.color     = val === surveyEmoji ? 'var(--cyan-electric)' : '#94a3b8';
            label.style.fontWeight = val === surveyEmoji ? '700' : '400';
        }
    });
}

function toggleSurveyTag(el) {
    const tag = el.getAttribute('data-tag');
    if (surveyTags.includes(tag)) {
        surveyTags = surveyTags.filter(t => t !== tag);
        el.style.backgroundColor = '#f8fafc';
        el.style.color           = '#64748b';
        el.style.borderColor     = '#e2e8f0';
        el.style.boxShadow       = 'none';
    } else {
        surveyTags.push(tag);
        el.style.backgroundColor = 'var(--navy-dark)';
        el.style.color           = 'var(--cyan-electric)';
        el.style.borderColor     = 'var(--cyan-electric)';
        el.style.boxShadow       = 'var(--cyan-glow)';
    }
}

function resetTagDisplay() {
    document.querySelectorAll('.survey-tag').forEach(el => {
        el.style.backgroundColor = '#f8fafc';
        el.style.color           = '#64748b';
        el.style.borderColor     = '#e2e8f0';
        el.style.boxShadow       = 'none';
    });
}

function submitSurvey() {
    if (!surveyTargetId) return;

    const btn = document.getElementById('survey-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'ĐANG GỬI...'; }

    setTimeout(() => {
        // Award +50 pts
        const currentPts  = Number(localStorage.getItem('user_points') || 0);
        const updatedPts  = currentPts + 50;
        const tierInfo    = window.getTierInfo ? window.getTierInfo(updatedPts) : { tier: 'Gold Member', nextTier: 'Platinum', remaining: '250k' };

        localStorage.setItem('user_points', String(updatedPts));
        localStorage.setItem('user_tier',   tierInfo.tier);
        localStorage.setItem('user_next_tier',       tierInfo.nextTier || 'Platinum');
        localStorage.setItem('user_remaining_spend', tierInfo.remaining || '0');

        // Mark history item as rated
        const list = getHistory().map(item => {
            if (item.id === surveyTargetId) return { ...item, surveyStatus: 'rated', rating: surveyRating };
            return item;
        });
        localStorage.setItem('user_history_bookings', JSON.stringify(list));

        // Notification
        const notif = {
            id: 'notif_review_' + Date.now(),
            title: 'Nhận điểm đánh giá',
            body: 'Chúc mừng! Bạn đã nhận được +50 PTS điểm thưởng Smember nhờ gửi đánh giá phản hồi dịch vụ.',
            time: 'Vừa xong',
            type: 'points',
            read: false
        };
        const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
        localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifs]));

        window.dispatchEvent(new Event('storage'));

        // Show success view
        const form    = document.getElementById('survey-form-view');
        const success = document.getElementById('survey-success-view');
        if (form)    form.style.display    = 'none';
        if (success) success.style.display = 'block';

        loadHistoryData();
        renderStats();

        setTimeout(() => closeSurveyModal(), 2000);
    }, 1200);
}
