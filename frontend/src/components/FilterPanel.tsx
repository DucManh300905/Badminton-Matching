import { useEffect, useState, type ReactNode } from 'react';
import { HANOI_AREAS } from '../utils/constants';
import { formatDateShort } from '../utils/format';
import type { FilterValues } from '../utils/postFilter';
import Icon, { type IconName } from './Icon';

// ── Bảng lọc của trang Tìm kèo (WBS 4.17) ──
// Điện thoại: trượt lên từ đáy màn hình. Máy tính: xổ xuống dưới nút "Bộ lọc".
// Chọn trong bảng chỉ là bản nháp; bấm "Áp dụng" mới lọc. Đóng (nền, nút đóng, Esc) = giữ bộ lọc cũ.

interface Props {
  value: FilterValues;
  today: string;
  tomorrow: string;
  /** Khách không lọc được theo trình độ */
  loggedIn: boolean;
  onApply: (f: FilterValues) => void;
  onClose: () => void;
}

function Group({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <fieldset className="filter-panel__group">
      <legend className="filter-panel__legend">
        <Icon name={icon} size={16} />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default function FilterPanel({ value, today, tomorrow, loggedIn, onApply, onClose }: Props) {
  const [draft, setDraft] = useState(value);
  const set = <K extends keyof FilterValues>(k: K, v: FilterValues[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const chip = (on: boolean) => `chip${on ? ' chip--on' : ''}`;
  const customDate = draft.date && draft.date !== today && draft.date !== tomorrow;

  // Esc để đóng; điện thoại: khóa cuộn trang phía sau khi bảng đang mở
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const body = document.body.style.overflow;
    if (window.matchMedia?.('(max-width: 1023.98px)').matches) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = body;
    };
  }, [onClose]);

  return (
    <>
      <div className="filter-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="filter-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        tabIndex={-1}
        ref={(el) => el?.focus({ preventScroll: true })}
      >
        <div className="filter-panel__head">
          <h2 id="filter-title" className="filter-panel__title">
            Bộ lọc
          </h2>
          <button type="button" className="icon-btn" aria-label="Đóng bộ lọc" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="filter-panel__body">
          <Group icon="calendar" title="Ngày">
            <div className="chips chips--flat">
              <button type="button" className={chip(!draft.date)} aria-pressed={!draft.date} onClick={() => set('date', '')}>
                Mọi ngày
              </button>
              <button
                type="button"
                className={chip(draft.date === today)}
                aria-pressed={draft.date === today}
                onClick={() => set('date', today)}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className={chip(draft.date === tomorrow)}
                aria-pressed={draft.date === tomorrow}
                onClick={() => set('date', tomorrow)}
              >
                Ngày mai
              </button>
              <label className={`${chip(!!customDate)} chip--picker`}>
                <Icon name="calendar" size={14} />
                <span>{customDate ? formatDateShort(draft.date) : 'Chọn ngày'}</span>
                {/* Ô ngày trong suốt phủ lên chip; máy tính cần showPicker() mới mở lịch khi bấm vào chip */}
                <input
                  type="date"
                  aria-label="Chọn ngày"
                  min={today}
                  value={draft.date}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {
                      // Trình duyệt cũ không có showPicker: vẫn dùng ô ngày như thường
                    }
                  }}
                  onChange={(e) => set('date', e.target.value)}
                />
              </label>
            </div>
          </Group>

          <Group icon="mapPin" title="Khu vực">
            <div className="chips chips--flat chips--grid">
              <button
                type="button"
                className={chip(!draft.district)}
                aria-pressed={!draft.district}
                onClick={() => set('district', '')}
              >
                Tất cả
              </button>
              {HANOI_AREAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={chip(draft.district === d)}
                  aria-pressed={draft.district === d}
                  onClick={() => set('district', d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </Group>

          {loggedIn && (
            <Group icon="level" title="Trình độ">
              <label className="checkbox">
                <input type="checkbox" checked={draft.myLevel} onChange={(e) => set('myLevel', e.target.checked)} />
                <span>Chỉ kèo hợp trình độ của tôi</span>
              </label>
            </Group>
          )}
        </div>

        <div className="filter-panel__foot">
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setDraft({ date: '', district: '', myLevel: false })}
          >
            Xóa tất cả
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onApply(draft)}>
            Áp dụng
          </button>
        </div>
      </div>
    </>
  );
}
