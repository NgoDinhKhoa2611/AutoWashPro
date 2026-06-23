import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { queueStatusMapper } from '../utils/queueStatusMapper';
import '../styles/shared.css';
import '../styles/customer/history.css';

export const CustomerHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalWashes, setTotalWashes] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch bookings
        const bookingRes = await customerService.getWashHistory();
        let bookingList = [];
        if (bookingRes.success && bookingRes.history) {
          // Filter to show Completed, Cancelled and NoShow bookings
          bookingList = bookingRes.history.filter(b => 
            b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'NoShow'
          );
          setHistory(bookingList);
        }

        // 2. Fetch reviews
        const reviewsRes = await customerService.getCustomerReviews();
        let reviewsList = [];
        if (reviewsRes.success && reviewsRes.reviews) {
          reviewsList = reviewsRes.reviews;
          setReviews(reviewsList);
        }

        // 3. Calculate stats based on COMPLETED bookings
        const completedBookings = bookingList.filter(b => b.status === 'Completed');
        setTotalWashes(completedBookings.length);
        setTotalSpent(completedBookings.reduce((s, b) => s + Number(b.price), 0));
        setTotalPoints(completedBookings.reduce((s, b) => s + Number(b.points), 0));

        // 4. Calculate average rating
        if (reviewsList.length > 0) {
          const sum = reviewsList.reduce((s, r) => s + r.rating, 0);
          setAvgRating((sum / reviewsList.length).toFixed(1));
        } else {
          setAvgRating('0.0');
        }

      } catch (err) {
        console.error('Error fetching history page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Find if a booking has an existing review
  const getBookingReview = (bookingId) => {
    return reviews.find(r => r.bookingId === parseInt(bookingId, 10));
  };

  return (
    <div className="container-fluid py-4">
      {/* Top Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4 text-start">
        <div>
          <h4 className="fw-bold text-dark mb-1">Lịch sử & Đánh giá</h4>
          <p className="text-secondary small mb-0">Xem lại các lịch hẹn đã hoàn tất, đã hủy và lịch sử đánh giá trạm rửa xe của bạn.</p>
        </div>
        <button 
          className="btn btn-outline-cyan px-4 py-2 fw-bold text-cyan"
          style={{ borderRadius: '12px', border: '1.5px solid var(--cyan-electric)' }}
          onClick={() => navigate('/customer/bookings')}
        >
          <i className="fas fa-calendar-check me-1.5"></i> Quản lý lịch hẹn
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info mb-2" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-secondary small">Đang tải lịch sử giao dịch...</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="row g-3 mb-4 text-start">
            {/* Total Washes */}
            <div className="col-6 col-md-3">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-cyan" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
                  <i className="fas fa-hands-wash"></i>
                </div>
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>TỔNG LẦN RỬA</small>
                  <h5 className="fw-bold text-dark mb-0">{totalWashes} lần</h5>
                </div>
              </div>
            </div>

            {/* Total Spent */}
            <div className="col-6 col-md-3">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-success" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
                  <i className="fas fa-wallet"></i>
                </div>
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>TỔNG CHI TIÊU</small>
                  <h5 className="fw-bold text-success mb-0">{totalSpent.toLocaleString()}đ</h5>
                </div>
              </div>
            </div>

            {/* Total Points */}
            <div className="col-6 col-md-3">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-warning" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
                  <i className="fas fa-coins"></i>
                </div>
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>ĐIỂM ĐÃ NHẬN</small>
                  <h5 className="fw-bold text-warning mb-0">+{totalPoints} PTS</h5>
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="col-6 col-md-3">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-danger" style={{ width: '46px', height: '46px', flexShrink: 0 }}>
                  <i className="fas fa-star" style={{ color: '#ffcf33' }}></i>
                </div>
                <div>
                  <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>ĐÁNH GIÁ TRUNG BÌNH</small>
                  <h5 className="fw-bold text-dark mb-0">{avgRating} / 5.0</h5>
                </div>
              </div>
            </div>
          </div>

          {/* History & Review List */}
          <div className="row text-start">
            <div className="col-12">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
                <h5 className="fw-bold mb-4 text-dark" style={{ fontSize: '0.95rem' }}>
                  <i className="fas fa-list-ul text-cyan me-2"></i>DANH SÁCH LỊCH SỬ CHĂM SÓC XE ({history.length})
                </h5>

                <div className="d-flex flex-column gap-3">
                  {history.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <div className="empty-state-icon mb-3"><i className="fas fa-history fa-2x"></i></div>
                      <h5 className="fw-bold mb-2">Bạn chưa có giao dịch hoàn thành nào</h5>
                      <p className="small mb-0">Sau khi rửa xe xong hoặc hủy lịch hẹn, thông tin sẽ xuất hiện tại đây.</p>
                    </div>
                  ) : (
                    history.map((b) => {
                      const hasReviewObj = getBookingReview(b.id);
                      return (
                        <div key={b.id} className="app-card border border-light p-4 bg-white rounded-4 shadow-sm hover-shadow transition-all">
                          <div className="d-flex flex-wrap justify-content-between align-items-start border-bottom pb-3 mb-3 gap-2">
                            <div>
                              <div className="fw-bold fs-6 text-dark font-monospace">{b.vehicle}</div>
                              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Ngày đặt: {b.bookingDate.split('-').reverse().join('/')} • Giờ: {b.bookingTime} • Mã: #{b.id}
                              </small>
                            </div>
                            <span className={`badge px-3 py-2 rounded-pill small fw-bold ${
                              b.status === 'Completed' ? 'bg-success bg-opacity-10 text-success' :
                              b.status === 'NoShow' ? 'bg-danger bg-opacity-10 text-danger' :
                              'bg-danger bg-opacity-10 text-danger'
                            }`}>
                              <i className={`fas me-1 ${
                                b.status === 'Completed' ? 'fa-check-circle' :
                                b.status === 'NoShow' ? 'fa-user-slash' :
                                'fa-times-circle'
                              }`}></i>
                              {b.status === 'Completed' ? 'Hoàn thành' :
                               b.status === 'NoShow' ? 'Khách không đến' :
                               'Đã hủy'}
                            </span>
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-6">
                              <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Gói dịch vụ</small>
                              <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                                {b.mainService}
                              </span>
                            </div>
                            <div className="col-6 text-end">
                              <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Chi phí</small>
                              <span className="fw-bold text-cyan" style={{ fontSize: '1rem' }}>{Number(b.price).toLocaleString()}đ</span>
                            </div>

                            {b.progressTracking?.stages && b.status === 'Completed' && (
                              <div className="col-12 mt-2 pt-2 border-top">
                                <small className="text-muted fw-bold d-block mb-1.5" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>TIẾN TRÌNH CHI TIẾT</small>
                                <div className="d-flex flex-wrap gap-2">
                                  {b.progressTracking.stages.map((stage, sIdx) => (
                                    <div key={sIdx} className="text-success small d-flex align-items-center gap-1.5" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                                      <i className="fas fa-check-circle text-success" style={{ fontSize: '0.75rem' }}></i>
                                      <span>{stage.displayName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Review block */}
                          <div className="d-flex flex-wrap align-items-center justify-content-between pt-3 border-top gap-2">
                            <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                              Điểm thưởng: <strong className="text-warning">+{b.status === 'Completed' ? b.points : 0} PTS</strong>
                            </span>

                            {b.status === 'Completed' ? (
                              hasReviewObj ? (
                                <div className="p-3 bg-light rounded-4 w-100 mt-2 border border-light">
                                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                                    <div className="text-warning">
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <i key={s} className={`${s <= hasReviewObj.rating ? 'fas' : 'far'} fa-star`} style={{ fontSize: '0.75rem' }}></i>
                                      ))}
                                    </div>
                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                      Đánh giá ngày: {new Date(hasReviewObj.createdAt).toLocaleDateString('vi-VN')}
                                    </small>
                                  </div>
                                  <p className="text-dark small mb-0 italic" style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                                    "{hasReviewObj.comment || 'Không có bình luận.'}"
                                  </p>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center gap-2">
                                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>Chưa có đánh giá</span>
                                  <button
                                    className="btn btn-sm btn-outline-cyan px-3 py-1 fw-bold small"
                                    style={{ borderRadius: '8px', fontSize: '0.72rem' }}
                                    onClick={() => navigate('/customer/bookings')}
                                  >
                                    Đánh giá ngay
                                  </button>
                                </div>
                              )
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerHistory;
