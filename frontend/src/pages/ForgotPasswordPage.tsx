import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { authApi } from '../api/auth';
import { toApiError } from '../api/client';
import { Alert } from '../components/ui';

/** Quên mật khẩu (WBS 4.14): nhập email, nhận link đặt lại (hiệu lực 30 phút) */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSent(await authApi.forgotPassword(email.trim()));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout auth-layout--single">
      <form onSubmit={handleSubmit} className="card stack">
        <h1 className="auth-card__title">Quên mật khẩu</h1>
        {sent ? (
          <>
            <Alert tone="success">{sent}</Alert>
            <p className="hint">Không thấy thư sau vài phút? Kiểm tra mục Spam / Quảng cáo, hoặc gửi lại sau 1 phút.</p>
            <button type="button" className="btn btn--outline btn--block" onClick={() => setSent(null)}>
              Gửi lại
            </button>
          </>
        ) : (
          <>
            <p className="hint">Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi link để đặt mật khẩu mới.</p>
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
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
            </button>
          </>
        )}
        <p className="hint text-center">
          <Link to="/dang-nhap" className="btn btn--link">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}
