import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Icon, { type IconName } from './Icon';

/** Nhóm menu có tiêu đề xanh, các dòng nằm trong một thẻ trắng */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      <div className="menu">{children}</div>
    </section>
  );
}

interface ItemProps {
  icon: IconName;
  label: string;
  /** Chữ nhỏ phía phải, trước dấu > */
  hint?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

/** Một dòng menu: icon nét mảnh · nhãn · (gợi ý) · dấu > */
export function MenuItem({ icon, label, hint, to, onClick, danger }: ItemProps) {
  const className = `menu-item${danger ? ' menu-item--danger' : ''}`;
  const content = (
    <>
      <Icon name={icon} className="menu-item__icon" />
      <span>{label}</span>
      {hint && <span className="menu-item__hint">{hint}</span>}
      <Icon name="chevron" size={20} className="chevron" />
    </>
  );

  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
