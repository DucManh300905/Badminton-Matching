import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Đường dẫn phía trên tiêu đề, vd [{ to: '/', label: 'Danh sách kèo' }] */
  breadcrumbs?: { to: string; label: string }[];
  /** Nút hành động bên phải tiêu đề */
  actions?: ReactNode;
}

/** Tiêu đề trang kiểu web: đường dẫn + tiêu đề + mô tả + nút hành động */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }: Props) {
  return (
    <header className="page-header">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumb" aria-label="Đường dẫn">
            {breadcrumbs.map((b) => (
              <Fragment key={b.to}>
                <Link to={b.to}>{b.label}</Link>
                <span aria-hidden="true">›</span>
              </Fragment>
            ))}
            <span>{title}</span>
          </nav>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
