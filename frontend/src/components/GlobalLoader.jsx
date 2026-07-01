import { useEffect, useState, useSyncExternalStore } from 'react';
import { subscribeLoading, getLoadingCount } from '../services/api';
import '../styles/global-loader.css';

/**
 * Hook trả về true khi có request tải dữ liệu đang chạy.
 * Có độ trễ nhỏ để các request nhanh không gây nhấp nháy vòng loading.
 */
const useGlobalLoading = (delay = 250) => {
  const count = useSyncExternalStore(subscribeLoading, getLoadingCount, getLoadingCount);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [count, delay]);

  return visible;
};

/**
 * Vòng tròn loading toàn cục. Hiển thị khi có dữ liệu đang được tải
 * trên bất kỳ trang nào (dựa trên các request GET qua axios).
 */
export const GlobalLoader = () => {
  const loading = useGlobalLoading();

  if (!loading) return null;

  return (
    <div className="global-loader-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loader-ring" aria-hidden="true"></div>
      <span className="visually-hidden">Đang tải dữ liệu...</span>
    </div>
  );
};

export default GlobalLoader;
