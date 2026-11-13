import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toApiError } from '../api/client';
import PageHeader from '../components/PageHeader';
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
      <PageHeader title="Tạo tài khoản" subtitle="Chỉ cần email, không cần số điện thoại" />
      <div className="page-body">
        <form onSubmit={handleSubmit} className="card stack">
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
