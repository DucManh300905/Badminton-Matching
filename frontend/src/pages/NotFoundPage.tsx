import { Link } from 'react-router';
import PageHeader from '../components/PageHeader';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Không tìm thấy trang" compact />
      <div className="page-body">
        <div className="card not-found">
          <p className="not-found__code">404</p>
          <p className="hint">Đường dẫn không tồn tại hoặc đã bị đổi.</p>
          <p>
            <Link to="/" className="btn btn--link">
              Về trang chủ
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
