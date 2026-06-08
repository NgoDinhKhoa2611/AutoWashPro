import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GlobalToastAndConfirm } from '../components/GlobalToastAndConfirm';
import '../styles/shared.css';
import '../styles/admin/admin.css';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeNav = location.pathname.startsWith('/admin/dashboard') ? 'dashboard' :
                    location.pathname.startsWith('/admin/queue') ? 'queue' :
                    location.pathname.startsWith('/admin/customers') ? 'customers' :
                    location.pathname.startsWith('/admin/services') ? 'services' :
                    location.pathname.startsWith('/admin/promotions') ? 'promotions' : 'dashboard';

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = () => {
    if (window.showConfirm) {
      window.showConfirm('Đăng xuất Admin', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị AutoWash Pro?', async () => {
        await logout();
        if (window.showToast) window.showToast('Đăng xuất thành công!', 'success');
        navigate('/login');
      });
    }
  };

  return (
    <div className="admin-wrapper">
      <GlobalToastAndConfirm />

      {/* Admin Sidebar */}
      <nav id="sidebar" className={sidebarCollapsed ? 'collapsed' : ''}>
        <Link to="/admin/dashboard" className="text-decoration-none d-block p-4 mb-4 hover-opacity" style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}>
          <div className="brand-full">
            <h4 className="fw-bold mb-0 text-dark">AutoWash <span className="text-cyan">Pro</span></h4>
            <small className="text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Hệ thống quản trị
            </small>
          </div>
          <div className="admin-brand-mini" id="sidebar-brand-mini">
            <i className="fas fa-hands-wash text-dark fa-lg"></i>
          </div>
        </Link>

        <div style={{ flex: 1 }} className="d-flex flex-column gap-1">
          <Link to="/admin/dashboard" className={`sidebar-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
            <i className="fas fa-chart-line"></i> <span>Bảng điều khiển</span>
          </Link>
          <Link to="/admin/queue" className={`sidebar-link ${activeNav === 'queue' ? 'active' : ''}`}>
            <i className="fas fa-list-ol"></i> <span>Hàng đợi trực tiếp</span>
          </Link>
          <Link to="/admin/customers" className={`sidebar-link ${activeNav === 'customers' ? 'active' : ''}`}>
            <i className="fas fa-users"></i> <span>Khách hàng</span>
          </Link>
          <Link to="/admin/services" className={`sidebar-link ${activeNav === 'services' ? 'active' : ''}`}>
            <i className="fas fa-box"></i> <span>Dịch vụ</span>
          </Link>
          <Link to="/admin/promotions" className={`sidebar-link ${activeNav === 'promotions' ? 'active' : ''}`}>
            <i className="fas fa-tags"></i> <span>Voucher & ưu đãi</span>
          </Link>
          <hr className="mx-3 opacity-10 my-4" />
          <a href="javascript:void(0)" className="sidebar-link text-danger opacity-75" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> <span>Đăng xuất</span>
          </a>
        </div>

        <div className="p-3">
          <button className="sidebar-collapse-btn" onClick={toggleSidebar}>
            <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            <span>Thu gọn menu</span>
          </button>
        </div>
      </nav>

      {/* Admin Main */}
      <div className={`admin-main ${sidebarCollapsed ? 'collapsed' : ''} ${activeNav === 'queue' ? 'admin-main-queue' : ''}`} id="admin-main">
        <Outlet />
      </div>
    </div>
  );
};
export default AdminLayout;
