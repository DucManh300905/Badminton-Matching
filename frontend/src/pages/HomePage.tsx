import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import FilterPanel from '../components/FilterPanel';
import PostCard from '../components/PostCard';
import UserMenu from '../components/UserMenu';
import Icon from '../components/Icon';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostFilter, PostSummary } from '../types';
import { toDateInput } from '../utils/format';
import { EMPTY_FILTER, activeFilters, matchesQuery, readFilter, writeFilter, type FilterValues } from '../utils/postFilter';

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

  const [panelOpen, setPanelOpen] = useState(false);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const current = readFilter(params);
  const active = activeFilters(current, { today, tomorrow, loggedIn: !!user });
  // Ô tìm tên sân giữ giá trị riêng (gõ nhanh không mất chữ), URL chỉ đi theo sau để chia sẻ / tải lại vẫn giữ
  const [query, setQueryText] = useState(() => params.get('q') ?? '');
  // Ô tìm tên sân lọc ngay trên danh sách đã tải (tối đa 100 kèo sắp diễn ra)
  const shown = posts?.filter((p) => matchesQuery(p, query)) ?? null;

  function applyFilter(f: FilterValues) {
    setParams((prev) => writeFilter(prev, f), { replace: true });
    setPanelOpen(false);
  }

  function setQuery(q: string) {
    setQueryText(q);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (q.trim()) next.set('q', q);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }

  const isToday = date === today;

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

      {/* Tìm tên sân + nút "Bộ lọc" (WBS 4.17): mọi bộ lọc gom vào một bảng, ngoài chỉ còn nhãn bộ lọc đang bật */}
      <div className="filter-bar">
        <div className="filter-bar__row">
          <label className="search-box">
            <Icon name="search" size={18} />
            <span className="sr-only">Tìm theo tên sân</span>
            <input
              type="search"
              className="search-box__input"
              placeholder="Tìm tên sân, địa chỉ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`btn btn--outline filter-bar__toggle${active.length ? ' filter-bar__toggle--on' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
          >
            <Icon name="sliders" size={18} />
            Bộ lọc
            {active.length > 0 && <span className="filter-bar__count">{active.length}</span>}
          </button>
          {panelOpen && (
            <FilterPanel
              value={current}
              today={today}
              tomorrow={tomorrow}
              loggedIn={!!user}
              onApply={applyFilter}
              onClose={closePanel}
            />
          )}
        </div>

        {active.length > 0 && (
          <div className="filter-tags" aria-label="Bộ lọc đang bật">
            {active.map((a) => (
              <button
                key={a.key}
                type="button"
                className="filter-tag"
                aria-label={`Bỏ lọc ${a.label}`}
                onClick={() => applyFilter({ ...current, [a.key]: a.key === 'myLevel' ? false : '' })}
              >
                {a.label}
                <Icon name="close" size={14} />
              </button>
            ))}
            {active.length > 1 && (
              <button type="button" className="btn btn--link filter-tags__clear" onClick={() => applyFilter(EMPTY_FILTER)}>
                Xóa tất cả
              </button>
            )}
          </div>
        )}
      </div>

      <section aria-label="Danh sách kèo">
        <div className="results-header">
          <h2 className="section-title mt-0">{isToday ? 'Kèo hôm nay' : 'Kèo sắp diễn ra'}</h2>
          {shown && <span className="results-header__count">{shown.length} kèo</span>}
        </div>

        {error && <Alert>{error}</Alert>}
        {loading && <Spinner />}
        {shown && shown.length === 0 && (
          <div className="card empty">
            <Icon name={query ? 'search' : 'shuttle'} size={40} className="empty__icon" />
            {query && posts && posts.length > 0 ? (
              <p>
                Không có kèo nào khớp “{query}”.{' '}
                <button type="button" className="btn btn--link" onClick={() => setQuery('')}>
                  Xóa ô tìm
                </button>
              </p>
            ) : (
              <p>
                Chưa có kèo nào phù hợp. <Link to="/keo/moi">Đăng kèo đầu tiên</Link>
              </p>
            )}
          </div>
        )}
        {shown && shown.length > 0 && (
          <ul className="post-grid">
            {shown.map((p) => (
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
