import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { useAuth } from '../hooks/useAuth';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
    padding: '48px 40px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  },
  iconCircle: (color) => ({
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    background: `${color}15`,
    transition: 'transform 0.4s ease',
  }),
  icon: (color) => ({
    fontSize: '36px',
    color: color,
  }),
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'paymentSpin 0.8s linear infinite',
    display: 'inline-block',
    verticalAlign: 'middle',
    marginRight: '8px',
  },
  btn: (color) => ({
    display: 'inline-block',
    padding: '12px 32px',
    borderRadius: '12px',
    border: 'none',
    background: color,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s ease, transform 0.2s ease',
  }),
  progressBar: {
    width: '100%',
    height: '4px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  progressFill: (pct, color) => ({
    width: `${pct}%`,
    height: '100%',
    background: color,
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  }),
  errorDetail: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '12px',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '8px',
  },
};

// Inject spinner keyframes
const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  const id = 'payment-result-keyframes';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `@keyframes paymentSpin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
};

const STATUS_PENDING = 1;
const STATUS_PAID = 2;
const STATUS_FAILED = 3;

const MAX_RETRIES = 8;
const RETRY_INTERVAL = 2000;
const REDIRECT_DELAY = 2500;

export const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser, isAdmin } = useAuth();

  const payment = searchParams.get('payment') || 'error';
  const bookingId = searchParams.get('bookingId');

  const [phase, setPhase] = useState('init'); // init | verifying | syncing | confirmed | failed
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Success flow
  useEffect(() => {
    if (payment !== 'success' || !bookingId) return;

    abortRef.current = false;
    setPhase('verifying');
    setMessage('Đang cập nhật dữ liệu...');
    setProgress(20);

    let attempt = 0;

    const verifyPayment = async () => {
      if (abortRef.current) return;

      attempt++;
      setRetryCount(attempt);
      setProgress(20 + (attempt / MAX_RETRIES) * 40);

      try {
        const res = await fetch(`/api/payment/${bookingId}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const status = data?.payment?.status;

        if (abortRef.current) return;

        if (status === STATUS_PAID) {
          // Payment confirmed - sync loyalty
          setPhase('syncing');
          setMessage('Đang đồng bộ điểm thưởng...');
          setProgress(75);

          try {
            const loyalty = await customerService.getLoyaltyStatus();
            if (loyalty && updateUser) {
              updateUser({
                points: loyalty.currentPoints ?? loyalty.points,
                tier: loyalty.tierName ?? loyalty.tier,
              });
            }
          } catch (loyaltyErr) {
            console.warn('Không thể đồng bộ loyalty:', loyaltyErr);
          }

          if (abortRef.current) return;

          setPhase('confirmed');
          setMessage('Thanh toán đã được xác nhận!');
          setProgress(100);

          // Redirect after delay
          setTimeout(() => {
            if (abortRef.current) return;
            const target = isAdmin ? '/admin/queue' : '/customer/dashboard';
            navigate(target, { replace: true });
          }, REDIRECT_DELAY);

        } else if (status === STATUS_FAILED) {
          setPhase('failed');
          setMessage('Thanh toán thất bại. Vui lòng thử lại.');
          setProgress(100);

        } else if (status === STATUS_PENDING) {
          if (attempt < MAX_RETRIES) {
            setTimeout(verifyPayment, RETRY_INTERVAL);
          } else {
            // Exhausted retries — still pending
            setPhase('failed');
            setMessage('Hệ thống chưa nhận được xác nhận thanh toán. Vui lòng kiểm tra lại sau.');
            setProgress(100);
          }
        } else {
          // Unknown status
          setPhase('failed');
          setMessage('Trạng thái thanh toán không xác định.');
          setProgress(100);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra thanh toán:', err);
        if (attempt < MAX_RETRIES) {
          setTimeout(verifyPayment, RETRY_INTERVAL);
        } else {
          setPhase('failed');
          setMessage('Không thể kết nối đến máy chủ để xác nhận thanh toán.');
          setProgress(100);
        }
      }
    };

    verifyPayment();

    return () => {
      abortRef.current = true;
    };
  }, [payment, bookingId, navigate, isAdmin, updateUser]);

  // ─── RENDER: Success Flow ───
  if (payment === 'success') {
    const isLoading = phase === 'init' || phase === 'verifying' || phase === 'syncing';
    const isConfirmed = phase === 'confirmed';
    const isFailed = phase === 'failed';

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          {/* Icon */}
          <div style={styles.iconCircle(isFailed ? '#ef4444' : '#10b981')}>
            {isFailed ? (
              <span style={styles.icon('#ef4444')}>✕</span>
            ) : (
              <span style={styles.icon('#10b981')}>✔</span>
            )}
          </div>

          {/* Title */}
          <h2 style={styles.title}>
            {isFailed ? 'Xác nhận thanh toán thất bại' : 'Thanh toán thành công'}
          </h2>

          {/* Status message */}
          <p style={styles.subtitle}>
            {isLoading && <span style={styles.spinner} />}
            {message || 'Đang cập nhật dữ liệu...'}
          </p>

          {/* Progress bar */}
          {!isFailed && (
            <div style={styles.progressBar}>
              <div style={styles.progressFill(progress, '#10b981')} />
            </div>
          )}

          {/* Retry info */}
          {isLoading && retryCount > 1 && (
            <p style={styles.errorDetail}>
              Đang xác nhận... (lần thử {retryCount}/{MAX_RETRIES})
            </p>
          )}

          {/* Confirmed redirect message */}
          {isConfirmed && (
            <p style={{ ...styles.errorDetail, color: '#10b981' }}>
              Đang chuyển hướng...
            </p>
          )}

          {/* Failed: show retry button */}
          {isFailed && (
            <div style={{ marginTop: '20px' }}>
              <a
                href="/customer/bookings"
                style={styles.btn('#ef4444')}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Quay lại Booking
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Cancel ───
  if (payment === 'cancel') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconCircle('#f59e0b')}>
            <span style={styles.icon('#f59e0b')}>⚠</span>
          </div>
          <h2 style={styles.title}>Giao dịch đã bị hủy</h2>
          <p style={styles.subtitle}>
            Bạn đã hủy giao dịch thanh toán. Không có khoản nào bị trừ.
          </p>
          <a
            href="/customer/bookings"
            style={styles.btn('#f59e0b')}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Quay lại Booking
          </a>
        </div>
      </div>
    );
  }

  // ─── RENDER: Error (default) ───
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconCircle('#ef4444')}>
          <span style={styles.icon('#ef4444')}>✕</span>
        </div>
        <h2 style={styles.title}>Thanh toán thất bại</h2>
        <p style={styles.subtitle}>
          Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.
        </p>
        <a
          href="/customer/bookings"
          style={styles.btn('#ef4444')}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Quay lại Booking
        </a>
      </div>
    </div>
  );
};

export default PaymentResult;
