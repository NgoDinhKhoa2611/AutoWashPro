/**
 * profile.js — Profile form, avatar presets, vehicle management, settings
 */

const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200'
];

let editAvatar = '';

document.addEventListener('DOMContentLoaded', function () {
    loadProfileData();
    renderVehicles();

    window.addEventListener('storage', function () {
        loadProfileData();
        renderVehicles();
    });
});

// ── Load profile data ────────────────────────────────────
function loadProfileData() {
    const name   = localStorage.getItem('user_display_name') || 'Lê Tuấn Kiệt';
    const phone  = localStorage.getItem('user_phone')        || '0901234567';
    const tier   = localStorage.getItem('user_tier')         || 'Gold Member';
    const avatar = localStorage.getItem('user_avatar')       || AVATAR_PRESETS[0];
    const points = Number(localStorage.getItem('user_points') || 1250);

    editAvatar = avatar;

    // Header display
    setEl('profile-name-display',   name);
    setEl('profile-phone-display',  phone);
    setEl('profile-points-display', points.toLocaleString() + ' <span style="font-size:1rem;font-weight:bold;">PTS</span>', true);

    const tierBadge = document.getElementById('profile-tier-badge');
    if (tierBadge) {
        tierBadge.textContent = tier;
        tierBadge.className   = 'badge fw-bold px-2 py-1 profile-tier-badge ' + getTierBgClass(tier);
    }

    const avatarImg = document.getElementById('profile-avatar-img');
    if (avatarImg) avatarImg.src = avatar;

    // Form inputs
    setVal('edit-name',  name);
    setVal('edit-phone', phone);

    renderAvatarPresets();
}

function getTierBgClass(tier) {
    const t = (tier || '').toLowerCase();
    if (t.includes('platinum')) return 'bg-info text-navy border-0';
    if (t.includes('gold'))     return 'bg-warning text-navy border-0';
    if (t.includes('silver'))   return 'bg-secondary text-white border-0';
    return 'bg-light text-dark border';
}

// ── Avatar presets ───────────────────────────────────────
function renderAvatarPresets() {
    const row = document.getElementById('avatar-presets-row');
    if (!row) return;

    row.innerHTML = AVATAR_PRESETS.map((url, i) => `
        <div class="position-relative" style="cursor:pointer;" onclick="selectAvatar('${url}')">
            <img src="${url}" alt="Preset ${i+1}" class="rounded-circle border"
                 style="width:56px;height:56px;object-fit:cover;
                        border-color:${editAvatar === url ? 'var(--cyan-electric)' : '#cbd5e1'} !important;
                        border-width:${editAvatar === url ? '3px' : '1px'} !important;
                        box-shadow:${editAvatar === url ? 'var(--cyan-glow)' : 'none'};
                        transition:all 0.2s ease;" />
            ${editAvatar === url
                ? `<span class="position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                         style="width:18px;height:18px;background:var(--cyan-electric);border:1px solid white;font-size:0.55rem;color:var(--navy-dark);">
                       <i class="fas fa-check"></i>
                   </span>`
                : ''}
        </div>
    `).join('');
}

function selectAvatar(url) {
    editAvatar = url;
    renderAvatarPresets();
}

// ── Save profile ─────────────────────────────────────────
function handleSaveProfile(e) {
    e.preventDefault();
    const name  = getVal('edit-name').trim();
    const phone = getVal('edit-phone').trim();

    if (!name)  { showToast('Họ và tên không được bỏ trống!', 'warning'); return; }
    if (!phone) { showToast('Số điện thoại không được bỏ trống!', 'warning'); return; }

    localStorage.setItem('user_display_name', name);
    localStorage.setItem('user_phone', phone);
    localStorage.setItem('user_avatar', editAvatar);
    window.dispatchEvent(new Event('storage'));
    showToast('Đã cập nhật hồ sơ cá nhân thành công!', 'success');
    loadProfileData();
}

// ── Save password ─────────────────────────────────────────
function handleSavePassword(e) {
    e.preventDefault();
    const newPwd  = getVal('new-password');
    const confPwd = getVal('confirm-password');

    if (!newPwd) { showToast('Vui lòng nhập mật khẩu mới!', 'warning'); return; }
    if (newPwd !== confPwd) { showToast('Xác nhận mật khẩu mới không trùng khớp!', 'error'); return; }
    if (newPwd.length < 6)  { showToast('Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');  return; }

    showToast('Đã thay đổi mật khẩu bảo mật thành công!', 'success');
    setVal('new-password', '');
    setVal('confirm-password', '');
}

