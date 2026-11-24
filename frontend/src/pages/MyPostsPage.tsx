import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toApiError } from '../api/client';
import { usersApi, type MyPosts } from '../api/users';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import PostCard from '../components/PostCard';
import { Alert, Spinner } from '../components/ui';

type Tab = 'joined' | 'authored';

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: 'joined', label: 'Đã tham gia', empty: 'Bạn chưa tham gia kèo nào.' },
  { key: 'authored', label: 'Đã đăng', empty: 'Bạn chưa đăng kèo nào.' },
];

export default function MyPostsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'authored' ? 'authored' : 'joined';
  const [data, setData] = useState<MyPosts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    usersApi
      .myPosts()
      .then(setData)
      .catch((e) => setError(toApiError(e).message));
  }, []);

  const current = TABS.find((t) => t.key === tab)!;
  const posts = data?.[tab] ?? [];

  return (
    <>
      <PageHeader
        title="Kèo của tôi"
        subtitle="Các kèo bạn đã tham gia và đã đăng"
        actions={
          <Link to="/keo/moi" className="btn btn--primary">
            Đăng kèo mới
          </Link>
        }
      />

      <div className="tabs" role="tablist" aria-label="Loại kèo">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
          >
            {t.label}
            {data ? ` (${data[t.key].length})` : ''}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && posts.length === 0 && (
        <div className="card empty">
          <Icon name={tab === 'joined' ? 'search' : 'calendar'} size={40} className="empty__icon" />
          <p>
            {current.empty}{' '}
            {tab === 'joined' ? <Link to="/">Tìm kèo ngay</Link> : <Link to="/keo/moi">Đăng kèo đầu tiên</Link>}
          </p>
        </div>
      )}
      {posts.length > 0 && (
        <ul className="post-grid">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} now={now} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
