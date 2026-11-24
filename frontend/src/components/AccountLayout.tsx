import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { MenuItem } from './Menu';
import { Avatar } from './ui';

/** Khu quản lý tài khoản: menu dọc bên trái (icon nét mảnh), nội dung bên phải */
export default function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Điện thoại: menu chỉ hiện ở màn hình gốc "Tài khoản"; trang con dùng nút quay lại của thanh tiêu đề
  const isRoot = useLocation().pathname === '/tai-khoan';

  // Nằm sau RequireAuth nên luôn có user
  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className={`account-layout${isRoot ? ' account-layout--root' : ''}`}>
      <aside className="card account-nav sticky" aria-label="Tài khoản">
        <div className="account-nav__profile">
          <Avatar name={user.displayName} url={user.avatarUrl} />
          <div>
            <p className="account-nav__name">{user.displayName}</p>
            <p className="account-nav__email">{user.email}</p>
          </div>
        </div>
        <nav>
          <MenuItem icon="list" label="Tổng quan" to="/tai-khoan" end />
          <MenuItem icon="calendar" label="Kèo của tôi" to="/keo-cua-toi" />
          <MenuItem icon="plus" label="Đăng kèo mới" to="/keo/moi" />
          <MenuItem icon="shuttle" label="Kho cầu" to="/kho-cau" />
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
