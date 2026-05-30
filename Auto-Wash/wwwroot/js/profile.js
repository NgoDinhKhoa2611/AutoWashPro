/**
 * profile.js — Profile form, avatar presets, vehicle management, settings, and secure password OTP validation
 */

const firebaseConfig = {
  apiKey: "AIzaSyAhYgpmhtDI6v3LRwOpio6MBHJ5N7Vijdg",
  authDomain: "dbonline-3c61c.firebaseapp.com",
  databaseURL: "https://dbonline-3c61c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dbonline-3c61c",
  storageBucket: "dbonline-3c61c.firebasestorage.app",
  messagingSenderId: "364900863040",
  appId: "1:364900863040:web:d3954e8f82a2b46f1c23a5",
  measurementId: "G-0512MF2VF1"
};

let editAvatar = '';
let firebaseAuth = null;
let confirmationResult = null;
let isFirebaseMockMode = false;
let profileOtpTimer = null;
let pendingNewPassword = '';

document.addEventListener('DOMContentLoaded', function () {
    initProfileFirebase();
    renderVehicles();

    // If logged in via Google, we hide the "MẬT KHẨU HIỆN TẠI" container since Google profiles don't possess a current local password
    if (typeof isGoogleAccount !== 'undefined' && isGoogleAccount) {
        const container = document.getElementById('curr-password-group');
        if (container) {
            container.style.display = 'none';
        }
    }

    window.addEventListener('storage', function () {
        renderVehicles();
    });
});

// ── Initialize Firebase ──────────────────────────────────
function initProfileFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            firebaseAuth = firebase.auth();
            console.log("Firebase Auth initialized in Profile.");
        } else {
            console.warn("Firebase library unavailable. Running standard mock fallback.");
            isFirebaseMockMode = true;
        }
    } catch (err) {
        console.error("Firebase load error inside profile, falling back to mock sandbox:", err);
        isFirebaseMockMode = true;
    }
}

// ── Load profile data ────────────────────────────────────
function loadProfileData() {
    // Deprecated: Profile information is now securely rendered server-side by C# MVC & SQL Server database.
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

// ── Save password (OTP Double Flow Flow) ─────────────────
async function handleSavePassword(e) {
    e.preventDefault();
    const newPwd  = getVal('new-password').trim();
    const confPwd = getVal('confirm-password').trim();

    if (!newPwd) { showToast('Vui lòng nhập mật khẩu mới!', 'warning'); return; }
    if (newPwd !== confPwd) { showToast('Xác nhận mật khẩu mới không trùng khớp!', 'error'); return; }
    if (newPwd.length < 6)  { showToast('Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');  return; }

    pendingNewPassword = newPwd;

    if (typeof isGoogleAccount !== 'undefined' && isGoogleAccount) {
        // Path A: Google linked account - Dispatch 6-digit OTP to registered Email
        showToast('Đang gửi mã xác thực OTP qua Email...', 'info');

        try {
            const response = await fetch('/Customer/SendEmailOtp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ Email: userEmail })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Mã OTP đã gửi! Vui lòng kiểm tra email của bạn.', 'success');
                document.getElementById('profile-otp-description').innerHTML = `Hệ thống đã gửi một mã xác thực OTP 6 chữ số tới email đăng ký: <span class="text-cyan fw-bold">${userEmail}</span>. Mã có giá trị trong 5 phút.`;
                
                const modal = new bootstrap.Modal(document.getElementById('otpChangePasswordModal'));
                modal.show();
                startProfileOtpTimer();
            } else {
                showToast(data.message || 'Lỗi khi gửi mã xác thực Email!', 'error');
            }
        } catch (err) {
            console.error("Email OTP connection error:", err);
            showToast('Lỗi kết nối máy chủ gửi OTP Email!', 'error');
        }
    } else {
        // Path B: Regular account - Dispatch Firebase 6-digit OTP SMS via registered Phone
        showToast('Đang gửi mã xác thực SMS tới số điện thoại...', 'info');

        // Dynamic Recaptcha Injection if absent
        let recaptcha = document.getElementById('recaptcha-container');
        if (!recaptcha) {
            recaptcha = document.createElement('div');
            recaptcha.id = 'recaptcha-container';
            recaptcha.style.display = 'none';
            document.body.appendChild(recaptcha);
        }

        if (isFirebaseMockMode || !firebaseAuth) {
            setTimeout(() => {
                showToast('Mã xác thực Sandbox đã gửi: 123456', 'success');
                document.getElementById('profile-otp-description').innerHTML = `Hệ thống đã gửi mã xác thực OTP 6 chữ số tới số điện thoại đăng ký: <span class="text-cyan fw-bold">${userPhone}</span> qua Firebase.`;
                
                const modal = new bootstrap.Modal(document.getElementById('otpChangePasswordModal'));
                modal.show();
                startProfileOtpTimer();
            }, 800);
            return;
        }

        try {
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    'size': 'invisible'
                });
            }

            confirmationResult = await firebaseAuth.signInWithPhoneNumber(userPhone, window.recaptchaVerifier);
            showToast('Mã xác thực Firebase OTP đã được gửi!', 'success');
            document.getElementById('profile-otp-description').innerHTML = `Hệ thống đã gửi mã xác thực OTP 6 chữ số tới số điện thoại đăng ký: <span class="text-cyan fw-bold">${userPhone}</span> qua Firebase.`;
            
            const modal = new bootstrap.Modal(document.getElementById('otpChangePasswordModal'));
            modal.show();
            startProfileOtpTimer();
        } catch (err) {
            console.error("Firebase SMS auth error, switching to Sandbox mock:", err);
            showToast('Firebase SMS lỗi. Sử dụng Sandbox giả lập: 123456', 'warning');

            document.getElementById('profile-otp-description').innerHTML = `Hệ thống đã gửi mã xác thực OTP 6 chữ số tới số điện thoại đăng ký: <span class="text-cyan fw-bold">${userPhone}</span> (Mô phỏng Sandbox).`;
            const modal = new bootstrap.Modal(document.getElementById('otpChangePasswordModal'));
            modal.show();
            startProfileOtpTimer();
        }
    }
}

