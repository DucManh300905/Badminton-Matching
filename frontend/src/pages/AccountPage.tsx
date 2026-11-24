import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { usersApi, type MyPosts } from '../api/users';
import PageHeader from '../components/PageHeader';
import PostCard from '../components/PostCard';
import Icon from '../components/Icon';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { LEVEL_LABELS } from '../utils/constants';
import { upcomingPosts } from '../utils/myPosts';

/** Số kèo sắp diễn ra hiển thị ở trang tổng quan */
const UPCOMING_LIMIT = 4;

export default function AccountPage() {
  const { user } = useAuth();
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

  const upcoming = mine ? upcomingPosts(mine.authored, mine.joined, now) : null;
  // Chưa tải xong thì hiện "–" thay cho số
  const count = (n: number | undefined) => (n === undefined ? '–' : String(n));

  return (
    <>
      <PageHeader title={`Xin chào, ${user.displayName}`} subtitle="Tổng quan hoạt động của bạn" />

      <div className="stats">
        <Link to="/keo-cua-toi?tab=authored" className="stat">
          <Icon name="edit" size={22} className="stat__icon" />
          <p className="stat__value">{count(mine?.authored.length)}</p>
          <p className="stat__label">Kèo đã đăng</p>
        </Link>
        <Link to="/keo-cua-toi?tab=joined" className="stat">
          <Icon name="users" size={22} className="stat__icon" />
          <p className="stat__value">{count(mine?.joined.length)}</p>
          <p className="stat__label">Đã tham gia</p>
        </Link>
        <Link to="/keo-cua-toi" className="stat">
          <Icon name="calendar" size={22} className="stat__icon" />
          <p className="stat__value">{count(upcoming?.length)}</p>
          <p className="stat__label">Sắp diễn ra</p>
        </Link>
        <Link to="/tai-khoan/ho-so" className="stat">
          <Icon name="level" size={22} className="stat__icon" />
          <p className="stat__value stat__value--text">{LEVEL_LABELS[user.level]}</p>
          <p className="stat__label">Trình độ</p>
        </Link>
      </div>

      {/* Điện thoại ẩn phần này: đã có tab "Kèo của tôi" ở thanh tab đáy */}
      <div className="account-upcoming">
        <div className="results-header">
          <h2 className="section-title">Kèo sắp diễn ra</h2>
          {upcoming && upcoming.length > UPCOMING_LIMIT && <Link to="/keo-cua-toi">Xem tất cả</Link>}
        </div>
        {!upcoming && <Spinner />}
        {upcoming && upcoming.length === 0 && (
          <div className="card empty">
            <Icon name="calendar" size={40} className="empty__icon" />
            <p>
              Bạn chưa có kèo nào sắp diễn ra. <Link to="/">Tìm kèo</Link> hoặc <Link to="/keo/moi">đăng kèo mới</Link>.
            </p>
          </div>
        )}
        {upcoming && upcoming.length > 0 && (
          <ul className="post-grid">
            {upcoming.slice(0, UPCOMING_LIMIT).map((p) => (
              <li key={p.id}>
                <PostCard post={p} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
