import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PostCard from '../components/PostCard';
import UserMenu from '../components/UserMenu';
import Icon from '../components/Icon';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostFilter, PostSummary } from '../types';
import { HANOI_AREAS } from '../utils/constants';
import { formatDateShort, toDateInput } from '../utils/format';

export default function HomePage() {
  const { user } = useAuth();
  const [today] = useState(() => toDateInput(new Date()));
  const [tomorrow] = useState(() => toDateInput(new Date(Date.now() + 24 * 3600 * 1000)));
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
  const hasFilter = !!(district || date || myLevel);
  const customDate = date && date !== today && date !== tomorrow;
  const chip = (on: boolean) => `chip${on ? ' chip--on' : ''}`;

  return (
    <>
      {/* Điện thoại: thanh tiêu đề gọn thay cho banner */}
      <header className="home-appbar">
        <div>
          <p className="home-appbar__brand">Badminton Matching</p>
          <p className="home-appbar__hello">{user ? `Chào ${user.displayName}` : 'Tìm kèo cầu lông, ghép đội nhanh'}</p>
        </div>
        <UserMenu compact />
      </header>

      <section className="hero">
        <div>
          <h1 className="hero__title">{isToday ? 'Kèo cầu lông hôm nay' : 'Tìm kèo cầu lông, ghép đội nhanh'}</h1>
          <p className="hero__subtitle">
            {user
              ? `Chào ${user.displayName}. Chọn khu vực và ngày để tìm kèo còn chỗ, hoặc đăng kèo của bạn để tìm thêm người.`
              : 'Xem các kèo còn chỗ tại Hà Nội, lọc theo khu vực, ngày và trình độ. Đăng nhập để tham gia hoặc đăng kèo.'}
          </p>
        </div>
        <Link to="/keo/moi" className="btn btn--light btn--lg">
          Đăng kèo
        </Link>
      </section>

      {/* Lọc nhanh dùng chung cho điện thoại và máy tính (WBS 4.15): "Hôm nay" là một bộ lọc, không còn là tiện ích riêng */}
      <div className="chips" role="group" aria-label="Lọc nhanh">
        <button type="button" className={chip(!date)} aria-pressed={!date} onClick={() => update('date', '')}>
          Mọi ngày
        </button>
        <button type="button" className={chip(isToday)} aria-pressed={isToday} onClick={() => update('date', today)}>
          Hôm nay
        </button>
        <button
          type="button"
          className={chip(date === tomorrow)}
          aria-pressed={date === tomorrow}
          onClick={() => update('date', tomorrow)}
        >
          Ngày mai
        </button>
        <label className={`${chip(!!customDate)} chip--picker`}>
          <span>{customDate ? formatDateShort(date) : 'Chọn ngày'}</span>
          <input type="date" aria-label="Chọn ngày" value={date} onChange={(e) => update('date', e.target.value)} />
        </label>
        <label className={`${chip(!!district)} chip--picker`}>
          <span>{district || 'Khu vực'}</span>
          <select aria-label="Khu vực" value={district} onChange={(e) => update('district', e.target.value)}>
            <option value="">Tất cả khu vực</option>
            {HANOI_AREAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        {user && (
          <button
            type="button"
            className={chip(myLevel)}
            aria-pressed={myLevel}
            onClick={() => update('myLevel', myLevel ? '' : '1')}
          >
            Hợp trình độ
          </button>
        )}
        {hasFilter && (
          <button type="button" className="chip chip--clear" onClick={() => setParams({}, { replace: true })}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <section aria-label="Danh sách kèo">
        <div className="results-header">
          <h2 className="section-title mt-0">{isToday ? 'Kèo hôm nay' : 'Kèo sắp diễn ra'}</h2>
          {posts && <span className="results-header__count">{posts.length} kèo</span>}
        </div>

        {error && <Alert>{error}</Alert>}
        {loading && <Spinner />}
        {posts && posts.length === 0 && (
          <div className="card empty">
            <Icon name="shuttle" size={40} className="empty__icon" />
            <p>
              Chưa có kèo nào phù hợp. <Link to="/keo/moi">Đăng kèo đầu tiên</Link>
            </p>
          </div>
        )}
        {posts && posts.length > 0 && (
          <ul className="post-grid">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
