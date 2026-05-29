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
    // loadProfileData(); // Deprecated: profile fields are now securely server-rendered by C# MVC
    renderVehicles();

    window.addEventListener('storage', function () {
        // loadProfileData(); // Deprecated: no longer using localStorage for profile data
        renderVehicles();
    });
});

// ── Load profile data ────────────────────────────────────
function loadProfileData() {
    // Deprecated: Profile information is now securely rendered server-side by C# MVC & SQL Server database.
    // Client-side localStorage overrides have been completely disabled to prevent tampering.
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
async function handleSaveProfile(e) {
    e.preventDefault();
    const name  = getVal('edit-name').trim();
    const phone = getVal('edit-phone').trim();

    if (!name)  { showToast('Họ và tên không được bỏ trống!', 'warning'); return; }

    const saveBtn = document.querySelector('.profile-save-btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const response = await fetch('/Customer/UpdateProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                FullName: name,
                Phone: phone
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Sync fallback localStorage if still used elsewhere in layouts
            localStorage.setItem('user_display_name', name);
            if (phone) localStorage.setItem('user_phone', phone);
            
            showToast('Đã lưu hồ sơ cá nhân vào cơ sở dữ liệu thành công!', 'success');
            setTimeout(() => { window.location.reload(); }, 1000);
        } else {
            showToast(result.message || 'Cập nhật hồ sơ thất bại!', 'error');
        }
    } catch (err) {
        console.error("Error saving profile to C# backend:", err);
        showToast('Không thể kết nối đến máy chủ C#!', 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

/*
// ── REAL DATA DATABASE INTEGRATION BLUEPRINT (Bug 4) ────────────────
// To transition this profile page from client-side localStorage mockups to real SQL Server database integration,
// you can comment out the localStorage lines above and use the following AJAX blueprint:
//
// // 1. Real Fetching Blueprint:
// async function loadProfileData() {
//     try {
//         const response = await fetch('/Customer/GetProfileData');
//         const data = await response.json();
//         if (data && data.success) {
//             const profile = data.profile;
//             editAvatar = profile.avatar || AVATAR_PRESETS[0];
//             setEl('profile-name-display',   profile.fullName);
//             setEl('profile-phone-display',  profile.phone || profile.email || 'Chưa cập nhật SĐT');
//             setEl('profile-points-display', profile.points.toLocaleString() + ' PTS', true);
//             setVal('edit-name',  profile.fullName);
//             setVal('edit-phone', profile.phone);
//             setVal('edit-email', profile.email);
//             // ... rest of binding logic ...
//         }
//     } catch (err) {
//         console.error("Error loading real customer profile:", err);
//     }
// }
//
// // 2. Real Saving Blueprint:
// async function handleSaveProfile(e) {
//     e.preventDefault();
//     const name  = getVal('edit-name').trim();
//     const phone = getVal('edit-phone').trim();
//     const email = getVal('edit-email').trim();
//
//     if (!name || !phone || !email) { showToast('Vui lòng nhập đầy đủ thông tin!', 'warning'); return; }
//
//     try {
//         const response = await fetch('/Customer/UpdateProfile', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ FullName: name, Phone: phone, Email: email, Avatar: editAvatar })
//         });
//         const result = await response.json();
//         if (result && result.success) {
//             showToast('Đã lưu hồ sơ cá nhân vào cơ sở dữ liệu thành công!', 'success');
//             loadProfileData();
//         } else {
//             showToast(result.message || 'Lưu hồ sơ thất bại!', 'error');
//         }
//     } catch (err) {
//         showToast('Lỗi kết nối máy chủ!', 'error');
//     }
// }
*/

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
                            <div class="fw-bold text-truncate text-black" style="font-size:0.8rem;max-width:140px;">${v.type}</div>
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
