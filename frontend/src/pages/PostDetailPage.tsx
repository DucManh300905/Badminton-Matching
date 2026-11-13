import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostDetail } from '../types';
import { GENDER_LABELS, LEVEL_LABELS } from '../utils/constants';
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from '../utils/format';

const SLOT_LABELS = { male: 'chỗ nam', female: 'chỗ nữ', any: 'chỗ chung' } as const;
const STATUS_LABELS = { full: 'Đủ người', closed: 'Đã hủy' } as const;

type Action = 'join' | 'leave' | 'cancel';

export default function PostDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Thời điểm mở trang, dùng để biết kèo đã bắt đầu chưa
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    postsApi
      .get(id)
      .then(setPost)
      .catch((e) => setLoadError(toApiError(e).message));
  }, [id]);

  async function act(action: Action) {
    if (action === 'cancel' && !window.confirm('Hủy kèo này? Người đã tham gia sẽ thấy kèo bị hủy.')) return;
    setBusy(true);
    setActionError(null);
    try {
      setPost(await postsApi[action](id));
    } catch (e) {
      setActionError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!post) return <Spinner />;

  const isAuthor = user?.id === post.author.id;
  const hasJoined = !!user && post.participants.some((p) => p.id === user.id);
  const started = new Date(post.startsAt).getTime() <= openedAt;
  const total = post.slots.male + post.slots.female + post.slots.any;

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-slate-500 hover:text-emerald-700">
        ← Danh sách kèo
      </Link>

      <article className="card space-y-5 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-emerald-700">{formatTimeRange(post.startsAt, post.endsAt)}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{post.courtName}</h1>
            <p className="text-slate-500">
              📍 {post.district}
              {post.address ? ` · ${post.address}` : ''}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              post.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {post.status === 'open' ? `Còn ${formatSlots(post.remaining)}` : STATUS_LABELS[post.status]}
          </span>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Trình độ</dt>
            <dd className="font-medium">{formatLevelRange(post.levelMin, post.levelMax)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Chi phí</dt>
            <dd className="font-medium">{formatPrice(post.pricePerPerson)}/người</dd>
          </div>
          <div>
            <dt className="text-slate-500">Chủ kèo</dt>
            <dd className="font-medium">{post.author.displayName}</dd>
          </div>
        </dl>

        {post.note && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">{post.note}</p>
        )}

        <section>
          <h2 className="mb-2 font-semibold text-slate-900">
            Người tham gia ({post.participants.length}/{total})
          </h2>
          {post.participants.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có ai. Hãy là người đầu tiên!</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {post.participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{p.displayName}</span>
                  <span className="text-slate-500">
                    {p.gender ? GENDER_LABELS[p.gender] : '—'} · {p.level ? LEVEL_LABELS[p.level] : '—'} ·{' '}
                    {SLOT_LABELS[p.slot]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {actionError && <Alert>{actionError}</Alert>}

        <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          {post.status === 'closed' ? (
            <p className="text-sm text-slate-500">Chủ kèo đã hủy kèo này.</p>
          ) : started ? (
            <p className="text-sm text-slate-500">Kèo đã bắt đầu.</p>
          ) : !user ? (
            <Link to="/dang-nhap" state={{ from: `/keo/${post.id}` }} className="btn-primary">
              Đăng nhập để tham gia
            </Link>
          ) : isAuthor ? (
            <>
              <p className="text-sm text-slate-500">Đây là kèo của bạn.</p>
              <button type="button" className="btn-danger ml-auto" disabled={busy} onClick={() => act('cancel')}>
                Hủy kèo
              </button>
            </>
          ) : hasJoined ? (
            <button type="button" className="btn-danger" disabled={busy} onClick={() => act('leave')}>
              Rời kèo
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={busy || post.status !== 'open'}
              onClick={() => act('join')}
            >
              {post.status === 'open' ? 'Tham gia kèo' : 'Đã đủ người'}
            </button>
          )}
        </footer>
      </article>
    </div>
  );
}
