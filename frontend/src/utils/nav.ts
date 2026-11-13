// Xác định tab nào đang được chọn trên thanh điều hướng đáy

export type TabKey = 'search' | 'today' | 'new' | 'mine' | 'account';

/**
 * @param pathname  location.pathname
 * @param search    location.search (vd "?date=2026-11-13")
 * @param today     ngày hôm nay dạng "YYYY-MM-DD"
 */
export function activeTab(pathname: string, search: string, today: string): TabKey | null {
  if (pathname === '/') {
    return new URLSearchParams(search).get('date') === today ? 'today' : 'search';
  }
  if (pathname === '/keo/moi') return 'new';
  if (pathname.startsWith('/keo/')) return 'search';
  if (pathname.startsWith('/keo-cua-toi')) return 'mine';
  if (pathname.startsWith('/tai-khoan') || pathname === '/dang-nhap' || pathname === '/dang-ky') return 'account';
  return null;
}
