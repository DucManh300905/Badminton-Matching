import { useRef, useState, type ChangeEvent } from 'react';
import { toApiError } from '../api/client';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { checkImage, IMAGE_ACCEPT } from '../utils/images';
import Icon from './Icon';
import { Alert, Avatar, CardTitle } from './ui';

/** Thẻ "Ảnh đại diện" trong Hồ sơ cá nhân: chọn ảnh là tải lên luôn, không cần bấm lưu */
export default function AvatarUploader() {
  const { user, setUser } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  async function run(task: () => Promise<User>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      setUser(await task());
      setMessage({ tone: 'success', text: done });
    } catch (e) {
      setMessage({ tone: 'error', text: toApiError(e).message });
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // chọn lại cùng một ảnh vẫn chạy
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setMessage({ tone: 'error', text: problem });
    run(() => usersApi.uploadAvatar(file), 'Đã đổi ảnh đại diện.');
  }

  function handleRemove() {
    if (!window.confirm('Xóa ảnh đại diện? Sẽ quay về chữ cái đầu của tên.')) return;
    run(() => usersApi.deleteAvatar(), 'Đã xóa ảnh đại diện.');
  }

  return (
    <section className="card form-card stack" aria-label="Ảnh đại diện">
      <CardTitle icon="camera">Ảnh đại diện</CardTitle>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="avatar-uploader">
        <Avatar name={user.displayName} url={user.avatarUrl} size="lg" />
        <div className="stack stack--tight">
          <div className="avatar-uploader__actions">
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => input.current?.click()}>
              <Icon name="image" size={18} />
              {busy ? 'Đang tải…' : user.avatarUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
            </button>
            {user.avatarUrl && (
              <button type="button" className="btn btn--ghost btn--danger-text" disabled={busy} onClick={handleRemove}>
                <Icon name="trash" size={18} />
                Xóa
              </button>
            )}
          </div>
          <p className="hint">JPEG, PNG hoặc WebP, tối đa 5 MB. Ảnh được cắt vuông và xóa thông tin vị trí.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          aria-label="Chọn ảnh đại diện"
          onChange={handleFile}
        />
      </div>
    </section>
  );
}
