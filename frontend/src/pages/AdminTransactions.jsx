import { useState, useEffect, useCallback } from "react";
import { adminService } from "../services/adminService";
import { Table } from "../components/Table";
import "../styles/shared.css";

// Payment status (issue #50): 1 Pending, 2 Paid, 3 Failed, 4 Expired
const getPaymentStatusStyle = (status) => {
  switch (status) {
    case 2:
      return { cls: "bg-success bg-opacity-10 text-success", icon: "fa-check-circle" };
    case 1:
      return { cls: "bg-warning bg-opacity-10 text-warning", icon: "fa-clock" };
    case 3:
      return { cls: "bg-danger bg-opacity-10 text-danger", icon: "fa-times-circle" };
    case 4:
      return { cls: "bg-secondary bg-opacity-10 text-secondary", icon: "fa-ban" };
    default:
      return { cls: "bg-secondary bg-opacity-10 text-secondary", icon: "fa-question-circle" };
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
};

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getTransactions({
        status: statusFilter,
        method: methodFilter,
        fromDate,
        toDate,
      });
      if (res.success && res.transactions) {
        setTransactions(res.transactions);
      } else {
        setTransactions([]);
        if (window.showToast)
          window.showToast(res.message || "Không tải được lịch sử giao dịch!", "error");
      }
    } catch {
      setTransactions([]);
      if (window.showToast) window.showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, fromDate, toDate]);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = () => {
    setStatusFilter("");
    setMethodFilter("");
    setFromDate("");
    setToDate("");
  };

  // Summary
  const paidList = transactions.filter((t) => t.status === 2);
  const totalPaidAmount = paidList.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="container-fluid py-4 text-start">
      <header className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 animate-up">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>
            LỊCH SỬ GIAO DỊCH
          </h4>
          <p className="text-secondary small mb-0">
            Theo dõi toàn bộ giao dịch thanh toán của khách hàng
          </p>
        </div>
        <button
          className="btn btn-dark btn-sm py-2 px-3 fw-bold rounded-3"
          onClick={loadTransactions}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-1"></i> LÀM MỚI
        </button>
      </header>

      {/* Summary */}
      <div className="row g-3 mb-4 animate-up">
        <div className="col-6 col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-cyan"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-receipt"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                TỔNG GIAO DỊCH
              </small>
              <h5 className="fw-bold text-dark mb-0">{transactions.length}</h5>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-success"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                ĐÃ THANH TOÁN
              </small>
              <h5 className="fw-bold text-success mb-0">{paidList.length}</h5>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light text-warning"
              style={{ width: "46px", height: "46px", flexShrink: 0 }}
            >
              <i className="fas fa-wallet"></i>
            </div>
            <div>
              <small className="text-muted d-block fw-bold" style={{ fontSize: "0.65rem" }}>
                DOANH THU ĐÃ THU
              </small>
              <h5 className="fw-bold text-dark mb-0">
                {totalPaidAmount.toLocaleString()}đ
              </h5>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-3 mb-4 animate-up align-items-end">
        <div className="col-md-3 col-sm-6">
          <label className="form-label small fw-bold text-muted">TRẠNG THÁI</label>
          <select
            className="form-select bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none", cursor: "pointer" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="1">Chờ thanh toán</option>
            <option value="2">Đã thanh toán</option>
            <option value="3">Thất bại</option>
            <option value="4">Hết hạn</option>
          </select>
        </div>
        <div className="col-md-3 col-sm-6">
          <label className="form-label small fw-bold text-muted">PHƯƠNG THỨC</label>
          <select
            className="form-select bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none", cursor: "pointer" }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="">Tất cả phương thức</option>
            <option value="1">Tiền mặt</option>
            <option value="2">VNPay</option>
            <option value="3">PayOS</option>
          </select>
        </div>
        <div className="col-md-2 col-sm-6">
          <label className="form-label small fw-bold text-muted">TỪ NGÀY</label>
          <input
            type="date"
            className="form-control bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none" }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="col-md-2 col-sm-6">
          <label className="form-label small fw-bold text-muted">ĐẾN NGÀY</label>
          <input
            type="date"
            className="form-control bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: "10px", boxShadow: "none" }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="col-md-2 col-sm-12 d-flex gap-2">
          <button
            className="btn btn-cyan flex-grow-1 py-2.5 fw-bold text-white"
            style={{ borderRadius: "10px", background: "var(--cyan-electric)", border: "none" }}
            onClick={loadTransactions}
            disabled={loading}
          >
            Áp dụng
          </button>
          <button
            className="btn btn-outline-secondary py-2.5 fw-bold"
            style={{ borderRadius: "10px" }}
            onClick={resetFilters}
            title="Xóa bộ lọc"
          >
            <i className="fas fa-eraser"></i>
          </button>
        </div>
      </div>

      {/* Table or states */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info mb-2" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-secondary small">Đang tải lịch sử giao dịch...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div
          className="app-card border-0 shadow-sm p-5 text-center text-muted animate-up"
          style={{ borderRadius: "24px" }}
        >
          <i className="fas fa-receipt fa-3x mb-3 text-muted" style={{ opacity: 0.25 }}></i>
          <h5 className="fw-bold mb-2" style={{ color: "var(--navy-dark)" }}>
            Không tìm thấy giao dịch nào
          </h5>
          <p className="text-muted small mb-0">
            Hãy thử điều chỉnh lại các bộ lọc ở trên.
          </p>
        </div>
      ) : (
        <Table
          headers={[
            { label: "Mã hóa đơn", className: "ps-4 py-3" },
            { label: "Khách hàng" },
            { label: "Xe" },
            { label: "Số tiền (đ)", className: "text-end" },
            { label: "Phương thức", className: "text-center" },
            { label: "Trạng thái", className: "text-center" },
            { label: "Thời gian", className: "text-end pe-4" },
          ]}
        >
          {transactions.map((t) => {
            const st = getPaymentStatusStyle(t.status);
            return (
              <tr key={t.paymentId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td className="ps-4 py-3">
                  <span className="fw-bold d-block text-dark font-monospace" style={{ fontSize: "0.82rem" }}>
                    {t.invoiceNumber}
                  </span>
                  <small className="text-muted">Lịch hẹn #{t.bookingId}</small>
                </td>
                <td>
                  <span className="fw-bold d-block text-dark" style={{ fontSize: "0.85rem" }}>
                    {t.customerName || "—"}
                  </span>
                  <small className="text-muted">{t.customerPhone || ""}</small>
                </td>
                <td>
                  <span className="text-dark font-monospace" style={{ fontSize: "0.8rem" }}>
                    {t.licensePlate || "—"}
                  </span>
                </td>
                <td className="text-end">
                  <span className="fw-bold text-dark">{Number(t.amount).toLocaleString()}</span>
                </td>
                <td className="text-center">
                  <span
                    className="badge rounded-pill px-3 py-1.5 border-0 bg-info bg-opacity-10 text-cyan"
                    style={{ fontSize: "0.62rem" }}
                  >
                    {t.paymentMethodName}
                  </span>
                </td>
                <td className="text-center">
                  <span className={`badge px-3 py-1.5 rounded-pill fw-bold ${st.cls}`} style={{ fontSize: "0.62rem" }}>
                    <i className={`fas me-1 ${st.icon}`}></i>
                    {t.statusName}
                  </span>
                </td>
                <td className="text-end pe-4">
                  <span className="text-dark d-block" style={{ fontSize: "0.78rem" }}>
                    {formatDateTime(t.paidAt || t.createdAt)}
                  </span>
                  {t.transactionNo && (
                    <small className="text-muted font-monospace" style={{ fontSize: "0.68rem" }}>
                      {t.transactionNo}
                    </small>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
};

export default AdminTransactions;
