import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { toDateInput } from '../utils/format';
import { activeTab, type TabKey } from '../utils/nav';
import { Avatar } from './ui';

interface NavItem {
  key: TabKey;
  label: string;
  to: (today: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'search', label: 'Tìm kèo', to: () => '/' },
  { key: 'today', label: 'Hôm nay', to: (today) => `/?date=${today}` },
  { key: 'mine', label: 'Kèo của tôi', to: () => '/keo-cua-toi' },
];

const ACCOUNT_LINKS = [
  { to: '/tai-khoan', label: 'Tổng quan tài khoản' },
  { to: '/keo-cua-toi', label: 'Kèo của tôi' },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ cá nhân' },
  { to: '/tai-khoan/doi-mat-khau', label: 'Đổi mật khẩu' },
];

/** Menu người dùng ở góc phải: bấm vào tên để mở */
function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng menu
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={user.displayName} url={user.avatarUrl} size="sm" />
        <span>{user.displayName}</span>
      </button>
      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__header">
            <strong>{user.displayName}</strong>
            <p className="user-menu__email">{user.email}</p>
          </div>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="user-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Thanh điều hướng trên cùng, CHỈ hiện trên máy tính (từ 1024px).
 * Điện thoại và máy tính bảng dùng giao diện kiểu app: thanh tab đáy (TabBar) + thanh tiêu đề (PageHeader).
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [today] = useState(() => toDateInput(new Date()));
  const active = activeTab(pathname, search, today);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

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
            </Link>
          ))}
        </nav>

        <div className="navbar__actions">
          {user ? (
            <>
              <Link to="/keo/moi" className="btn btn--primary">
                Đăng kèo
              </Link>
              <UserMenu onLogout={handleLogout} />
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
