/**
 * admin-dashboard.js — Chart.js revenue + tier distribution charts
 */

let revenueChart = null;
let tierChart    = null;

document.addEventListener('DOMContentLoaded', function () {
    renderCharts();

    window.addEventListener('storage', function () {
        renderCharts();
    });
});

function getDynamicStats() {
    const activeBookingStr = localStorage.getItem('active_booking');
    const queueCount = activeBookingStr ? 4 : 3;
    const rev = Number(localStorage.getItem('admin_revenue') || 12500000);

    const userTier = (localStorage.getItem('user_tier') || 'Gold Member').toLowerCase();
    let plat = 1, gold = 0, silv = 1, memb = 0;

    if (userTier.includes('platinum'))    plat += 1;
    else if (userTier.includes('gold'))   gold += 1;
    else if (userTier.includes('silver')) silv += 1;
    else                                  memb += 1;

    return { queueCount, revenue: rev, tierCounts: { platinum: plat, gold, silver: silv, member: memb } };
}

function renderCharts() {
    const stats = getDynamicStats();
    const formattedRev = (stats.revenue / 1000000).toFixed(stats.revenue % 1000000 === 0 ? 1 : 2);

    // Update stat cards
    const revEl   = document.getElementById('stat-revenue');
    const queueEl = document.getElementById('stat-queue');
    if (revEl)   revEl.textContent   = '₫' + formattedRev + 'M';
    if (queueEl) queueEl.textContent = stats.queueCount;

    buildRevenueChart(stats);
    buildTierChart(stats);
}

function buildRevenueChart(stats) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;

    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }

    const dynamicLast = stats.revenue / 1000000;

    revenueChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Revenue (M ₫)',
                data: [5, 8, 10, 9, 11, 12, dynamicLast],
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#0ea5e9',
                borderWidth: 3
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { weight: '600' } } },
                x: { grid: { display: false } }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function buildTierChart(stats) {
    const canvas = document.getElementById('tier-chart');
    if (!canvas) return;

    if (tierChart) { tierChart.destroy(); tierChart = null; }

    tierChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Platinum', 'Gold', 'Silver', 'Member'],
            datasets: [{
                data: [
                    stats.tierCounts.platinum,
                    stats.tierCounts.gold,
                    stats.tierCounts.silver,
                    stats.tierCounts.member
                ],
                backgroundColor: ['#0ea5e9', '#ffcf33', '#94a3b8', '#cbd5e1'],
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 15
            }]
        },
        options: {
            animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true, font: { family: 'Inter', weight: 'bold', size: 11 } }
                },
                tooltip: { backgroundColor: '#0b1121', padding: 12, cornerRadius: 8, displayColors: false }
            },
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function handleExportReport() {
    if (window.showToast) showToast('Đang tổng hợp dữ liệu và xuất báo cáo PDF...', 'info');
    else alert('Đang tổng hợp dữ liệu và xuất báo cáo PDF...');
}
