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
    // Set cookies for C# server database state tracking
    document.cookie = "UserPhone=" + phone + "; path=/; max-age=" + (30*24*60*60);
    document.cookie = "UserEmail=kien.le@example.com; path=/; max-age=" + (30*24*60*60); // Default mock email
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
    localStorage.setItem('user_points', '550');
    localStorage.setItem('user_tier', 'Gold Member');
    localStorage.setItem('user_next_tier', 'Platinum');
    localStorage.setItem('user_remaining_spend', '250k');
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

// ── Google Sign-In Integration ───────────────────────────
function initGoogleSignIn() {
    if (typeof google === 'undefined') {
        // Retry in 100ms if GIS library is not loaded yet
        setTimeout(initGoogleSignIn, 100);
        return;
    }

    google.accounts.id.initialize({
        client_id: "40329422268-s3m1sqlniabg1f8o7roo5pmfckb4j3te.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });

    // Render Google button for Login Panel
    const loginBtnContainer = document.getElementById("google-login-btn-login");
    if (loginBtnContainer) {
        google.accounts.id.renderButton(loginBtnContainer, {
            theme: "outline",
            size: "large",
            width: 360,
            text: "signin_with",
            shape: "pill",
            logo_alignment: "left"
        });
    }

    // Render Google button for Register Panel
    const registerBtnContainer = document.getElementById("google-login-btn-register");
    if (registerBtnContainer) {
        google.accounts.id.renderButton(registerBtnContainer, {
            theme: "outline",
            size: "large",
            width: 360,
            text: "signup_with",
            shape: "pill",
            logo_alignment: "left"
        });
    }
}

function handleCredentialResponse(response) {
    try {
        const payload = decodeJwtResponse(response.credential);
        
        console.log("Google Login Success! User Data:", payload);

        const email = payload.email;
        const name  = payload.name || "Người dùng Google";
        const avatar = payload.picture || "";
        const googleId = payload.sub || "";

        // Send user details to C# backend to check/persist in the MySQL database
        fetch('/Account/GoogleLogin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Email: email,
                FullName: name,
                GoogleId: googleId
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                // Set cookies for C# server database state tracking
                document.cookie = "UserEmail=" + email + "; path=/; max-age=" + (30*24*60*60);
                document.cookie = "UserPhone=; path=/; max-age=" + (30*24*60*60); // Clear phone cookie
                if (avatar) {
                    document.cookie = "UserAvatar=" + encodeURIComponent(avatar) + "; path=/; max-age=" + (30*24*60*60);
                }

                // Store into localStorage to match AutoWash's custom mock authentication layer
                localStorage.setItem('user_role', 'customer');
                localStorage.setItem('user_display_name', name);
                localStorage.setItem('user_email', email); // Store email correctly in user_email
                localStorage.setItem('user_phone', '');    // Phone is empty initially for Google Sign-Ins
                localStorage.setItem('user_avatar', avatar);
                
                // Retain existing points or initialize new standard customer points
                if (!localStorage.getItem('user_points')) {
                    localStorage.setItem('user_points', '100'); // Give 100 points for first Google signup!
                }
                if (!localStorage.getItem('user_tier')) {
                    localStorage.setItem('user_tier', 'Standard Member');
                }

                window.dispatchEvent(new Event('storage'));

                // Show toast and redirect
                showToast(`Đăng nhập Google thành công! Chào mừng ${name}`, 'success');

                setTimeout(() => {
                    window.location.href = '/Customer/Dashboard';
                }, 1200);
            } else {
                console.error("Google login failed on backend:", data.message);
                showToast("Cơ sở dữ liệu báo lỗi: " + (data.message || ""), "error");
            }
        })
        .catch(err => {
            console.error("Network error during Google login:", err);
            showToast("Không thể kết nối với máy chủ để xác thực!", "error");
        });

    } catch (error) {
        console.error("Google authentication error:", error);
        showToast("Có lỗi xảy ra khi đăng nhập bằng Google!", "error");
    }
}

// Pure JS function to decode Google JWT Token
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Init
document.addEventListener('DOMContentLoaded', function () {
    showPanel('login');
    initGoogleSignIn();
});

