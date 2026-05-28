/**
 * services.js — Admin Services Catalog CRUD
 */

const DEFAULT_CATALOG = [
    { id: 'service_01', name: 'Rửa xe phổ thông',        description: 'Rửa vỏ bọt tuyết cơ bản và sấy khô nhanh chóng.',                                  category: 'Rửa xe cơ bản',     price: 35000, estimatedMinutes: 20, isActive: true, isFeatured: false, status: 'Active' },
    { id: 'service_02', name: 'Combo Rửa xe cao cấp',     description: 'Rửa vỏ chi tiết bọt tuyết, sáp phủ bóng nano, vệ sinh nội thất và sấy khô.',       category: 'Rửa xe cao cấp',    price: 85000, estimatedMinutes: 45, isActive: true, isFeatured: true,  status: 'Active' },
    { id: 'service_03', name: 'Vệ sinh sên chuyên nghiệp', description: 'Tẩy rửa cặn dầu mỡ trên xích sên, dưỡng sên cao cấp giúp vận hành êm ái.',        category: 'Dịch vụ đi kèm',   price: 20000, estimatedMinutes: 10, isActive: true, isFeatured: false, status: 'Active' },
    { id: 'service_04', name: 'Wax bóng nano bảo vệ sơn', description: 'Phủ lớp sáp wax bóng chuyên dụng giúp bảo vệ lớp sơn bóng bẩy và kháng nước.',    category: 'Phủ bóng / Wax',    price: 25000, estimatedMinutes: 15, isActive: true, isFeatured: false, status: 'Active' },
    { id: 'service_05', name: 'Chăm sóc dưỡng nhựa nhám', description: 'Dưỡng phục hồi các phần nhựa đen nhám bị bạc màu trên xe máy.',                    category: 'Chăm sóc nội thất', price: 30000, estimatedMinutes: 15, isActive: true, isFeatured: false, status: 'Active' }
];

let services       = [];
let modalMode      = 'add';
let editingId      = null;

document.addEventListener('DOMContentLoaded', function () {
    loadServices();
    window.addEventListener('storage', loadServices);
});

