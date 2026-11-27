import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { authApi } from '../api/auth';
import { toApiError } from '../api/client';
import { Alert, FieldError } from '../components/ui';

/** Cùng một email: chỉ gửi lại mã sau 60 giây (khớp backend) */
const RESEND_SECONDS = 60;

/**
 * Quên mật khẩu (WBS 4.14), 2 bước trên cùng trang:
 * 1) nhập email → nhận mã 4 số qua email (hiệu lực 10 phút);
 * 2) nhập mã + mật khẩu mới → mọi máy khác phải đăng nhập lại.
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setInfo(await authApi.forgotPassword(email.trim()));
      setStep('code');
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    if (password !== confirm) {
      setFields({ confirm: 'Hai mật khẩu chưa giống nhau' });
      return;
    }
    setBusy(true);
    try {
      setInfo(await authApi.resetPassword(email.trim(), code, password));
      setStep('done');
    } catch (err) {
      const res = toApiError(err);
      setError(res.message);
      setFields(res.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout auth-layout--single">
      {step === 'email' && (
        <form onSubmit={sendCode} className="card stack">
          <h1 className="auth-card__title">Quên mật khẩu</h1>
          <p className="hint">Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã 4 số để đặt mật khẩu mới.</p>
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
            {busy ? 'Đang gửi…' : 'Gửi mã'}
          </button>
          <p className="hint text-center">
            <Link to="/dang-nhap" className="btn btn--link">
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleReset} className="card stack">
          <h1 className="auth-card__title">Nhập mã và mật khẩu mới</h1>
          {info && <Alert tone="info">{info}</Alert>}
          <p className="hint">
            Mã gửi tới <strong>{email.trim()}</strong>, hiệu lực 10 phút. Nhập sai 5 lần thì mã bị hủy, hãy gửi mã mới.
          </p>
          {error && <Alert>{error}</Alert>}
          <div className="field">
            <label htmlFor="code" className="label">
              Mã 4 số
            </label>
            <input
              id="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{4}"
              maxLength={4}
              className="input otp-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <FieldError message={fields.code} />
          </div>
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
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || code.length !== 4}>
            {busy ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
          </button>
          <div className="otp-actions">
            <button type="button" className="btn btn--link" disabled={busy || wait > 0} onClick={() => sendCode()}>
              {wait > 0 ? `Gửi lại mã sau ${wait} giây` : 'Gửi lại mã'}
            </button>
            <button
              type="button"
              className="btn btn--link"
              onClick={() => {
                setStep('email');
                setError(null);
                setCode('');
              }}
            >
              Đổi email
            </button>
          </div>
          <p className="hint">Không thấy thư? Kiểm tra mục Spam / Quảng cáo.</p>
        </form>
      )}

      {step === 'done' && (
        <div className="card stack">
          <h1 className="auth-card__title">Đã đặt mật khẩu mới</h1>
          <Alert tone="success">{info}</Alert>
          <p className="hint">Các máy đang đăng nhập tài khoản này cũng phải đăng nhập lại.</p>
          <Link to="/dang-nhap" className="btn btn--primary btn--block">
            Đăng nhập
          </Link>
        </div>
      )}
    </div>
  );
}
