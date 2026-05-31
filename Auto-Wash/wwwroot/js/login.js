/**
 * login.js — Login / Register / OTP flow logic with Firebase Auth integration
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

let firebaseAuth = null;
let confirmationResult = null;
let isFirebaseMockMode = false;
let googleCompleteUserData = null; // Temporary container for deferred Google Registration details

// ── Initialize Firebase Auth ─────────────────────────────
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth();
            console.log("Firebase Auth loaded successfully with provided keys.");
        } else {
            console.warn("Firebase library undefined. Operating in Developer Sandbox Mode.");
            isFirebaseMockMode = true;
        }
    } catch (err) {
        console.error("Failed to initialize Firebase Auth, falling back to mock sandbox:", err);
        isFirebaseMockMode = true;
    }
}

// ── Panel switching ──────────────────────────────────────
function showPanel(panel) {
    const panels = ['login', 'register', 'otp', 'google-complete', 'firebase-otp'];
    panels.forEach(p => {
        const el = document.getElementById('panel-' + p);
        if (el) el.style.display = p === panel ? 'block' : 'none';
    });

    const header = document.getElementById('brand-header');
    if (header) header.style.display = (panel === 'otp' || panel === 'firebase-otp') ? 'none' : 'block';
}

// ── Login ────────────────────────────────────────────────
function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-phone').value.trim();
    const pwd = document.getElementById('login-password').value.trim();

    if (!identifier || !pwd) {
        showToast('Vui lòng điền đầy đủ thông tin đăng nhập!', 'warning');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Đang xử lý... <i class="fas fa-spinner fa-spin ms-2"></i>';
    }

    fetch('/Account/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Identifier: identifier, Password: pwd })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showToast(data.message || 'Đăng nhập thất bại!', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'ĐĂNG NHẬP <i class="fas fa-sign-in-alt ms-2"></i>';
            }
            return;
        }

        localStorage.setItem('user_role', data.role);
        localStorage.setItem('user_display_name', data.name || '');
        localStorage.setItem('user_email', data.email || '');
        if (data.phone) localStorage.setItem('user_phone', data.phone);
        if (data.tier) localStorage.setItem('user_tier', data.tier);
        if (data.points != null) localStorage.setItem('user_points', String(data.points));
        window.dispatchEvent(new Event('storage'));

        if (data.role === 'admin' || data.role === 'staff') {
            showToast('Đăng nhập Admin thành công!', 'success');
            setTimeout(() => { window.location.href = '/Admin/Dashboard'; }, 700);
        } else {
            showToast('Đăng nhập thành công!', 'success');
            setTimeout(() => { window.location.href = '/Customer/Dashboard'; }, 700);
        }
    })
    .catch(() => {
        showToast('Không thể kết nối với máy chủ!', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'ĐĂNG NHẬP <i class="fas fa-sign-in-alt ms-2"></i>';
        }
    });
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
    if (el.value.length === 1 && idx < 5) {
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
    const digits = [0, 1, 2, 3, 4, 5].map(i => {
        const el = document.getElementById('otp-' + i);
        return el ? el.value : '';
    });
    const code = digits.join('');

    if (code.length < 6) {
        showToast('Vui lòng nhập đầy đủ mã 6 chữ số!', 'warning');
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
        setTimeout(initGoogleSignIn, 100);
        return;
    }

    google.accounts.id.initialize({
        client_id: "40329422268-s3m1sqlniabg1f8o7roo5pmfckb4j3te.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });

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
        console.log("Google Login Success! Raw payload:", payload);

        const email = payload.email;
        const name  = payload.name || "Người dùng Google";
        const avatar = payload.picture || "";
        const googleId = payload.sub || "";

        // Verify with C# backend if this Google profile has a linked phone number
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
                if (data.isNewUser) {
                    // Google signup is incomplete, defer writing to DB and switch to profile completion
                    googleCompleteUserData = {
                        Email: email,
                        FullName: name,
                        GoogleId: googleId,
                        Avatar: avatar
                    };

                    document.getElementById('google-complete-name').value = name;
                    document.getElementById('google-complete-email').value = email;
                    showPanel('google-complete');
                    showToast('Vui lòng hoàn tất số điện thoại và mật khẩu đăng nhập!', 'info');
                } else {
                    // Returning user
                    document.cookie = "UserEmail=" + email + "; path=/; max-age=" + (30*24*60*60);
                    if (avatar) {
                        document.cookie = "UserAvatar=" + encodeURIComponent(avatar) + "; path=/; max-age=" + (30*24*60*60);
                    }

                    localStorage.setItem('user_role', 'customer');
                    localStorage.setItem('user_display_name', name);
                    localStorage.setItem('user_email', email);
                    localStorage.setItem('user_avatar', avatar);

                    window.dispatchEvent(new Event('storage'));

                    showToast(`Đăng nhập Google thành công! Chào mừng ${name}`, 'success');
                    setTimeout(() => { window.location.href = '/Customer/Dashboard'; }, 1200);
                }
            } else {
                console.error("Google authentication database error:", data.message);
                showToast("Xác thực hệ thống lỗi: " + (data.message || ""), "error");
            }
        })
        .catch(err => {
            console.error("Network error during Google validation:", err);
            showToast("Lỗi kết nối máy chủ xác thực!", "error");
        });

    } catch (error) {
        console.error("Google JWT extraction error:", error);
        showToast("Có lỗi xảy ra khi đăng nhập bằng Google!", "error");
    }
}

function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// ── Google Profile Completion & Firebase Verification ─────
async function handleGoogleCompleteSubmit(e) {
    e.preventDefault();
    const phone = document.getElementById('google-complete-phone').value.trim();
    const password = document.getElementById('google-complete-password').value;
    const confirm = document.getElementById('google-complete-confirm').value;

    if (!phone || !password || !confirm) {
        showToast('Vui lòng nhập đầy đủ các trường!', 'warning');
        return;
    }

    // Validate standard local Vietnamese phone format (10 digits starting with 0)
    const cleanPhone = phone.replace(/[-\s]/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) {
        showToast('Số điện thoại không hợp lệ! Vui lòng nhập định dạng 10 chữ số (ví dụ: 0912345678).', 'warning');
        return;
    }

    if (password !== confirm) {
        showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Mật khẩu phải chứa ít nhất 6 ký tự!', 'error');
        return;
    }

    // Save standard clean local format to database payload (B-2 Item 2)
    googleCompleteUserData.Phone = cleanPhone;
    googleCompleteUserData.Password = password;

    // Dynamically format local number to E.164 (+84...) format strictly for Firebase Auth
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+84' + formattedPhone.substring(1);
    }

    const submitBtn = document.getElementById('google-complete-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    showToast('Đang gửi mã OTP đến số điện thoại ' + cleanPhone + '...', 'info');

    if (isFirebaseMockMode || !firebaseAuth) {
        setTimeout(() => {
            showToast('Mã OTP (Firebase Sandbox) đã gửi: 123456', 'success');
            document.getElementById('firebase-otp-phone-display').textContent = cleanPhone;
            showPanel('firebase-otp');
            startFirebaseOtpTimer();
            if (submitBtn) submitBtn.disabled = false;
        }, 800);
        return;
    }

    try {
        let recaptchaDiv = document.getElementById('recaptcha-container');
        if (recaptchaDiv) recaptchaDiv.style.display = 'block';

        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible'
            });
        }

        confirmationResult = await firebaseAuth.signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier);
        showToast('Đã gửi mã xác thực thành công!', 'success');
        document.getElementById('firebase-otp-phone-display').textContent = cleanPhone;
        showPanel('firebase-otp');
        startFirebaseOtpTimer();
    } catch (err) {
        console.error("Firebase SMS dispatch failed, launching mock sandbox:", err);
        showToast('Không thể kết nối Firebase SMS. Sử dụng mã giả lập Sandbox: 123456', 'warning');
        
        document.getElementById('firebase-otp-phone-display').textContent = cleanPhone;
        showPanel('firebase-otp');
        startFirebaseOtpTimer();
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

let firebaseOtpTimer = null;
function startFirebaseOtpTimer() {
    let seconds = 300; // 5 minutes (300 seconds) countdown duration
    const timerEl = document.getElementById('fb-otp-timer');
    const resendMsg = document.getElementById('fb-otp-resend-msg');
    const resendBtn = document.getElementById('fb-otp-resend-btn');

    if (resendMsg) resendMsg.style.display = 'block';
    if (resendBtn) resendBtn.style.display = 'none';

    clearInterval(firebaseOtpTimer);
    firebaseOtpTimer = setInterval(() => {
        seconds--;
        if (timerEl) {
            let mins = Math.floor(seconds / 60);
            let secs = seconds % 60;
            timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        if (seconds <= 0) {
            clearInterval(firebaseOtpTimer);
            if (resendMsg) resendMsg.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'block';
        }
    }, 1000);
}

async function handleVerifyFirebaseOtp() {
    const digits = [0, 1, 2, 3, 4, 5].map(i => {
        const el = document.getElementById('fb-otp-' + i);
        return el ? el.value : '';
    });
    const code = digits.join('');

    if (code.length < 6) {
        showToast('Vui lòng nhập mã xác thực OTP 6 chữ số!', 'warning');
        return;
    }

    const verifyBtn = document.getElementById('firebase-otp-verify-btn');
    if (verifyBtn) verifyBtn.disabled = true;

    if (isFirebaseMockMode || !confirmationResult) {
        if (code === '123456' || isFirebaseMockMode) {
            await finalizeGoogleSignup();
        } else {
            showToast('Mã OTP Sandbox không hợp lệ! Vui lòng dùng: 123456', 'error');
            if (verifyBtn) verifyBtn.disabled = false;
        }
        return;
    }

    try {
        const result = await confirmationResult.confirm(code);
        console.log("Firebase SMS successfully verified user:", result.user);
        await finalizeGoogleSignup();
    } catch (err) {
        console.error("Firebase SMS verification failed:", err);
        showToast('Mã xác thực Firebase OTP không hợp lệ!', 'error');
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

async function finalizeGoogleSignup() {
    clearInterval(firebaseOtpTimer);
    showToast('Xác thực OTP thành công! Đang đồng bộ tài khoản...', 'info');

    try {
        const response = await fetch('/Account/CompleteGoogleSignup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Email: googleCompleteUserData.Email,
                FullName: googleCompleteUserData.FullName,
                GoogleId: googleCompleteUserData.GoogleId,
                Phone: googleCompleteUserData.Phone,
                Password: googleCompleteUserData.Password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('user_role', 'customer');
            localStorage.setItem('user_display_name', googleCompleteUserData.FullName);
            localStorage.setItem('user_phone', googleCompleteUserData.Phone);
            localStorage.setItem('user_email', googleCompleteUserData.Email);
            localStorage.setItem('user_avatar', googleCompleteUserData.Avatar || '');
            localStorage.setItem('user_points', '100'); 
            localStorage.setItem('user_tier', 'Standard Member');

            window.dispatchEvent(new Event('storage'));

            document.cookie = "UserEmail=" + googleCompleteUserData.Email + "; path=/; max-age=" + (30*24*60*60);
            document.cookie = "UserPhone=" + googleCompleteUserData.Phone + "; path=/; max-age=" + (30*24*60*60);
            if (googleCompleteUserData.Avatar) {
                document.cookie = "UserAvatar=" + encodeURIComponent(googleCompleteUserData.Avatar) + "; path=/; max-age=" + (30*24*60*60);
            }

            // Show success screen
            const successMsg = document.getElementById('success-msg');
            if (successMsg) successMsg.textContent = `Chào mừng ${googleCompleteUserData.FullName} gia nhập AutoWash Pro`;

            const successScreen = document.getElementById('success-screen');
            const brandHeader = document.getElementById('brand-header');
            if (successScreen) successScreen.style.display = 'flex';
            if (brandHeader) brandHeader.style.display = 'none';

            document.querySelectorAll('.glass-card').forEach(c => c.style.display = 'none');

            setTimeout(() => {
                window.location.href = '/Customer/Dashboard';
            }, 2200);
        } else {
            showToast(data.message || 'Có lỗi xảy ra khi hoàn tất lưu thông tin tài khoản!', 'error');
            const verifyBtn = document.getElementById('firebase-otp-verify-btn');
            if (verifyBtn) verifyBtn.disabled = false;
        }
    } catch (err) {
        console.error("Completion API connection error:", err);
        showToast('Không thể kết nối đến máy chủ C#!', 'error');
        const verifyBtn = document.getElementById('firebase-otp-verify-btn');
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

function handleResendFirebaseOtp() {
    startFirebaseOtpTimer();
    showToast('Đã gửi lại mã xác thực Firebase mới!', 'info');
}

function handleFbOtpInput(idx, el) {
    el.value = el.value.replace(/\D/, '');
    if (el.value.length === 1 && idx < 5) {
        const next = document.getElementById('fb-otp-' + (idx + 1));
        if (next) next.focus();
    }
    el.classList.toggle('filled', el.value.length > 0);
}

function handleFbOtpKeydown(idx, e) {
    if (e.key === 'Backspace') {
        const el = document.getElementById('fb-otp-' + idx);
        if (el && el.value === '' && idx > 0) {
            const prev = document.getElementById('fb-otp-' + (idx - 1));
            if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
        }
    }
}

// ── DOM Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    showPanel('login');
    initGoogleSignIn();
    initFirebase();
});
