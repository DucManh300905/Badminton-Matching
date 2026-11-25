import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import Icon from './Icon';
import UserMenu from './UserMenu';

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Đường dẫn phía trên tiêu đề, vd [{ to: '/', label: 'Danh sách kèo' }]. Mục cuối là đích của nút quay lại. */
  breadcrumbs?: { to: string; label: string }[];
  /** Nút hành động bên phải tiêu đề */
  actions?: ReactNode;
}

/**
 * Tiêu đề trang.
 * Máy tính: đường dẫn + tiêu đề lớn + mô tả + nút hành động (kiểu web).
 * Điện thoại: thanh tiêu đề gọn dính trên cùng, có nút quay lại về mục cuối của `breadcrumbs` (kiểu app).
 */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }: Props) {
  const back = breadcrumbs?.[breadcrumbs.length - 1];

  return (
    <header className="page-header">
      {back && (
        <Link to={back.to} className="page-header__back" aria-label={`Quay lại ${back.label}`}>
          <Icon name="back" size={24} />
        </Link>
      )}
      <div className="page-header__main">
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
      {/* Điện thoại: nút Tài khoản góc phải (WBS 4.12); máy tính dùng menu ở thanh trên */}
      <div className="page-header__account">
        <UserMenu compact />
      </div>
    </header>
  );
}
