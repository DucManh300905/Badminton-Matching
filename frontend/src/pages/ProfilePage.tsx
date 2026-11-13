import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { usersApi, type ProfileInput } from '../api/users';
import PageHeader from '../components/PageHeader';
import { Alert, FieldError } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { GENDER_LABELS, LEVEL_LABELS, SKILL_LEVELS, type Gender, type SkillLevel } from '../utils/constants';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState<Required<ProfileInput>>(() => ({
    displayName: user?.displayName ?? '',
    gender: user?.gender ?? 'male',
    level: user?.level ?? 'TB',
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
      <PageHeader title="Hồ sơ cá nhân" back={{ to: '/tai-khoan', label: 'Tài khoản' }} compact />
      <div className="page-body">
        <form onSubmit={handleSubmit} className="card stack">
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
          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </>
  );
}
