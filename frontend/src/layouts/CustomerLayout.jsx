import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GlobalToastAndConfirm } from '../components/GlobalToastAndConfirm';
import { customerService } from '../services/customerService';
import '../styles/shared.css';
import '../styles/customer/customer.css';

export const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem('sidebar_collapsed') === '1'
  );
  const [mobileSidebarShow, setMobileSidebarShow] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Lấy đường dẫn hiện tại để active link
  const activeNav = location.pathname.startsWith('/customer/dashboard') ? 'dashboard' :
                    location.pathname.startsWith('/customer/booking') ? 'booking' :
                    location.pathname.startsWith('/customer/vehicles') ? 'vehicles' :
                    location.pathname.startsWith('/customer/loyalty') ? 'loyalty' :
                    location.pathname.startsWith('/customer/history') ? 'history' :
                    location.pathname.startsWith('/customer/profile') ? 'profile' : 'dashboard';

  useEffect(() => {
    // Load notifications from API
    const loadNotifs = async () => {
      try {
        const response = await customerService.getNotifications();
        if (response.success && response.notifications) {
          setNotifications(response.notifications);
        }
      } catch (e) {
        console.error('Lỗi khi tải thông báo:', e);
      }
    };

    loadNotifs();
    window.addEventListener('storage', loadNotifs);

    // Xử lý click outside để ẩn dropdowns
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('storage', loadNotifs);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const toggleSidebar = () => {
    const newVal = !sidebarCollapsed;
    setSidebarCollapsed(newVal);
    localStorage.setItem('sidebar_collapsed', newVal ? '1' : '0');
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarShow(!mobileSidebarShow);
  };

  const markNotifRead = async (id) => {
    try {
      await customerService.markNotificationAsRead(Number(id));
      const response = await customerService.getNotifications();
      if (response.success && response.notifications) {
        setNotifications(response.notifications);
      }
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async (e) => {
    e.stopPropagation();
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await customerService.markNotificationAsRead(Number(n.id));
      }
      const response = await customerService.getNotifications();
      if (response.success && response.notifications) {
        setNotifications(response.notifications);
      }
      window.dispatchEvent(new Event('storage'));
      if (window.showToast) {
        window.showToast('Đã đánh dấu tất cả thông báo là đã đọc!', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (window.showConfirm) {
      window.showConfirm('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi AutoWash Pro?', async () => {
        await logout();
        if (window.showToast) window.showToast('Đăng xuất thành công!', 'success');
        navigate('/login');
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const avatarUrl = user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';
  const typeIcons = {
    points: 'fa-coins text-warning',
    status: 'fa-car-side text-cyan',
    info: 'fa-info-circle text-info'
  };

  return (
    <div className="customer-layout-wrapper">
      <GlobalToastAndConfirm />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarShow && (
        <div className="sidebar-overlay show" onClick={toggleMobileSidebar}></div>
      )}

      {/* Left Sidebar */}
      <aside className={`customer-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarShow ? 'show-sidebar' : ''}`} id="customer-sidebar">
        {/* Mobile close button */}
        <div className="d-flex d-lg-none justify-content-end w-100 mb-2">
          <button className="btn text-dark p-1 border-0" onClick={toggleMobileSidebar}>
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>

        {/* Brand Logo */}
        <Link to="/customer/dashboard" className="text-decoration-none d-flex align-items-center mb-4 px-2 hover-opacity sidebar-brand-link">
          <div className="brand-full d-flex align-items-center">
            <div className="p-2 me-3 d-flex align-items-center justify-content-center sidebar-brand-icon">
              <i className="fas fa-hands-wash fa-lg text-dark"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark sidebar-brand-name">
                AutoWash <span className="text-cyan">Pro</span>
              </h5>
              <small className="text-secondary sidebar-brand-sub">SWP391 FPT University</small>
            </div>
          </div>
          <div className="brand-mini d-none sidebar-brand-icon">
            <i className="fas fa-hands-wash fa-lg text-dark"></i>
          </div>
        </Link>

        <hr className="sidebar-divider" />

        {/* Nav Links */}
        <nav className="customer-sidebar-links">
          <Link to="/customer/dashboard" className={`customer-sidebar-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
            <i className="fas fa-columns"></i><span>Trang chủ</span>
          </Link>
          <Link to="/customer/booking" className={`customer-sidebar-link ${activeNav === 'booking' ? 'active' : ''}`}>
            <i className="fas fa-calendar-alt"></i><span>Đặt lịch rửa xe</span>
          </Link>
          <Link to="/customer/vehicles" className={`customer-sidebar-link ${activeNav === 'vehicles' ? 'active' : ''}`}>
            <i className="fas fa-motorcycle"></i><span>Phương tiện của tôi</span>
          </Link>
          <Link to="/customer/loyalty" className={`customer-sidebar-link ${activeNav === 'loyalty' ? 'active' : ''}`}>
            <i className="fas fa-crown"></i><span>Loyalty & Voucher</span>
          </Link>
          <Link to="/customer/history" className={`customer-sidebar-link ${activeNav === 'history' ? 'active' : ''}`}>
            <i className="fas fa-history"></i><span>Lịch sử & Đánh giá</span>
          </Link>
          <Link to="/customer/profile" className={`customer-sidebar-link ${activeNav === 'profile' ? 'active' : ''}`}>
            <i className="fas fa-user-cog"></i><span>Tài khoản của tôi</span>
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-4 d-flex flex-column gap-2">
          <button type="button" className="customer-sidebar-link text-danger border-0 bg-transparent w-100 text-start" onClick={handleLogout} style={{ borderRadius: '12px' }}>
            <i className="fas fa-sign-out-alt text-danger"></i>
            <span>Đăng xuất</span>
          </button>
          <button className="sidebar-collapse-btn" onClick={toggleSidebar}>
            <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            <span>Thu gọn menu</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`customer-main ${sidebarCollapsed ? 'collapsed' : ''}`} id="customer-main">
        {/* Top Header */}
        <header className="customer-top-header">
          <div className="d-flex align-items-center">
            <h5 className="fw-bold text-dark mb-0">
              {activeNav === 'dashboard' ? 'Dashboard' :
               activeNav === 'booking' ? 'Đặt lịch rửa xe' :
               activeNav === 'vehicles' ? 'Phương tiện của tôi' :
               activeNav === 'loyalty' ? 'AutoWash Loyalty & Voucher' :
               activeNav === 'history' ? 'Lịch sử rửa xe' : 'Hồ sơ của tôi'}
            </h5>
          </div>

          <div className="d-flex align-items-center gap-4">
            {/* Notification Bell */}
            <div className="header-notif-trigger position-relative" id="notif-trigger" ref={notifRef}>
              <div className="notif-icon-btn" onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}>
                <i className="far fa-bell fa-lg"></i>
              </div>
              {unreadCount > 0 && (
                <span className="position-absolute bg-cyan rounded-circle" id="notif-dot" style={{ width: '8px', height: '8px', top: '2px', right: '2px' }}></span>
              )}

              {/* Notification Dropdown */}
              <div className={`notif-dropdown ${notifDropdownOpen ? 'show' : ''}`} id="notif-dropdown" style={{ display: notifDropdownOpen ? 'block' : 'none' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 notif-dropdown-title">Thông báo</h6>
                  <button className="btn btn-link p-0 text-cyan small text-decoration-none fw-bold notif-dropdown-btn" onClick={markAllRead}>
                    Đánh dấu đã đọc
                  </button>
                </div>
                <div id="notif-list" className="d-flex flex-column gap-2 notif-list-scroll">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-muted small">Không có thông báo nào</div>
                  ) : (
                    notifications.slice(0, 8).map(n => (
                      <div key={n.id} className={`d-flex align-items-start px-3 py-2 border-bottom notif-item ${n.read ? '' : 'notif-unread'}`} onClick={() => markNotifRead(n.id)}>
                        <i className={`fas ${typeIcons[n.type] || 'fa-bell text-muted'} me-2 mt-1 fs-7`}></i>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="fw-bold small text-truncate" style={{ color: 'var(--navy-dark)', fontSize: '0.78rem' }}>{n.title}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>{n.body}</div>
                          <div className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>{n.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="position-relative" id="profile-trigger" ref={profileRef}>
              <div className="header-profile-trigger" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                <img src={avatarUrl} alt="Avatar" className="avatar-circle header-avatar" />
                <div className="d-none d-md-block text-start">
                  <small className="text-muted d-block header-account-label">TÀI KHOẢN</small>
                  <h6 className="fw-bold mb-0 header-username-text">
                    {user?.name || 'Khách hàng'}
                  </h6>
                </div>
              </div>

              <div id="profile-dropdown" className={`${profileDropdownOpen ? 'show' : ''}`} style={{ display: profileDropdownOpen ? 'block' : 'none' }}>
                <div className="px-3 py-2 border-bottom mb-2 text-start">
                  <div className="fw-bold text-truncate dropdown-profile-name">
                    {user?.name || 'Khách hàng'}
                  </div>
                  <div className="text-muted text-truncate dropdown-profile-tier">
                    {(user?.tier || 'Gold Member').replace(' Member', ' Loyalty')}
                  </div>
                </div>
                <Link to="/customer/profile" className="profile-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                  <i className="fas fa-user-circle"></i> Trang cá nhân
                </Link>
                <button type="button" className="profile-dropdown-item text-danger border-0 bg-transparent w-100 text-start" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt text-danger"></i> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="customer-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav d-flex d-lg-none">
        <div className="mobile-nav-bg-container">
          <div className="mobile-nav-bg-left"></div>
          <div className="mobile-nav-bg-center">
            <svg width="86" height="72" viewBox="0 0 86 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1 L6 1 C16 1, 18 28, 43 28 C68 28, 70 1, 80 1 L86 1 L86 72 L0 72 Z" fill="white" stroke="rgba(15, 23, 42, 0.06)" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="mobile-nav-bg-right"></div>
        </div>

        <div className="mobile-nav-links-container">
          <Link to="/customer/dashboard" className={`mobile-bottom-nav-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
            <i className="fas fa-th-large"></i>
            <span>Trang chủ</span>
          </Link>
          <Link to="/customer/history" className={`mobile-bottom-nav-link ${activeNav === 'history' ? 'active' : ''}`}>
            <i className="fas fa-history"></i>
            <span>Lịch sử</span>
          </Link>

          {/* Center Floating circular button */}
          <div className="mobile-bottom-nav-center-wrapper">
            <Link to="/customer/booking" className={`mobile-bottom-nav-center-btn ${activeNav === 'booking' ? 'active' : ''}`}>
              <i className="fas fa-calendar-alt"></i>
            </Link>
            <span className="mobile-bottom-nav-center-label">Đặt lịch</span>
          </div>

          <Link to="/customer/loyalty" className={`mobile-bottom-nav-link ${activeNav === 'loyalty' ? 'active' : ''}`}>
            <i className="fas fa-crown"></i>
            <span>Loyalty</span>
          </Link>
          <Link to="/customer/profile" className={`mobile-bottom-nav-link ${activeNav === 'profile' ? 'active' : ''}`}>
            <i className="fas fa-user-cog"></i>
            <span>Tài khoản</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};
export default CustomerLayout;
