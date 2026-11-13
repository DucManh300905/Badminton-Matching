import { Link } from 'react-router';
import type { PostSummary } from '../types';
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from '../utils/format';

export default function PostCard({ post }: { post: PostSummary }) {
  const isFull = post.status === 'full';
  const remaining = formatSlots(post.remaining);

  return (
    <Link
      to={`/keo/${post.id}`}
      className="card block p-4 transition hover:border-emerald-300 hover:shadow-md"
      aria-label={`Kèo ${post.courtName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">{formatTimeRange(post.startsAt, post.endsAt)}</p>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-900">{post.courtName}</h3>
          <p className="text-sm text-slate-500">📍 {post.district}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isFull ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isFull ? 'Đủ người' : `Còn ${remaining}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>🎯 {formatLevelRange(post.levelMin, post.levelMax)}</span>
        <span>💰 {formatPrice(post.pricePerPerson)}/người</span>
        <span>👤 {post.author.displayName}</span>
      </div>
    </Link>
  );
}
