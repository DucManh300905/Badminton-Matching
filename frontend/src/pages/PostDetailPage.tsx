import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { chatsApi } from '../api/chats';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import PageHeader from '../components/PageHeader';
import PaymentCard from '../components/PaymentCard';
import BillsCard from '../components/BillsCard';
import CostsCard, { AttendanceCard } from '../components/CostsCard';
import Icon, { type IconName } from '../components/Icon';
import { PostCoverBanner } from '../components/PostCover';
import ShareButtons from '../components/ShareButtons';
import { Alert, Avatar, CardTitle, Spinner } from '../components/ui';
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

/** Nhãn ô thông tin kèm icon */
function InfoLabel({ icon, children }: { icon: IconName; children: string }) {
  return (
    <dt>
      <Icon name={icon} size={16} />
      {children}
    </dt>
  );
}

export default function PostDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Thời điểm mở trang, dùng để biết kèo đã bắt đầu chưa
  const [openedAt] = useState(() => Date.now());
  const navigate = useNavigate();

  /** Nhắn riêng với một người cùng kèo (WBS 4.13) */
  async function messageTo(userId: string) {
    setActionError(null);
    try {
      navigate(`/lich-su/tin-nhan/${await chatsApi.directWith(userId)}`);
    } catch (e) {
      setActionError(toApiError(e).message);
    }
  }

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

  // Nút hành động chính: dùng ở thẻ "Tình trạng" (máy tính) và thanh dính ở đáy (điện thoại)
  const actionButton = !user ? (
    <Link to="/dang-nhap" state={{ from: `/keo/${post.id}` }} className="btn btn--primary btn--block btn--lg">
      Đăng nhập để tham gia
    </Link>
  ) : isAuthor ? (
    <button type="button" className="btn btn--danger btn--block" disabled={busy} onClick={() => act('cancel')}>
      Hủy kèo
    </button>
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
  );

  return (
    <>
      <PageHeader
        breadcrumbs={CRUMBS}
        title={post.courtName}
        subtitle={`${formatTimeRange(post.startsAt, post.endsAt)} · ${post.district}`}
      />

      <PostCoverBanner post={post} canEdit={isAuthor && post.status !== 'closed'} onSaved={setPost} />

      <div className="detail-layout">
        <div className="stack">
          <article className="card stack">
            <CardTitle icon="info">Thông tin kèo</CardTitle>
            <dl className="info-grid">
              <div>
                <InfoLabel icon="clock">Thời gian</InfoLabel>
                <dd>{formatTimeRange(post.startsAt, post.endsAt)}</dd>
              </div>
              <div>
                <InfoLabel icon="mapPin">Khu vực</InfoLabel>
                <dd>{post.district}</dd>
              </div>
              <div>
                <InfoLabel icon="user">Chủ kèo</InfoLabel>
                <dd className="info-grid__person">
                  <Avatar name={post.author.displayName} url={post.author.avatarUrl} size="xs" />
                  {post.author.displayName}
                  {hasJoined && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--chat"
                      aria-label={`Nhắn riêng cho ${post.author.displayName}`}
                      onClick={() => messageTo(post.author.id)}
                    >
                      <Icon name="chat" size={18} />
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <InfoLabel icon="level">Trình độ</InfoLabel>
                <dd>{formatLevelRange(post.levelMin, post.levelMax)}</dd>
              </div>
              <div>
                <InfoLabel icon="wallet">Chi phí dự kiến</InfoLabel>
                <dd>{formatPrice(post.pricePerPerson)}/người</dd>
              </div>
              {post.address && (
                <div>
                  <InfoLabel icon="court">Địa chỉ</InfoLabel>
                  <dd>{post.address}</dd>
                </div>
              )}
            </dl>
            {post.note && (
              <p className="note note--icon">
                <Icon name="note" size={16} />
                <span>{post.note}</span>
              </p>
            )}
          </article>

          <section className="card">
            <div className="action-card__status">
              <CardTitle icon="users" className="mt-0">
                Người tham gia ({post.participants.length}/{total})
              </CardTitle>
              {(isAuthor || hasJoined) && (
                <Link to={`/lich-su/tin-nhan/p-${post.id}`} className="btn btn--sm btn--outline">
                  <Icon name="chat" size={16} />
                  Nhắn nhóm
                </Link>
              )}
            </div>
            {isAuthor && payment?.hasCosts && payment.summary.participantCount > 0 && (
              <p className="pay-summary">
                Đã thu {payment.summary.paidCount}/{payment.summary.participantCount} người ·{' '}
                <strong>{formatMoney(payment.summary.collected)}</strong> / {formatMoney(payment.summary.expected)}
              </p>
            )}
            {isAuthor && payment?.hasCosts && !payment.bank && post.status !== 'closed' && (
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
                    <Avatar name={p.displayName} url={p.avatarUrl} size="sm" />
                    <div className="people__body">
                      <p className="people__name">{p.displayName}</p>
                      <p className="people__info">
                        {p.gender ? GENDER_LABELS[p.gender] : '—'} · {p.level ? LEVEL_LABELS[p.level] : '—'} ·{' '}
                        {SLOT_LABELS[p.slot]}
                        {p.attended === false && ' · vắng'}
                      </p>
                    </div>
                    {(isAuthor || hasJoined) && p.id !== user?.id && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--chat"
                        aria-label={`Nhắn riêng cho ${p.displayName}`}
                        onClick={() => messageTo(p.id)}
                      >
                        <Icon name="chat" size={18} />
                      </button>
                    )}
                    {p.paid !== undefined && p.amountDue === 0 && p.attended === false && (
                      <span className="badge badge--closed">Vắng</span>
                    )}
                    {p.paid !== undefined &&
                      (p.amountDue ?? 0) > 0 &&
                      (isAuthor && post.status !== 'closed' ? (
                        <button
                          type="button"
                          className={`paid-toggle${p.paid ? ' paid-toggle--on' : ''}${p.paymentStatus === 'owe' ? ' paid-toggle--owe' : ''}`}
                          aria-pressed={p.paid}
                          disabled={busy}
                          onClick={() => togglePaid(p.id, !p.paid)}
                        >
                          {p.paymentStatus === 'owe' ? 'Còn thiếu' : p.paid ? 'Đã trả' : 'Chưa trả'}
                        </button>
                      ) : (
                        <span
                          className={`badge badge--${p.paymentStatus === 'owe' ? 'closed' : p.paid ? 'open' : 'full'}`}
                        >
                          {p.paymentStatus === 'owe' ? 'Còn thiếu' : p.paid ? 'Đã trả' : 'Chưa trả'}
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {post.costs && <CostsCard post={post} isAuthor={isAuthor} onSaved={setPost} />}
          {post.costs && <BillsCard post={post} isAuthor={isAuthor} onSaved={setPost} />}
          {isAuthor && payment?.canMarkAttendance && (
            <AttendanceCard
              key={post.participants.map((p) => `${p.id}${p.attended}`).join()}
              post={post}
              onSaved={setPost}
            />
          )}
        </div>

        <div className="stack sticky">
          <aside className="card" aria-label="Tham gia kèo">
            <div className="action-card__status">
              <strong className="icon-text">
                <Icon name="flag" size={18} />
                Tình trạng
              </strong>
              <span className={`badge badge--${badge.tone}`}>{badge.text}</span>
            </div>
            <p className="action-card__price">
              {formatPrice(post.pricePerPerson)} <span>/ người (dự kiến)</span>
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
            ) : (
              <>
                {isAuthor && <p className="hint">Đây là kèo của bạn.</p>}
                {/* Điện thoại: nút này chuyển xuống thanh hành động dính ở đáy (bên dưới) */}
                <div className="action-card__buttons">{actionButton}</div>
              </>
            )}
            <ShareButtons post={post} />
          </aside>
          {hasJoined && payment && post.status !== 'closed' && <PaymentCard payment={payment} postId={post.id} />}
        </div>
      </div>

      {/* Điện thoại: thanh hành động dính ở đáy, ngay trên thanh tab */}
      {post.status !== 'closed' && !started && (
        <div className="action-bar">
          <div className="action-bar__info">
            <strong>{formatPrice(post.pricePerPerson)}</strong>
            <span>{badge.text}</span>
          </div>
          {actionButton}
        </div>
      )}
    </>
  );
}
