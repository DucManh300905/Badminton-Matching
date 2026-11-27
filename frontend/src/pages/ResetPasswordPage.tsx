import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../api/auth';
import { toApiError } from '../api/client';
import { Alert, FieldError } from '../components/ui';

/** Đặt mật khẩu mới từ link trong email (WBS 4.14); xong thì mọi máy phải đăng nhập lại */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    if (password !== confirm) {
      setFields({ confirm: 'Hai mật khẩu chưa giống nhau' });
      return;
    }
    setBusy(true);
    try {
      setDone(await authApi.resetPassword(token, password));
    } catch (err) {
      const info = toApiError(err);
      setError(info.fields.token ?? info.message);
      setFields(info.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout auth-layout--single">
      <form onSubmit={handleSubmit} className="card stack">
        <h1 className="auth-card__title">Đặt mật khẩu mới</h1>
        {done ? (
          <>
            <Alert tone="success">{done}</Alert>
            <Link to="/dang-nhap" className="btn btn--primary btn--block">
              Đăng nhập
            </Link>
          </>
        ) : !/^[a-f0-9]{64}$/.test(token) ? (
          <>
            <Alert>Link đặt lại mật khẩu không hợp lệ. Hãy mở đúng link trong email, hoặc yêu cầu link mới.</Alert>
            <Link to="/quen-mat-khau" className="btn btn--primary btn--block">
              Yêu cầu link mới
            </Link>
          </>
        ) : (
          <>
            {error && (
              <Alert>
                {error} <Link to="/quen-mat-khau">Yêu cầu link mới</Link>
              </Alert>
            )}
            <div className="field">
              <label htmlFor="password" className="label">
                Mật khẩu mới <span className="label__note">(tối thiểu 8 ký tự)</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldError message={fields.password} />
            </div>
            <div className="field">
              <label htmlFor="confirm" className="label">
                Nhập lại mật khẩu mới
              </label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <FieldError message={fields.confirm} />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
            </button>
            <p className="hint">Sau khi đổi, các máy đang đăng nhập tài khoản này sẽ phải đăng nhập lại.</p>
          </>
        )}
      </form>
    </div>
  );
}
