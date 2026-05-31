import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tải thông tin người dùng từ LocalStorage lúc khởi động
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_display_name');
    const email = localStorage.getItem('user_email');
    const phone = localStorage.getItem('user_phone');
    const tier = localStorage.getItem('user_tier');
    const points = localStorage.getItem('user_points');
    const avatar = localStorage.getItem('user_avatar');

    if (role) {
      setUser({
        role,
        name: name || '',
        email: email || '',
        phone: phone || '',
        tier: tier || 'Member',
        points: points ? Number(points) : 0,
        avatar: avatar || ''
      });
    }
    setLoading(false);

    // Lắng nghe sự kiện storage từ các tab khác hoặc từ các file JS cũ
    const handleStorageChange = () => {
      const currentRole = localStorage.getItem('user_role');
      if (currentRole) {
        setUser({
          role: currentRole,
          name: localStorage.getItem('user_display_name') || '',
          email: localStorage.getItem('user_email') || '',
          phone: localStorage.getItem('user_phone') || '',
          tier: localStorage.getItem('user_tier') || 'Member',
          points: Number(localStorage.getItem('user_points') || 0),
          avatar: localStorage.getItem('user_avatar') || ''
        });
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    if (data.success) {
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('user_display_name', data.name || '');
      localStorage.setItem('user_email', data.email || '');
      if (data.phone) localStorage.setItem('user_phone', data.phone);
      if (data.tier) localStorage.setItem('user_tier', data.tier);
      if (data.points != null) localStorage.setItem('user_points', String(data.points));
      
      const loggedUser = {
        role: data.role,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        tier: data.tier || 'Member',
        points: data.points != null ? Number(data.points) : 0,
        avatar: ''
      };
      setUser(loggedUser);
      window.dispatchEvent(new Event('storage'));
      return data;
    }
    throw new Error(data.message || 'Đăng nhập thất bại!');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Lỗi khi gọi API logout:', e);
    }
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_tier');
    localStorage.removeItem('user_points');
    localStorage.removeItem('user_avatar');
    localStorage.removeItem('active_booking');
    localStorage.removeItem('wash_step');
    
    setUser(null);
    window.dispatchEvent(new Event('storage'));
  };

  const updateUser = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    if (newData.name !== undefined) localStorage.setItem('user_display_name', newData.name);
    if (newData.phone !== undefined) localStorage.setItem('user_phone', newData.phone);
    if (newData.points !== undefined) localStorage.setItem('user_points', String(newData.points));
    if (newData.tier !== undefined) localStorage.setItem('user_tier', newData.tier);
    if (newData.avatar !== undefined) localStorage.setItem('user_avatar', newData.avatar);
    window.dispatchEvent(new Event('storage'));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'staff',
    isCustomer: user?.role === 'customer'
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
