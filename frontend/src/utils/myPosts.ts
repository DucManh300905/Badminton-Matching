import type { PostSummary } from '../types';

/** Kèo sắp diễn ra (chưa hủy, chưa bắt đầu) trong cả hai danh sách, không trùng, sớm nhất trước */
export function upcomingPosts(authored: PostSummary[], joined: PostSummary[], now: number): PostSummary[] {
  const byId = new Map<string, PostSummary>();
  for (const p of [...authored, ...joined]) {
    if (p.status !== 'closed' && new Date(p.startsAt).getTime() > now) byId.set(p.id, p);
  }
  return [...byId.values()].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** Số kèo sắp diễn ra, không đếm trùng */
export function countUpcoming(authored: PostSummary[], joined: PostSummary[], now: number): number {
  return upcomingPosts(authored, joined, now).length;
}
