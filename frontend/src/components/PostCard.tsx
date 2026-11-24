import { Link } from 'react-router';
import type { PostSummary } from '../types';
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from '../utils/format';
import Icon from './Icon';
import { Cover } from './PostCover';
import { Avatar, IconText } from './ui';

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
      <Cover url={post.coverUrl} className="cover--card" />
      <div className="post-card__top">
        <div>
          <p className="post-card__time">
            <IconText icon="clock">{formatTimeRange(post.startsAt, post.endsAt)}</IconText>
          </p>
          <h3 className="post-card__title">{post.courtName}</h3>
          <p className="post-card__area">
            <IconText icon="mapPin">{post.district}</IconText>
          </p>
        </div>
        <span className={`badge badge--${badge.tone}`}>{badge.text}</span>
      </div>

      <div className="post-card__meta">
        {needed && (
          <span>
            <Icon name="users" size={16} />
            <span>
              Cần: <strong>{needed}</strong>
            </span>
          </span>
        )}
        <span>
          <Icon name="level" size={16} />
          <span>
            Trình độ: <strong>{formatLevelRange(post.levelMin, post.levelMax)}</strong>
          </span>
        </span>
        <span>
          <Icon name="wallet" size={16} />
          <span>
            Dự kiến: <strong>{formatPrice(post.pricePerPerson)}/người</strong>
          </span>
        </span>
        <span>
          <Avatar name={post.author.displayName} url={post.author.avatarUrl} size="xs" />
          <span>
            Chủ kèo: <strong>{post.author.displayName}</strong>
          </span>
        </span>
      </div>
    </Link>
  );
}
