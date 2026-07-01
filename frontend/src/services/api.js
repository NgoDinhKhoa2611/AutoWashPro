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

/* ──────────────────────────────────────────────────────────────
 * Global loading tracker
 * ----------------------------------------------------------------
 * Đếm số request "tải dữ liệu" đang chạy (mặc định là GET) để hiển thị
 * một vòng tròn loading toàn cục. Các component đăng ký qua subscribeLoading.
 *
 *  - Chỉ GET được tính (đây là các lệnh tải dữ liệu khi mở trang).
 *  - Các thao tác ghi (POST/PUT/DELETE) đã có trạng thái loading riêng trên nút.
 *  - Request nền (vd: polling thông báo) có thể bỏ qua bằng cách truyền
 *    `{ skipGlobalLoader: true }` trong config.
 * ────────────────────────────────────────────────────────────── */
let activeCount = 0;
const loadingListeners = new Set();

const emitLoading = () => {
  for (const listener of loadingListeners) listener();
};

export const subscribeLoading = (listener) => {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
};

export const getLoadingCount = () => activeCount;

const shouldTrack = (config) =>
  config &&
  config.skipGlobalLoader !== true &&
  String(config.method || 'get').toLowerCase() === 'get';

api.interceptors.request.use(
  (config) => {
    if (shouldTrack(config)) {
      config.__trackedLoading = true;
      activeCount += 1;
      emitLoading();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const releaseTracked = (config) => {
  if (config && config.__trackedLoading) {
    config.__trackedLoading = false;
    activeCount = Math.max(0, activeCount - 1);
    emitLoading();
  }
};

api.interceptors.response.use(
  (response) => {
    releaseTracked(response.config);
    return response;
  },
  (error) => {
    releaseTracked(error.config);
    return Promise.reject(error);
  }
);

export default api;
