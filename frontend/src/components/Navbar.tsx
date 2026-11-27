import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { toDateInput } from '../utils/format';
import { activeTab, type TabKey } from '../utils/nav';
import UserMenu from './UserMenu';
import { CountBadge } from './ui';

interface NavItem {
  key: TabKey;
  label: string;
  to: (today: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'search', label: 'Tìm kèo', to: () => '/' },
  { key: 'mine', label: 'Lịch sử', to: () => '/lich-su' },
  { key: 'overview', label: 'Tổng quan', to: () => '/tong-quan' },
];

/**
 * Thanh điều hướng trên cùng, CHỈ hiện trên máy tính (từ 1024px).
 * Điện thoại và máy tính bảng dùng giao diện kiểu app: thanh tab đáy (TabBar) + thanh tiêu đề (PageHeader).
 */
export default function Navbar() {
  const { user } = useAuth();
  const { unread } = useChat();
  const { pathname } = useLocation();
  const [today] = useState(() => toDateInput(new Date()));
  const current = activeTab(pathname);
  // Trang tiện ích không có trên thanh (vd Kho cầu) → sáng "Tổng quan"
  const active =
    current && NAV_ITEMS.some((i) => i.key === current) ? current : current === 'shuttles' ? 'overview' : current;

  const linkClass = (key: TabKey) => `navbar__link${key === active ? ' navbar__link--active' : ''}`;

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          Badminton Matching
        </Link>

        <nav className="navbar__links" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.to(today)}
              className={linkClass(item.key)}
              aria-current={item.key === active ? 'page' : undefined}
            >
              {item.label}
              {item.key === 'mine' && <CountBadge count={unread} />}
            </Link>
          ))}
        </nav>

        <div className="navbar__actions">
          {user ? (
            <>
              <Link to="/keo/moi" className="btn btn--primary">
                Đăng kèo
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/dang-nhap" className="btn btn--outline">
                Đăng nhập
              </Link>
              <Link to="/dang-ky" className="btn btn--primary">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
