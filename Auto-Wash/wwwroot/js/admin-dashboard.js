/**
 * admin-dashboard.js — Dashboard charts, stats, loyalty config, tier review
 */

let revenueChart = null;
let tierChart    = null;
let _tiersCache  = [];

document.addEventListener('DOMContentLoaded', function () {
    fetchAndRenderDashboard();
    fetchLoyaltyConfig();
    fetchTierReview();
});

// ── Stats & Charts ────────────────────────────────────────

async function fetchAndRenderDashboard() {
    try {
        const res = await fetch('/Admin/DashboardStats');
        if (!res.ok) {
            if (res.status === 401) showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.', 'warning');
            else if (res.status === 404) showToast('API chưa sẵn sàng — hãy restart app.', 'error');
            else showToast('Lỗi tải dữ liệu dashboard (' + res.status + ').', 'error');
            return;
        }
        const stats = await res.json();
        updateStatCards(stats);
        buildRevenueChart(stats);
        buildTierChart(stats);
    } catch (err) {
        console.error('Dashboard stats error:', err);
        showToast('Không thể kết nối server.', 'error');
    }
}

function updateStatCards(stats) {
    const rev   = stats.totalRevenue || 0;
    const prev  = stats.prevTotalRevenue || 0;
    const queue = stats.activeQueue ?? 0;
    const mins  = stats.avgMinutes || 0;
    const stars = stats.avgStars || 0;

    // Revenue
    const revEl = document.getElementById('stat-revenue');
    if (revEl) revEl.textContent = rev === 0 ? '₫0' : '₫' + (rev / 1000000).toFixed(1) + 'M';

    // Revenue % change vs previous 7 days
    const changeEl = document.getElementById('stat-revenue-change');
    if (changeEl) {
        if (prev === 0) {
            changeEl.className = 'small fw-bold text-muted';
            changeEl.innerHTML = 'Mới';
        } else {
            const pct = ((rev - prev) / prev * 100).toFixed(1);
            const up  = rev >= prev;
            changeEl.className = `small fw-bold ${up ? 'text-success' : 'text-danger'}`;
            changeEl.innerHTML  = `<i class="fas fa-caret-${up ? 'up' : 'down'} me-1"></i>${Math.abs(pct)}%`;
        }
    }

    // Active Queue
    const queueEl = document.getElementById('stat-queue');
    if (queueEl) queueEl.textContent = queue;

    // AVG. TIME
    const timeEl = document.getElementById('stat-avgtime');
    if (timeEl) timeEl.textContent = mins > 0 ? mins + 'm' : '—';

    const timeLblEl = document.getElementById('stat-avgtime-label');
    if (timeLblEl) {
        if (mins === 0) {
            timeLblEl.className = 'small fw-bold text-muted';
            timeLblEl.textContent = 'Chưa có dữ liệu';
        } else if (mins < 20) {
            timeLblEl.className = 'small fw-bold text-success';
            timeLblEl.innerHTML = '<i class="fas fa-bolt me-1"></i>Rất nhanh';
        } else if (mins < 30) {
            timeLblEl.className = 'small fw-bold text-success';
            timeLblEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Optimal';
        } else if (mins < 45) {
            timeLblEl.className = 'small fw-bold text-warning';
            timeLblEl.textContent = 'Bình thường';
        } else {
            timeLblEl.className = 'small fw-bold text-danger';
            timeLblEl.textContent = 'Cần cải thiện';
        }
    }

    // RATING
    const ratingEl = document.getElementById('stat-rating');
    if (ratingEl) ratingEl.textContent = stars > 0 ? stars.toFixed(1) + '/5' : '—';

    const starsEl = document.getElementById('stat-rating-stars');
    if (starsEl) {
        if (stars === 0) {
            starsEl.innerHTML = '<span class="text-muted small">Chưa có đánh giá</span>';
        } else {
            let html = '';
            for (let i = 1; i <= 5; i++) {
                if (stars >= i)          html += '<i class="fas fa-star"></i>';
                else if (stars >= i - 0.5) html += '<i class="fas fa-star-half-alt"></i>';
                else                      html += '<i class="far fa-star"></i>';
            }
            starsEl.innerHTML = html;
        }
    }
}

function showChartEmpty(canvas, icon, message) {
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.style.display = 'none';
    if (parent.querySelector('.chart-empty-state')) return;
    const el = document.createElement('div');
    el.className = 'chart-empty-state d-flex flex-column align-items-center justify-content-center';
    el.style.cssText = 'position:absolute;inset:0;color:#cbd5e1;gap:8px;pointer-events:none;';
    el.innerHTML = `<i class="${icon}" style="font-size:2.5rem;opacity:0.5;"></i>`
                 + `<span style="font-size:0.8rem;font-weight:600;">${message}</span>`;
    parent.appendChild(el);
}

