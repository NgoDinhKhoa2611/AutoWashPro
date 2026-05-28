/**
 * login.js — Login / Register / OTP flow logic
 */

// ── Panel switching ──────────────────────────────────────
function showPanel(panel) {
    const panels = ['login', 'register', 'otp'];
    panels.forEach(p => {
        const el = document.getElementById('panel-' + p);
        if (el) el.style.display = p === panel ? 'block' : 'none';
    });

    const header = document.getElementById('brand-header');
    if (header) header.style.display = panel === 'otp' ? 'none' : 'block';
}

// ── Login ────────────────────────────────────────────────
function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pwd   = document.getElementById('login-password').value.trim();

    if (!phone || !pwd) {
        showToast('Vui lòng điền đầy đủ thông tin đăng nhập!', 'warning');
        return;
    }

    // Demo: accept any credentials
    // Admin shortcut
    if (phone.toLowerCase().includes('admin')) {
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_display_name', 'Admin AutoWash');
        window.dispatchEvent(new Event('storage'));
        showToast('Đăng nhập Admin thành công!', 'success');
        setTimeout(() => { window.location.href = '/Admin/Dashboard'; }, 700);
        return;
    }

    // Default customer
    localStorage.setItem('user_role', 'customer');
    if (!localStorage.getItem('user_display_name')) {
        localStorage.setItem('user_display_name', 'Lê Tuấn Kiệt');
    }
    if (!localStorage.getItem('user_phone')) {
        localStorage.setItem('user_phone', phone);
    }
    if (!localStorage.getItem('user_points')) {
        localStorage.setItem('user_points', '550');
    }
    if (!localStorage.getItem('user_tier')) {
        localStorage.setItem('user_tier', 'Gold Member');
    }
    window.dispatchEvent(new Event('storage'));
    showToast('Đăng nhập thành công!', 'success');
    setTimeout(() => { window.location.href = '/Customer/Dashboard'; }, 700);
}

// ── Register ─────────────────────────────────────────────
let pendingPhone = '';

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pwd   = document.getElementById('reg-password').value;
    const conf  = document.getElementById('reg-confirm').value;

    if (!name || !phone || !pwd || !conf) {
        showToast('Vui lòng điền đầy đủ tất cả các trường!', 'warning');
        return;
    }
    if (pwd !== conf) {
        showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
        return;
    }
    if (pwd.length < 6) {
        showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
        return;
    }

    pendingPhone = phone;
    const display = document.getElementById('otp-phone-display');
    if (display) display.textContent = phone;

    // Store temp registration
    localStorage.setItem('reg_name_temp', name);
    localStorage.setItem('reg_phone_temp', phone);

    showPanel('otp');
    startOtpTimer();
}

// ── OTP ──────────────────────────────────────────────────
let otpTimer = null;

function handleOtpInput(idx, el) {
    el.value = el.value.replace(/\D/, '');
    if (el.value.length === 1 && idx < 3) {
        const next = document.getElementById('otp-' + (idx + 1));
        if (next) next.focus();
    }
    el.classList.toggle('filled', el.value.length > 0);
}

function handleOtpKeydown(idx, e) {
    if (e.key === 'Backspace') {
        const el = document.getElementById('otp-' + idx);
        if (el && el.value === '' && idx > 0) {
            const prev = document.getElementById('otp-' + (idx - 1));
            if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
        }
    }
}

function handleVerifyOtp() {
    const digits = [0, 1, 2, 3].map(i => {
        const el = document.getElementById('otp-' + i);
        return el ? el.value : '';
    });
    const code = digits.join('');

    if (code.length < 4) {
        showToast('Vui lòng nhập đầy đủ mã 4 chữ số!', 'warning');
        return;
    }

    // Demo: accept any 4-digit code
    clearInterval(otpTimer);

    const name  = localStorage.getItem('reg_name_temp')  || 'Người dùng mới';
    const phone = localStorage.getItem('reg_phone_temp') || pendingPhone;

    localStorage.setItem('user_role', 'customer');
    localStorage.setItem('user_display_name', name);
    localStorage.setItem('user_phone', phone);
    localStorage.setItem('user_points', '0');
    localStorage.setItem('user_tier', 'Standard Member');
    localStorage.removeItem('reg_name_temp');
    localStorage.removeItem('reg_phone_temp');
    window.dispatchEvent(new Event('storage'));

    // Show success screen
    const successMsg = document.getElementById('success-msg');
    if (successMsg) successMsg.textContent = `Chào mừng ${name} gia nhập AutoWash Pro`;

    const successScreen = document.getElementById('success-screen');
    const brandHeader   = document.getElementById('brand-header');
    if (successScreen) successScreen.style.display = 'flex';
    if (brandHeader)   brandHeader.style.display = 'none';

    document.querySelectorAll('.glass-card').forEach(c => c.style.display = 'none');

    setTimeout(() => { window.location.href = '/Customer/Dashboard'; }, 2200);
}

function handleResendOtp() {
    startOtpTimer();
    showToast('Đã gửi lại mã OTP mới!', 'info');
}

function startOtpTimer() {
    let seconds = 59;
    const timerEl  = document.getElementById('otp-timer');
    const resendMsg = document.getElementById('otp-resend-msg');
    const resendBtn = document.getElementById('otp-resend-btn');

    if (resendMsg) resendMsg.style.display = 'block';
    if (resendBtn) resendBtn.style.display = 'none';

    clearInterval(otpTimer);
    otpTimer = setInterval(() => {
        seconds--;
        if (timerEl) timerEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(otpTimer);
            if (resendMsg) resendMsg.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'block';
        }
    }, 1000);
}

// Init
document.addEventListener('DOMContentLoaded', function () {
    showPanel('login');
});
