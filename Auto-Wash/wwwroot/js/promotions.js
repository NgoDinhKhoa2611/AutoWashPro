/**
 * promotions.js — Admin Campaign / Promotions Management
 */

let campaigns = [];

document.addEventListener('DOMContentLoaded', function () {
    loadCampaigns();
    window.addEventListener('storage', loadCampaigns);
});

function loadCampaigns() {
    const saved = localStorage.getItem('app_promotions');
    if (saved) {
        try {
            campaigns = JSON.parse(saved);
            renderCampaigns();
            return;
        } catch (e) {}
    }
    campaigns = [
        {
            id: 'promo_01',
            name: 'Chào hè rực rỡ 2026',
            description: 'Giảm 20% cho tất cả khách hàng hạng Platinum khi đặt lịch vào khung giờ vàng (11:00 - 14:00).',
            status: 'Active',
            target: 'Platinum',
            redemptions: 145,
            maxRedemptions: 500
        },
        {
            id: 'promo_02',
            name: 'Tết Nguyên Đán 2026',
            description: 'Tặng 100 điểm thưởng cho mọi lượt rửa xe từ 25 Tết đến mùng 5 Tết.',
            status: 'Expired',
            target: 'All Customers',
            redemptions: 320,
            maxRedemptions: 320
        }
    ];
    localStorage.setItem('app_promotions', JSON.stringify(campaigns));
    renderCampaigns();
}

function renderCampaigns() {
    const grid = document.getElementById('campaigns-grid');
    if (!grid) return;

    if (campaigns.length === 0) {
        grid.innerHTML = `
            <div class="col-12">
                <div class="app-card border-0 shadow-sm p-5 text-center text-muted" style="border-radius:24px;">
                    <i class="fas fa-bullhorn fa-3x mb-3 opacity-25"></i>
                    <h5 class="fw-bold" style="color:var(--navy-dark);">Chưa có chiến dịch nào</h5>
                    <p class="text-muted small mb-0">Tạo chiến dịch đầu tiên bằng cách nhấn "NEW CAMPAIGN".</p>
                </div>
            </div>`;
        return;
    }

    grid.innerHTML = campaigns.map((c, i) => {
        const pct      = Math.min(100, c.maxRedemptions > 0 ? Math.floor((c.redemptions / c.maxRedemptions) * 100) : 0);
        const isActive  = c.status === 'Active';
        const isExpired = c.status === 'Expired';
        const isStopped = c.status === 'Stopped';

        const statusBadge = isActive
            ? 'bg-success bg-opacity-10 text-success'
            : isExpired
            ? 'bg-secondary bg-opacity-10 text-secondary'
            : 'bg-danger bg-opacity-10 text-danger';

        return `
        <div class="col-md-6 animate-up" style="animation-delay:${0.1 * (i + 1)}s;">
            <div class="app-card border-0 shadow-sm p-4 ${!isActive ? 'opacity-75' : ''}">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="fw-bold mb-1" style="color:var(--navy-dark);">${c.name}</h6>
                        <span class="badge ${statusBadge} rounded-pill px-3" style="font-size:0.7rem;">${c.status}</span>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-light btn-sm rounded-circle shadow-sm" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu border-0 shadow-sm">
                            ${isActive  ? `<li><a class="dropdown-item fw-medium small" href="javascript:void(0)" onclick="toggleCampaignStatus('${c.id}')"><i class="fas fa-pause me-2 text-warning"></i>Tạm dừng</a></li>` : ''}
                            ${isStopped ? `<li><a class="dropdown-item fw-medium small" href="javascript:void(0)" onclick="toggleCampaignStatus('${c.id}')"><i class="fas fa-play me-2 text-success"></i>Kích hoạt</a></li>` : ''}
                            <li><a class="dropdown-item fw-medium text-danger small" href="javascript:void(0)" onclick="deleteCampaign('${c.id}')"><i class="fas fa-trash-alt me-2"></i>Xoá bỏ</a></li>
                        </ul>
                    </div>
                </div>
                <p class="small text-muted mb-4">${c.description}</p>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="bg-light p-2 rounded-3 text-center">
                            <small class="text-muted d-block mb-1" style="font-size:0.6rem;font-weight:700;">TARGET TIER</small>
                            <span class="fw-bold small" style="color:var(--navy-dark);">${c.target}</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="bg-light p-2 rounded-3 text-center">
                            <small class="text-muted d-block mb-1" style="font-size:0.6rem;font-weight:700;">REDEMPTIONS</small>
                            <span class="fw-bold small" style="color:var(--navy-dark);">${c.redemptions}/${c.maxRedemptions}</span>
                        </div>
                    </div>
                </div>
                <div class="progress bg-light" style="height:6px;border-radius:10px;">
                    <div class="progress-bar" style="width:${pct}%;background:${isActive ? 'var(--cyan-electric)' : '#94a3b8'};${isActive ? 'box-shadow:var(--cyan-glow);' : ''}"></div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Actions ──────────────────────────────────────────────
function launchCampaign() {
    const name  = (document.getElementById('promo-name') || {}).value || '';
    const target = (document.getElementById('promo-target') || {}).value || 'All Customers';
    const maxR  = Number((document.getElementById('promo-max') || {}).value || 500);
    const desc  = (document.getElementById('promo-desc') || {}).value || '';

    if (!name.trim()) { showToast('Vui lòng nhập tên chiến dịch!', 'warning'); return; }

    const newPromo = {
        id: 'promo_' + Date.now(),
        name: name.trim(),
        description: desc.trim() || 'Ưu đãi đặc biệt từ hệ thống AutoWash Pro.',
        status: 'Active',
        target,
        redemptions: 0,
        maxRedemptions: maxR
    };

    campaigns = [newPromo, ...campaigns];
    localStorage.setItem('app_promotions', JSON.stringify(campaigns));
    window.dispatchEvent(new Event('storage'));
    renderCampaigns();

    // Reset form
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('promo-name', ''); setV('promo-target', 'All Customers'); setV('promo-max', '500'); setV('promo-desc', '');

    showToast('Phát hành chiến dịch khuyến mãi mới thành công!', 'success');
}

function toggleCampaignStatus(id) {
    campaigns = campaigns.map(c => {
        if (c.id !== id) return c;
        return { ...c, status: c.status === 'Active' ? 'Stopped' : 'Active' };
    });
    localStorage.setItem('app_promotions', JSON.stringify(campaigns));
    window.dispatchEvent(new Event('storage'));
    renderCampaigns();
}

function deleteCampaign(id) {
    window.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xoá chiến dịch này?', () => {
        campaigns = campaigns.filter(c => c.id !== id);
        localStorage.setItem('app_promotions', JSON.stringify(campaigns));
        window.dispatchEvent(new Event('storage'));
        renderCampaigns();
        showToast('Đã xoá chiến dịch thành công!', 'success');
    });
}
