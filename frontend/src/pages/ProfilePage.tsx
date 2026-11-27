import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { usersApi, type ProfileInput } from '../api/users';
import AvatarUploader from '../components/AvatarUploader';
import BankAccountForm from '../components/BankAccountForm';
import PageHeader from '../components/PageHeader';
import { Alert, CardTitle, FieldError } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { GENDER_LABELS, LEVEL_LABELS, SKILL_LEVELS, type Gender, type SkillLevel } from '../utils/constants';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState<Required<ProfileInput>>(() => ({
    displayName: user?.displayName ?? '',
    gender: user?.gender ?? 'male',
    level: user?.level ?? 'TB',
    phone: user?.phone ?? '',
  }));
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProfileInput>(key: K, value: Required<ProfileInput>[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setFields({});
    try {
      setUser(await usersApi.updateMe(form));
      setMessage({ tone: 'success', text: 'Đã lưu hồ sơ.' });
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
      <PageHeader
        breadcrumbs={[{ to: '/tai-khoan/cai-dat', label: 'Cài đặt' }]}
        title="Hồ sơ cá nhân"
        subtitle="Thông tin dùng để ghép bạn vào kèo phù hợp"
      />
      <div className="stack">
        <AvatarUploader />
        <form onSubmit={handleSubmit} className="card form-card stack" aria-label="Thông tin cá nhân">
          <CardTitle icon="user">Thông tin cá nhân</CardTitle>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="field">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" className="input" value={user?.email ?? ''} disabled />
          </div>
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
          <p className="hint">Trình độ quyết định bạn tham gia được những kèo nào.</p>
          <div className="form-footer">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
        <BankAccountForm />
      </div>
    </>
  );
}
