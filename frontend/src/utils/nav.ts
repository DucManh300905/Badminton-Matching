// Xác định mục nào đang được chọn trên thanh điều hướng (thanh dưới trên điện thoại, thanh trên trên máy tính)
import type { FeatureKey } from './features';

export type TabKey = FeatureKey | 'overview';

/**
 * @param pathname  location.pathname
 * @returns null khi trang không thuộc tab nào (Cài đặt, hồ sơ… mở từ nút tài khoản góc phải)
 */
export function activeTab(pathname: string): TabKey | null {
  // "Hôm nay" là bộ lọc của Tìm kèo (WBS 4.15)
  if (pathname === '/') return 'search';
  if (pathname === '/keo/moi') return 'new';
  if (pathname.startsWith('/keo/')) return 'search';
  if (pathname.startsWith('/lich-su') || pathname.startsWith('/keo-cua-toi')) return 'mine';
  if (pathname.startsWith('/kho-cau')) return 'shuttles';
  if (pathname.startsWith('/tong-quan')) return 'overview';
  return null;
}
