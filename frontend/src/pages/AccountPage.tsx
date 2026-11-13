import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { usersApi, type MyPosts } from '../api/users';
import Icon from '../components/Icon';
import { MenuItem, MenuSection } from '../components/Menu';
import PageHeader from '../components/PageHeader';
import { Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION, LEVEL_LABELS } from '../utils/constants';
import { countUpcoming } from '../utils/myPosts';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mine, setMine] = useState<MyPosts | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    usersApi
      .myPosts()
      .then(setMine)
      .catch(() => setMine({ authored: [], joined: [] }));
  }, []);

  // Trang này nằm sau RequireAuth nên luôn có user
  if (!user) return null;

  // RequireAuth thấy "vừa tự đăng xuất" sẽ đưa về trang chủ; navigate('/') để chắc chắn
  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  // Chưa tải xong thì hiện "–" thay cho số
  const count = (n: number | undefined) => (n === undefined ? '–' : String(n));

  return (
    <>
      <PageHeader>
        <Link to="/tai-khoan/ho-so" className="profile-card" aria-label="Sửa hồ sơ">
          <Avatar name={user.displayName} />
          <div>
            <p className="profile-card__name">{user.displayName}</p>
            <p className="profile-card__email">{user.email}</p>
          </div>
          <Icon name="chevron" size={22} className="chevron" />
        </Link>
      </PageHeader>

      <div className="page-body">
        <div className="tiles">
          <Link to="/keo-cua-toi?tab=authored" className="tile">
            <span className="tile__value">{count(mine?.authored.length)}</span>
            <span className="tile__label">Kèo đã đăng</span>
          </Link>
          <Link to="/keo-cua-toi?tab=joined" className="tile">
            <span className="tile__value">{count(mine?.joined.length)}</span>
            <span className="tile__label">Đã tham gia</span>
          </Link>
          <Link to="/keo-cua-toi" className="tile">
            <span className="tile__value">
              {count(mine ? countUpcoming(mine.authored, mine.joined, now) : undefined)}
            </span>
            <span className="tile__label">Sắp diễn ra</span>
          </Link>
          <Link to="/tai-khoan/ho-so" className="tile">
            <span className="tile__value tile__value--text">{LEVEL_LABELS[user.level]}</span>
            <span className="tile__label">Trình độ</span>
          </Link>
        </div>

        <MenuSection title="Hoạt động">
          <MenuItem icon="calendar" label="Kèo của tôi" to="/keo-cua-toi" />
          <MenuItem icon="plus" label="Đăng kèo mới" to="/keo/moi" />
          <MenuItem icon="list" label="Tìm kèo" to="/" />
        </MenuSection>

        <MenuSection title="Hệ thống">
          <MenuItem icon="edit" label="Hồ sơ cá nhân" to="/tai-khoan/ho-so" />
          <MenuItem icon="lock" label="Đổi mật khẩu" to="/tai-khoan/doi-mat-khau" />
          <MenuItem icon="logout" label="Đăng xuất" onClick={handleLogout} danger />
        </MenuSection>

        <p className="version">Phiên bản {APP_VERSION}</p>
      </div>
    </>
  );
}
