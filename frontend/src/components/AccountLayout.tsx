import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { MenuItem } from './Menu';
import { Avatar } from './ui';

/** Khu quản lý tài khoản: menu dọc bên trái (icon nét mảnh), nội dung bên phải */
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
          <Avatar name={user.displayName} />
          <div>
            <p className="account-nav__name">{user.displayName}</p>
            <p className="account-nav__email">{user.email}</p>
          </div>
        </div>
        <nav>
          <MenuItem icon="list" label="Tổng quan" to="/tai-khoan" end />
          <MenuItem icon="calendar" label="Kèo của tôi" to="/keo-cua-toi" />
          <MenuItem icon="plus" label="Đăng kèo mới" to="/keo/moi" />
          <div className="menu-divider" />
          <MenuItem icon="edit" label="Hồ sơ cá nhân" to="/tai-khoan/ho-so" />
          <MenuItem icon="lock" label="Đổi mật khẩu" to="/tai-khoan/doi-mat-khau" />
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