function buildRevenueChart(stats) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }

    const data    = (stats.revenue7Days || []).map(v => +(v / 1000000).toFixed(2));
    const hasData = data.some(v => v > 0);

    if (!hasData) {
        showChartEmpty(canvas, 'fas fa-chart-line', 'Chưa có doanh thu 7 ngày qua');
        return;
    }

    revenueChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: stats.dayLabels || ['T2','T3','T4','T5','T6','T7','CN'],
            datasets: [{
                label: 'Revenue (M ₫)',
                data,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14,165,233,0.1)',
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

    const d    = stats.tierDistribution || {};
    const plat = d.Platinum || 0, gold = d.Gold || 0, silv = d.Silver || 0, memb = d.Member || 0;

    if (plat + gold + silv + memb === 0) {
        showChartEmpty(canvas, 'fas fa-users', 'Chưa có dữ liệu khách hàng');
        return;
    }

    tierChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Platinum', 'Gold', 'Silver', 'Member'],
            datasets: [{
                data: [plat, gold, silv, memb],
                backgroundColor: ['#0ea5e9', '#ffcf33', '#94a3b8', '#cbd5e1'],
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 15
            }]
        },
        options: {
            animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { family: 'Inter', weight: 'bold', size: 11 } } },
                tooltip: { backgroundColor: '#0b1121', padding: 12, cornerRadius: 8, displayColors: false }
            },
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ── Loyalty Config ────────────────────────────────────────

async function fetchLoyaltyConfig() {
    try {
        const res = await fetch('/Admin/GetLoyaltyConfig');
        if (!res.ok) return;
        const data = await res.json();

        _tiersCache = data.tiers || [];

        // Base config fields
        setVal('cfg-point-rate',     data.pointsPerThousandVND);
        setVal('cfg-expiry-months',  data.pointExpiryMonths);
        setVal('cfg-tier-review-day', data.tierReviewDayOfMonth);
        setVal('cfg-ranking-window',  data.rankingWindowYears);

        // Per-tier fields — populate inputs + update threshold labels from DB
        _tiersCache.forEach(t => {
            const n = t.tierName.toLowerCase();
            if (n.includes('silver')) {
                setVal('cfg-silver-mult',     t.pointMultiplier);
                setVal('cfg-silver-discount', t.discountPercent);
                setVal('cfg-silver-days',     t.bookingWindowDays);
                setThresholdLabel('lbl-silver-threshold', t.minRankingBalance);
            } else if (n.includes('gold')) {
                setVal('cfg-gold-mult',     t.pointMultiplier);
                setVal('cfg-gold-discount', t.discountPercent);
                setVal('cfg-gold-days',     t.bookingWindowDays);
                setThresholdLabel('lbl-gold-threshold', t.minRankingBalance);
            } else if (n.includes('platinum') || n.includes('plat')) {
                setVal('cfg-plat-mult',     t.pointMultiplier);
                setVal('cfg-plat-discount', t.discountPercent);
                setVal('cfg-plat-days',     t.bookingWindowDays);
                setThresholdLabel('lbl-plat-threshold', t.minRankingBalance);
            } else {
                // Member tier
                setVal('cfg-member-days', t.bookingWindowDays);
                setThresholdLabel('lbl-member-threshold', t.minRankingBalance, 'Mặc định');
            }
        });
    } catch (err) {
        console.error('Failed to load loyalty config:', err);
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
}

function setThresholdLabel(id, minVnd, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (minVnd > 0)
        ? `≥ ${minVnd.toLocaleString('vi-VN')} VNĐ`
        : (fallback || 'Mặc định');
}

async function handleSaveLoyaltyConfig() {
    if (_tiersCache.length === 0) {
        showToast('Chưa tải được cấu hình tier từ server!', 'warning');
        return;
    }

    const tierUpdates = _tiersCache.map(t => {
        const n        = t.tierName.toLowerCase();
        let mult     = t.pointMultiplier;
        let discount = t.discountPercent;
        let days     = t.bookingWindowDays;

        if (n.includes('silver')) {
            mult     = +document.getElementById('cfg-silver-mult')?.value     || mult;
            discount = +document.getElementById('cfg-silver-discount')?.value || 0;
            days     = +document.getElementById('cfg-silver-days')?.value     || days;
        } else if (n.includes('gold')) {
            mult     = +document.getElementById('cfg-gold-mult')?.value     || mult;
            discount = +document.getElementById('cfg-gold-discount')?.value || 0;
            days     = +document.getElementById('cfg-gold-days')?.value     || days;
        } else if (n.includes('platinum') || n.includes('plat')) {
            mult     = +document.getElementById('cfg-plat-mult')?.value     || mult;
            discount = +document.getElementById('cfg-plat-discount')?.value || 0;
            days     = +document.getElementById('cfg-plat-days')?.value     || days;
        } else {
            days = +document.getElementById('cfg-member-days')?.value || days;
        }

        return { tierId: t.tierId, pointMultiplier: mult, discountPercent: discount, bookingWindowDays: days };
    });

    try {
        const res = await fetch('/Admin/SaveLoyaltyConfig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pointsPerThousandVND:  +document.getElementById('cfg-point-rate')?.value     || 1,
                pointExpiryMonths:     +document.getElementById('cfg-expiry-months')?.value  || 12,
                tierReviewDayOfMonth:  +document.getElementById('cfg-tier-review-day')?.value || 1,
                rankingWindowYears:    +document.getElementById('cfg-ranking-window')?.value  || 2,
                tierUpdates
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Đã lưu cấu hình quy chế tích điểm và đặc quyền hạng VIP thành công!', 'success');
        } else {
            showToast(result.message || 'Lưu cấu hình thất bại!', 'error');
        }
    } catch {
        showToast('Không thể kết nối server!', 'error');
    }
}

// ── Tier Review ───────────────────────────────────────────
// Xếp hạng theo RankingBalance (cửa sổ trượt N năm) vs Tier.MinRankingBalance

async function fetchTierReview() {
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + 1, 1);
    const dateEl = document.getElementById('next-review-date');
    if (dateEl) dateEl.textContent = nextReview.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    try {
        const res = await fetch('/Admin/TierReview');
        if (!res.ok) return;
        renderTierReview(await res.json());
    } catch (err) {
        console.error('Failed to load tier review:', err);
    }
}

