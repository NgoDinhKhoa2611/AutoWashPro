import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/history.css';

const STEP_BADGES = ['Đã nhận diện LPR', 'Đang phun rửa vỏ', 'Đang sấy khí áp lực', 'Đã rửa sạch & Check-out'];

const INITIAL_HISTORY = [
  { id: 'hist_01', date: '18/05/2026', plate: '51G - 123.45', type: 'Honda Vision', service: 'Combo Cao cấp', price: 85000, points: 85, status: 'Hoàn tất', surveyStatus: 'pending' },
  { id: 'hist_02', date: '12/05/2026', plate: '51G - 123.45', type: 'Honda Vision', service: 'Rửa xe phổ thông', price: 35000, points: 35, status: 'Hoàn tất', surveyStatus: 'rated', rating: 5 },
  { id: 'hist_03', date: '05/05/2026', plate: '51A - 999.99', type: 'SH Mode', service: 'Rửa xe phổ thông', price: 35000, points: 35, status: 'Hoàn tất', surveyStatus: 'rated', rating: 4 }
];

export const CustomerHistory = () => {
  const { user, updateUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [washStep, setWashStep] = useState(0);

  // Stats
  const [totalWashes, setTotalWashes] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Survey modal state
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveyTargetId, setSurveyTargetId] = useState(null);
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyEmoji, setSurveyEmoji] = useState(5);
  const [surveyTags, setSurveyTags] = useState([]);
  const [surveyText, setSurveyText] = useState('');
  const [surveySuccess, setSurveySuccess] = useState(false);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await customerService.getWashHistory();
        if (response.success && response.history) {
          const list = response.history.map(b => ({
            id: b.id,
            date: b.bookingDate.split('-').reverse().join('/'),
            plate: b.vehicle,
            type: 'Xe ga',
            service: b.mainService + (b.addons && b.addons.length > 0 ? ` + ${b.addons.join(', ')}` : ''),
            price: b.price,
            points: b.points,
            status: b.status === 'Completed' ? 'Hoàn tất' : 'Đang xử lý',
            surveyStatus: 'pending'
          }));
          setHistory(list);
          setTotalWashes(list.length);
          setTotalSpent(list.reduce((s, i) => s + i.price, 0));
          setTotalPoints(list.reduce((s, i) => s + i.points, 0));
          return;
        }
      } catch (err) {
        console.error(err);
      }

      loadLocalStorageHistory();
    };

    const loadLocalStorageHistory = () => {
      let saved = [];
      try {
        const str = localStorage.getItem('user_history_bookings');
        if (str) {
          saved = JSON.parse(str);
        } else {
          saved = INITIAL_HISTORY;
          localStorage.setItem('user_history_bookings', JSON.stringify(INITIAL_HISTORY));
        }
      } catch (e) {
        saved = INITIAL_HISTORY;
      }
      setHistory(saved);

      setTotalWashes(saved.length);
      setTotalSpent(saved.reduce((s, i) => s + i.price, 0));
      setTotalPoints(saved.reduce((s, i) => s + i.points, 0));
    };

    const fetchActive = async () => {
      try {
        const response = await customerService.getActiveBooking();
        if (response.success && response.booking) {
          setActiveBooking(response.booking);
          setWashStep(response.washStep || 0);
          return;
        }
      } catch (err) {
        console.error(err);
      }
      
      try {
        const activeStr = localStorage.getItem('active_booking');
        if (activeStr) {
          setActiveBooking(JSON.parse(activeStr));
          setWashStep(Number(localStorage.getItem('wash_step') || 0));
        } else {
          setActiveBooking(null);
        }
      } catch (e) {}
    };

    const loadHistoryData = () => {
      fetchHistory();
      fetchActive();
    };

    loadHistoryData();
    window.addEventListener('storage', loadHistoryData);

    return () => {
      window.removeEventListener('storage', loadHistoryData);
    };
  }, []);

  const handleOpenSurvey = (id) => {
    setSurveyTargetId(id);
    setSurveyRating(5);
    setSurveyEmoji(5);
    setSurveyTags([]);
    setSurveyText('');
    setSurveySuccess(false);
    setSurveyModalOpen(true);
  };

  const handleToggleTag = (tag) => {
    if (surveyTags.includes(tag)) {
      setSurveyTags(surveyTags.filter(t => t !== tag));
    } else {
      setSurveyTags([...surveyTags, tag]);
    }
  };

  const handleSubmitSurvey = () => {
    if (!surveyTargetId) return;
    setSubmittingSurvey(true);

    setTimeout(() => {
      // Award +50 points
      const currentPts = Number(localStorage.getItem('user_points') || 0);
      const updatedPts = currentPts + 50;
      localStorage.setItem('user_points', String(updatedPts));
      updateUser({ points: updatedPts });

      // Mark history item as rated
      const updatedHistory = history.map(item => {
        if (item.id === surveyTargetId) {
          return { ...item, surveyStatus: 'rated', rating: surveyRating };
        }
        return item;
      });
      setHistory(updatedHistory);
      localStorage.setItem('user_history_bookings', JSON.stringify(updatedHistory));

      // Create notification
      const notif = {
        id: 'notif_review_' + Date.now(),
        title: 'Nhận điểm đánh giá',
        body: 'Chúc mừng! Bạn đã nhận được +50 PTS điểm thưởng AutoWash Loyalty nhờ gửi đánh giá phản hồi dịch vụ.',
        time: 'Vừa xong',
        type: 'points',
        read: false
      };
      let notifications = [];
      try {
        notifications = JSON.parse(localStorage.getItem('user_notifications') || '[]');
      } catch (e) {}
      localStorage.setItem('user_notifications', JSON.stringify([notif, ...notifications]));
      window.dispatchEvent(new Event('storage'));

      setSubmittingSurvey(false);
      setSurveySuccess(true);

      setTimeout(() => {
        setSurveyModalOpen(false);
        setSurveyTargetId(null);
      }, 2000);
    }, 1200);
  };

  const availableTags = ['Rửa sạch bóng', 'Thao tác nhanh', 'Nhân viên thân thiện', 'Giá hợp lý', 'VIP bypass tốt'];

  return (
    <div className="container-fluid py-4">
      {/* Active wash progress tracking header */}
      {activeBooking && (
        <div className="app-card border-0 shadow-sm p-4 bg-white mb-4 rounded-4 animate-up" id="history-active-block">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3 text-start">
              <div className="rounded-circle d-flex align-items-center justify-content-center bg-cyan-light text-cyan" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                <i className="fas fa-satellite-dish"></i>
              </div>
              <div>
                <h6 className="fw-bold mb-0 text-dark" id="active-plate">{activeBooking.plate}</h6>
                <small className="text-secondary" id="active-service">{activeBooking.service}</small>
              </div>
            </div>
            <div className="text-end">
              <span className="badge bg-cyan text-dark rounded px-2.5 py-1.5 fw-bold font-monospace mb-1 d-block" id="active-tier-badge" style={{ fontSize: '0.62rem' }}>
                VIP {activeBooking.tier} PRIORITY
              </span>
              <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                Giờ hẹn: <strong id="active-time">{activeBooking.bookingTime}</strong> • <span className="badge bg-info bg-opacity-10 text-cyan px-2 py-0.5 rounded" id="active-step-badge">{STEP_BADGES[Math.min(washStep, 3)]}</span>
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-secondary" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
              <i className="fas fa-hands-wash"></i>
            </div>
            <div className="text-start">
              <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>TỔNG SỐ LẦN RỬA</small>
              <h5 className="fw-bold text-dark mb-0" id="stat-wash-count">{totalWashes} lần</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-cyan" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
              <i className="fas fa-wallet"></i>
            </div>
            <div className="text-start">
              <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>TỔNG CHI TIÊU TÍCH LŨY</small>
              <h5 className="fw-bold text-cyan mb-0" id="stat-total-spent">{totalSpent.toLocaleString()}đ</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-warning" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
              <i className="fas fa-coins"></i>
            </div>
            <div className="text-start">
              <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>ĐIỂM THƯỞNG NHẬN ĐƯỢC</small>
              <h5 className="fw-bold text-warning mb-0" id="stat-total-pts">+{totalPoints} PTS</h5>
            </div>
          </div>
        </div>
      </div>

      {/* History Grid */}
      <div className="row">
        <div className="col-12 text-start">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
            <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
              LỊCH SỬ CHĂM SÓC XE CỦA BẠN (<span id="history-count">{history.length}</span>)
            </h5>

            <div className="d-flex flex-column gap-3" id="history-list">
              {history.length === 0 ? (
                <div className="empty-state-container text-center py-5 text-muted">
                  <div className="empty-state-icon mb-3"><i className="fas fa-history fa-2x"></i></div>
                  <h5 className="fw-bold mb-2">Chưa có lịch sử rửa xe</h5>
                  <p className="small mb-0">Sau khi hoàn tất dịch vụ, lịch sử sẽ tự động xuất hiện tại đây.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="app-card border border-light p-4 bg-white rounded-4 shadow-sm" id={`hist-card-${item.id}`}>
                    <div className="d-flex flex-wrap justify-content-between align-items-start border-bottom pb-3 mb-3 gap-2">
                      <div>
                        <div className="fw-bold fs-6" style={{ color: 'var(--navy-dark)' }}>{item.plate}</div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{item.date} • {item.type}</small>
                      </div>
                      <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-bold">
                        <i className="fas fa-check-circle me-1"></i>{item.status}
                      </span>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Gói dịch vụ</small>
                        <span className="fw-bold" style={{ color: 'var(--navy-dark)', fontSize: '0.85rem' }}>{item.service}</span>
                      </div>
                      <div className="col-6 text-end">
                        <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Chi phí</small>
                        <span className="fw-bold text-cyan" style={{ fontSize: '1rem' }}>{Number(item.price).toLocaleString()}đ</span>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center justify-content-between pt-3 border-top gap-2">
                      <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                        Điểm nhận được: <strong className="text-warning">+{item.points} PTS</strong>
                      </span>

                      {item.surveyStatus === 'pending' ? (
                        <button
                          className="app-btn-primary py-2 px-3 shadow-none border-0"
                          style={{ fontSize: '0.78rem', borderRadius: '10px' }}
                          onClick={() => handleOpenSurvey(item.id)}
                        >
                          <i className="fas fa-comment-alt me-1"></i> ĐÁNH GIÁ +50 PTS
                        </button>
                      ) : (
                        <div className="d-flex align-items-center gap-1 text-warning" style={{ fontSize: '0.82rem' }}>
                          <span className="text-muted me-1">Đánh giá:</span>
                          {[1, 2, 3, 4, 5].map(s => (
                            <i key={s} className={`${s <= (item.rating || 5) ? 'fas' : 'far'} fa-star`} style={{ color: '#ffcf33', fontSize: '0.82rem' }}></i>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Survey Modal */}
      {surveyModalOpen && (
        <div id="survey-modal-backdrop" className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="confirm-modal-header">
              <h5 className="confirm-modal-title">Khảo sát & Đánh giá dịch vụ</h5>
              <button type="button" className="confirm-modal-close-btn" onClick={() => setSurveyModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {surveySuccess ? (
              <div className="confirm-modal-body text-center py-5" id="survey-success-view">
                <i className="fas fa-check-circle fa-4x text-success mb-3 animate-pulse"></i>
                <h5 className="fw-bold text-success">GỬI PHẢN HỒI THÀNH CÔNG!</h5>
                <p className="text-muted small mb-0 mt-2">Bạn nhận được +50 PTS điểm thưởng AutoWash Loyalty.</p>
              </div>
            ) : (
              <div className="confirm-modal-body" id="survey-form-view">
                {/* Emojis selection */}
                <div className="d-flex justify-content-around mb-4">
                  {[1, 2, 3, 4, 5].map(val => {
                    const emojis = ['', '😢', '😐', '🙂', '😊', '😍'];
                    const labels = ['', 'Tệ', 'Kém', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];
                    return (
                      <div
                        key={val}
                        className="survey-emoji-item text-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSurveyEmoji(val);
                          setSurveyRating(val);
                        }}
                      >
                        <div
                          className="survey-emoji"
                          style={{
                            fontSize: '2rem',
                            transition: 'all 0.2s',
                            transform: val === surveyEmoji ? 'scale(1.25)' : 'scale(1)',
                            filter: val === surveyEmoji ? 'none' : 'grayscale(60%)'
                          }}
                        >
                          {emojis[val]}
                        </div>
                        <small
                          className="survey-emoji-label d-block mt-1"
                          style={{
                            fontSize: '0.65rem',
                            color: val === surveyEmoji ? 'var(--cyan-electric)' : '#94a3b8',
                            fontWeight: val === surveyEmoji ? '700' : '400'
                          }}
                        >
                          {labels[val]}
                        </small>
                      </div>
                    );
                  })}
                </div>

                {/* Stars */}
                <div className="text-center mb-3">
                  {[1, 2, 3, 4, 5].map(val => (
                    <i
                      key={val}
                      className="survey-star fas fa-star fa-2x mx-1"
                      style={{
                        cursor: 'pointer',
                        color: val <= surveyRating ? '#ffcf33' : '#cbd5e1',
                        textShadow: val <= surveyRating ? '0 0 12px rgba(255,207,51,0.4)' : 'none'
                      }}
                      onClick={() => setSurveyRating(val)}
                    ></i>
                  ))}
                </div>

                {/* Quick tags */}
                <div className="mb-3 text-start">
                  <label className="form-label small fw-bold text-muted mb-2">ĐÁNH GIÁ NHANH</label>
                  <div className="d-flex flex-wrap gap-1.5">
                    {availableTags.map((tag, idx) => {
                      const isSelected = surveyTags.includes(tag);
                      return (
                        <span
                          key={idx}
                          className="survey-tag badge border py-2 px-3 font-semibold"
                          style={{
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            borderRadius: '20px',
                            background: isSelected ? 'var(--navy-dark)' : '#f8fafc',
                            color: isSelected ? 'var(--cyan-electric)' : '#64748b',
                            borderColor: isSelected ? 'var(--cyan-electric)' : '#e2e8f0',
                            boxShadow: isSelected ? 'var(--cyan-glow)' : 'none'
                          }}
                          onClick={() => handleToggleTag(tag)}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Comment box */}
                <div className="mb-3 text-start">
                  <label className="form-label small fw-bold text-muted">Ý KIẾN KHÁC (TÙY CHỌN)</label>
                  <textarea
                    id="survey-review-text"
                    className="form-control bg-light border-0 py-2.5 rounded-3"
                    rows="3"
                    placeholder="Gợi ý cải tiến chất lượng dịch vụ..."
                    value={surveyText}
                    onChange={(e) => setSurveyText(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-flex gap-2">
                  <button className="app-btn-secondary w-50 py-2.5" onClick={() => setSurveyModalOpen(false)}>HỦY BỎ</button>
                  <button
                    className="app-btn-primary w-50 py-2.5 text-dark fw-bold"
                    id="survey-submit-btn"
                    disabled={submittingSurvey}
                    onClick={handleSubmitSurvey}
                  >
                    {submittingSurvey ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerHistory;
