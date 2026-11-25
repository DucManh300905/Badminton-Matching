import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { MenuItem } from './Menu';
import { Avatar } from './ui';

/**
 * Khu tài khoản trên máy tính: menu dọc bên trái (icon nét mảnh), nội dung bên phải.
 * Điện thoại ẩn menu này: tính năng nằm ở tab Tổng quan, Cài đặt / Đăng xuất ở nút tài khoản góc phải (WBS 4.12).
 */
export default function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Nằm sau RequireAuth nên luôn có user
  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="account-layout">
      <aside className="card account-nav sticky" aria-label="Tài khoản">
        <div className="account-nav__profile">
          <Avatar name={user.displayName} url={user.avatarUrl} />
          <div>
            <p className="account-nav__name">{user.displayName}</p>
            <p className="account-nav__email">{user.email}</p>
          </div>
        </div>
        <nav>
          <MenuItem icon="grid" label="Tổng quan" to="/tong-quan" end />
          <MenuItem icon="calendar" label="Kèo của tôi" to="/keo-cua-toi" />
          <MenuItem icon="plus" label="Đăng kèo mới" to="/keo/moi" />
          <MenuItem icon="shuttle" label="Kho cầu" to="/kho-cau" />
          <div className="menu-divider" />
          <MenuItem icon="settings" label="Cài đặt" to="/tai-khoan/cai-dat" activePrefix="/tai-khoan/" />
          <div className="menu-divider" />
          <MenuItem icon="logout" label="Đăng xuất" onClick={handleLogout} danger />
        </nav>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
