import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toApiError } from '../api/client';
import { Alert } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-layout">
        <section className="auth-intro">
          <h1 className="auth-intro__title">Chào mừng bạn quay lại</h1>
          <p className="auth-intro__text">Đăng nhập để đăng kèo, tham gia kèo và theo dõi lịch chơi của bạn.</p>
          <ul className="auth-intro__list">
            <li>Tìm kèo còn chỗ theo khu vực, ngày và trình độ</li>
            <li>Chia tiền theo từng khoản, thu tiền bằng mã QR</li>
            <li>Tham gia hoặc rời kèo chỉ với một lần bấm</li>
          </ul>
        </section>
        <form onSubmit={handleSubmit} className="card stack">
          <h2 className="auth-card__title">Đăng nhập</h2>
          {error && <Alert>{error}</Alert>}
          <div className="field">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password" className="label">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
          <p className="hint text-center">
            Chưa có tài khoản?{' '}
            <Link to="/dang-ky" state={{ from }} className="btn btn--link">
              Đăng ký
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}
