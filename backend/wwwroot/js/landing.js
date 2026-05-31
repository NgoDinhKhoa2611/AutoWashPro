/**
 * landing.js — Interactive LPR Scanner simulation & smooth-scroll page navigation
 * AutoWash Pro — SWP391 FPT University
 */

let demoState = 'idle'; // 'idle' | 'scanning' | 'recognized' | 'washing_snow' | 'washing_dry' | 'completed'
let demoTimeouts = [];

document.addEventListener('DOMContentLoaded', function () {
    initSmoothScroll();
    initNavbarScroll();
    
    // Auto-trigger the demo once after 1 second for a nice premium impression
    setTimeout(() => {
        startDemoSimulation();
    }, 1000);
});

// ── LPR & Wash Progress Simulation ──────────────────────
function startDemoSimulation() {
    if (demoState !== 'idle') return; // Prevent multiple clicks

    const viewport = document.getElementById('scanner-viewport');
    const line = document.getElementById('scanner-line');
    const content = document.getElementById('scanner-content');
    const status = document.getElementById('scanner-status');
    const progress = document.getElementById('demo-progress');
    const label = document.getElementById('progress-label');
    const btn = document.getElementById('demo-btn');
    const btnText = document.getElementById('demo-btn-text');

    if (!viewport || !status || !progress || !label) return;

    // Clear any active timeouts just in case
    clearDemoTimeouts();

    // Original Camera Idle HTML
    const idleHtml = `
        <div class="text-center" style="opacity:0.4;">
            <i class="fas fa-camera text-white fa-3x mb-3 animate-pulse"></i>
            <div class="text-white small fw-bold" style="font-size:0.72rem;letter-spacing:1px;text-transform:uppercase;">
                Bấm nút "Xem demo" để kích hoạt
            </div>
        </div>
    `;

    // Scanning Camera HTML
    const scanningHtml = `
        <div class="text-center opacity-40">
            <i class="fas fa-camera text-white fa-3x mb-3 fa-pulse" style="color:var(--cyan-electric) !important;"></i>
            <div class="text-white small fw-bold" style="font-size:0.72rem;letter-spacing:1px;text-transform:uppercase;">
                Hệ thống Camera AI đang quét...
            </div>
        </div>
    `;

    // Recognized Plate HTML
    const plateHtml = `
        <div class="scanner-plate-box">
            51G - 123.45
        </div>
    `;

    // ── STEP 1: Scanning LPR (0s) ───────────────────────
    demoState = 'scanning';
    viewport.classList.remove('success');
    viewport.classList.add('scanning');
    if (line) line.style.display = 'block';
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Đang chạy demo...';
    
    content.innerHTML = scanningHtml;
    status.textContent = 'ĐANG ĐỌC BIỂN SỐ XE...';
    progress.style.width = '0%';
    label.textContent = 'Đang nhận dạng...';

    // ── STEP 2: Recognized Plate (2.0s) ─────────────────
    scheduleTimeout(() => {
        demoState = 'recognized';
        viewport.classList.remove('scanning');
        viewport.classList.add('success');
        if (line) line.style.display = 'none';

        content.innerHTML = plateHtml;
        status.textContent = 'XÁC MINH PHƯƠNG TIỆN THÀNH CÔNG';
        progress.style.width = '15%';
        label.textContent = 'Đã xếp hàng (15%)';
    }, 2000);

    // ── STEP 3: Washing step 1 - Snow Foam (4.0s) ────────
    scheduleTimeout(() => {
        demoState = 'washing_snow';
        status.textContent = 'TIẾN TRÌNH: PHUN BỌT TUYẾT VÀO VỎ';
        progress.style.width = '45%';
        label.textContent = 'Đang rửa vỏ (45%)';
    }, 4000);

    // ── STEP 4: Washing step 2 - Air Drying (6.5s) ───────
    scheduleTimeout(() => {
        demoState = 'washing_dry';
        status.textContent = 'TIẾN TRÌNH: SẤY KHÔ & ĐÁNH BÓNG';
        progress.style.width = '80%';
        label.textContent = 'Đang sấy khô (80%)';
    }, 6500);

    // ── STEP 5: Completed (9.0s) ────────────────────────
    scheduleTimeout(() => {
        demoState = 'completed';
        status.textContent = 'HOÀN THÀNH RỬA XE - HẸN GẶP LẠI!';
        progress.style.width = '100%';
        label.textContent = 'Đã hoàn tất (100%)';
    }, 9000);

    // ── STEP 6: Reset to idle (12.5s) ───────────────────
    scheduleTimeout(() => {
        demoState = 'idle';
        viewport.classList.remove('success', 'scanning');
        if (line) line.style.display = 'none';
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Xem demo tính năng';

        content.innerHTML = idleHtml;
        status.textContent = 'HỆ THỐNG OFFLINE';
        progress.style.width = '0%';
        label.textContent = 'Chưa bắt đầu';
    }, 12500);
}

function scheduleTimeout(callback, ms) {
    const t = setTimeout(callback, ms);
    demoTimeouts.push(t);
}

function clearDemoTimeouts() {
    demoTimeouts.forEach(t => clearTimeout(t));
    demoTimeouts = [];
}

// ── Smooth Scroll Navigation ────────────────────────────
function initSmoothScroll() {
    window.scrollToSection = function (id) {
        const element = document.getElementById(id);
        if (element) {
            // Deduct navbar height for optimal positioning
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };
}

// ── Navbar Scroll Visual Effect ─────────────────────────
function initNavbarScroll() {
    const nav = document.querySelector('.landing-nav');
    if (!nav) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            nav.classList.add('shadow-sm', 'py-2');
            nav.classList.remove('py-3');
            nav.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            nav.classList.remove('shadow-sm', 'py-2');
            nav.classList.add('py-3');
            nav.style.background = 'rgba(255, 255, 255, 0.85)';
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run once on load
}
