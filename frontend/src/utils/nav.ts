// Xác định mục nào đang được chọn trên thanh điều hướng (thanh dưới trên điện thoại, thanh trên trên máy tính)
import type { FeatureKey } from './features';

export type TabKey = FeatureKey | 'overview';

/**
 * @param pathname  location.pathname
 * @param search    location.search (vd "?date=2026-11-13")
 * @param today     ngày hôm nay dạng "YYYY-MM-DD"
 * @returns null khi trang không thuộc tab nào (Cài đặt, hồ sơ… mở từ nút tài khoản góc phải)
 */
export function activeTab(pathname: string, search: string, today: string): TabKey | null {
  if (pathname === '/') {
    return new URLSearchParams(search).get('date') === today ? 'today' : 'search';
  }
  if (pathname === '/keo/moi') return 'new';
  if (pathname.startsWith('/keo/')) return 'search';
  if (pathname.startsWith('/keo-cua-toi')) return 'mine';
  if (pathname.startsWith('/kho-cau')) return 'shuttles';
  if (pathname.startsWith('/tong-quan')) return 'overview';
  return null;
}
