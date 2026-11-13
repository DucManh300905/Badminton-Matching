import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import PostCard from '../components/PostCard';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostFilter, PostSummary } from '../types';
import { HANOI_AREAS } from '../utils/constants';
import { toDateInput } from '../utils/format';

export default function HomePage() {
  const { user } = useAuth();
  const [today] = useState(() => toDateInput(new Date()));
  // Bộ lọc nằm trên URL (?district=...&date=...) → chia sẻ link hoặc F5 vẫn giữ nguyên
  const [params, setParams] = useSearchParams();
  const district = params.get('district') ?? '';
  const date = params.get('date') ?? '';
  const myLevel = params.get('myLevel') === '1';

  const filter: PostFilter = {};
  if (district) filter.district = district;
  if (date) filter.date = date;
  if (myLevel && user) filter.level = user.level;
  // Khóa của bộ lọc hiện tại: kết quả chỉ được hiển thị nếu khớp khóa này
  const filterKey = JSON.stringify(filter);

  const [result, setResult] = useState<{ key: string; posts?: PostSummary[]; error?: string } | null>(null);
  const loading = result?.key !== filterKey;
  const posts = loading ? null : (result.posts ?? null);
  const error = loading ? null : (result.error ?? null);

  useEffect(() => {
    let cancelled = false;
    postsApi
      .list(JSON.parse(filterKey) as PostFilter)
      .then((p) => !cancelled && setResult({ key: filterKey, posts: p }))
      .catch((e) => !cancelled && setResult({ key: filterKey, error: toApiError(e).message }));
    return () => {
      cancelled = true;
    };
  }, [filterKey]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const isToday = date === today;

  return (
    <>
      <PageHeader
        title={isToday ? 'Kèo hôm nay' : 'Tìm kèo cầu lông'}
        subtitle={user ? `Chào ${user.displayName}, hôm nay đánh cầu không?` : 'Tìm đồng đội, ghép kèo nhanh chóng'}
      />

      <div className="page-body stack">
        <section className="card" aria-label="Bộ lọc">
          <div className="filters">
            <div>
              <label htmlFor="f-district" className="label">
                Khu vực
              </label>
              <select
                id="f-district"
                className="input"
                value={district}
                onChange={(e) => update('district', e.target.value)}
              >
                <option value="">Tất cả</option>
                {HANOI_AREAS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-date" className="label">
                Ngày
              </label>
              <input
                id="f-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => update('date', e.target.value)}
              />
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={myLevel}
                disabled={!user}
                onChange={(e) => update('myLevel', e.target.checked ? '1' : '')}
              />
              <span>Chỉ hiện kèo hợp trình độ của tôi {!user && <span className="hint">(cần đăng nhập)</span>}</span>
            </label>
          </div>
        </section>

        {error && <Alert>{error}</Alert>}
        {loading && <Spinner />}
        {posts && posts.length === 0 && (
          <div className="card empty">
            Chưa có kèo nào phù hợp. <Link to="/keo/moi">Đăng kèo đầu tiên</Link>
          </div>
        )}
        {posts && posts.length > 0 && (
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
