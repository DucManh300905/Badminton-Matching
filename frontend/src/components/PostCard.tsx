import { Link } from 'react-router';
import type { PostSummary } from '../types';
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from '../utils/format';

interface Props {
  post: PostSummary;
  /** Truyền vào để đánh dấu kèo đã diễn ra (trang "Kèo của tôi") */
  now?: number;
}

/** Nhãn trạng thái: Đã hủy · Đã diễn ra · Đủ người · Còn … */
function statusBadge(post: PostSummary, now?: number): { text: string; tone: 'open' | 'full' | 'closed' } {
  if (post.status === 'closed') return { text: 'Đã hủy', tone: 'closed' };
  if (now !== undefined && new Date(post.startsAt).getTime() <= now) return { text: 'Đã diễn ra', tone: 'full' };
  if (post.status === 'full') return { text: 'Đủ người', tone: 'full' };
  // Nhãn chỉ ghi tổng cho gọn; chi tiết nam / nữ nằm ở hàng thông tin bên dưới
  const left = post.remaining.male + post.remaining.female + post.remaining.any;
  return { text: `Còn ${left} chỗ`, tone: 'open' };
}

export default function PostCard({ post, now }: Props) {
  const badge = statusBadge(post, now);
  const needed = badge.tone === 'open' ? formatSlots(post.remaining) : '';

  return (
    <Link
      to={`/keo/${post.id}`}
      className={`post-card${badge.tone === 'open' ? '' : ' post-card--dim'}`}
      aria-label={`Kèo ${post.courtName}`}
    >
      <div className="post-card__top">
        <div>
          <p className="post-card__time">{formatTimeRange(post.startsAt, post.endsAt)}</p>
          <h3 className="post-card__title">{post.courtName}</h3>
          <p className="post-card__area">{post.district}</p>
        </div>
        <span className={`badge badge--${badge.tone}`}>{badge.text}</span>
      </div>

      <div className="post-card__meta">
        {needed && (
          <span>
            Cần: <strong>{needed}</strong>
          </span>
        )}
        <span>
          Trình độ: <strong>{formatLevelRange(post.levelMin, post.levelMax)}</strong>
        </span>
        <span>
          Chi phí: <strong>{formatPrice(post.pricePerPerson)}/người</strong>
        </span>
        <span>
          Chủ kèo: <strong>{post.author.displayName}</strong>
        </span>
      </div>
    </Link>
  );
}
