import type { PostSummary } from '../types';
import { fold } from './features';
import { formatDateShort } from './format';

// ── Bộ lọc trang Tìm kèo (WBS 4.17) ──
// Giá trị bộ lọc nằm trên URL (?date=&district=&myLevel=1&q=) để chia sẻ link / tải lại trang vẫn giữ.

export interface FilterValues {
  /** "YYYY-MM-DD" hoặc "" = mọi ngày */
  date: string;
  /** "" = mọi khu vực */
  district: string;
  myLevel: boolean;
}

export const EMPTY_FILTER: FilterValues = { date: '', district: '', myLevel: false };

export const readFilter = (params: URLSearchParams): FilterValues => ({
  date: params.get('date') ?? '',
  district: params.get('district') ?? '',
  myLevel: params.get('myLevel') === '1',
});

/** Ghi bộ lọc vào URL, giữ nguyên các tham số khác (ô tìm tên sân `q`) */
export function writeFilter(params: URLSearchParams, f: FilterValues): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
  set('date', f.date);
  set('district', f.district);
  set('myLevel', f.myLevel ? '1' : '');
  return next;
}

/** Nhãn ngày: Hôm nay / Ngày mai / "T5, 03/12" */
export const dateLabel = (date: string, today: string, tomorrow: string) =>
  date === today ? 'Hôm nay' : date === tomorrow ? 'Ngày mai' : formatDateShort(date);

/**
 * Các bộ lọc đang bật, để hiện thành nhãn có dấu × bên ngoài bảng lọc.
 * "Hợp trình độ" chỉ tính khi đã đăng nhập (khách không lọc được theo trình độ).
 */
export function activeFilters(
  f: FilterValues,
  { today, tomorrow, loggedIn }: { today: string; tomorrow: string; loggedIn: boolean },
): { key: keyof FilterValues; label: string }[] {
  const list: { key: keyof FilterValues; label: string }[] = [];
  if (f.date) list.push({ key: 'date', label: dateLabel(f.date, today, tomorrow) });
  if (f.district) list.push({ key: 'district', label: f.district });
  if (f.myLevel && loggedIn) list.push({ key: 'myLevel', label: 'Hợp trình độ' });
  return list;
}

/** Ô tìm tên sân: mọi từ gõ vào phải có trong tên sân / địa chỉ / khu vực, không phân biệt dấu */
export function matchesQuery(post: Pick<PostSummary, 'courtName' | 'address' | 'district'>, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fold(`${post.courtName} ${post.address ?? ''} ${post.district}`);
  return words.every((w) => hay.includes(w));
}
