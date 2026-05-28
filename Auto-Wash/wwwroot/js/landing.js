/**
 * landing.js — LPR Scanner demo + smooth-scroll interactions
 */

document.addEventListener('DOMContentLoaded', function () {
    initScannerDemo();
    initSmoothScroll();
});

// ── LPR Scanner Demo ─────────────────────────────────────
let scanTimeout = null;
let plateTimeout = null;

function initScannerDemo() {
    const btn = document.getElementById('scan-demo-btn');
    if (btn) btn.addEventListener('click', startLprScan);
}

function startLprScan() {
    const viewport = document.getElementById('scanner-viewport-landing');
    const overlayText = document.getElementById('scanner-overlay-text');
    const plateBox = document.getElementById('scanner-plate-box');
    const btn = document.getElementById('scan-demo-btn');

    if (!viewport) return;

    // Reset
    viewport.classList.remove('success');
    viewport.classList.add('scanning');
    if (overlayText) {
        overlayText.style.display = 'flex';
        overlayText.style.background = 'rgba(7, 11, 30, 0.8)';
        overlayText.style.borderColor = 'var(--cyan-electric)';
        overlayText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>ĐANG QUÉT LPR BIỂN SỐ...';
    }
    if (plateBox) plateBox.style.display = 'none';
    if (btn) btn.disabled = true;

    clearTimeout(scanTimeout);
    clearTimeout(plateTimeout);

    scanTimeout = setTimeout(() => {
        viewport.classList.remove('scanning');
        viewport.classList.add('success');

        if (plateBox) {
            plateBox.textContent = '51G - 123.45';
            plateBox.style.display = 'block';
        }
        if (overlayText) {
            overlayText.innerHTML = '<i class="fas fa-check-circle me-2"></i>NHẬN DIỆN THÀNH CÔNG!';
            overlayText.style.background = 'rgba(6, 78, 59, 0.9)';
            overlayText.style.borderColor = '#10b981';
            overlayText.style.color = '#10b981';
        }

        plateTimeout = setTimeout(() => {
            viewport.classList.remove('success');
            if (overlayText) overlayText.style.display = 'none';
            if (plateBox)    plateBox.style.display = 'none';
            if (btn)         btn.disabled = false;
        }, 3000);
    }, 2200);
}

// ── Smooth Scroll ────────────────────────────────────────
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ── Navbar scroll effect ─────────────────────────────────
window.addEventListener('scroll', function () {
    const nav = document.getElementById('landing-nav');
    if (!nav) return;
    if (window.scrollY > 60) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});
