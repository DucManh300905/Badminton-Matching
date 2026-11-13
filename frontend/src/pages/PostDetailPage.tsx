import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import { Alert, Avatar, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostDetail } from '../types';
import { GENDER_LABELS, LEVEL_LABELS } from '../utils/constants';
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from '../utils/format';

const SLOT_LABELS = { male: 'chỗ nam', female: 'chỗ nữ', any: 'chỗ chung' } as const;

type Action = 'join' | 'leave' | 'cancel';

const BACK = { to: '/', label: 'Danh sách kèo' };

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

  if (loadError || !post) {
    return (
      <>
        <PageHeader title="Chi tiết kèo" back={BACK} compact />
        <div className="page-body">{loadError ? <Alert>{loadError}</Alert> : <Spinner />}</div>
      </>
    );
  }

  const isAuthor = user?.id === post.author.id;
  const hasJoined = !!user && post.participants.some((p) => p.id === user.id);
  const started = new Date(post.startsAt).getTime() <= openedAt;
  const total = post.slots.male + post.slots.female + post.slots.any;
  const badge =
    post.status === 'closed'
      ? { text: 'Đã hủy', tone: 'closed' }
      : post.status === 'full'
        ? { text: 'Đủ người', tone: 'full' }
        : { text: `Còn ${formatSlots(post.remaining)}`, tone: 'open' };

  return (
    <>
      <PageHeader back={BACK} title={post.courtName} subtitle={formatTimeRange(post.startsAt, post.endsAt)} />

      <div className="page-body stack">
        <article className="card stack">
          <div className="post-card__top">
            <div>
              <p className="post-card__area">
                {post.district}
                {post.address ? ` · ${post.address}` : ''}
              </p>
            </div>
            <span className={`badge badge--${badge.tone}`}>{badge.text}</span>
          </div>

          <dl className="info-grid">
            <div>
              <dt>Trình độ</dt>
              <dd>{formatLevelRange(post.levelMin, post.levelMax)}</dd>
            </div>
            <div>
              <dt>Chi phí</dt>
              <dd>{formatPrice(post.pricePerPerson)}/người</dd>
            </div>
            <div>
              <dt>Chủ kèo</dt>
              <dd>{post.author.displayName}</dd>
            </div>
          </dl>

          {post.note && <p className="note">{post.note}</p>}
        </article>

        <section className="card">
          <h2 className="card__title">
            Người tham gia ({post.participants.length}/{total})
          </h2>
          {post.participants.length === 0 ? (
            <p className="hint">Chưa có ai. Hãy là người đầu tiên!</p>
          ) : (
            <ul className="people">
              {post.participants.map((p) => (
                <li key={p.id}>
                  <Avatar name={p.displayName} />
                  <div>
                    <p className="people__name">{p.displayName}</p>
                    <p className="people__info">
                      {p.gender ? GENDER_LABELS[p.gender] : '—'} · {p.level ? LEVEL_LABELS[p.level] : '—'} ·{' '}
                      {SLOT_LABELS[p.slot]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {actionError && <Alert>{actionError}</Alert>}

        <div className="actions">
          {post.status === 'closed' ? (
            <p className="hint">Chủ kèo đã hủy kèo này.</p>
          ) : started ? (
            <p className="hint">Kèo đã bắt đầu.</p>
          ) : !user ? (
            <Link to="/dang-nhap" state={{ from: `/keo/${post.id}` }} className="btn btn--primary btn--block">
              Đăng nhập để tham gia
            </Link>
          ) : isAuthor ? (
            <>
              <p className="hint">Đây là kèo của bạn.</p>
              <button type="button" className="btn btn--danger" disabled={busy} onClick={() => act('cancel')}>
                Hủy kèo
              </button>
            </>
          ) : hasJoined ? (
            <button type="button" className="btn btn--danger btn--block" disabled={busy} onClick={() => act('leave')}>
              Rời kèo
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={busy || post.status !== 'open'}
              onClick={() => act('join')}
            >
              {post.status === 'open' ? 'Tham gia kèo' : 'Đã đủ người'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