function renderTierReview(reviews) {
    const tierBadge = {
        Member:   '<span class="badge tier-badge tier-badge-member">MEMBER</span>',
        Silver:   '<span class="badge tier-badge tier-badge-silver">SILVER</span>',
        Gold:     '<span class="badge tier-badge tier-badge-gold">GOLD</span>',
        Platinum: '<span class="badge tier-badge tier-badge-platinum">PLATINUM</span>',
    };
    const getBadge = name => {
        const key = Object.keys(tierBadge).find(k => name.includes(k));
        return key ? tierBadge[key] : `<span class="badge bg-secondary">${name}</span>`;
    };
    const changeBadge = (dir, label) =>
        dir === 'up'   ? `<span class="tier-change-badge tier-change-up"><i class="fas fa-arrow-up me-1"></i>${label}</span>`
      : dir === 'down' ? `<span class="tier-change-badge tier-change-down"><i class="fas fa-arrow-down me-1"></i>${label}</span>`
      :                  `<span class="tier-change-badge tier-change-stable">Giữ nguyên</span>`;

    const tbody = document.getElementById('tier-review-tbody');
    if (!tbody) return;

    if (!reviews || reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4 small">Không có thay đổi hạng nào trong kỳ review này.</td></tr>';
        return;
    }

    tbody.innerHTML = reviews.map(r => `
        <tr>
            <td class="ps-3 py-3 fw-bold" style="color:var(--navy-dark);">${r.name}</td>
            <td>${getBadge(r.currentTier)}</td>
            <td class="fw-bold">${(r.rankingBalance || 0).toLocaleString('vi-VN')} <span class="text-muted fw-normal">VNĐ</span></td>
            <td>${changeBadge(r.direction, r.predictedTier)}</td>
            <td class="pe-3 text-muted small">${r.reason}</td>
        </tr>`).join('');
}

async function handleRunReview() {
    const btn = document.querySelector('[onclick="handleRunReview()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang xử lý...';
    }

    try {
        const res = await fetch('/Admin/RunTierReview', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            const total = (data.upgrades || 0) + (data.downgrades || 0);
            if (total === 0) {
                showToast('Monthly Review hoàn tất — không có thay đổi hạng nào.', 'info');
            } else {
                const parts = [];
                if (data.upgrades > 0)   parts.push(`<strong>${data.upgrades}</strong> nâng hạng`);
                if (data.downgrades > 0) parts.push(`<strong>${data.downgrades}</strong> hạ hạng`);
                showToast(`Review hoàn tất: ${parts.join(', ')}.`, 'success');
            }
            await fetchTierReview();
        } else {
            showToast(data.message || 'Chạy review thất bại!', 'error');
        }
    } catch {
        showToast('Không thể kết nối server!', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play me-1"></i> CHẠY REVIEW THỦ CÔNG';
        }
    }
}

function handleExportReport() {
    if (window.showToast) showToast('Đang tổng hợp dữ liệu và xuất báo cáo PDF...', 'info');
}
