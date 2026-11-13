import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  title?: string;
  subtitle?: ReactNode;
  /** Đường dẫn "quay lại" hiện phía trên tiêu đề */
  back?: { to: string; label: string };
  /** Nội dung thêm trong header (vd thẻ thông tin người dùng) */
  children?: ReactNode;
  compact?: boolean;
}

/** Header nền xanh chuyển màu, mép dưới cong; phần .page-body ngay sau sẽ đè lên mép cong */
export default function PageHeader({ title, subtitle, back, children, compact }: Props) {
  return (
    <header className={`page-header${compact ? ' page-header--compact' : ''}`}>
      {back && (
        <Link to={back.to} className="page-header__back">
          ‹ {back.label}
        </Link>
      )}
      {title && <h1 className="page-header__title">{title}</h1>}
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
