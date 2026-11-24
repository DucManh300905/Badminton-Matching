import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import PaymentCard from '../components/PaymentCard';
import SettlementForm, { SettlementSummary } from '../components/SettlementForm';
import { Alert, Avatar, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { PostDetail } from '../types';
import { GENDER_LABELS, LEVEL_LABELS } from '../utils/constants';
import { formatLevelRange, formatMoney, formatPrice, formatTimeRange } from '../utils/format';

const SLOT_LABELS = { male: 'chỗ nam', female: 'chỗ nữ', any: 'chỗ chung' } as const;
const SLOT_ROWS = [
  ['male', 'Nam'],
  ['female', 'Nữ'],
  ['any', 'Nam hoặc nữ'],
] as const;

type Action = 'join' | 'leave' | 'cancel';

const CRUMBS = [{ to: '/', label: 'Danh sách kèo' }];

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

  async function togglePaid(userId: string, paid: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      setPost(await postsApi.setPaid(id, userId, paid));
    } catch (e) {
      setActionError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError || !post) {
    return (
      <>
        <PageHeader title="Chi tiết kèo" breadcrumbs={CRUMBS} />
        {loadError ? <Alert>{loadError}</Alert> : <Spinner />}
      </>
    );
  }

  const isAuthor = user?.id === post.author.id;
  const payment = post.payment;
  const hasJoined = !!user && post.participants.some((p) => p.id === user.id);
  const started = new Date(post.startsAt).getTime() <= openedAt;
  const total = post.slots.male + post.slots.female + post.slots.any;
  const left = post.remaining.male + post.remaining.female + post.remaining.any;
  const badge =
    post.status === 'closed'
      ? { text: 'Đã hủy', tone: 'closed' }
      : post.status === 'full'
        ? { text: 'Đủ người', tone: 'full' }
        : { text: `Còn ${left} chỗ`, tone: 'open' };

  return (
    <>
      <PageHeader
        breadcrumbs={CRUMBS}
        title={post.courtName}
        subtitle={`${formatTimeRange(post.startsAt, post.endsAt)} · ${post.district}`}
      />

      <div className="detail-layout">
        <div className="stack">
          <article className="card stack">
            <h2 className="card__title">Thông tin kèo</h2>
            <dl className="info-grid">
              <div>
                <dt>Thời gian</dt>
                <dd>{formatTimeRange(post.startsAt, post.endsAt)}</dd>
              </div>
              <div>
                <dt>Khu vực</dt>
                <dd>{post.district}</dd>
              </div>
              <div>
                <dt>Chủ kèo</dt>
                <dd>{post.author.displayName}</dd>
              </div>
              <div>
                <dt>Trình độ</dt>
                <dd>{formatLevelRange(post.levelMin, post.levelMax)}</dd>
              </div>
              <div>
                <dt>Chi phí</dt>
                <dd>{formatPrice(post.pricePerPerson)}/người</dd>
              </div>
              {post.address && (
                <div>
                  <dt>Địa chỉ</dt>
                  <dd>{post.address}</dd>
                </div>
              )}
            </dl>
            {post.note && <p className="note">{post.note}</p>}
          </article>

          <section className="card">
            <h2 className="card__title">
              Người tham gia ({post.participants.length}/{total})
            </h2>
            {isAuthor && payment && payment.amount > 0 && post.participants.length > 0 && (
              <p className="pay-summary">
                Đã thu {payment.summary.paidCount}/{payment.summary.participantCount} người ·{' '}
                <strong>{formatMoney(payment.summary.collected)}</strong> / {formatMoney(payment.summary.expected)}
              </p>
            )}
            {isAuthor && payment && payment.amount > 0 && !payment.bank && post.status !== 'closed' && (
              <div className="notice">
                <Alert tone="info">
                  Thêm số tài khoản để người chơi chuyển tiền bằng mã QR:{' '}
                  <Link to="/tai-khoan/ho-so">mở Hồ sơ cá nhân</Link>.
                </Alert>
              </div>
            )}
            {post.participants.length === 0 ? (
              <p className="hint">Chưa có ai. Hãy là người đầu tiên!</p>
            ) : (
              <ul className="people">
                {post.participants.map((p) => (
                  <li key={p.id}>
                    <Avatar name={p.displayName} size="sm" />
                    <div className="people__body">
                      <p className="people__name">{p.displayName}</p>
                      <p className="people__info">
                        {p.gender ? GENDER_LABELS[p.gender] : '—'} · {p.level ? LEVEL_LABELS[p.level] : '—'} ·{' '}
                        {SLOT_LABELS[p.slot]}
                        {p.attended === false && ' · vắng'}
                      </p>
                    </div>
                    {p.paid !== undefined && p.amountDue === 0 && p.attended === false && (
                      <span className="badge badge--closed">Vắng</span>
                    )}
                    {p.paid !== undefined &&
                      (p.amountDue ?? post.pricePerPerson) > 0 &&
                      (isAuthor && post.status !== 'closed' ? (
                        <button
                          type="button"
                          className={`paid-toggle${p.paid ? ' paid-toggle--on' : ''}`}
                          aria-pressed={p.paid}
                          disabled={busy}
                          onClick={() => togglePaid(p.id, !p.paid)}
                        >
                          {p.paid ? 'Đã trả' : 'Chưa trả'}
                        </button>
                      ) : (
                        <span className={`badge badge--${p.paid ? 'open' : 'full'}`}>
                          {p.paid ? 'Đã trả' : 'Chưa trả'}
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isAuthor && payment?.canSettle && (
            <SettlementForm key={post.settlement?.settledAt ?? 'new'} post={post} onSaved={setPost} />
          )}
          {isAuthor && !payment?.canSettle && post.settlement && (
            <section className="card" aria-label="Chi phí đã chốt">
              <h2 className="card__title">Chi phí đã chốt</h2>
              <SettlementSummary settlement={post.settlement} />
            </section>
          )}
        </div>

        <div className="stack sticky">
          <aside className="card" aria-label="Tham gia kèo">
            <div className="action-card__status">
              <strong>Tình trạng</strong>
              <span className={`badge badge--${badge.tone}`}>{badge.text}</span>
            </div>
            <p className="action-card__price">
              {formatPrice(post.settlement?.perPerson ?? post.pricePerPerson)}{' '}
              <span>/ người{post.settlement ? ' (đã chốt)' : ''}</span>
            </p>
            <dl className="slot-list">
              {SLOT_ROWS.filter(([k]) => post.slots[k] > 0).map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd>
                    còn {post.remaining[k]}/{post.slots[k]}
                  </dd>
                </div>
              ))}
            </dl>

            {actionError && (
              <div className="notice">
                <Alert>{actionError}</Alert>
              </div>
            )}

            {post.status === 'closed' ? (
              <p className="hint">Chủ kèo đã hủy kèo này.</p>
            ) : started ? (
              <p className="hint">Kèo đã bắt đầu.</p>
            ) : !user ? (
              <Link to="/dang-nhap" state={{ from: `/keo/${post.id}` }} className="btn btn--primary btn--block btn--lg">
                Đăng nhập để tham gia
              </Link>
            ) : isAuthor ? (
              <div className="stack">
                <p className="hint">Đây là kèo của bạn.</p>
                <button
                  type="button"
                  className="btn btn--danger btn--block"
                  disabled={busy}
                  onClick={() => act('cancel')}
                >
                  Hủy kèo
                </button>
              </div>
            ) : hasJoined ? (
              <button type="button" className="btn btn--danger btn--block" disabled={busy} onClick={() => act('leave')}>
                Rời kèo
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--block btn--lg"
                disabled={busy || post.status !== 'open'}
                onClick={() => act('join')}
              >
                {post.status === 'open' ? 'Tham gia kèo' : 'Đã đủ người'}
              </button>
            )}
          </aside>
          {hasJoined && payment && post.status !== 'closed' && (
            <PaymentCard payment={payment} postId={post.id} settlement={post.settlement} />
          )}
        </div>
      </div>
    </>
  );
}
