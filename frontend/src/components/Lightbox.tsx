import { useState } from 'react';
import Icon from './Icon';

/** Xem ảnh cỡ lớn (bill, ảnh chuyển khoản); Esc hoặc bấm nền để đóng, mũi tên để chuyển ảnh */
export default function Lightbox({
  urls,
  index,
  onClose,
  label = 'Ảnh',
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  label?: string;
}) {
  const [i, setI] = useState(index);
  const go = (d: number) => setI((x) => (x + d + urls.length) % urls.length);
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} ${i + 1} / ${urls.length}`}
      tabIndex={-1}
      ref={(el) => el?.focus()}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      <img src={urls[i]} alt={`${label} ${i + 1}`} onClick={(e) => e.stopPropagation()} />
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
