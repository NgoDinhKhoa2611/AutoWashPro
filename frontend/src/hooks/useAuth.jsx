import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalStorage = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_tier');
    localStorage.removeItem('user_points');
    localStorage.removeItem('user_avatar');
    localStorage.removeItem('account_id');
    localStorage.removeItem('customer_id');
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  const syncUserFromAuthResponse = (data) => {
    localStorage.setItem('user_role', data.role || 'customer');
    localStorage.setItem('user_display_name', data.fullName || data.name || '');
    localStorage.setItem('user_email', data.email || '');
    if (data.phone) localStorage.setItem('user_phone', data.phone);
    if (data.tier) localStorage.setItem('user_tier', data.tier);
    if (data.points != null) localStorage.setItem('user_points', String(data.points));
    localStorage.setItem('account_id', String(data.accountId || ''));
    localStorage.setItem('customer_id', String(data.customerId || ''));

    const loggedUser = {
      accountId: data.accountId,
      customerId: data.customerId,
      role: data.role || 'customer',
      name: data.fullName || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      tier: data.tier || 'Member',
      points: data.points != null ? Number(data.points) : 0,
      avatar: localStorage.getItem('user_avatar') || ''
    };
    setUser(loggedUser);
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (data && data.isAuthenticated) {
          syncUserFromAuthResponse(data);
        } else {
          setUser(null);
          clearLocalStorage();
        }
      } catch (err) {
        console.error('Lỗi khi đồng bộ thông tin đăng nhập với backend:', err);
        setUser(null);
        clearLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Lắng nghe sự kiện storage và auth-state-changed để xử lý đồng bộ và multi-tab logout
    const handleStorageChange = () => {
      const currentRole = localStorage.getItem('user_role');
      if (!currentRole) {
        setUser(null);
      } else {
        // Chỉ đồng bộ cập nhật thông tin hiển thị nếu user hiện tại đã đăng nhập
        setUser(prevUser => {
          if (!prevUser) return null; // Ngăn chặn việc khôi phục bừa bãi đăng nhập từ localStorage
          return {
            accountId: Number(localStorage.getItem('account_id') || 0) || null,
            customerId: Number(localStorage.getItem('customer_id') || 0) || null,
            role: currentRole,
            name: localStorage.getItem('user_display_name') || '',
            email: localStorage.getItem('user_email') || '',
            phone: localStorage.getItem('user_phone') || '',
            tier: localStorage.getItem('user_tier') || 'Member',
            points: Number(localStorage.getItem('user_points') || 0),
            avatar: localStorage.getItem('user_avatar') || ''
          };
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleStorageChange);
    };
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    if (data.success) {
      syncUserFromAuthResponse(data);
      return data;
    }
    throw new Error(data.message || 'Đăng nhập thất bại!');
  };

  const register = async (email, fullName, phone, password, otpCode) => {
    const data = await authService.register(email, fullName, phone, password, otpCode);
    if (data.success) {
      syncUserFromAuthResponse(data);
      return data;
    }
    throw new Error(data.message || 'Đăng ký thất bại!');
  };

  const googleLogin = async (email, fullName, googleId) => {
    const data = await authService.googleLogin(email, fullName, googleId);
    if (data && data.success) {
      if (!data.isNewUser) {
        syncUserFromAuthResponse(data);
      }
      return data;
    }
    throw new Error(data.message || 'Đăng nhập Google thất bại!');
  };

  const completeGoogleSignup = async (email, fullName, googleId, phone, password) => {
    const data = await authService.completeGoogleSignup(email, fullName, googleId, phone, password);
    if (data && data.success) {
      syncUserFromAuthResponse(data);
      return data;
    }
    throw new Error(data.message || 'Hoàn tất đăng ký Google thất bại!');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Lỗi khi gọi API logout:', e);
    }
    clearLocalStorage();
    setUser(null);
  };

  const updateUser = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    if (newData.name !== undefined) localStorage.setItem('user_display_name', newData.name);
    if (newData.phone !== undefined) localStorage.setItem('user_phone', newData.phone);
    if (newData.points !== undefined) localStorage.setItem('user_points', String(newData.points));
    if (newData.tier !== undefined) localStorage.setItem('user_tier', newData.tier);
    if (newData.avatar !== undefined) localStorage.setItem('user_avatar', newData.avatar);
    if (newData.accountId !== undefined) localStorage.setItem('account_id', String(newData.accountId || ''));
    if (newData.customerId !== undefined) localStorage.setItem('customer_id', String(newData.customerId || ''));
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    googleLogin,
    completeGoogleSignup,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'staff',
    isCustomer: user?.role === 'customer',
    isStaff: user?.role === 'staff'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
