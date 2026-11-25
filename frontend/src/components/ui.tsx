import type { ReactNode } from 'react';
import { initials } from '../utils/format';
import Icon, { type IconName } from './Icon';

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div role="status" className="spinner">
      {label}
    </div>
  );
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'success' }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`alert alert--${tone}`}>
      {children}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error">{message}</p>;
}

/** Ảnh đại diện: ảnh người dùng tải lên (WBS 4.9); chưa có thì dùng chữ cái đầu của tên */
export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const cls = `avatar${size === 'md' ? '' : ` avatar--${size}`}`;
  if (url) return <img className={`${cls} avatar--img`} src={url} alt="" aria-hidden="true" loading="lazy" />;
  return (
    <span className={cls} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Số tin chưa xem trong vòng đỏ (quá 99 → "99+"); 0 thì không hiện */
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`count-dot ${className}`.trim()} aria-label={`${count} tin nhắn chưa xem`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Tiêu đề thẻ kèm icon nét mảnh */
export function CardTitle({
  icon,
  children,
  className = '',
  as: Tag = 'h2',
}: {
  icon: IconName;
  children: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <Tag className={`card__title card__title--icon ${className}`.trim()}>
      <Icon name={icon} size={20} />
      <span>{children}</span>
    </Tag>
  );
}

/** Dòng chữ kèm icon nhỏ phía trước (thông tin kèo, nhãn bộ lọc…) */
export function IconText({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="icon-text">
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </span>
  );
}
