import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import '../styles/shared.css';
import '../styles/admin/dashboard.css';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    revenue7Days: [0, 0, 0, 0, 0, 0, 0],
    totalRevenue: 0,
    prevTotalRevenue: 0,
    activeQueue: 0,
    avgMinutes: 0,
    avgStars: 0.0,
    tierDistribution: { Platinum: 0, Gold: 0, Silver: 0, Member: 0 },
    dayLabels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  });

  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pointsPerThousandVND: 1,
    pointExpiryMonths: 12,
    tierReviewDayOfMonth: 1,
    rankingWindowYears: 2,
    tiers: []
  });

  const [reviewList, setReviewList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'loyalty' | 'tierReview'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await adminService.getDashboardStats();
      setStats(statsRes);
      
      const configRes = await adminService.getLoyaltyConfig();
      setLoyaltyConfig(configRes);

      const reviewRes = await adminService.tierReview();
      setReviewList(reviewRes);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault();
    try {
      const response = await adminService.saveLoyaltyConfig({
        PointsPerThousandVND: loyaltyConfig.pointsPerThousandVND,
        PointExpiryMonths: loyaltyConfig.pointExpiryMonths,
        TierReviewDayOfMonth: loyaltyConfig.tierReviewDayOfMonth,
        RankingWindowYears: loyaltyConfig.rankingWindowYears,
        TierUpdates: loyaltyConfig.tiers.map(t => ({
          TierId: t.tierId,
          PointMultiplier: t.pointMultiplier,
          DiscountPercent: t.discountPercent,
          BookingWindowDays: t.bookingWindowDays
        }))
      });

      if (response.success) {
        if (window.showToast) window.showToast('Lưu cấu hình quy chế tích điểm thành công!', 'success');
      } else {
        if (window.showToast) window.showToast('Lỗi lưu cấu hình!', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  const handleRunTierReview = async () => {
    const run = async () => {
      try {
        const response = await adminService.runTierReview();
        if (response.success) {
          if (window.showToast) {
            window.showToast(`Xếp hạng hoàn tất! Nâng hạng: ${response.upgrades}, Hạ hạng: ${response.downgrades}`, 'success');
          }
          fetchDashboardData();
        } else {
          if (window.showToast) window.showToast('Lỗi khi chạy review!', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast('Lỗi kết nối máy chủ!', 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Chạy Xếp Hạng Định Kỳ', 'Bạn có chắc chắn muốn áp dụng xếp hạng mới cho toàn bộ khách hàng ngay bây giờ?', run);
    } else {
      if (window.confirm('Chạy xếp hạng?')) {
        run();
      }
    }
  };

  const handleUpdateTierConfig = (idx, field, val) => {
    const updatedTiers = [...loyaltyConfig.tiers];
    updatedTiers[idx] = { ...updatedTiers[idx], [field]: Number(val) };
    setLoyaltyConfig({ ...loyaltyConfig, tiers: updatedTiers });
  };

  const revPctChange = stats.prevTotalRevenue > 0
    ? Math.round(((stats.totalRevenue - stats.prevTotalRevenue) / stats.prevTotalRevenue) * 100)
    : 0;

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 text-start">
      {/* Header and navigation tabs */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>BẢNG ĐIỀU KHIỂN HỆ THỐNG</h4>
          <p className="text-secondary small mb-0">Hệ thống quản lý, giám sát và cấu hình đặc quyền rửa xe thông minh</p>
        </div>
        <div className="d-flex bg-white shadow-sm p-1 rounded-3 gap-1">
          <button className={`btn btn-sm px-3 border-0 ${activeTab === 'stats' ? 'app-btn-primary text-dark' : 'text-muted'}`} onClick={() => setActiveTab('stats')}>
            <i className="fas fa-chart-line me-2"></i>Thống kê
          </button>
          <button className={`btn btn-sm px-3 border-0 ${activeTab === 'loyalty' ? 'app-btn-primary text-dark' : 'text-muted'}`} onClick={() => setActiveTab('loyalty')}>
            <i className="fas fa-cogs me-2"></i>Quy chế VIP
          </button>
          <button className={`btn btn-sm px-3 border-0 ${activeTab === 'tierReview' ? 'app-btn-primary text-dark' : 'text-muted'}`} onClick={() => setActiveTab('tierReview')}>
            <i className="fas fa-users-cog me-2"></i>Xếp hạng tháng
          </button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <>
          {/* Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
                <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>DOANH THU 7 NGÀY</small>
                <h4 className="fw-bold text-cyan mt-1 mb-1">{stats.totalRevenue.toLocaleString()}đ</h4>
                <small className={revPctChange >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'} style={{ fontSize: '0.72rem' }}>
                  <i className={`fas ${revPctChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} me-1`}></i>
                  {Math.abs(revPctChange)}% so với tuần trước
                </small>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
                <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>XE ĐANG RỬA (QUEUE)</small>
                <h4 className="fw-bold text-dark mt-1 mb-1">{stats.activeQueue} xe</h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>Xe trong hàng chờ & đang rửa</small>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
                <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>THỜI GIAN RỬA TB</small>
                <h4 className="fw-bold text-dark mt-1 mb-1">{stats.avgMinutes} phút</h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>Tính từ check-in đến hoàn tất</small>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
                <small className="text-muted d-block fw-bold" style={{ fontSize: '0.65rem' }}>ĐÁNH GIÁ TRUNG BÌNH</small>
                <h4 className="fw-bold text-warning mt-1 mb-1">{stats.avgStars} <i className="fas fa-star" style={{ color: '#ffcf33', fontSize: '1.2rem' }}></i></h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>Tổng sao đánh giá từ khách hàng</small>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Revenue Chart preview (Simulated with CSS bars for neat premium aesthetics) */}
            <div className="col-lg-8">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4" style={{ minHeight: '380px' }}>
                <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
                  <i className="fas fa-chart-bar text-cyan me-2"></i>BIỂU ĐỒ DOANH THU 7 NGÀY GẦN NHẤT
                </h5>
                <div className="d-flex align-items-end justify-content-between px-3 mt-5" style={{ height: '220px', borderBottom: '1.5px solid #f1f5f9' }}>
                  {stats.revenue7Days.map((val, idx) => {
                    const max = Math.max(...stats.revenue7Days) || 1;
                    const pct = Math.max(10, Math.round((val / max) * 100));
                    return (
                      <div key={idx} className="text-center d-flex flex-column align-items-center" style={{ flex: 1 }}>
                        <small className="text-cyan fw-bold mb-2" style={{ fontSize: '0.68rem' }}>{val > 0 ? `${Math.round(val / 1000)}k` : '0'}</small>
                        <div
                          className="w-50 rounded-top"
                          style={{
                            height: `${pct * 1.5}px`,
                            background: 'linear-gradient(180deg, var(--cyan-electric) 0%, rgba(6,182,212,0.3) 100%)',
                            boxShadow: '0 4px 15px rgba(6,182,212,0.15)',
                            transition: 'height 0.8s ease'
                          }}
                        ></div>
                        <small className="text-muted fw-semibold mt-2" style={{ fontSize: '0.72rem' }}>{stats.dayLabels[idx]}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Customer Tier Distribution */}
            <div className="col-lg-4">
              <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4" style={{ minHeight: '380px' }}>
                <h5 className="fw-bold mb-4" style={{ color: 'var(--navy-dark)' }}>
                  <i className="fas fa-chart-pie text-cyan me-2"></i>CƠ CẤU HẠNG THÀNH VIÊN
                </h5>
                <div className="d-flex flex-column gap-3 mt-4">
                  {Object.entries(stats.tierDistribution).map(([tier, count]) => {
                    const total = Object.values(stats.tierDistribution).reduce((s, i) => s + i, 0) || 1;
                    const pct = Math.round((count / total) * 100);

                    const colors = {
                      Platinum: 'bg-info',
                      Gold: 'bg-warning',
                      Silver: 'bg-secondary',
                      Member: 'bg-dark'
                    };

                    return (
                      <div key={tier} className="text-start">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold small" style={{ color: 'var(--navy-dark)' }}>{tier} Member</span>
                          <span className="text-muted small fw-bold">{count} xe ({pct}%)</span>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '10px' }}>
                          <div className={`progress-bar ${colors[tier] || 'bg-cyan'}`} style={{ width: `${pct}%`, borderRadius: '10px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'loyalty' && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <h5 className="fw-bold mb-4 border-bottom pb-2.5" style={{ color: 'var(--navy-dark)' }}>
            <i className="fas fa-cogs text-cyan me-2"></i>CẤU HÌNH QUY CHẾ TÍCH ĐIỂM & ĐẶC QUYỀN VIP
          </h5>
          <form onSubmit={handleSaveLoyaltyConfig}>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">SỐ ĐIỂM TÍCH LŨY / 1.000 VNĐ CHIT TIÊU</label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5"
                  value={loyaltyConfig.pointsPerThousandVND}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointsPerThousandVND: Number(e.target.value) })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">HẠN HẾT HẠN ĐIỂM (THÁNG)</label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5"
                  value={loyaltyConfig.pointExpiryMonths}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointExpiryMonths: Number(e.target.value) })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">NGÀY REVIEW HẠNG HÀNG THÁNG</label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5"
                  value={loyaltyConfig.tierReviewDayOfMonth}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, tierReviewDayOfMonth: Number(e.target.value) })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted">CỬA SỔ XẾP HẠNG (NĂM)</label>
                <input
                  type="number"
                  className="form-control bg-light border-0 py-2.5"
                  value={loyaltyConfig.rankingWindowYears}
                  onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, rankingWindowYears: Number(e.target.value) })}
                />
              </div>
            </div>

            <h6 className="fw-bold mb-3 mt-4" style={{ color: 'var(--navy-dark)' }}>CẤU HÌNH ĐẶC QUYỀN VIP CHO TỪNG PHÂN HẠNG</h6>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr className="bg-light">
                    <th>Hạng thành viên</th>
                    <th>Ngưỡng chi tiêu tối thiểu (VNĐ)</th>
                    <th>Hệ số điểm thưởng</th>
                    <th>% Chiết khấu hóa đơn</th>
                    <th>Số ngày đặt lịch tối đa</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyConfig.tiers.map((t, i) => (
                    <tr key={t.tierId}>
                      <td className="fw-bold">{t.tierName}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm bg-light border-0"
                          readOnly
                          value={t.minRankingBalance}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-sm bg-light border-0"
                          value={t.pointMultiplier}
                          onChange={(e) => handleUpdateTierConfig(i, 'pointMultiplier', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm bg-light border-0"
                          value={t.discountPercent}
                          onChange={(e) => handleUpdateTierConfig(i, 'discountPercent', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm bg-light border-0"
                          value={t.bookingWindowDays}
                          onChange={(e) => handleUpdateTierConfig(i, 'bookingWindowDays', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="submit" className="app-btn-primary py-2.5 px-5 mt-4" style={{ borderRadius: '12px' }}>
              LƯU CẤU HÌNH QUY CHẾ
            </button>
          </form>
        </div>
      )}

      {activeTab === 'tierReview' && (
        <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-2.5">
            <div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-users-cog text-cyan me-2"></i>CHẠY XẾP HẠNG THÀNH VIÊN ĐỊNH KỲ
              </h5>
              <p className="text-secondary small mb-0">Hệ thống phân tích mức tích lũy trượt chi tiêu của khách hàng để tự động cập nhật VIP Tier</p>
            </div>
            <button className="app-btn-primary py-2 px-4 shadow-none" style={{ borderRadius: '10px' }} onClick={handleRunTierReview}>
              <i className="fas fa-play me-2"></i>ÁP DỤNG XẾP HẠNG NGAY
            </button>
          </div>

          <h6 className="fw-bold mb-3" style={{ color: 'var(--navy-dark)' }}>BẢNG DỰ ĐOÁN THAY ĐỔI HẠNG KHÁCH HÀNG</h6>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="bg-light">
                  <th>Tên khách hàng</th>
                  <th>Hạng hiện tại</th>
                  <th>Tích lũy chi tiêu</th>
                  <th>Dự báo hạng mới</th>
                  <th>Trạng thái</th>
                  <th>Lý do điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {reviewList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">Không có dữ liệu thay đổi hạng nào cần xem xét</td>
                  </tr>
                ) : (
                  reviewList.map((item, idx) => {
                    const dirClass = item.direction === 'up' ? 'badge bg-success bg-opacity-10 text-success' :
                                     item.direction === 'down' ? 'badge bg-danger bg-opacity-10 text-danger' :
                                     'badge bg-secondary bg-opacity-10 text-secondary';
                    const dirLabel = item.direction === 'up' ? 'NÂNG HẠNG' :
                                     item.direction === 'down' ? 'HẠ HẠNG' : 'GIỮ NGUYÊN';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td className="fw-bold">{item.name}</td>
                        <td>{item.currentTier}</td>
                        <td className="fw-bold text-cyan">{item.rankingBalance.toLocaleString()}đ</td>
                        <td className="fw-bold text-warning">{item.predictedTier}</td>
                        <td>
                          <span className={`${dirClass} px-3 py-1 rounded-pill fw-bold`} style={{ fontSize: '0.65rem' }}>{dirLabel}</span>
                        </td>
                        <td className="text-muted small">{item.reason}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;