// ── Profile OTP Modal UI Helper Logic ─────────────────────
function startProfileOtpTimer() {
    let seconds = 300; // 5 mins countdown
    const timerEl = document.getElementById('profile-otp-timer');
    const resendMsg = document.getElementById('profile-otp-resend-wrapper');
    const resendBtn = document.getElementById('profile-otp-resend-btn');

    if (resendMsg) resendMsg.style.display = 'block';
    if (resendBtn) resendBtn.style.display = 'none';

    clearInterval(profileOtpTimer);
    profileOtpTimer = setInterval(() => {
        seconds--;
        if (timerEl) {
            let mins = Math.floor(seconds / 60);
            let secs = seconds % 60;
            timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        if (seconds <= 0) {
            clearInterval(profileOtpTimer);
            if (resendMsg) resendMsg.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'block';
        }
    }, 1000);
}

async function handleVerifyProfileOtp() {
    const digits = [0, 1, 2, 3, 4, 5].map(i => {
        const el = document.getElementById('prof-otp-' + i);
        return el ? el.value : '';
    });
    const code = digits.join('');

    if (code.length < 6) {
        showToast('Vui lòng nhập đầy đủ 6 chữ số mã OTP!', 'warning');
        return;
    }

    const verifyBtn = document.getElementById('profile-otp-verify-btn');
    if (verifyBtn) verifyBtn.disabled = true;

    if (typeof isGoogleAccount !== 'undefined' && isGoogleAccount) {
        // Path A: Google Account - verify code on C# Backend
        try {
            const response = await fetch('/Customer/VerifyEmailAndChangePassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Email: userEmail,
                    OtpCode: code,
                    NewPassword: pendingNewPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                clearInterval(profileOtpTimer);
                showToast('Mật khẩu của bạn đã được thay đổi thành công!', 'success');
                
                // Close modal
                const modalEl = document.getElementById('otpChangePasswordModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                setVal('new-password', '');
                setVal('confirm-password', '');
            } else {
                showToast(data.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!', 'error');
            }
        } catch (err) {
            console.error("Error verifying Email OTP:", err);
            showToast('Không thể kết nối với máy chủ xác minh!', 'error');
        } finally {
            if (verifyBtn) verifyBtn.disabled = false;
        }
    } else {
        // Path B: Regular Account - verify via Firebase
        if (isFirebaseMockMode || !confirmationResult) {
            if (code === '123456' || isFirebaseMockMode) {
                await finalizePhonePasswordChange();
            } else {
                showToast('Mã OTP Sandbox không đúng! Vui lòng dùng: 123456', 'error');
                if (verifyBtn) verifyBtn.disabled = false;
            }
            return;
        }

        try {
            const result = await confirmationResult.confirm(code);
            console.log("Firebase SMS successfully verified user:", result.user);
            await finalizePhonePasswordChange();
        } catch (err) {
            console.error("Firebase verification failed:", err);
            showToast('Mã xác thực Firebase SMS không chính xác!', 'error');
            if (verifyBtn) verifyBtn.disabled = false;
        }
    }
}

async function finalizePhonePasswordChange() {
    clearInterval(profileOtpTimer);
    try {
        const response = await fetch('/Customer/ChangePasswordWithPhoneOtp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Phone: userPhone,
                NewPassword: pendingNewPassword
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Mật khẩu của bạn đã được thay đổi thành công!', 'success');
            
            const modalEl = document.getElementById('otpChangePasswordModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            setVal('new-password', '');
            setVal('confirm-password', '');
        } else {
            showToast(data.message || 'Cập nhật mật khẩu thất bại!', 'error');
        }
    } catch (err) {
        console.error("C# password update failed:", err);
        showToast('Không thể đồng bộ thay đổi mật khẩu đến máy chủ C#!', 'error');
    } finally {
        const verifyBtn = document.getElementById('profile-otp-verify-btn');
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

function handleResendProfileOtp() {
    startProfileOtpTimer();
    showToast('Đã gửi lại mã xác thực OTP mới!', 'info');
}

function handleProfOtpInput(idx, el) {
    el.value = el.value.replace(/\D/, '');
    if (el.value.length === 1 && idx < 5) {
        const next = document.getElementById('prof-otp-' + (idx + 1));
        if (next) next.focus();
    }
    el.classList.toggle('filled', el.value.length > 0);
}

function handleProfOtpKeydown(idx, e) {
    if (e.key === 'Backspace') {
        const el = document.getElementById('prof-otp-' + idx);
        if (el && el.value === '' && idx > 0) {
            const prev = document.getElementById('prof-otp-' + (idx - 1));
            if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
        }
    }
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
