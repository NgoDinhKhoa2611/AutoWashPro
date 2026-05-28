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