function loadServices() {
    const saved = localStorage.getItem('app_services');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) { services = parsed; renderServices(); return; }
        } catch (e) {}
    }
    services = DEFAULT_CATALOG.map(s => ({ ...s, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    localStorage.setItem('app_services', JSON.stringify(services));
    renderServices();
}

function filterServices() {
    renderServices();
}

function saveCatalog(list) {
    services = list;
    localStorage.setItem('app_services', JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    renderServices();
}

// ── Render ───────────────────────────────────────────────
function renderServices() {
    const search     = (document.getElementById('service-search')  || {}).value || '';
    const catFilter  = (document.getElementById('category-filter') || {}).value || 'ALL';
    const statFilter = (document.getElementById('status-filter')   || {}).value || 'ALL';

    const filtered = services.filter(s => {
        const active = s.isActive !== undefined ? s.isActive : s.status === 'Active';
        const matchSearch = !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.description || '').toLowerCase().includes(search.toLowerCase());
        const matchCat    = catFilter  === 'ALL' || s.category === catFilter;
        const matchStat   = statFilter === 'ALL' || (statFilter === 'ACTIVE' && active) || (statFilter === 'INACTIVE' && !active);
        return matchSearch && matchCat && matchStat;
    });

    const emptyDiv = document.getElementById('services-empty-state');
    const tableW   = document.getElementById('services-table-wrapper');
    const tbody    = document.getElementById('services-tbody');

    if (filtered.length === 0) {
        if (emptyDiv) emptyDiv.style.display = 'block';
        if (tableW)   tableW.style.display   = 'none';
        return;
    }
    if (emptyDiv) emptyDiv.style.display = 'none';
    if (tableW)   tableW.style.display   = 'block';
    if (!tbody) return;

    tbody.innerHTML = filtered.map(s => {
        const active = s.isActive !== undefined ? s.isActive : s.status === 'Active';
        return `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td class="ps-4 py-3">
                <span class="fw-bold d-block" style="color:var(--navy-dark);">${s.name}</span>
                <small class="text-muted d-block text-truncate" style="max-width:300px;">${s.description || ''}</small>
            </td>
            <td><span class="badge rounded-pill bg-light px-3 py-1 border" style="color:var(--navy-dark);">${s.category || 'Chưa phân loại'}</span></td>
            <td><span class="fw-bold" style="color:var(--navy-dark);">${Number(s.price).toLocaleString()}đ</span></td>
            <td><span class="fw-bold text-cyan"><i class="far fa-clock me-1"></i>${s.estimatedMinutes || 15} phút</span></td>
            <td>
                ${s.isFeatured
                    ? '<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-1 rounded-pill fw-bold"><i class="fas fa-star me-1"></i>Nổi bật</span>'
                    : '<span class="text-muted" style="opacity:0.4;">-</span>'}
            </td>
            <td>
                ${active
                    ? '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-bold">Hoạt động</span>'
                    : '<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3 py-1 fw-bold">Tạm ẩn</span>'}
            </td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-sm fw-bold px-2 py-1" style="font-size:0.72rem;border-radius:8px;border:1px solid var(--cyan-electric);color:var(--cyan-electric);"
                            onclick="openEditServiceModal('${s.id}')"><i class="fas fa-edit"></i> SỬA</button>
                    <button class="btn btn-sm fw-bold px-2 py-1 ${active ? 'btn-outline-warning' : 'btn-outline-success'}"
                            style="font-size:0.72rem;border-radius:8px;" onclick="toggleServiceActive('${s.id}')">
                        ${active ? '<i class="fas fa-eye-slash"></i> ẨN' : '<i class="fas fa-eye"></i> BẬT'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger fw-bold px-2 py-1" style="font-size:0.72rem;border-radius:8px;"
                            onclick="deleteService('${s.id}')"><i class="fas fa-trash-alt"></i> XÓA</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── Modal ────────────────────────────────────────────────
function openAddServiceModal() {
    modalMode = 'add'; editingId = null;
    setVal('svc-name', ''); setVal('svc-desc', ''); setVal('svc-price', '30000');
    setVal('svc-minutes', '15'); setVal('svc-category', 'Rửa xe cơ bản');
    setChecked('svc-active', true); setChecked('svc-featured', false);

    const titleEl = document.getElementById('service-modal-title');
    if (titleEl) titleEl.textContent = 'THÊM DỊCH VỤ MỚI';
    showServiceModal();
}

function openEditServiceModal(id) {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    modalMode = 'edit'; editingId = id;

    setVal('svc-name',     s.name || '');
    setVal('svc-desc',     s.description || '');
    setVal('svc-price',    s.price);
    setVal('svc-minutes',  s.estimatedMinutes || 15);
    setVal('svc-category', s.category || 'Rửa xe cơ bản');
    setChecked('svc-active',   s.isActive !== undefined ? s.isActive : s.status === 'Active');
    setChecked('svc-featured', !!s.isFeatured);

    const titleEl = document.getElementById('service-modal-title');
    if (titleEl) titleEl.textContent = 'SỬA THÔNG TIN DỊCH VỤ';
    showServiceModal();
}

function showServiceModal() {
    const overlay = document.getElementById('service-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeServiceModal() {
    const overlay = document.getElementById('service-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function saveService(e) {
    e.preventDefault();
    const name = getVal('svc-name').trim();
    if (!name) { showToast('Vui lòng điền tên dịch vụ', 'error'); return; }

    const data = {
        name,
        description:      getVal('svc-desc').trim(),
        category:         getVal('svc-category'),
        price:            Number(getVal('svc-price')),
        estimatedMinutes: Number(getVal('svc-minutes')),
        isActive:         getChecked('svc-active'),
        isFeatured:       getChecked('svc-featured'),
        status:           getChecked('svc-active') ? 'Active' : 'Inactive',
        updatedAt:        new Date().toISOString()
    };

    let updated;
    if (modalMode === 'add') {
        updated = [{ ...data, id: 'service_' + Date.now(), createdAt: new Date().toISOString() }, ...services];
        showToast(`Đã thêm dịch vụ "${name}" thành công!`, 'success');
    } else {
        updated = services.map(s => s.id === editingId ? { ...s, ...data } : s);
        showToast('Cập nhật thông tin dịch vụ thành công!', 'success');
    }
    saveCatalog(updated);
    closeServiceModal();
}

function toggleServiceActive(id) {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    const current = s.isActive !== undefined ? s.isActive : s.status === 'Active';
    const next = !current;
    const updated = services.map(sv => sv.id === id ? { ...sv, isActive: next, status: next ? 'Active' : 'Inactive', updatedAt: new Date().toISOString() } : sv);
    saveCatalog(updated);
    showToast(`Đã ${next ? 'KÍCH HOẠT' : 'ẨN'} dịch vụ "${s.name}"`, next ? 'success' : 'warning');
}

function deleteService(id) {
    const s = services.find(sv => sv.id === id);
    if (!s) return;
    window.showConfirm('Xóa dịch vụ', `Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${s.name}"? Thao tác này không thể hoàn tác.`, () => {
        saveCatalog(services.filter(sv => sv.id !== id));
        showToast(`Đã xóa dịch vụ "${s.name}" khỏi hệ thống.`, 'success');
    });
}

// ── Helpers ──────────────────────────────────────────────
function setVal(id, val)        { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)             { const el = document.getElementById(id); return el ? el.value : ''; }
function setChecked(id, v)      { const el = document.getElementById(id); if (el) el.checked = v; }
function getChecked(id)         { const el = document.getElementById(id); return el ? el.checked : false; }
