import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { usersApi, type MyPosts } from '../api/users';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { LEVEL_LABELS } from '../utils/constants';
import { FEATURE_GROUPS, searchFeatures, type Feature } from '../utils/features';
import { toDateInput } from '../utils/format';
import { countUpcoming } from '../utils/myPosts';

/** Một ô tiện ích. Cần đăng nhập mà chưa đăng nhập → sang trang Đăng nhập, xong quay lại đúng tiện ích */
function FeatureTile({ f, today, guest, badge }: { f: Feature; today: string; guest: boolean; badge?: number }) {
  const target = f.to(today);
  const locked = guest && f.needsAuth;
  return (
    <li>
      <Link to={locked ? '/dang-nhap' : target} state={locked ? { from: target } : undefined} className="feature-tile">
        <span className="feature-tile__icon">
          <Icon name={f.icon} size={24} />
        </span>
        <span className="feature-tile__body">
          <span className="feature-tile__label">{f.label}</span>
          <span className="feature-tile__desc">{locked ? 'Cần đăng nhập' : f.description}</span>
        </span>
        {!!badge && <span className="count-badge">{badge > 99 ? '99+' : badge} tin chưa xem</span>}
      </Link>
    </li>
  );
}

/**
 * Tổng quan (WBS 4.12): nơi chứa mọi tính năng, có ô tìm kiếm (gõ không dấu vẫn ra).
 * Tính năng mới chỉ cần thêm vào utils/features.ts. Đầu trang là hàng số liệu nhỏ của người dùng.
 */
export default function OverviewPage() {
  const { user } = useAuth();
  const { unread } = useChat();
  const [query, setQuery] = useState('');
  const [today] = useState(() => toDateInput(new Date()));
  const [now] = useState(() => Date.now());
  const [mine, setMine] = useState<MyPosts | null>(null);

  useEffect(() => {
    if (!user) return;
    usersApi
      .myPosts()
      .then(setMine)
      .catch(() => setMine({ authored: [], joined: [] }));
  }, [user]);

  const results = searchFeatures(query);
  const count = (n: number | undefined) => (n === undefined ? '–' : String(n));

  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle={user ? `Xin chào, ${user.displayName}` : 'Mọi tính năng của Badminton Matching'}
      />

      {user && (
        <div className="mini-stats" aria-label="Hoạt động của bạn">
          <Link to="/lich-su?tab=authored" className="mini-stat">
            <strong>{count(mine?.authored.length)}</strong>
            <span>Đã đăng</span>
          </Link>
          <Link to="/lich-su?tab=joined" className="mini-stat">
            <strong>{count(mine?.joined.length)}</strong>
            <span>Đã tham gia</span>
          </Link>
          <Link to="/lich-su" className="mini-stat">
            <strong>{mine ? countUpcoming(mine.authored, mine.joined, now) : '–'}</strong>
            <span>Sắp diễn ra</span>
          </Link>
          <Link to="/tai-khoan/ho-so" className="mini-stat">
            <strong className="mini-stat__text">{LEVEL_LABELS[user.level]}</strong>
            <span>Trình độ</span>
          </Link>
        </div>
      )}

      <div className="feature-search">
        <Icon name="search" size={20} />
        <input
          type="search"
          className="input"
          placeholder="Tìm tính năng, ví dụ: kho cau, hom nay…"
          aria-label="Tìm tính năng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <div className="card empty">
          <Icon name="search" size={40} className="empty__icon" />
          <p>Không có tính năng nào khớp "{query}".</p>
        </div>
      ) : (
        FEATURE_GROUPS.map((g) => {
          const items = results.filter((f) => f.group === g.key);
          if (items.length === 0) return null;
          return (
            <section key={g.key} className="feature-group" aria-label={g.label}>
              <h2 className="feature-group__title">{g.label}</h2>
              <ul className="feature-grid">
                {items.map((f) => (
                  <FeatureTile key={f.key} f={f} today={today} guest={!user} badge={f.key === 'mine' ? unread : 0} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
