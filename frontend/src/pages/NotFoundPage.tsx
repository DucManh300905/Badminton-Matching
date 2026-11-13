import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl">🏸</p>
      <h1 className="mt-4 text-xl font-bold">Không tìm thấy trang</h1>
      <Link to="/" className="mt-4 inline-block text-emerald-700 hover:underline">
        Về trang chủ
      </Link>
    </div>
  );
}
