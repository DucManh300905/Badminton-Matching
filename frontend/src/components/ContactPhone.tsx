import { useState, type FormEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { PostDetail } from '../types';
import { formatPhone } from '../utils/format';
import Icon from './Icon';
import { Alert, FieldError } from './ui';

// ── Số liên hệ (WBS 4.16) ──

/**
 * Chủ kèo xem / đổi / xóa số liên hệ của kèo ngay ở trang chi tiết (app chưa có chức năng sửa kèo).
 * Chỉ đổi số của kèo này, không đổi số trong hồ sơ.
 */
export function ContactPhoneEditor({ post, onSaved }: { post: PostDetail; onSaved: (p: PostDetail) => void }) {
  const current = post.author.phone ?? '';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await postsApi.setContactPhone(post.id, value.trim()));
      setEditing(false);
    } catch (err) {
      const info = toApiError(err);
      setError(info.fields.contactPhone ?? info.message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <span className="contact-phone">
        <Icon name="phone" size={14} />
        {current ? formatPhone(current) : <span className="hint">Chưa có số liên hệ</span>}
        <button
          type="button"
          className="btn btn--link"
          onClick={() => {
            setValue(current);
            setEditing(true);
          }}
        >
          {current ? 'Sửa' : 'Thêm số'}
        </button>
      </span>
    );
  }

  return (
    <form className="contact-phone contact-phone--edit" onSubmit={save}>
      <label htmlFor="contact-phone-edit" className="sr-only">
        Số điện thoại liên hệ của kèo
      </label>
      <input
        id="contact-phone-edit"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className="input input--sm"
        placeholder="Để trống = không để số"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="btn btn--sm btn--primary" disabled={saving}>
        {saving ? 'Đang lưu…' : 'Lưu'}
      </button>
      <button type="button" className="btn btn--sm btn--outline" onClick={() => setEditing(false)}>
        Hủy
      </button>
      <FieldError message={error ?? undefined} />
    </form>
  );
}

/**
 * Sau khi tham gia kèo mà hồ sơ chưa có số điện thoại: mời thêm số để chủ kèo liên lạc khi cần.
 * Lưu vào hồ sơ; "Bỏ qua" chỉ ẩn hộp này.
 */
export function PhonePrompt({ onClose }: { onClose: () => void }) {
  const { setUser } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      setUser(await usersApi.updateMe({ phone: value.trim() }));
      onClose();
    } catch (err) {
      const info = toApiError(err);
      setError(info.fields.phone ?? info.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card phone-prompt" aria-label="Thêm số điện thoại">
      <div className="notice">
        <Alert tone="info">Bạn đã tham gia kèo. Thêm số điện thoại để chủ kèo liên lạc khi cần (đổi giờ, đổi sân…).</Alert>
      </div>
      <form className="phone-prompt__form" onSubmit={save}>
        <label htmlFor="prompt-phone" className="sr-only">
          Số điện thoại
        </label>
        <input
          id="prompt-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="input"
          placeholder="Ví dụ: 0912 345 678"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={saving || !value.trim()}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" className="btn btn--outline" onClick={onClose}>
          Bỏ qua
        </button>
      </form>
      <FieldError message={error ?? undefined} />
      <p className="hint">Lưu vào Hồ sơ cá nhân. Chỉ người cùng kèo với bạn mới thấy.</p>
    </section>
  );
}
