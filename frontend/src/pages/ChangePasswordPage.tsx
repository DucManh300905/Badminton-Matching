import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { toApiError, tokenStore } from '../api/client';
import PageHeader from '../components/PageHeader';
import { Alert, FieldError } from '../components/ui';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePasswordPage() {
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFields({});
    if (form.newPassword !== form.confirm) {
      setFields({ confirm: 'Mật khẩu nhập lại không khớp' });
      return;
    }
    setSaving(true);
    try {
      // Đổi mật khẩu làm mọi token cũ hết hiệu lực → lưu ngay token mới để không bị đăng xuất
      tokenStore.set(await authApi.changePassword(form.currentPassword, form.newPassword));
      setForm(EMPTY);
      setMessage({ tone: 'success', text: 'Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại.' });
    } catch (err) {
      const info = toApiError(err);
      setMessage({ tone: 'error', text: info.message });
      setFields(info.fields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Đổi mật khẩu" back={{ to: '/tai-khoan', label: 'Tài khoản' }} compact />
      <div className="page-body">
        <form onSubmit={handleSubmit} className="card stack">
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="field">
            <label htmlFor="currentPassword" className="label">
              Mật khẩu hiện tại
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
            />
            <FieldError message={fields.currentPassword} />
          </div>
          <div className="field">
            <label htmlFor="newPassword" className="label">
              Mật khẩu mới <span className="label__note">(tối thiểu 8 ký tự)</span>
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
            />
            <FieldError message={fields.newPassword} />
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
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
            />
            <FieldError message={fields.confirm} />
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
            {saving ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </>
  );
}
