import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { PostDetail } from '../types';
import { checkImage, IMAGE_ACCEPT } from '../utils/images';
import Icon from './Icon';
import { Alert, CardTitle } from './ui';

export const MAX_BILLS = 7;

/** Xem ảnh bill cỡ lớn; Esc hoặc bấm nền để đóng, mũi tên để chuyển ảnh */
function Lightbox({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const go = (d: number) => setI((x) => (x + d + urls.length) % urls.length);
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh bill ${i + 1} / ${urls.length}`}
      tabIndex={-1}
      ref={(el) => el?.focus()}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      <img src={urls[i]} alt={`Ảnh bill ${i + 1}`} onClick={(e) => e.stopPropagation()} />
      <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
        {urls.length > 1 && (
          <button type="button" className="btn btn--sm btn--overlay" onClick={() => go(-1)} aria-label="Ảnh trước">
            <Icon name="back" size={16} />
          </button>
        )}
        <span>
          {i + 1} / {urls.length}
        </span>
        {urls.length > 1 && (
          <button type="button" className="btn btn--sm btn--overlay" onClick={() => go(1)} aria-label="Ảnh sau">
            <Icon name="chevron" size={16} />
          </button>
        )}
        <button type="button" className="btn btn--sm btn--overlay" onClick={onClose}>
          <Icon name="close" size={16} />
          Đóng
        </button>
      </div>
    </div>
  );
}

/**
 * Thẻ "Bill và hóa đơn" ngay dưới Chi phí kèo (WBS 4.11):
 * chủ kèo tải tối đa 7 ảnh bill; mọi người trong kèo xem ảnh và xuất hóa đơn (in / lưu PDF).
 */
export default function BillsCard({
  post,
  isAuthor,
  onSaved,
}: {
  post: PostDetail;
  isAuthor: boolean;
  onSaved: (p: PostDetail) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const bills = post.bills ?? [];
  const canEdit = isAuthor && post.status !== 'closed';

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length === 0) return;
    const room = MAX_BILLS - bills.length;
    const bad = files.map(checkImage).find(Boolean);
    if (bad) return setError(bad);
    if (files.length > room) return setError(`Chỉ còn thêm được ${room} ảnh (tối đa ${MAX_BILLS}).`);

    setBusy(true);
    setError(null);
    try {
      let latest = post;
      for (const f of files) latest = await postsApi.addBill(post.id, f);
      onSaved(latest);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: string) {
    if (!window.confirm('Xóa ảnh bill này?')) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await postsApi.removeBill(post.id, file));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack" aria-label="Bill và hóa đơn">
      <div className="action-card__status">
        <CardTitle icon="note" className="mt-0">
          Bill và hóa đơn
        </CardTitle>
        <span className="hint">
          {bills.length}/{MAX_BILLS} ảnh
        </span>
      </div>
      {error && <Alert>{error}</Alert>}

      {bills.length === 0 ? (
        <p className="hint">
          {canEdit ? 'Chụp hóa đơn sân, nước, cầu… để mọi người cùng xem. Tối đa 7 ảnh.' : 'Chủ kèo chưa tải ảnh bill.'}
        </p>
      ) : (
        <ul className="bill-grid">
          {bills.map((b, i) => (
            <li key={b.file} className="bill-grid__item">
              <button
                type="button"
                className="bill-grid__thumb"
                onClick={() => setOpen(i)}
                aria-label={`Xem ảnh bill ${i + 1}`}
              >
                <img src={b.url} alt="" loading="lazy" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="bill-grid__remove"
                  aria-label={`Xóa ảnh bill ${i + 1}`}
                  disabled={busy}
                  onClick={() => remove(b.file)}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="bill-actions">
        {canEdit && bills.length < MAX_BILLS && (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => input.current?.click()}>
            <Icon name="camera" size={18} />
            {busy ? 'Đang tải…' : 'Thêm ảnh bill'}
          </button>
        )}
        <Link to={`/keo/${post.id}/hoa-don`} className="btn btn--primary">
          <Icon name="receipt" size={18} />
          Xuất hóa đơn
        </Link>
      </div>
      {canEdit && (
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="sr-only"
          aria-label="Chọn ảnh bill"
          onChange={handleFiles}
        />
      )}
      {open !== null && <Lightbox urls={bills.map((b) => b.url)} index={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
