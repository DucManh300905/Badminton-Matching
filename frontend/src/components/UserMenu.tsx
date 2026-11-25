import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import { Avatar } from './ui';

/**
 * Menu Tài khoản (WBS 4.12): chỉ gồm những gì thuộc về tài khoản — Cài đặt, Đăng xuất.
 * Các tính năng (Lịch sử, Kho cầu…) nằm ở Tổng quan, không lặp lại ở đây.
 * - compact: điện thoại, chỉ ảnh đại diện ở góc phải thanh tiêu đề
 * - thường: máy tính, ảnh + tên ở thanh trên
 * Chưa đăng nhập: nút "Đăng nhập".
 */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng menu
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link to="/dang-nhap" className={`btn ${compact ? 'btn--sm btn--outline' : 'btn--outline'}`}>
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className={`user-menu${compact ? ' user-menu--compact' : ''}`} ref={ref}>
      <button
        type="button"
        className="user-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản: ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={user.displayName} url={user.avatarUrl} size="sm" />
        {!compact && <span>{user.displayName}</span>}
      </button>
      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__header">
            <Avatar name={user.displayName} url={user.avatarUrl} />
            <div>
              <strong>{user.displayName}</strong>
              <p className="user-menu__email">{user.email}</p>
            </div>
          </div>
          <Link to="/tai-khoan/cai-dat" className="user-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="settings" size={18} />
            Cài đặt
          </Link>
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/', { replace: true });
            }}
          >
            <Icon name="logout" size={18} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
