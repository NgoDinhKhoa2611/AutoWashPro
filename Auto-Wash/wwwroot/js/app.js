/**
 * app.js — AutoWash Pro Global Utilities
 * Toast notifications + Confirm modal system
 */

// ── Toast System ─────────────────────────────────────────
const TOAST_ICONS = {
    success: 'fa-check-circle',
    error:   'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle'
};

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const id = 'toast_' + Date.now();
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

    const el = document.createElement('div');
    el.className = `toast-item toast-${type}`;
    el.id = id;
    el.innerHTML = `
        <div class="toast-icon"><i class="fas ${icon}"></i></div>
        <div class="toast-body">${message}</div>
        <button class="toast-close" onclick="dismissToast('${id}')">&times;</button>
    `;

    container.appendChild(el);

    // Trigger entrance animation
    requestAnimationFrame(() => el.classList.add('show'));

    // Auto-dismiss after 3.5 s
    setTimeout(() => dismissToast(id), 3500);
};

window.dismissToast = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 400);
};

// ── Confirm Modal ────────────────────────────────────────
let _confirmCallback = null;

window.showConfirm = function(title, message, onConfirm) {
    _confirmCallback = onConfirm;

    const overlay = document.getElementById('confirm-modal-backdrop');
    if (!overlay) {
        // Fallback to native confirm
        if (window.confirm(message)) onConfirm && onConfirm();
        return;
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-body').textContent = message;

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
};

window.closeConfirmModal = function() {
    const overlay = document.getElementById('confirm-modal-backdrop');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
    _confirmCallback = null;
};

window.handleConfirmOk = function() {
    if (typeof _confirmCallback === 'function') _confirmCallback();
    window.closeConfirmModal();
};

// ── Helpers ──────────────────────────────────────────────
window.formatVND = function(amount) {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
};

window.getTierClass = function(tier) {
    const t = (tier || '').toLowerCase();
    if (t.includes('platinum')) return 'tier-pill-platinum active';
    if (t.includes('gold'))     return 'tier-pill-gold active';
    if (t.includes('silver'))   return 'tier-pill-silver active';
    return 'tier-pill-member active';
};

window.getTierInfo = function(pts) {
    if (pts >= 2000) return { tier: 'Platinum Member', nextTier: 'Diamond Ultimate', remaining: '0' };
    if (pts >= 1000) return { tier: 'Gold Member',     nextTier: 'Platinum',         remaining: '250k' };
    if (pts >= 500)  return { tier: 'Silver Member',   nextTier: 'Gold',             remaining: '800k' };
    return            { tier: 'Standard Member', nextTier: 'Silver',   remaining: '1.5M' };
};
