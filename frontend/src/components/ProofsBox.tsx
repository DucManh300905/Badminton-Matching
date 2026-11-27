import { useRef, useState, type ChangeEvent } from 'react';
import { toApiError } from '../api/client';
import { postsApi } from '../api/posts';
import type { PostDetail, UploadedImage } from '../types';
import { checkImage, IMAGE_ACCEPT } from '../utils/images';
import Icon from './Icon';
import Lightbox from './Lightbox';
import { Alert } from './ui';

export const MAX_PROOFS = 3;

/**
 * Ảnh chuyển khoản người chơi gửi cho chủ kèo (WBS 4.14).
 * Gửi ảnh không tự đánh dấu đã trả: chủ kèo xem ảnh rồi tự bấm "Đã trả". Chủ kèo nhận email khi có ảnh mới.
 */
export default function ProofsBox({
  postId,
  proofs,
  paid,
  onSaved,
}: {
  postId: string;
  proofs: UploadedImage[];
  paid: boolean;
  onSaved: (p: PostDetail) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return setMessage({ tone: 'error', text: problem });
    setBusy(true);
    setMessage(null);
    try {
      onSaved(await postsApi.addProof(postId, file));
      setMessage({ tone: 'success', text: 'Đã gửi ảnh cho chủ kèo. Chủ kèo sẽ đánh dấu "Đã trả" sau khi kiểm tra.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toApiError(err).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: string) {
    if (!window.confirm('Xóa ảnh chuyển khoản này?')) return;
    setBusy(true);
    setMessage(null);
    try {
      onSaved(await postsApi.removeProof(postId, file));
    } catch (err) {
      setMessage({ tone: 'error', text: toApiError(err).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="proofs-box">
      <p className="proofs-box__title">
        <Icon name="image" size={16} />
        Ảnh chuyển khoản
        {proofs.length > 0 && !paid && <span className="badge badge--full">Chờ chủ kèo xác nhận</span>}
      </p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {proofs.length > 0 && (
        <ul className="bill-grid bill-grid--small">
          {proofs.map((p, i) => (
            <li key={p.file} className="bill-grid__item">
              <button
                type="button"
                className="bill-grid__thumb"
                onClick={() => setOpen(i)}
                aria-label={`Xem ảnh chuyển khoản ${i + 1}`}
              >
                <img src={p.url} alt="" loading="lazy" />
              </button>
              <button
                type="button"
                className="bill-grid__remove"
                aria-label={`Xóa ảnh chuyển khoản ${i + 1}`}
                disabled={busy}
                onClick={() => remove(p.file)}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {proofs.length < MAX_PROOFS && (
        <button
          type="button"
          className="btn btn--outline btn--block"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Icon name="camera" size={18} />
          {busy ? 'Đang gửi…' : proofs.length ? 'Gửi thêm ảnh' : 'Gửi ảnh chuyển khoản'}
        </button>
      )}
      <p className="hint">
        Đã chuyển khoản? Gửi ảnh chụp màn hình giao dịch (tối đa {MAX_PROOFS} ảnh). Chỉ chủ kèo và bạn thấy ảnh này.
      </p>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label="Chọn ảnh chuyển khoản"
        onChange={handleFile}
      />
      {open !== null && (
        <Lightbox urls={proofs.map((p) => p.url)} index={open} label="Ảnh chuyển khoản" onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
