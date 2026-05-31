import React, { useState, useEffect } from 'react';

const DEFAULT_CATALOG = [
  { id: 'service_01', name: 'Rửa xe phổ thông',        description: 'Rửa vỏ bọt tuyết cơ bản và sấy khô nhanh chóng.',                                  category: 'Rửa xe cơ bản',     price: 35000, estimatedMinutes: 20, isActive: true, isFeatured: false, status: 'Active' },
  { id: 'service_02', name: 'Combo Rửa xe cao cấp',     description: 'Rửa vỏ chi tiết bọt tuyết, sáp phủ bóng nano, vệ sinh nội thất và sấy khô.',       category: 'Rửa xe cao cấp',    price: 85000, estimatedMinutes: 45, isActive: true, isFeatured: true,  status: 'Active' },
  { id: 'service_03', name: 'Vệ sinh sên chuyên nghiệp', description: 'Tẩy rửa cặn dầu mỡ trên xích sên, dưỡng sên cao cấp giúp vận hành êm ái.',        category: 'Dịch vụ đi kèm',   price: 20000, estimatedMinutes: 10, isActive: true, isFeatured: false, status: 'Active' },
  { id: 'service_04', name: 'Wax bóng nano bảo vệ sơn', description: 'Phủ lớp sáp wax bóng chuyên dụng giúp bảo vệ lớp sơn bóng bẩy và kháng nước.',    category: 'Phủ bóng / Wax',    price: 25000, estimatedMinutes: 15, isActive: true, isFeatured: false, status: 'Active' },
  { id: 'service_05', name: 'Chăm sóc dưỡng nhựa nhám', description: 'Dưỡng phục hồi các phần nhựa đen nhám bị bạc màu trên xe máy.',                    category: 'Chăm sóc nội thất', price: 30000, estimatedMinutes: 15, isActive: true, isFeatured: false, status: 'Active' }
];

