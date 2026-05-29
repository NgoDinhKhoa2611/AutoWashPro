/**
 * customer-layout.js — CustomerLayout sidebar, notifications, profile dropdown
 */

document.addEventListener('DOMContentLoaded', function () {
    syncLayoutFromStorage();
    loadNotifWidget();

    // Re-sync when storage changes from other tabs
    window.addEventListener('storage', function () {
        syncLayoutFromStorage();
        loadNotifWidget();
    });
});

// ── Sidebar toggle ───────────────────────────────────────
function toggleSidebar() {
    const sidebar  = document.getElementById('customer-sidebar');
    const main     = document.getElementById('customer-main');
    const overlay  = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth < 992;

    if (isMobile) {
        sidebar.classList.toggle('show-sidebar');
        if (overlay) overlay.classList.toggle('d-none');
    } else {
        sidebar.classList.toggle('collapsed');
        if (main) main.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    }
}

function closeSidebarOverlay() {
    const sidebar = document.getElementById('customer-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('show-sidebar');
    if (overlay) overlay.classList.add('d-none');
}

// Restore collapsed state on desktop
(function () {
    const sidebar = document.getElementById('customer-sidebar');
    const main    = document.getElementById('customer-main');
    if (window.innerWidth >= 992 && localStorage.getItem('sidebar_collapsed') === '1') {
        if (sidebar) sidebar.classList.add('collapsed');
        if (main)    main.classList.add('collapsed');
    }
})();

// ── Sync header from localStorage ────────────────────────
function syncLayoutFromStorage() {
    // Auto-migration to ensure user is Gold Member for premium testing
    let tier = localStorage.getItem('user_tier');
    if (!tier || tier === 'Standard Member' || tier === 'Member') {
        tier = 'Gold Member';
        localStorage.setItem('user_tier', 'Gold Member');
        localStorage.setItem('user_points', '550');
        localStorage.setItem('user_next_tier', 'Platinum');
        localStorage.setItem('user_remaining_spend', '250k');
        window.dispatchEvent(new Event('storage'));
    }

    const name   = localStorage.getItem('user_display_name') || 'Người dùng';
    const avatar = localStorage.getItem('user_avatar')       || '';
    const points = localStorage.getItem('user_points')       || '0';

    const nameEl   = document.getElementById('header-user-name');
    const tierEl   = document.getElementById('header-user-tier');
    const avatarEl = document.getElementById('header-user-avatar');
    const ptsEl    = document.getElementById('header-user-points');
    const dropdownNameEl = document.getElementById('dropdown-user-name');

    if (nameEl)   nameEl.textContent   = name;
    if (dropdownNameEl) dropdownNameEl.textContent = name;
    if (tierEl)   tierEl.textContent   = tier;
    if (ptsEl)    ptsEl.textContent    = Number(points).toLocaleString() + ' PTS';
    if (avatarEl && avatar) avatarEl.src = avatar;
}

// ── Notification dropdown ────────────────────────────────
function toggleNotifDropdown() {
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) dd.classList.add('show');
}

function toggleProfileDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) dd.classList.add('show');
}

function closeAllDropdowns() {
    document.querySelectorAll('.notif-dropdown, .profile-dropdown-menu').forEach(d => d.classList.remove('show'));
}

document.addEventListener('click', function (e) {
    const notifTrigger   = document.getElementById('notif-trigger');
    const profileTrigger = document.getElementById('profile-trigger');

    if (!notifTrigger?.contains(e.target) && !profileTrigger?.contains(e.target)) {
        closeAllDropdowns();
    }
});

function loadNotifWidget() {
    const saved = localStorage.getItem('user_notifications');
    let list = [];
    if (saved) {
        try { list = JSON.parse(saved); } catch (e) {}
    }

    const badge = document.getElementById('notif-badge');
    const container = document.getElementById('notif-list');
    if (!container) return;

    const unread = list.filter(n => !n.read).length;
    if (badge) {
        badge.style.display = unread > 0 ? 'flex' : 'none';
        badge.textContent = unread > 9 ? '9+' : unread;
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="px-3 py-3 text-muted small text-center">Không có thông báo nào</div>';
        return;
    }

    const typeIcons = { points: 'fa-coins text-warning', status: 'fa-car-side text-cyan', info: 'fa-info-circle text-info' };

    container.innerHTML = list.slice(0, 8).map(n => `
        <div class="d-flex align-items-start px-3 py-2 border-bottom notif-item ${n.read ? '' : 'notif-unread'}"
             onclick="markNotifRead('${n.id}')">
            <i class="fas ${typeIcons[n.type] || 'fa-bell text-muted'} me-2 mt-1 fs-7"></i>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-bold small text-truncate" style="color:var(--navy-dark);font-size:0.78rem;">${n.title}</div>
                <div class="text-muted" style="font-size:0.72rem;line-height:1.3;">${n.body}</div>
                <div class="text-muted mt-1" style="font-size:0.65rem;">${n.time}</div>
            </div>
        </div>
    `).join('');
}

function markNotifRead(id) {
    const saved = localStorage.getItem('user_notifications');
    if (!saved) return;
    try {
        const list = JSON.parse(saved).map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem('user_notifications', JSON.stringify(list));
        loadNotifWidget();
    } catch (e) {}
}

function markAllRead() {
    const saved = localStorage.getItem('user_notifications');
    if (!saved) return;
    try {
        const list = JSON.parse(saved).map(n => ({ ...n, read: true }));
        localStorage.setItem('user_notifications', JSON.stringify(list));
        loadNotifWidget();
        if (window.showToast) showToast('Đã đánh dấu tất cả là đã đọc', 'success');
    } catch (e) {}
}

function handleLogoutFromLayout() {
    if (window.showConfirm) {
        window.showConfirm('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi AutoWash Pro?', () => {
            localStorage.removeItem('user_role');
            window.dispatchEvent(new Event('storage'));
            if (window.showToast) showToast('Đăng xuất thành công!', 'success');
            setTimeout(() => { window.location.href = '/'; }, 800);
        });
    } else {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            localStorage.removeItem('user_role');
            window.location.href = '/';
        }
    }
}
