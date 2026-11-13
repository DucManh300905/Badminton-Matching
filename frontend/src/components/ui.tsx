import type { ReactNode } from 'react';
import { initials } from '../utils/format';

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

/** Ảnh đại diện = chữ cái đầu của tên (không dùng hình) */
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
