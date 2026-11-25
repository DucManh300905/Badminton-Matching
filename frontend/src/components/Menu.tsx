import { NavLink, useLocation } from 'react-router';
import Icon, { type IconName } from './Icon';

interface ItemProps {
  icon: IconName;
  label: string;
  to?: string;
  /** Chỉ sáng khi đúng đường dẫn (không sáng cho trang con) */
  end?: boolean;
  onClick?: () => void;
  danger?: boolean;
  /** Sáng cho mọi trang có đường dẫn bắt đầu bằng chuỗi này (vd Cài đặt sáng cả ở Hồ sơ, Đổi mật khẩu) */
  activePrefix?: string;
}

/** Một dòng menu: icon nét mảnh + nhãn. Có `to` → link (tự sáng khi đang ở trang đó); không có → nút. */
export function MenuItem({ icon, label, to, end, onClick, danger, activePrefix }: ItemProps) {
  const { pathname } = useLocation();
  const base = `menu-item${danger ? ' menu-item--danger' : ''}`;
  const content = (
    <>
      <Icon name={icon} size={20} className="menu-item__icon" />
      <span>{label}</span>
    </>
  );

  return to ? (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${base}${isActive || (activePrefix && pathname.startsWith(activePrefix)) ? ' menu-item--active' : ''}`
      }
    >
      {content}
    </NavLink>
  ) : (
    <button type="button" className={base} onClick={onClick}>
      {content}
    </button>
  );
}
