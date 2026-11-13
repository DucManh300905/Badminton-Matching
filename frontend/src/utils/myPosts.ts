import type { PostSummary } from '../types';

/** Kèo sắp diễn ra (chưa hủy, chưa bắt đầu) trong cả hai danh sách, không đếm trùng */
export function countUpcoming(authored: PostSummary[], joined: PostSummary[], now: number): number {
  const ids = new Set<string>();
  for (const p of [...authored, ...joined]) {
    if (p.status !== 'closed' && new Date(p.startsAt).getTime() > now) ids.add(p.id);
  }
  return ids.size;
}
