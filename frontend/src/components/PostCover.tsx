import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { PostDetail } from '../types';
import { checkImage, IMAGE_ACCEPT } from '../utils/images';
import Icon from './Icon';
import { Alert } from './ui';

/** Ảnh bìa: ảnh thật hoặc dải màu xanh mặc định (dùng ở thẻ kèo, trang chi tiết, ô chọn ảnh) */
export function Cover({ url, className = '' }: { url?: string | null; className?: string }) {
  return (
    <div className={`cover${url ? '' : ' cover--empty'} ${className}`.trim()} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" /> : <Icon name="shuttle" size={40} />}
    </div>
  );
}

/** Ô chọn ảnh bìa khi đăng kèo: chỉ xem trước, ảnh được tải lên sau khi kèo tạo xong */
export function CoverPicker({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Giải phóng ảnh xem trước cũ khi đổi ảnh hoặc rời trang
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(next: File | null) {
    setPreview(next ? URL.createObjectURL(next) : null);
    onChange(next);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const problem = checkImage(picked);
    setError(problem);
    if (!problem) pick(picked);
  }

  return (
    <div className="stack stack--tight">
      <Cover url={preview} className="cover--picker" />
      {error && <Alert>{error}</Alert>}
      <div className="cover-actions">
        <button type="button" className="btn btn--outline" onClick={() => input.current?.click()}>
          <Icon name="image" size={18} />
          {file ? 'Đổi ảnh' : 'Chọn ảnh bìa'}
        </button>
        {file && (
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => pick(null)}>
            <Icon name="trash" size={18} />
            Bỏ ảnh
          </button>
        )}
      </div>
      <p className="hint">Không bắt buộc. JPEG, PNG hoặc WebP, tối đa 5 MB; ảnh được cắt theo khung 1200×630.</p>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label="Chọn ảnh bìa"
        onChange={handleFile}
      />
    </div>
  );
}

/** Dải ảnh bìa đầu trang chi tiết; chủ kèo đổi / xóa được khi kèo chưa hủy */
export function PostCoverBanner({
  post,
  canEdit,
  onSaved,
}: {
  post: PostDetail;
  canEdit: boolean;
  onSaved: (p: PostDetail) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<PostDetail>) {
    setBusy(true);
    setError(null);
    try {
      onSaved(await task());
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setError(problem);
    run(() => postsApi.uploadCover(post.id, file));
  }

  return (
    <div className="cover-banner">
      <Cover url={post.coverUrl} className="cover--banner" />
      {canEdit && (
        <div className="cover-banner__tools">
          <button
            type="button"
            className="btn btn--sm btn--overlay"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Icon name="camera" size={16} />
            {busy ? 'Đang tải…' : post.coverUrl ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
          </button>
          {post.coverUrl && (
            <button
              type="button"
              className="btn btn--sm btn--overlay"
              disabled={busy}
              aria-label="Xóa ảnh bìa"
              onClick={() => window.confirm('Xóa ảnh bìa của kèo?') && run(() => postsApi.deleteCover(post.id))}
            >
              <Icon name="trash" size={16} />
              Xóa
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            aria-label="Chọn ảnh bìa"
            onChange={handleFile}
          />
        </div>
      )}
      {error && (
        <div className="notice">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}