const AdminServices = () => {
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
  const [svcCategory, setSvcCategory] = useState('Rửa xe cơ bản');
  const [svcPrice, setSvcPrice] = useState(30000);
  const [svcMinutes, setSvcMinutes] = useState(15);
  const [svcActive, setSvcActive] = useState(true);
  const [svcFeatured, setSvcFeatured] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = () => {
    const saved = localStorage.getItem('app_services');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServices(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse app_services', e);
      }
    }
    const initialList = DEFAULT_CATALOG.map(s => ({
      ...s,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem('app_services', JSON.stringify(initialList));
    setServices(initialList);
  };

  const saveCatalog = (list) => {
    setServices(list);
    localStorage.setItem('app_services', JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
  };

  const openAddServiceModal = () => {
    setModalMode('add');
    setEditingId(null);
    setSvcName('');
    setSvcDesc('');
    setSvcCategory('Rửa xe cơ bản');
    setSvcPrice(30000);
    setSvcMinutes(15);
    setSvcActive(true);
    setSvcFeatured(false);
    setShowModal(true);
  };

  const openEditServiceModal = (s) => {
    setModalMode('edit');
    setEditingId(s.id);
    setSvcName(s.name || '');
    setSvcDesc(s.description || '');
    setSvcCategory(s.category || 'Rửa xe cơ bản');
    setSvcPrice(s.price || 0);
    setSvcMinutes(s.estimatedMinutes || 15);
    setSvcActive(s.isActive !== undefined ? s.isActive : s.status === 'Active');
    setSvcFeatured(!!s.isFeatured);
    setShowModal(true);
  };

  const closeServiceModal = () => {
    setShowModal(false);
  };

  const saveService = (e) => {
    e.preventDefault();
    if (!svcName.trim()) {
      if (window.showToast) window.showToast('Vui lòng điền tên dịch vụ', 'error');
      return;
    }

    const data = {
      name: svcName.trim(),
      description: svcDesc.trim(),
      category: svcCategory,
      price: Number(svcPrice),
      estimatedMinutes: Number(svcMinutes),
      isActive: svcActive,
      isFeatured: svcFeatured,
      status: svcActive ? 'Active' : 'Inactive',
      updatedAt: new Date().toISOString()
    };

    let updated;
    if (modalMode === 'add') {
      updated = [{ ...data, id: 'service_' + Date.now(), createdAt: new Date().toISOString() }, ...services];
      if (window.showToast) window.showToast(`Đã thêm dịch vụ "${data.name}" thành công!`, 'success');
    } else {
      updated = services.map(s => s.id === editingId ? { ...s, ...data } : s);
      if (window.showToast) window.showToast('Cập nhật thông tin dịch vụ thành công!', 'success');
    }

    saveCatalog(updated);
    closeServiceModal();
  };

  const toggleServiceActive = (id) => {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    const current = s.isActive !== undefined ? s.isActive : s.status === 'Active';
    const next = !current;
    const updated = services.map(sv => sv.id === id ? {
      ...sv,
      isActive: next,
      status: next ? 'Active' : 'Inactive',
      updatedAt: new Date().toISOString()
    } : sv);
    saveCatalog(updated);
    if (window.showToast) {
      window.showToast(`Đã ${next ? 'KÍCH HOẠT' : 'ẨN'} dịch vụ "${s.name}"`, next ? 'success' : 'warning');
    }
  };

  const deleteService = (id) => {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    if (window.showConfirm) {
      window.showConfirm('Xóa dịch vụ', `Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${s.name}"? Thao tác này không thể hoàn tác.`, () => {
        saveCatalog(services.filter(sv => sv.id !== id));
        if (window.showToast) window.showToast(`Đã xóa dịch vụ "${s.name}" khỏi hệ thống.`, 'success');
      });
    } else {
      // Fallback
      if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${s.name}"?`)) {
        saveCatalog(services.filter(sv => sv.id !== id));
      }
    }
  };

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
    <div className="container-fluid py-4">
      <header className="d-flex justify-content-between align-items-center mb-5 animate-up">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Services Catalog Management</h4>
          <p className="text-muted small mb-0 fw-medium">Quản lý danh mục sản phẩm, gói rửa xe và các dịch vụ giá trị gia tăng.</p>
        </div>
        <button
          className="app-btn-primary py-2 px-4 w-auto shadow-none"
          style={{ fontSize: '0.82rem', borderRadius: '12px' }}
          onClick={openAddServiceModal}
        >
          <i className="fas fa-plus me-1"></i> THÊM DỊCH VỤ
        </button>
      </header>

      {/* Filters */}
      <div className="row g-3 mb-5 animate-up" style={{ animationDelay: '0.05s' }}>
        <div className="col-md-5">
          <div className="input-group shadow-sm" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <span className="input-group-text bg-white border-0 ps-3 text-muted">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control bg-white border-0 py-3 ps-2"
              placeholder="Tìm dịch vụ theo tên, mô tả..."
              style={{ outline: 'none', boxShadow: 'none' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4 col-sm-6">
          <select
            className="form-select bg-white border-0 py-3 shadow-sm fw-semibold"
            style={{ borderRadius: '14px', outline: 'none', boxShadow: 'none', cursor: 'pointer', color: 'var(--navy-dark)' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại dịch vụ</option>
            <option value="Rửa xe cơ bản">Rửa xe cơ bản</option>
            <option value="Rửa xe cao cấp">Rửa xe cao cấp</option>
            <option value="Dịch vụ đi kèm">Dịch vụ đi kèm (Add-ons)</option>
            <option value="Chăm sóc nội thất">Chăm sóc nội thất</option>
            <option value="Phủ bóng / Wax">Phủ bóng / Wax</option>
          </select>
        </div>
        <div className="col-md-3 col-sm-6">
          <select
            className="form-select bg-white border-0 py-3 shadow-sm fw-semibold"
            style={{ borderRadius: '14px', outline: 'none', boxShadow: 'none', cursor: 'pointer', color: 'var(--navy-dark)' }}
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
        <div className="app-card border-0 shadow-lg p-5 text-center text-muted animate-up" style={{ borderRadius: '24px' }}>
          <i className="fas fa-box-open fa-3x mb-3 text-muted" style={{ opacity: 0.25 }}></i>
          <h5 className="fw-bold mb-2" style={{ color: 'var(--navy-dark)' }}>Không tìm thấy dịch vụ nào</h5>
          <p className="text-muted small mb-0">Hãy thử đổi từ khóa tìm kiếm hoặc điều chỉnh lại các bộ lọc ở trên.</p>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden border-0 shadow-lg animate-up" style={{ animationDelay: '0.1s', borderRadius: '24px' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr class="small text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                  <th className="ps-4 py-3">Tên dịch vụ</th>
                  <th>Loại dịch vụ</th>
                  <th>Giá tiền</th>
                  <th>Thời gian ước tính</th>
                  <th>Nổi bật</th>
                  <th>Trạng thái</th>
                  <th className="text-end pe-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="small fw-medium">
                {filteredServices.map(s => {
                  const active = s.isActive !== undefined ? s.isActive : s.status === 'Active';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="ps-4 py-3">
                        <span className="fw-bold d-block" style={{ color: 'var(--navy-dark)' }}>{s.name}</span>
                        <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>{s.description || ''}</small>
                      </td>
                      <td>
                        <span className="badge rounded-pill bg-light px-3 py-1 border" style={{ color: 'var(--navy-dark)' }}>
                          {s.category || 'Chưa phân loại'}
                        </span>
                      </td>
                      <td><span className="fw-bold" style={{ color: 'var(--navy-dark)' }}>{Number(s.price).toLocaleString()}đ</span></td>
                      <td>
                        <span className="fw-bold text-cyan">
                          <i className="far fa-clock me-1"></i>{s.estimatedMinutes || 15} phút
                        </span>
                      </td>
                      <td>
                        {s.isFeatured ? (
                          <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-1 rounded-pill fw-bold">
                            <i className="fas fa-star me-1"></i> Nổi bật
                          </span>
                        ) : (
                          <span className="text-muted" style={{ opacity: 0.4 }}>-</span>
                        )}
                      </td>
                      <td>
                        {active ? (
                          <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold">Hoạt động</span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1 fw-bold">Tạm ẩn</span>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className="btn btn-sm fw-bold px-2 py-1"
                            style={{ fontSize: '0.72rem', borderRadius: '8px', border: '1px solid var(--cyan-electric)', color: 'var(--cyan-electric)' }}
                            onClick={() => openEditServiceModal(s)}
                          >
                            <i className="fas fa-edit"></i> SỬA
                          </button>
                          <button
                            className={`btn btn-sm fw-bold px-2 py-1 ${active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            style={{ fontSize: '0.72rem', borderRadius: '8px' }}
                            onClick={() => toggleServiceActive(s.id)}
                          >
                            {active ? <><i className="fas fa-eye-slash"></i> ẨN</> : <><i className="fas fa-eye"></i> BẬT</>}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger fw-bold px-2 py-1"
                            style={{ fontSize: '0.72rem', borderRadius: '8px' }}
                            onClick={() => deleteService(s.id)}
                          >
                            <i className="fas fa-trash-alt"></i> XÓA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal Overlay */}
      {showModal && (
        <div className="confirm-modal-backdrop" style={{ display: 'flex', zIndex: 1050 }}>
          <div className="confirm-modal-card animate-confirm-in" style={{ maxWidth: '600px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
              <h5 className="fw-bold mb-0" style={{ color: 'var(--navy-dark)' }}>
                <i className="fas fa-box me-2" style={{ color: 'var(--cyan-electric)' }}></i>
                <span>{modalMode === 'add' ? 'THÊM DỊCH VỤ MỚI' : 'SỬA THÔNG TIN DỊCH VỤ'}</span>
              </h5>
              <button className="btn btn-link text-muted p-0 fs-4 text-decoration-none" onClick={closeServiceModal}>&times;</button>
            </div>

            <form onSubmit={saveService}>
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <label className="form-label small fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>
                    Tên dịch vụ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control border rounded-4 py-2 px-3 fw-semibold bg-light"
                    placeholder="Ví dụ: Combo Rửa xe siêu cấp"
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Mô tả chi tiết</label>
                  <textarea
                    rows="3"
                    className="form-control border rounded-4 py-2 px-3 bg-light"
                    placeholder="Mô tả các công đoạn thực hiện hoặc lợi ích..."
                    value={svcDesc}
                    onChange={(e) => setSvcDesc(e.target.value)}
                  ></textarea>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>Loại dịch vụ</label>
                  <select
                    className="form-select border rounded-4 py-2 px-3 bg-light fw-semibold"
                    style={{ color: 'var(--navy-dark)' }}
                    value={svcCategory}
                    onChange={(e) => setSvcCategory(e.target.value)}
                  >
                    <option value="Rửa xe cơ bản">Rửa xe cơ bản</option>
                    <option value="Rửa xe cao cấp">Rửa xe cao cấp</option>
                    <option value="Dịch vụ đi kèm">Dịch vụ đi kèm</option>
                    <option value="Chăm sóc nội thất">Chăm sóc nội thất</option>
                    <option value="Phủ bóng / Wax">Phủ bóng / Wax</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>
                    Giá tiền (VND) <span class="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-control border rounded-4 py-2 px-3 fw-semibold bg-light"
                    value={svcPrice}
                    onChange={(e) => setSvcPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold mb-1" style={{ color: 'var(--navy-dark)' }}>
                    Thời gian ước tính (phút) <span class="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control border rounded-4 py-2 px-3 fw-semibold bg-light"
                    value={svcMinutes}
                    onChange={(e) => setSvcMinutes(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <div className="p-3 bg-light rounded-4 w-100 d-flex flex-column gap-2 border border-light">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="svc-active"
                        style={{ cursor: 'pointer' }}
                        checked={svcActive}
                        onChange={(e) => setSvcActive(e.target.checked)}
                      />
                      <label className="form-check-label small fw-bold" htmlFor="svc-active" style={{ color: 'var(--navy-dark)', cursor: 'pointer' }}>
                        Trạng thái: Hoạt động
                      </label>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="svc-featured"
                        style={{ cursor: 'pointer' }}
                        checked={svcFeatured}
                        onChange={(e) => setSvcFeatured(e.target.checked)}
                      />
                      <label className="form-check-label small fw-bold" htmlFor="svc-featured" style={{ color: 'var(--navy-dark)', cursor: 'pointer' }}>
                        Dịch vụ nổi bật (Featured)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3 pt-3 border-top">
                <button type="button" className="confirm-cancel-btn py-2 text-decoration-none border-0" onClick={closeServiceModal}>
                  Hủy bỏ
                </button>
                <button type="submit" className="confirm-ok-btn confirm-btn-cyan py-2 border-0">
                  <i className="fas fa-save me-1"></i> Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServices;
