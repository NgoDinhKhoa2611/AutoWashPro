/**
 * app.js — AutoWash Pro Global Utilities
 * Toast notifications + Confirm modal system
 */

// ── Storage Access Polyfill (Handling Tracking Prevention) ──
(function () {
    let storageAvailable = false;
    try {
        if (window.localStorage) {
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            storageAvailable = true;
        }
    } catch (e) {
        storageAvailable = false;
    }

    if (!storageAvailable) {
        console.warn('Storage access is blocked by Tracking Prevention or browser settings. Falling back to in-memory storage.');

        const createMockStorage = () => {
            const inMemoryStore = {};
            return {
                getItem: function (key) {
                    return key in inMemoryStore ? inMemoryStore[key] : null;
                },
                setItem: function (key, value) {
                    inMemoryStore[key] = String(value);
                },
                removeItem: function (key) {
                    delete inMemoryStore[key];
                },
                clear: function () {
                    for (const key in inMemoryStore) {
                        delete inMemoryStore[key];
                    }
                },
                key: function (index) {
                    const keys = Object.keys(inMemoryStore);
                    return keys[index] || null;
                },
                get length() {
                    return Object.keys(inMemoryStore).length;
                }
            };
        };

        try {
            Object.defineProperty(window, 'localStorage', {
                value: createMockStorage(),
                writable: true,
                configurable: true
            });
        } catch (e) {
            console.error('Failed to redefine localStorage:', e);
        }

        try {
            Object.defineProperty(window, 'sessionStorage', {
                value: createMockStorage(),
                writable: true,
                configurable: true
            });
        } catch (e) {
            console.error('Failed to redefine sessionStorage:', e);
        }
    }
})();

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
    el.className = `toast-item toast-${type} animate-toast-in`;
    el.id = id;
    el.innerHTML = `
        <div class="toast-icon"><i class="fas ${icon}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close-btn" onclick="dismissToast('${id}')"><i class="fas fa-times"></i></button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(el);
    setTimeout(() => dismissToast(id), 3500);
};

window.dismissToast = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('animate-toast-in');
    el.classList.add('animate-toast-out');
    setTimeout(() => el.remove(), 350);
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

    const okBtn = document.getElementById('confirm-ok-btn');
    if (okBtn) {
        okBtn.onclick = window.handleConfirmOk;
    }

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

window.closeConfirm = function() {
    window.closeConfirmModal();
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