// ── Vehicles ─────────────────────────────────────────────
function getVehicles() {
    try {
        const saved = localStorage.getItem('user_vehicles');
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    const initial = [
        { plate: '51G - 123.45', type: 'Honda Vision' },
        { plate: '51A - 999.99', type: 'SH Mode' }
    ];
    localStorage.setItem('user_vehicles', JSON.stringify(initial));
    return initial;
}

function renderVehicles() {
    const vehicles  = getVehicles();
    const grid      = document.getElementById('vehicles-grid');
    const emptyDiv  = document.getElementById('vehicles-empty');
    if (!grid) return;

    if (vehicles.length === 0) {
        grid.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'block';
        return;
    }
    if (emptyDiv) emptyDiv.style.display = 'none';

    grid.innerHTML = vehicles.map(v => `
        <div class="garage-card">
            <div class="app-card border-0 p-3 position-relative h-100" style="border-radius:20px;min-height:145px;">
                <button class="btn btn-link text-muted p-0 position-absolute" style="top:12px;right:12px;z-index:10;"
                        onclick="handleDeleteVehicle('${v.plate.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash-alt text-danger" style="font-size:0.85rem;"></i>
                </button>
                <div class="d-flex flex-column justify-content-between h-100">
                    <div class="d-flex align-items-center gap-2.5 mb-2">
                        <div class="p-2 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                             style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);width:36px;height:36px;">
                            <i class="fas fa-motorcycle text-cyan"></i>
                        </div>
                        <div>
                            <small class="text-muted d-block fw-bold" style="font-size:0.6rem;letter-spacing:0.5px;">DÒNG XE</small>
                            <div class="fw-bold text-truncate text-white" style="font-size:0.8rem;max-width:140px;">${v.type}</div>
                        </div>
                    </div>
                    <!-- Biển số thiết kế 3D phát sáng cực xịn -->
                    <div class="text-center py-1.5 px-3 border border-2 rounded-3 d-flex flex-column align-items-center bg-white"
                         style="border-color:#00f2fe !important;font-family:'Consolas','Courier New',monospace;box-shadow:0 0 12px rgba(0, 242, 254, 0.15);">
                        <div class="w-100 border-bottom text-center text-muted" style="font-size:0.5rem;letter-spacing:1px;font-weight:700;color:#64748b!important;line-height:1.2;">VIỆT NAM</div>
                        <div class="fw-black py-0.5 text-dark" style="font-size:1.15rem;letter-spacing:1px;line-height:1.2;">${v.plate}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function handleDeleteVehicle(plate) {
    const confirmFn = () => {
        const updated = getVehicles().filter(v => v.plate !== plate);
        localStorage.setItem('user_vehicles', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        showToast('Đã xoá phương tiện thành công!', 'success');
        renderVehicles();
    };

    if (window.showConfirm) {
        window.showConfirm('Xoá phương tiện', `Bạn có chắc chắn muốn xoá xe ${plate}?`, confirmFn);
    } else if (confirm(`Bạn có chắc chắn muốn xoá xe ${plate}?`)) {
        confirmFn();
    }
}

function handleAddVehicle() {
    const plate = getVal('new-plate').trim().toUpperCase();
    const type  = getVal('new-type');

    if (!plate) { showToast('Vui lòng nhập biển số xe!', 'warning'); return; }

    const vehicles = getVehicles();
    if (vehicles.some(v => v.plate.toUpperCase() === plate)) {
        showToast('Biển số xe này đã tồn tại!', 'error');
        return;
    }

    const updated = [...vehicles, { plate, type }];
    localStorage.setItem('user_vehicles', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    setVal('new-plate', '');
    showToast('Đã đăng ký thêm xe mới thành công!', 'success');
    renderVehicles();

    // Close Bootstrap modal
    const closeBtn = document.querySelector('#addVehicleModal [data-bs-dismiss="modal"]');
    if (closeBtn) closeBtn.click();
}

// ── Settings ─────────────────────────────────────────────
function handleNotifToggle() {
    showToast('Đã cập nhật cài đặt thông báo!', 'success');
}

function handleSupport() {
    showToast('Kết nối với trung tâm hỗ trợ...', 'info');
}

function handleLogout() {
    if (window.showConfirm) {
        window.showConfirm('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi AutoWash Pro?', () => {
            localStorage.removeItem('user_role');
            window.dispatchEvent(new Event('storage'));
            showToast('Đăng xuất thành công!', 'success');
            setTimeout(() => { window.location.href = '/'; }, 800);
        });
    } else if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('user_role');
        window.location.href = '/';
    }
}

// ── DOM helpers ──────────────────────────────────────────
function setEl(id, val, html = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (html) el.innerHTML = val; else el.textContent = val;
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}
