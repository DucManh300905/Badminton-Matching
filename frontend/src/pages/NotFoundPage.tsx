import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="card not-found">
      <p className="not-found__code">404</p>
      <h1 className="section-title mt-0">Không tìm thấy trang</h1>
      <p className="hint">Đường dẫn không tồn tại hoặc đã bị đổi.</p>
      <p>
        <Link to="/" className="btn btn--primary">
          Về trang chủ
        </Link>
      </p>
    </div>
  );
}
