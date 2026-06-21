import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { queueStatusMapper } from '../utils/queueStatusMapper';
import '../styles/shared.css';
import '../styles/customer/history.css'; // Reuse premium styles

export const CustomerBookings = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('active'); // active, history, reviews
  const [reviewSubTab, setReviewSubTab] = useState('pending'); // pending, submitted
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review states
  const [myReviews, setMyReviews] = useState([]);
  const [pendingReviewBookings, setPendingReviewBookings] = useState([]);

  // Modal states
  const [detailModalBooking, setDetailModalBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // History Tab Search, Filter and Pagination states
  const [historyFilter, setHistoryFilter] = useState('all'); // all, completed, cancelled
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;

  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [cancelReasonDetails, setCancelReasonDetails] = useState(null); // { id, cancelledBy, cancelledAt, reason }

  // Fetch all bookings and reviews
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all bookings
      const bookingRes = await customerService.getWashHistory();
      if (bookingRes.success && bookingRes.history) {
        setBookings(bookingRes.history);
      }

      // 2. Fetch pending reviews and existing reviews
      const pendingRes = await customerService.getPendingReviews();
      if (pendingRes.success && pendingRes.bookings) {
        setPendingReviewBookings(pendingRes.bookings);
      }

      const reviewsRes = await customerService.getCustomerReviews();
      if (reviewsRes.success && reviewsRes.reviews) {
        setMyReviews(reviewsRes.reviews);
      }
    } catch (err) {
      console.error('Error loading bookings data:', err);
      if (window.showToast) window.showToast('Không thể tải danh sách lịch đặt.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle route parameter id to open detail modal on mount / change
  useEffect(() => {
    if (routeId) {
      handleOpenDetail(parseInt(routeId, 10));
    }
  }, [routeId]);

  const handleOpenDetail = async (bookingId) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await customerService.getBookingDetail(bookingId);
      if (res.success && res.booking) {
        setDetailModalBooking(res.booking);
      } else {
        if (window.showToast) window.showToast('Không tìm thấy chi tiết lịch hẹn.', 'warning');
        setShowDetailModal(false);
        navigate('/customer/bookings');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi khi tải chi tiết lịch hẹn.', 'danger');
      setShowDetailModal(false);
      navigate('/customer/bookings');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setDetailModalBooking(null);
    if (routeId) {
      navigate('/customer/bookings');
    }
  };

  // Cancel Booking
  const handleOpenCancel = (bookingId, e) => {
    e.stopPropagation();
    setCancelTargetId(bookingId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleSubmitCancel = async () => {
    if (!cancelReason.trim()) {
      if (window.showToast) window.showToast('Vui lòng nhập lý do hủy!', 'warning');
      return;
    }
    setCancelling(true);
    try {
      const res = await customerService.cancelBooking(cancelTargetId, cancelReason.trim());
      if (res.success) {
        if (window.showToast) window.showToast(res.message || 'Đã hủy lịch hẹn thành công!', 'success');
        setShowCancelModal(false);
        // Reload data
        loadData();
        // If the cancelled booking is currently open in detail modal, refresh it
        if (detailModalBooking && detailModalBooking.bookingId === cancelTargetId) {
          handleOpenDetail(cancelTargetId);
        }
      } else {
        if (window.showToast) window.showToast(res.message || 'Không thể hủy lịch hẹn.', 'warning');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Đã xảy ra lỗi khi hủy lịch hẹn.', 'danger');
    } finally {
      setCancelling(false);
    }
  };

  // Review Booking
  const handleOpenReview = (bookingId, e) => {
    if (e) e.stopPropagation();
    setReviewTargetId(bookingId);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleOpenCancelReason = async (bookingId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await customerService.getBookingDetail(bookingId);
      if (res.success && res.booking) {
        setCancelReasonDetails({
          id: res.booking.bookingId,
          cancelledBy: res.booking.cancelledBy,
          cancelledAt: res.booking.cancelledAt,
          reason: res.booking.cancelReason
        });
        setShowCancelReasonModal(true);
      } else {
        if (window.showToast) window.showToast('Không tải được lý do hủy.', 'warning');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Lỗi khi tải lý do hủy.', 'danger');
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      const res = await customerService.createReview(reviewTargetId, reviewRating, reviewComment.trim());
      if (res.success) {
        if (window.showToast) window.showToast(res.message || 'Gửi đánh giá thành công! Cảm ơn bạn.', 'success');
        setShowReviewModal(false);
        loadData();
        // If detail modal is open, refresh it
        if (detailModalBooking && detailModalBooking.bookingId === reviewTargetId) {
          handleOpenDetail(reviewTargetId);
        }
      } else {
        if (window.showToast) window.showToast(res.message || 'Không thể gửi đánh giá.', 'warning');
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Đã xảy ra lỗi khi gửi đánh giá.', 'danger');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtering bookings based on tab
  // Active states: Pending Confirmation, Confirmed, Checked In
  const activeBookings = bookings.filter(b => 
    b.status === 'Pending' || 
    b.status === 'Pending Confirmation' ||
    b.status === 'Confirmed' || 
    b.status === 'CheckedIn' ||
    b.status === 'Checked In' ||
    b.status === 'InProgress' ||
    b.status === 'In Progress'
  );

  // History states: Completed, Cancelled
  const historyBookings = bookings.filter(b => 
    b.status === 'Completed' || 
    b.status === 'Cancelled'
  );

  // Filtered & Searched history bookings
  const filteredHistory = historyBookings.filter(b => {
    if (historyFilter === 'completed' && b.status !== 'Completed') return false;
    if (historyFilter === 'cancelled' && b.status !== 'Cancelled') return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const idMatches = b.id.toString().includes(q);
      const plateMatches = b.vehicle && b.vehicle.toLowerCase().includes(q);
      return idMatches || plateMatches;
    }
    return true;
  });

  // Paginated history
  const totalHistoryPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );

  const translateStatus = (status) => {
    switch (status) {
      case 'Pending':
      case 'Pending Confirmation':
        return { label: 'Chờ xác nhận', badgeClass: 'bg-warning bg-opacity-15 text-warning', icon: 'fa-hourglass-start' };
      case 'Confirmed':
        return { label: 'Đã xác nhận', badgeClass: 'bg-primary bg-opacity-10 text-primary', icon: 'fa-calendar-check' };
      case 'CheckedIn':
      case 'Checked In':
        return { label: 'Đã Check-in', badgeClass: 'bg-info bg-opacity-10 text-info', icon: 'fa-sign-in-alt' };
      case 'Completed':
        return { label: 'Hoàn tất', badgeClass: 'bg-success bg-opacity-10 text-success', icon: 'fa-check-circle' };
      case 'Cancelled':
        return { label: 'Đã hủy', badgeClass: 'bg-danger bg-opacity-10 text-danger', icon: 'fa-times-circle' };
      default:
        return { label: 'Đang xử lý', badgeClass: 'bg-secondary bg-opacity-10 text-secondary', icon: 'fa-cog fa-spin' };
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Top Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4 text-start">
        <div>
          <h4 className="fw-bold text-dark mb-1">Quản lý lịch đặt xe</h4>
          <p className="text-secondary small mb-0">Theo dõi, chỉnh sửa lịch hẹn và gửi đánh giá dịch vụ của bạn.</p>
        </div>
        <button 
          className="app-btn-primary px-4 py-2 text-dark fw-bold border-0 shadow-sm"
          style={{ borderRadius: '12px' }}
          onClick={() => navigate('/customer/booking')}
        >
          <i className="fas fa-calendar-plus me-1.5"></i> Đặt lịch mới
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-start border-bottom pb-1 mb-2 gap-4">
            <button
              className={`btn pb-2 fw-bold text-decoration-none border-0 rounded-0 px-2 position-relative ${activeTab === 'active' ? 'text-cyan border-bottom border-cyan border-3' : 'text-secondary'}`}
              style={{ background: 'transparent' }}
              onClick={() => setActiveTab('active')}
            >
              Lịch hẹn hoạt động ({activeBookings.length})
            </button>
            <button
              className={`btn pb-2 fw-bold text-decoration-none border-0 rounded-0 px-2 position-relative ${activeTab === 'history' ? 'text-cyan border-bottom border-cyan border-3' : 'text-secondary'}`}
              style={{ background: 'transparent' }}
              onClick={() => setActiveTab('history')}
            >
              Lịch sử giao dịch ({historyBookings.length})
            </button>
            <button
              className={`btn pb-2 fw-bold text-decoration-none border-0 rounded-0 px-2 position-relative ${activeTab === 'reviews' ? 'text-cyan border-bottom border-cyan border-3' : 'text-secondary'}`}
              style={{ background: 'transparent' }}
              onClick={() => setActiveTab('reviews')}
            >
              Đánh giá dịch vụ ({pendingReviewBookings.length + myReviews.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info mb-2" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-secondary small">Đang tải dữ liệu lịch hẹn...</p>
        </div>
      ) : (
        <div className="row text-start">
          {/* TAB 1: ACTIVE BOOKINGS */}
          {activeTab === 'active' && (
            <div className="col-12">
              {activeBookings.length === 0 ? (
                <div className="app-card p-5 text-center text-muted rounded-4 bg-white border-0 shadow-sm">
                  <div className="mb-3"><i className="fas fa-calendar-minus fa-3x text-light"></i></div>
                  <h5 className="fw-bold mb-1 text-dark">Không có lịch hẹn hoạt động nào</h5>
                  <p className="small mb-3">Bạn chưa có lịch hẹn nào đang chờ xử lý hoặc đã xác nhận.</p>
                  <button className="app-btn-primary px-4 py-2 border-0" onClick={() => navigate('/customer/booking')}>Đặt lịch ngay</button>
                </div>
              ) : (
                <div className="row g-3">
                  {activeBookings.map((b) => {
                    const statusInfo = b.queueStatus
                      ? { label: queueStatusMapper.getLabel(b.queueStatus, b.addons), badgeClass: queueStatusMapper.getBadgeClass(b.queueStatus), icon: queueStatusMapper.getIcon(b.queueStatus) }
                      : translateStatus(b.status);
                    return (
                      <div key={b.id} className="col-md-6 col-lg-4">
                        <div className="app-card border border-light p-4 bg-white rounded-4 shadow-sm hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(b.id)}>
                          <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                            <div>
                              <div className="small text-muted font-monospace mb-0.5">MÃ LỊCH: #{b.id}</div>
                              <span className="fw-bold text-dark font-monospace fs-6">{b.vehicle}</span>
                            </div>
                            <span className={`badge px-2.5 py-1.5 rounded-pill small fw-bold ${statusInfo.badgeClass}`}>
                              <i className={`fas ${statusInfo.icon} me-1`}></i>{statusInfo.label}
                            </span>
                          </div>

                          <div className="mb-3 small text-secondary">
                            <div className="mb-1"><i className="far fa-calendar text-muted me-2"></i>Ngày hẹn: <strong className="text-dark">{b.bookingDate.split('-').reverse().join('/')}</strong></div>
                            <div className="mb-1"><i className="far fa-clock text-muted me-2"></i>Giờ hẹn: <strong className="text-dark">{b.bookingTime}</strong></div>
                            <div className="mb-1"><i className="fas fa-hands-wash text-muted me-2"></i>Dịch vụ chính: <strong className="text-dark">{b.mainService}</strong></div>
                            {b.addons && b.addons.length > 0 && (
                              <div className="mb-1 text-truncate"><i className="fas fa-plus-circle text-muted me-2"></i>Đi kèm: <strong className="text-dark">{b.addons.join(', ')}</strong></div>
                            )}
                            <div><i className="fas fa-coins text-muted me-2"></i>Dịch vụ tích điểm: <strong className="text-warning">+{b.points} PTS</strong></div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                            <div>
                              <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>TỔNG TIỀN</small>
                              <strong className="text-cyan fs-5">{Number(b.price).toLocaleString()}đ</strong>
                            </div>
                            <div className="d-flex gap-2">
                              {(b.status === 'Pending' || b.status === 'Pending Confirmation' || b.status === 'Confirmed') && (
                                <button className="btn btn-outline-danger btn-sm px-3 py-1.5 rounded-3 fw-bold small" onClick={(e) => handleOpenCancel(b.id, e)}>
                                  Hủy lịch
                                </button>
                              )}
                              <button className="btn btn-light btn-sm px-3 py-1.5 rounded-3 fw-bold small border text-dark" onClick={(e) => { e.stopPropagation(); handleOpenDetail(b.id); }}>
                                Chi tiết
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKING HISTORY */}
          {activeTab === 'history' && (
            <div className="col-12">
              {/* Search & Filter Controls */}
              <div className="row g-3 mb-4 align-items-center">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><i className="fas fa-search text-muted"></i></span>
                    <input
                      type="text"
                      className="form-control border bg-light text-dark p-2"
                      placeholder="Tìm theo Mã lịch hoặc Biển số xe..."
                      value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    />
                  </div>
                </div>
                <div className="col-md-6 d-flex justify-content-md-end gap-2 flex-wrap">
                  {['all', 'completed', 'cancelled'].map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`btn btn-sm px-3.5 py-2 fw-semibold rounded-pill border-0 ${historyFilter === f ? 'bg-cyan text-white shadow-sm' : 'btn-light text-secondary'}`}
                      onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="app-card p-5 text-center text-muted rounded-4 bg-white border-0 shadow-sm">
                  <div className="mb-3"><i className="fas fa-history fa-3x text-light"></i></div>
                  <h5 className="fw-bold mb-1 text-dark">Chưa có lịch sử giao dịch</h5>
                  <p className="small mb-0">Các lịch hẹn hoàn thành hoặc đã hủy khớp với bộ lọc sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                <>
                  <div className="row g-3">
                    {paginatedHistory.map((b) => {
                      const statusInfo = b.queueStatus
                        ? { label: queueStatusMapper.getLabel(b.queueStatus, b.addons), badgeClass: queueStatusMapper.getBadgeClass(b.queueStatus), icon: queueStatusMapper.getIcon(b.queueStatus) }
                        : translateStatus(b.status);
                      return (
                        <div key={b.id} className="col-md-6 col-lg-4">
                          <div className="app-card border border-light p-4 bg-white rounded-4 shadow-sm hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(b.id)}>
                            <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                              <div>
                                <div className="small text-muted font-monospace mb-0.5">MÃ LỊCH: #{b.id}</div>
                                <span className="fw-bold text-dark font-monospace fs-6">{b.vehicle}</span>
                              </div>
                              <span className={`badge px-2.5 py-1.5 rounded-pill small fw-bold ${statusInfo.badgeClass}`}>
                                <i className={`fas ${statusInfo.icon} me-1`}></i>{statusInfo.label}
                              </span>
                            </div>

                            <div className="mb-3 small text-secondary">
                              <div className="mb-1"><i className="far fa-calendar text-muted me-2"></i>Ngày hẹn: <strong className="text-dark">{b.bookingDate.split('-').reverse().join('/')}</strong></div>
                              <div className="mb-1"><i className="far fa-clock text-muted me-2"></i>Giờ hẹn: <strong className="text-dark">{b.bookingTime}</strong></div>
                              <div className="mb-1"><i className="fas fa-hands-wash text-muted me-2"></i>Dịch vụ chính: <strong className="text-dark">{b.mainService}</strong></div>
                              {b.addons && b.addons.length > 0 && (
                                <div className="mb-1 text-truncate"><i className="fas fa-plus-circle text-muted me-2"></i>Đi kèm: <strong className="text-dark">{b.addons.join(', ')}</strong></div>
                              )}
                              <div><i className="fas fa-coins text-muted me-2"></i>Tích điểm: <strong className="text-warning">+{b.status === 'Completed' ? b.points : 0} PTS</strong></div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                              <div>
                                <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>THÀNH TIỀN</small>
                                <strong className="text-cyan fs-5">{Number(b.price).toLocaleString()}đ</strong>
                              </div>
                              <div className="d-flex gap-2">
                                {b.status === 'Completed' && (
                                  b.hasReview ? (
                                    <button className="btn btn-outline-secondary btn-sm px-3 py-1.5 rounded-3 fw-bold small border text-dark" onClick={(e) => { e.stopPropagation(); handleOpenDetail(b.id); }}>
                                      Xem đánh giá
                                    </button>
                                  ) : (
                                    <button className="btn btn-outline-info btn-sm px-3 py-1.5 rounded-3 fw-bold small" onClick={(e) => { e.stopPropagation(); handleOpenReview(b.id); }}>
                                      Viết đánh giá
                                    </button>
                                  )
                                )}
                                {b.status === 'Cancelled' && (
                                  <button className="btn btn-light btn-sm px-3 py-1.5 rounded-3 fw-bold small border text-danger" onClick={(e) => handleOpenCancelReason(b.id, e)}>
                                    Lý do hủy
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalHistoryPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center mt-4 gap-3">
                      <button
                        className="btn btn-outline-cyan btn-sm px-3 py-2 rounded-3 fw-bold"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      >
                        <i className="fas fa-chevron-left me-1"></i> Trước
                      </button>
                      <span className="small fw-bold text-secondary">Trang {historyPage} / {totalHistoryPages}</span>
                      <button
                        className="btn btn-outline-cyan btn-sm px-3 py-2 rounded-3 fw-bold"
                        disabled={historyPage === totalHistoryPages}
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                      >
                        Sau <i className="fas fa-chevron-right ms-1"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: REVIEWS SYSTEM */}
          {activeTab === 'reviews' && (
            <div className="col-12">
              <div className="d-flex justify-content-start border-bottom pb-1 mb-3 gap-3">
                <button
                  className={`btn btn-sm fw-bold border-0 px-3 py-1.5 rounded-pill ${reviewSubTab === 'pending' ? 'bg-cyan text-white shadow-sm' : 'btn-light text-secondary'}`}
                  onClick={() => setReviewSubTab('pending')}
                >
                  Chờ đánh giá ({pendingReviewBookings.length})
                </button>
                <button
                  className={`btn btn-sm fw-bold border-0 px-3 py-1.5 rounded-pill ${reviewSubTab === 'submitted' ? 'bg-cyan text-white shadow-sm' : 'btn-light text-secondary'}`}
                  onClick={() => setReviewSubTab('submitted')}
                >
                  Đánh giá đã gửi ({myReviews.length})
                </button>
              </div>

              {/* Sub-tab: Pending reviews */}
              {reviewSubTab === 'pending' && (
                pendingReviewBookings.length === 0 ? (
                  <div className="app-card p-5 text-center text-muted rounded-4 bg-white border-0 shadow-sm">
                    <div className="mb-3"><i className="far fa-comment-dots fa-3x text-light"></i></div>
                    <h5 className="fw-bold mb-1 text-dark">Tuyệt vời! Không có lịch đặt chờ đánh giá</h5>
                    <p className="small mb-0">Tất cả lịch đặt hoàn thành của bạn đã được đánh giá hoặc chưa có giao dịch nào.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {pendingReviewBookings.map((b) => (
                      <div key={b.bookingId} className="col-md-6 col-lg-4">
                        <div className="app-card border border-light p-4 bg-white rounded-4 shadow-sm">
                          <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                            <div>
                              <div className="small text-muted font-monospace mb-0.5">MÃ LỊCH: #{b.bookingId}</div>
                              <span className="fw-bold text-dark font-monospace fs-6">{b.vehicle}</span>
                            </div>
                            <span className="badge bg-success bg-opacity-10 text-success px-2.5 py-1.5 rounded-pill small fw-bold">
                              <i className="fas fa-check-circle me-1"></i>Hoàn thành
                            </span>
                          </div>

                          <div className="mb-3 small text-secondary">
                            <div className="mb-1"><i className="far fa-calendar text-muted me-2"></i>Ngày đặt: <strong className="text-dark">{new Date(b.scheduledAt).toLocaleDateString('vi-VN')}</strong></div>
                            <div className="mb-1"><i className="fas fa-hands-wash text-muted me-2"></i>Gói chính: <strong className="text-dark">{b.serviceName}</strong></div>
                            <div><i className="fas fa-wallet text-muted me-2"></i>Chi phí: <strong className="text-cyan">{Number(b.finalPrice).toLocaleString()}đ</strong></div>
                          </div>

                          <div className="d-flex justify-content-end pt-3 border-top">
                            <button className="app-btn-primary px-3.5 py-2 border-0 text-dark fw-bold small" style={{ borderRadius: '10px' }} onClick={() => handleOpenReview(b.bookingId)}>
                              <i className="fas fa-star me-1"></i> Viết đánh giá
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Sub-tab: Submitted reviews */}
              {reviewSubTab === 'submitted' && (
                myReviews.length === 0 ? (
                  <div className="app-card p-5 text-center text-muted rounded-4 bg-white border-0 shadow-sm">
                    <div className="mb-3"><i className="far fa-star fa-3x text-light"></i></div>
                    <h5 className="fw-bold mb-1 text-dark">Chưa có đánh giá nào</h5>
                    <p className="small mb-0">Các đánh giá bạn đã viết cho trạm rửa xe sẽ hiển thị tại đây.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {myReviews.map((r) => (
                      <div key={r.reviewId} className="col-md-6 col-lg-4">
                        <div className="app-card border border-light p-4 bg-white rounded-4 shadow-sm d-flex flex-column justify-content-between h-100">
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                              <div>
                                <span className="fw-bold text-dark font-monospace fs-7">{r.vehicle}</span>
                                <small className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Mã: #{r.bookingId}</small>
                              </div>
                              <div className="text-warning">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <i key={s} className={`${s <= r.rating ? 'fas' : 'far'} fa-star`} style={{ fontSize: '0.75rem' }}></i>
                                ))}
                              </div>
                            </div>

                            <p className="text-dark small mb-3 italic" style={{ fontSize: '0.8rem', minHeight: '40px', wordBreak: 'break-word' }}>
                              "{r.comment || 'Không có bình luận.'}"
                            </p>
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted" style={{ fontSize: '0.68rem' }}>
                            <span>Gói: {r.serviceName}</span>
                            <span>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BOOKING DETAIL MODAL */}
      {showDetailModal && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in text-start" style={{ maxWidth: '580px', width: '100%' }}>
            <div className="confirm-modal-header border-bottom pb-3">
              <h5 className="confirm-modal-title fw-bold text-dark d-flex align-items-center gap-2">
                <i className="fas fa-info-circle text-cyan"></i>
                Chi tiết lịch hẹn #{detailModalBooking?.bookingId || ''}
              </h5>
              <button type="button" className="confirm-modal-close-btn border-0 bg-transparent text-secondary" onClick={handleCloseDetail}>
                <i className="fas fa-times fa-lg"></i>
              </button>
            </div>

            {detailLoading ? (
              <div className="confirm-modal-body text-center py-5">
                <div className="spinner-border text-info mb-2" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
                <p className="text-secondary small">Đang tải chi tiết...</p>
              </div>
            ) : detailModalBooking ? (
              <div className="confirm-modal-body py-3" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                
                {/* 1. Booking overview (merged vehicle and schedule info) */}
                <div className="mb-3 px-1">
                  <h6 className="fw-bold text-secondary mb-2.5" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>TỔNG QUAN LỊCH HẸN</h6>
                  <div className="row g-3 py-1">
                    <div className="col-6 col-sm-4">
                      <small className="text-secondary d-block mb-1" style={{ fontSize: '0.62rem', fontWeight: 600 }}>PHƯƠNG TIỆN</small>
                      <strong className="text-dark font-monospace" style={{ fontSize: '0.82rem' }}>{detailModalBooking.vehicle?.licensePlate}</strong>
                      <span className="text-secondary small d-block" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                        {detailModalBooking.vehicle?.brand} {detailModalBooking.vehicle?.model} ({detailModalBooking.vehicle?.vehicleClass})
                      </span>
                    </div>
                    <div className="col-6 col-sm-4">
                      <small className="text-secondary d-block mb-1" style={{ fontSize: '0.62rem', fontWeight: 600 }}>THỜI GIAN HẸN</small>
                      <strong className="text-dark d-block" style={{ fontSize: '0.82rem' }}>{new Date(detailModalBooking.scheduledAt).toLocaleDateString('vi-VN')}</strong>
                      <span className="badge bg-cyan bg-opacity-10 text-cyan font-monospace mt-0.5" style={{ fontSize: '0.68rem' }}>
                        {new Date(detailModalBooking.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="col-12 col-sm-4">
                      <small className="text-secondary d-block mb-1" style={{ fontSize: '0.62rem', fontWeight: 600 }}>TRẠNG THÁI HIỆN TẠI</small>
                      <span className={`badge px-2.5 py-1.5 rounded-pill small fw-bold ${
                        detailModalBooking.queueStatus
                          ? queueStatusMapper.getBadgeClass(detailModalBooking.queueStatus)
                          : translateStatus(detailModalBooking.status).badgeClass
                      }`} style={{ fontSize: '0.68rem' }}>
                        {detailModalBooking.queueStatus
                          ? queueStatusMapper.getLabel(detailModalBooking.queueStatus, detailModalBooking.addons ? detailModalBooking.addons.map(a => a.serviceName) : [])
                          : translateStatus(detailModalBooking.status).label}
                      </span>
                    </div>
                  </div>
                </div>

                {detailModalBooking.status !== 'Cancelled' && (
                  <>
                    <hr className="my-2.5 opacity-10" />
                    {/* 2. Wash progress timeline */}
                    <div className="mb-2 px-1">
                      <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                        {detailModalBooking.queueStatus === 'Waiting' || detailModalBooking.queueStatus === 'WaitingCheckIn'
                          ? 'LỊCH SẮP DIỄN RA'
                          : 'TIẾN ĐỘ RỬA XE THỰC TẾ'}
                      </h6>
                      <div className="position-relative d-flex flex-column gap-1.5 py-0.5 px-1">
                        {queueStatusMapper.getTimelineSteps(
                          detailModalBooking.status,
                          detailModalBooking.queueStatus,
                          detailModalBooking.addons ? detailModalBooking.addons.map(a => a.serviceName) : []
                        ).map((step, idx) => (
                          <div key={idx} className="d-flex align-items-center gap-2 position-relative py-0.5">
                            <div className="d-flex align-items-center justify-content-center" style={{ width: '16px', height: '16px', zIndex: 2 }}>
                              {step.isCompleted ? (
                                <i className="fas fa-check-circle text-success" style={{ fontSize: '0.78rem' }}></i>
                              ) : step.isActive ? (
                                <i className="fas fa-dot-circle text-primary animate-pulse" style={{ fontSize: '0.78rem' }}></i>
                              ) : (
                                <i className="far fa-circle text-muted" style={{ fontSize: '0.72rem' }}></i>
                              )}
                            </div>
                            <span className={`${step.isCompleted ? 'text-secondary text-decoration-line-through' : step.isActive ? 'text-dark fw-bold' : 'text-muted'}`} style={{ fontSize: '0.74rem' }}>
                              {step.name}
                            </span>
                            {step.isActive && (
                              <span className="badge bg-info bg-opacity-10 text-cyan ms-auto fw-bold" style={{ fontSize: '0.52rem', borderRadius: '4px', padding: '2px 5px' }}>Đang chạy</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <hr className="my-2.5 opacity-10" />

                {/* 3. Services Details */}
                <div className="mb-3 px-1">
                  <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>CHI TIẾT DỊCH VỤ</h6>
                  <div className="py-1">
                    {detailModalBooking.mainService && (
                      <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                        <div>
                          <strong className="text-dark small d-block" style={{ fontSize: '0.78rem' }}>{detailModalBooking.mainService.serviceName}</strong>
                          <small className="text-secondary" style={{ fontSize: '0.65rem' }}>Gói rửa chính</small>
                        </div>
                        <strong className="text-cyan small" style={{ fontSize: '0.78rem' }}>{Number(detailModalBooking.mainService.price).toLocaleString()}đ</strong>
                      </div>
                    )}
                    {detailModalBooking.addons && detailModalBooking.addons.length > 0 ? (
                      detailModalBooking.addons.map((a, i) => (
                        <div key={i} className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light last-border-none">
                          <div>
                            <strong className="text-dark small d-block" style={{ fontSize: '0.78rem' }}>{a.serviceName}</strong>
                            <small className="text-secondary" style={{ fontSize: '0.65rem' }}>Dịch vụ đi kèm</small>
                          </div>
                          <strong className="text-cyan small" style={{ fontSize: '0.78rem' }}>{Number(a.price).toLocaleString()}đ</strong>
                        </div>
                      ))
                    ) : (
                      !detailModalBooking.mainService && <div className="text-muted small italic py-1">Không chọn dịch vụ đi kèm.</div>
                    )}
                  </div>
                </div>

                <hr className="my-2.5 opacity-10" />

                {/* 4. Payments info (Voucher merged here) */}
                <div className="mb-3 px-1">
                  <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>CHI TIẾT THANH TOÁN</h6>
                  <div className="py-1">
                    <div className="d-flex justify-content-between align-items-center mb-1 text-secondary small" style={{ fontSize: '0.75rem' }}>
                      <span>Giá gốc dịch vụ:</span>
                      <strong>{Number(detailModalBooking.basePrice).toLocaleString()}đ</strong>
                    </div>
                    {detailModalBooking.voucher && (
                      <div className="d-flex justify-content-between align-items-center mb-1 small text-success" style={{ fontSize: '0.72rem' }}>
                        <span>Ưu đãi voucher:</span>
                        <span className="fw-bold">
                          <i className="fas fa-ticket-alt me-1"></i>
                          {detailModalBooking.voucher.rewardName}
                        </span>
                      </div>
                    )}
                    {detailModalBooking.promoDiscount > 0 && (
                      <div className="d-flex justify-content-between align-items-center mb-1 text-secondary small" style={{ fontSize: '0.75rem' }}>
                        <span>Giảm giá voucher:</span>
                        <strong className="text-success">-{Number(detailModalBooking.promoDiscount).toLocaleString()}đ</strong>
                      </div>
                    )}
                    <hr className="my-2 opacity-5" />
                    <div className="d-flex justify-content-between align-items-center text-dark">
                      <span className="fw-bold small" style={{ fontSize: '0.78rem' }}>TỔNG THANH TOÁN:</span>
                      <strong className="text-cyan fs-5">{Number(detailModalBooking.finalPrice).toLocaleString()}đ</strong>
                    </div>
                  </div>
                </div>

                <hr className="my-2.5 opacity-10" />

                {/* 5. Loyalty Points info */}
                <div className="mb-3 px-1">
                  <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>LỢI ÍCH THÀNH VIÊN</h6>
                  <div className="py-1 d-flex align-items-center justify-content-between" style={{ fontSize: '0.75rem' }}>
                    <div>
                      <small className="text-secondary d-block mb-0.5" style={{ fontSize: '0.62rem' }}>TIỂU CHUẨN TÍCH ĐIỂM</small>
                      <span className="text-dark font-semibold">Tích lũy điểm khi rửa xe hoàn tất.</span>
                    </div>
                    <div className="text-end">
                      <small className="text-secondary d-block mb-0.5" style={{ fontSize: '0.62rem' }}>ĐIỂM DỰ KIẾN</small>
                      <strong className="text-warning font-monospace" style={{ fontSize: '0.9rem' }}>+{detailModalBooking.pointsEarned} PTS</strong>
                    </div>
                  </div>
                </div>

                {detailModalBooking.hasReview && (
                  <>
                    <hr className="my-2.5 opacity-10" />
                    {/* 5.5. Submitted Review Details */}
                    <div className="mb-3 px-1">
                      <h6 className="fw-bold text-secondary mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>ĐÁNH GIÁ CỦA BẠN</h6>
                      <div className="py-1 text-start">
                        <div className="text-warning mb-1.5" style={{ fontSize: '0.75rem' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <i key={s} className={`${s <= (detailModalBooking.rating || 5) ? 'fas' : 'far'} fa-star`} style={{ fontSize: '0.8rem' }}></i>
                          ))}
                        </div>
                        <div className="small text-secondary italic" style={{ fontSize: '0.75rem' }}>"{detailModalBooking.reviewText || 'Không có bình luận.'}"</div>
                      </div>
                    </div>
                  </>
                )}

                {detailModalBooking.status === 'Cancelled' && (
                  <>
                    <hr className="my-2.5 opacity-10" />
                    {/* 6. Cancellation details */}
                    <div className="mb-3 px-1">
                      <h6 className="fw-bold text-danger mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}><i className="fas fa-exclamation-circle me-1.5"></i>CHI TIẾT HỦY LỊCH HẸN</h6>
                      <div className="py-1 text-start" style={{ fontSize: '0.75rem' }}>
                        <div className="small text-secondary mb-1">Hủy bởi: <strong className="text-dark">{detailModalBooking.cancelledBy === 'Customer' ? 'Khách hàng' : 'Quản trị viên'}</strong></div>
                        {detailModalBooking.cancelledAt && (
                          <div className="small text-secondary mb-1">Thời gian hủy: <strong className="text-dark">{new Date(detailModalBooking.cancelledAt).toLocaleString('vi-VN')}</strong></div>
                        )}
                        <div className="small text-secondary">Lý do: <strong className="text-danger italic">"{detailModalBooking.cancelReason || 'Không có lý do cụ thể.'}"</strong></div>
                      </div>
                    </div>
                  </>
                )}

                {detailModalBooking.status === 'Completed' && (
                  <>
                    <hr className="my-2.5 opacity-10" />
                    {/* 7. Completed details */}
                    <div className="mb-3 px-1 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                      <div>
                        <h6 className="fw-bold text-success mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}><i className="fas fa-check-double me-1.5"></i>HOÀN TẤT DỊCH VỤ</h6>
                        <small className="text-secondary">Thời gian thanh toán: <strong className="text-dark">{detailModalBooking.paidAt ? new Date(detailModalBooking.paidAt).toLocaleString('vi-VN') : 'Đã thanh toán'}</strong></small>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-success text-white fw-bold" style={{ fontSize: '0.65rem', padding: '6px 12px' }}>ĐÃ THANH TOÁN</span>
                      </div>
                    </div>
                  </>
                )}

              </div>
            ) : null}

            <div className="confirm-modal-footer d-flex gap-2 justify-content-end border-top pt-3 mt-2">
              {detailModalBooking && (detailModalBooking.status === 'Pending' || detailModalBooking.status === 'Pending Confirmation' || detailModalBooking.status === 'Confirmed') && (
                <button className="btn btn-outline-danger px-4 py-2 small fw-bold" style={{ borderRadius: '8px' }} onClick={(e) => handleOpenCancel(detailModalBooking.bookingId, e)}>
                  Hủy lịch hẹn
                </button>
              )}
              {detailModalBooking && detailModalBooking.status === 'Completed' && !detailModalBooking.hasReview && (
                <button className="app-btn-primary px-4 py-2 border-0 text-dark fw-bold small" style={{ borderRadius: '8px' }} onClick={() => { handleCloseDetail(); handleOpenReview(detailModalBooking.bookingId); }}>
                  Đánh giá ngay
                </button>
              )}
              <button className="app-btn-secondary px-4 py-2 small" style={{ borderRadius: '8px' }} onClick={handleCloseDetail}>Đóng lại</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCELLATION MODAL */}
      {showCancelModal && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in text-start" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="confirm-modal-header border-bottom pb-3">
              <h5 className="confirm-modal-title fw-bold text-danger">Hủy lịch đặt xe #{cancelTargetId}</h5>
              <button type="button" className="confirm-modal-close-btn border-0 bg-transparent text-secondary" onClick={() => setShowCancelModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body py-3">
              <p className="text-secondary small mb-3">Bạn có chắc chắn muốn hủy lịch hẹn này? Vui lòng cho biết lý do hủy lịch để trạm rửa xe cải tiến chất lượng dịch vụ.</p>
              
              <div className="mb-2">
                <label className="form-label small fw-bold text-muted mb-1">LÝ DO HỦY LỊCH HẸN <span className="text-danger">*</span></label>
                <textarea
                  className="form-control border bg-light text-dark p-2.5 rounded-3"
                  rows="3"
                  placeholder="Ví dụ: Thay đổi kế hoạch cá nhân, Bận đột xuất..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="confirm-modal-footer d-flex gap-2 justify-content-end border-top pt-3">
              <button className="btn btn-light px-4 py-2 small border text-dark" style={{ borderRadius: '8px' }} onClick={() => setShowCancelModal(false)}>Hủy bỏ</button>
              <button className="btn btn-danger px-4 py-2 small fw-bold" style={{ borderRadius: '8px' }} disabled={cancelling} onClick={handleSubmitCancel}>
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW SYSTEM POPUP */}
      {showReviewModal && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in text-start" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="confirm-modal-header border-bottom pb-3">
              <h5 className="confirm-modal-title fw-bold text-dark"><i className="fas fa-star text-warning me-1.5"></i>Đánh giá chất lượng dịch vụ</h5>
              <button type="button" className="confirm-modal-close-btn border-0 bg-transparent text-secondary" onClick={() => setShowReviewModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body py-3">
              <p className="text-secondary small mb-4">Chia sẻ trải nghiệm rửa xe của bạn tại trạm. Đánh giá của bạn sẽ giúp trạm nâng cao phục vụ và hỗ trợ khách hàng tốt hơn.</p>
              
              {/* Stars Selection */}
              <div className="text-center mb-4">
                <div className="d-flex justify-content-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <i
                      key={val}
                      className="fas fa-star fa-2x cursor-pointer transition-all"
                      style={{
                        cursor: 'pointer',
                        color: val <= reviewRating ? '#ffcf33' : '#cbd5e1',
                        textShadow: val <= reviewRating ? '0 0 12px rgba(255,207,51,0.4)' : 'none',
                        transform: val === reviewRating ? 'scale(1.1)' : 'scale(1)'
                      }}
                      onClick={() => setReviewRating(val)}
                    ></i>
                  ))}
                </div>
                <small className="text-secondary d-block mt-2.5 fw-bold" style={{ fontSize: '0.78rem' }}>
                  {reviewRating === 5 ? 'Rất hài lòng 😍' :
                   reviewRating === 4 ? 'Hài lòng 🙂' :
                   reviewRating === 3 ? 'Bình thường 😐' :
                   reviewRating === 2 ? 'Kém 😢' : 'Rất kém 😡'}
                </small>
              </div>

              {/* Feedback text */}
              <div className="mb-2">
                <label className="form-label small fw-bold text-muted mb-1">NỘI DUNG ĐÁNH GIÁ (TÙY CHỌN)</label>
                <textarea
                  className="form-control border bg-light text-dark p-2.5 rounded-3"
                  rows="3"
                  placeholder="Hãy chia sẻ ý kiến của bạn về độ sạch, thái độ phục vụ của nhân viên, không gian chờ..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="confirm-modal-footer d-flex gap-2 justify-content-end border-top pt-3">
              <button className="btn btn-light px-4 py-2 small border text-dark" style={{ borderRadius: '8px' }} onClick={() => setShowReviewModal(false)}>Hủy bỏ</button>
              <button className="app-btn-primary px-4 py-2 border-0 text-dark fw-bold small" style={{ borderRadius: '8px' }} disabled={submittingReview} onClick={handleSubmitReview}>
                {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW CANCELLATION REASON POPUP */}
      {showCancelReasonModal && cancelReasonDetails && (
        <div className="confirm-modal-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card animate-confirm-in text-start" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="confirm-modal-header border-bottom pb-3">
              <h5 className="confirm-modal-title fw-bold text-danger"><i className="fas fa-exclamation-circle me-1.5"></i>Chi tiết hủy lịch đặt xe</h5>
              <button type="button" className="confirm-modal-close-btn border-0 bg-transparent text-secondary" onClick={() => setShowCancelReasonModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="confirm-modal-body py-3">
              <div className="mb-3">
                <small className="text-muted d-block mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>ĐƠN ĐẶT LỊCH</small>
                <strong className="text-dark">Mã lịch hẹn: #{cancelReasonDetails.id}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>HỦY BỞI</small>
                <strong className="text-dark">
                  {cancelReasonDetails.cancelledBy === 'Customer' ? 'Khách hàng' : 'Quản trị viên / Hệ thống'}
                </strong>
              </div>
              {cancelReasonDetails.cancelledAt && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>THỜI GIAN HỦY</small>
                  <strong className="text-dark">
                    {new Date(cancelReasonDetails.cancelledAt).toLocaleString('vi-VN')}
                  </strong>
                </div>
              )}
              <div>
                <small className="text-muted d-block mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>LÝ DO HỦY LỊCH</small>
                <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-3 text-danger italic small" style={{ wordBreak: 'break-word' }}>
                  "{cancelReasonDetails.reason || 'Không có lý do cụ thể.'}"
                </div>
              </div>
            </div>
            <div className="confirm-modal-footer d-flex gap-2 justify-content-end border-top pt-3">
              <button className="app-btn-secondary px-4 py-2 small" style={{ borderRadius: '8px' }} onClick={() => setShowCancelReasonModal(false)}>Đóng lại</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerBookings;
