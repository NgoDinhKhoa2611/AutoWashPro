/**
 * admin-layout.js — Admin sidebar toggle and global utilities
 */

document.addEventListener('DOMContentLoaded', function () {
    const collapsed = localStorage.getItem('admin_sidebar_collapsed') === '1';
    if (collapsed) applySidebarCollapse(true);
});

function toggleAdminSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isNowCollapsed = !sidebar.classList.contains('collapsed');
    applySidebarCollapse(isNowCollapsed);
    localStorage.setItem('admin_sidebar_collapsed', isNowCollapsed ? '1' : '0');
}

function applySidebarCollapse(collapse) {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('admin-main');
    if (!sidebar) return;
    if (collapse) {
        sidebar.classList.add('collapsed');
        if (main) main.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
        if (main) main.classList.remove('collapsed');
    }
}

function handleAdminLogout() {
    if (window.showConfirm) {
        window.showConfirm('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi Admin Panel?', () => {
            localStorage.removeItem('user_role');
            window.dispatchEvent(new Event('storage'));
            if (window.showToast) showToast('Đăng xuất thành công!', 'success');
            setTimeout(() => { window.location.href = '/Account/Logout'; }, 800);
        });
    } else if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Admin Panel?')) {
        localStorage.removeItem('user_role');
        window.dispatchEvent(new Event('storage'));
        window.location.href = '/Account/Logout';
    }
}

