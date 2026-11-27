import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toApiError } from '../api/client';
import { Alert, FieldError } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RegisterInput } from '../types';
import { GENDER_LABELS, LEVEL_LABELS, SKILL_LEVELS, type Gender, type SkillLevel } from '../utils/constants';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [form, setForm] = useState<RegisterInput>({
    email: '',
    password: '',
    displayName: '',
    gender: 'male',
    level: 'TB',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      await register(form);
      navigate(from, { replace: true });
    } catch (err) {
      const info = toApiError(err);
      setError(info.message);
      setFields(info.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-layout">
        <section className="auth-intro">
          <h1 className="auth-intro__title">Tham gia cộng đồng chơi cầu lông</h1>
          <p className="auth-intro__text">Tạo tài khoản miễn phí, chỉ cần email, không cần số điện thoại.</p>
          <ul className="auth-intro__list">
            <li>Tìm kèo còn chỗ theo khu vực, ngày và trình độ</li>
            <li>Chia tiền theo từng khoản, thu tiền bằng mã QR</li>
            <li>Tham gia hoặc rời kèo chỉ với một lần bấm</li>
          </ul>
        </section>
        <form onSubmit={handleSubmit} className="card stack">
          <h2 className="auth-card__title">Tạo tài khoản</h2>
          {error && <Alert>{error}</Alert>}
          <div className="field">
            <label htmlFor="displayName" className="label">
              Tên hiển thị
            </label>
            <input
              id="displayName"
              required
              className="input"
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
            />
            <FieldError message={fields.displayName} />
          </div>
          <div className="field">
            <label htmlFor="phone" className="label">
              Số điện thoại <span className="label__note">(không bắt buộc)</span>
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="input"
              placeholder="Ví dụ: 0912 345 678"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
            <p className="hint">Chỉ người cùng kèo với bạn mới thấy, để gọi hoặc nhắn Zalo khi cần.</p>
            <FieldError message={fields.phone} />
          </div>
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
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
            <FieldError message={fields.email} />
          </div>
          <div className="field">
            <label htmlFor="password" className="label">
              Mật khẩu <span className="label__note">(tối thiểu 8 ký tự)</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
            <FieldError message={fields.password} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="gender" className="label">
                Giới tính
              </label>
              <select
                id="gender"
                className="input"
                value={form.gender}
                onChange={(e) => set('gender', e.target.value as Gender)}
              >
                {Object.entries(GENDER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="level" className="label">
                Trình độ
              </label>
              <select
                id="level"
                className="input"
                value={form.level}
                onChange={(e) => set('level', e.target.value as SkillLevel)}
              >
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hint">Giới tính và trình độ dùng để ghép bạn vào đúng chỗ trống của kèo.</p>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
          <p className="hint text-center">
            Đã có tài khoản?{' '}
            <Link to="/dang-nhap" state={{ from }} className="btn btn--link">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}
