import { useState, useEffect, useCallback } from 'react';
import '../styles/shared.css';
import '../styles/admin/services.css';
import { adminService } from '../services/adminService';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import Table from '../components/Table';

export const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states for add/edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);

  const [svcName, setSvcName] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcCategory, setSvcCategory] = useState('Dịch vụ chính');
  const [svcPrice, setSvcPrice] = useState(30000);
  const [svcMinutes, setSvcMinutes] = useState(15);
  const [svcActive, setSvcActive] = useState(true);
  const [svcFeatured, setSvcFeatured] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const res = await adminService.getServices();
      if (res && res.success) {
        setServices(res.services);
      } else {
        if (window.showToast) window.showToast('Không thể tải danh sách dịch vụ', 'error');
      }
    } catch (e) {
      console.error('Failed to parse app_services', e);
      if (window.showToast) window.showToast('Lỗi tải danh sách dịch vụ', 'error');
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const openAddServiceModal = useCallback(() => {
    setModalMode('add');
    setEditingId(null);
    setSvcName('');
    setSvcDesc('');
    setSvcCategory('Dịch vụ chính');
    setSvcPrice(30000);
    setSvcMinutes(15);
    setSvcActive(true);
    setSvcFeatured(false);
    setShowModal(true);
  }, []);

  const openEditServiceModal = useCallback((s) => {
    setModalMode('edit');
    setEditingId(s.id);
    setSvcName(s.name || '');
    setSvcDesc(s.description || '');
    setSvcCategory(s.category || 'Dịch vụ chính');
    setSvcPrice(s.price || 0);
    setSvcMinutes(s.estimatedMinutes || 15);
    setSvcActive(s.isActive !== undefined ? s.isActive : s.status === 'Active');
    setSvcFeatured(!!s.isFeatured);
    setShowModal(true);
  }, []);

  const closeServiceModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const saveService = useCallback(async (e) => {
    e.preventDefault();
    if (!svcName.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền tên dịch vụ', 'error');
      return;
    }

    const payload = {
      id: modalMode === 'edit' ? editingId : null,
      name: svcName.trim(),
      description: svcDesc.trim(),
      category: svcCategory,
      price: Number(svcPrice),
      estimatedMinutes: Number(svcMinutes),
      isActive: svcActive,
      isFeatured: svcFeatured
    };

    try {
      const res = await adminService.saveService(payload);
      if (res && res.success) {
        if (window.showToast) {
          window.showToast(modalMode === 'add' ? `Đã thêm dịch vụ "${payload.name}" thành công!` : 'Cập nhật thông tin dịch vụ thành công!', 'success');
        }
        loadServices();
        closeServiceModal();
      } else {
        if (window.showToast) window.showToast(res.message || 'Lỗi lưu dịch vụ', 'error');
      }
    } catch (e) {
      console.error('Failed to save service', e);
      if (window.showToast) window.showToast('Lỗi lưu dịch vụ', 'error');
    }
  }, [modalMode, editingId, svcName, svcDesc, svcCategory, svcPrice, svcMinutes, svcActive, svcFeatured, loadServices, closeServiceModal]);

  const toggleServiceActive = useCallback(async (id) => {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    try {
      const res = await adminService.toggleService(id);
      if (res && res.success) {
        const current = s.isActive !== undefined ? s.isActive : s.status === 'Active';
        const next = !current;
        if (window.showToast) {
          window.showToast(`Đã ${next ? 'KÍCH HOẠT' : 'ẨN'} dịch vụ "${s.name}"`, next ? 'success' : 'warning');
        }
        loadServices();
      } else {
        if (window.showToast) window.showToast(res.message || 'Không thể thay đổi trạng thái', 'error');
      }
    } catch (e) {
      console.error('Failed to toggle status', e);
      if (window.showToast) window.showToast('Lỗi thay đổi trạng thái', 'error');
    }
  }, [services, loadServices]);

  const deleteService = useCallback(async (id) => {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    
    const performDelete = async () => {
      try {
        const res = await adminService.deleteService(id);
        if (res && res.success) {
          if (window.showToast) window.showToast(`Đã xóa dịch vụ "${s.name}" khỏi hệ thống.`, 'success');
          loadServices();
        } else {
          if (window.showToast) window.showToast(res.message || 'Không thể xóa dịch vụ', 'error');
        }
      } catch (e) {
        console.error('Failed to delete service', e);
        const errMsg = e.response?.data?.message || 'Lỗi xóa dịch vụ';
        if (window.showToast) window.showToast(errMsg, 'error');
      }
    };

    if (window.showConfirm) {
      window.showConfirm('Xóa dịch vụ', `Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${s.name}"? Thao tác này không thể hoàn tác.`, performDelete);
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${s.name}"?`)) {
        performDelete();
      }
    }
  }, [services, loadServices]);

  const filteredServices = services.filter(s => {
    const active = s.isActive !== undefined ? s.isActive : s.status === 'Active';
    const matchSearch = !searchTerm ||
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || s.category === categoryFilter;
    const matchStat = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && active) ||
      (statusFilter === 'INACTIVE' && !active);
    return matchSearch && matchCat && matchStat;
  });

  return (
    <div className="container-fluid py-4 text-start">
      <header className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 animate-up">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.5px' }}>DANH MỤC DỊCH VỤ</h4>
          <p className="text-secondary small mb-0">Quản lý danh mục gói rửa chính và các dịch vụ giá trị gia tăng đi kèm</p>
        </div>
        <button
          className="btn btn-dark btn-sm py-2 px-3 fw-bold rounded-3"
          onClick={openAddServiceModal}
        >
          <i className="fas fa-plus me-1"></i> THÊM DỊCH VỤ MỚI
        </button>
      </header>

      {/* Filters */}
      <div className="row g-3 mb-4 animate-up">
        <div className="col-md-5">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm dịch vụ theo tên, mô tả..."
          />
        </div>
        <div className="col-md-4 col-sm-6">
          <select
            className="form-select bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: '10px', outline: 'none', boxShadow: 'none', cursor: 'pointer' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại dịch vụ</option>
            <option value="Dịch vụ chính">Dịch vụ chính (Main)</option>
            <option value="Dịch vụ đi kèm">Dịch vụ đi kèm (Add-on)</option>
          </select>
        </div>
        <div className="col-md-3 col-sm-6">
          <select
            className="form-select bg-white border-0 py-2.5 shadow-sm fw-semibold text-dark"
            style={{ borderRadius: '10px', outline: 'none', boxShadow: 'none', cursor: 'pointer' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (Active)</option>
            <option value="INACTIVE">Tạm ẩn (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Services Table or Empty State */}
      {filteredServices.length === 0 ? (
        <div className="app-card border-0 shadow-sm p-5 text-center text-muted animate-up" style={{ borderRadius: '24px' }}>
          <i className="fas fa-box-open fa-3x mb-3 text-muted" style={{ opacity: 0.25 }}></i>
          <h5 className="fw-bold mb-2" style={{ color: 'var(--navy-dark)' }}>Không tìm thấy dịch vụ nào</h5>
          <p className="text-muted small mb-0">Hãy thử đổi từ khóa tìm kiếm hoặc điều chỉnh lại các bộ lọc ở trên.</p>
        </div>
      ) : (
        <Table
          headers={[
            { label: 'Tên dịch vụ', className: 'ps-4 py-3' },
            { label: 'Loại dịch vụ' },
            { label: 'Giá tiền' },
            { label: 'Thời gian ước tính' },
            { label: 'Nổi bật' },
            { label: 'Trạng thái' },
            { label: 'Hành động', className: 'text-end pe-4' }
          ]}
          emptyMessage="Không tìm thấy dịch vụ nào"
        >
          {filteredServices.map(s => {
            const active = s.isActive !== undefined ? s.isActive : s.status === 'Active';
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="ps-4 py-3">
                  <span className="fw-bold d-block text-dark" style={{ fontSize: '0.85rem' }}>{s.name}</span>
                  <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>{s.description || ''}</small>
                </td>
                <td>
                  <span className={`badge rounded-pill px-3 py-1.5 border-0 ${s.category === 'Dịch vụ chính' ? 'bg-info bg-opacity-10 text-cyan' : 'bg-secondary bg-opacity-10 text-secondary'}`} style={{ fontSize: '0.62rem' }}>
                    {s.category || 'Dịch vụ đi kèm'}
                  </span>
                </td>
                <td><span className="fw-bold text-dark">{Number(s.price).toLocaleString()}đ</span></td>
                <td>
                  <span className="fw-bold text-cyan">
                    <i className="far fa-clock me-1"></i>{s.estimatedMinutes || 15} phút
                  </span>
                </td>
                <td>
                  {s.isFeatured ? (
                    <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '0.6rem' }}>
                      <i className="fas fa-star me-1"></i> Nổi bật
                    </span>
                  ) : (
                    <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                  )}
                </td>
                <td>
                  {active ? (
                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1.5 fw-bold" style={{ fontSize: '0.6rem' }}>Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1.5 fw-bold" style={{ fontSize: '0.6rem' }}>Tạm ẩn</span>
                  )}
                </td>
                <td className="text-end pe-4">
                  <div className="d-flex justify-content-end gap-1.5">
                    <button
                      className="btn btn-sm btn-light py-1.5 px-2.5 font-bold border rounded-3 shadow-sm text-dark"
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => openEditServiceModal(s)}
                    >
                      <i className="fas fa-edit me-1"></i> SỬA
                    </button>
                    <button
                      className={`btn btn-sm py-1.5 px-2.5 font-bold border rounded-3 shadow-sm ${active ? 'btn-outline-warning text-warning' : 'btn-outline-success text-success'}`}
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => toggleServiceActive(s.id)}
                    >
                      {active ? <><i className="fas fa-eye-slash me-1"></i> ẨN</> : <><i className="fas fa-eye me-1"></i> HIỆN</>}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger py-1.5 px-2.5 font-bold border-0 rounded-circle"
                      onClick={() => deleteService(s.id)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Add / Edit Service Modal Overlay */}
      <Modal
        isOpen={showModal}
        onClose={closeServiceModal}
        title={modalMode === 'add' ? 'THÊM DỊCH VỤ MỚI' : 'SỬA THÔNG TIN DỊCH VỤ'}
        maxWidth="600px"
      >
        <form onSubmit={saveService} className="text-start">
          <div className="row g-3 mb-3">
            <div className="col-12">
              <label className="form-label small fw-bold text-muted mb-1">Tên dịch vụ <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control border rounded-3 py-2 px-3 fw-semibold bg-light text-dark"
                placeholder="Ví dụ: Rửa xe phổ thông"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold text-muted mb-1">Mô tả chi tiết</label>
              <textarea
                rows="3"
                className="form-control border rounded-3 py-2 px-3 bg-light text-dark"
                placeholder="Mô tả các công đoạn rửa..."
                value={svcDesc}
                onChange={(e) => setSvcDesc(e.target.value)}
              ></textarea>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted mb-1">Loại dịch vụ</label>
              <select
                className="form-select border rounded-3 py-2 px-3 bg-light fw-bold text-dark"
                value={svcCategory}
                onChange={(e) => setSvcCategory(e.target.value)}
              >
                <option value="Dịch vụ chính">Dịch vụ chính (Main)</option>
                <option value="Dịch vụ đi kèm">Dịch vụ đi kèm (Add-on)</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted mb-1">Giá tiền (VNĐ) <span className="text-danger">*</span></label>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-control border rounded-3 py-2 px-3 fw-semibold bg-light text-dark"
                value={svcPrice}
                onChange={(e) => setSvcPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold text-muted mb-1">Thời gian ước tính (phút) <span className="text-danger">*</span></label>
              <input
                type="number"
                min="1"
                className="form-control border rounded-3 py-2 px-3 fw-semibold bg-light text-dark"
                value={svcMinutes}
                onChange={(e) => setSvcMinutes(Number(e.target.value))}
                required
              />
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <div className="p-2.5 bg-light rounded-3 w-100 d-flex flex-column gap-2 border">
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="svc-active"
                    style={{ cursor: 'pointer' }}
                    checked={svcActive}
                    onChange={(e) => setSvcActive(e.target.checked)}
                  />
                  <label className="form-check-label small fw-bold text-dark" htmlFor="svc-active" style={{ cursor: 'pointer' }}>
                    Hoạt động
                  </label>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="svc-featured"
                    style={{ cursor: 'pointer' }}
                    checked={svcFeatured}
                    onChange={(e) => setSvcFeatured(e.target.checked)}
                  />
                  <label className="form-check-label small fw-bold text-dark" htmlFor="svc-featured" style={{ cursor: 'pointer' }}>
                    Dịch vụ nổi bật
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex gap-3 pt-3 border-top justify-content-end">
            <button type="button" className="confirm-cancel-btn py-2 text-decoration-none border-0 w-25" onClick={closeServiceModal}>
              Hủy bỏ
            </button>
            <button type="submit" className="confirm-ok-btn confirm-btn-cyan py-2 border-0 w-25" style={{ background: 'var(--cyan-electric)' }}>
              Lưu lại
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminServices;
