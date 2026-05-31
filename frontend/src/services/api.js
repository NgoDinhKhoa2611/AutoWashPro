import axios from 'axios';

// Trong quá trình phát triển (development) sử dụng Vite Proxy, chúng ta dùng relative path.
// Trong production hoặc khi không dùng proxy, cấu hình VITE_API_BASE_URL trỏ tới http://localhost:5023
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Quan trọng: Đảm bảo Session Cookie và Custom Cookies được gửi đi
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
