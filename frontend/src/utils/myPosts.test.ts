import { describe, expect, it } from 'vitest';
import type { PostSummary } from '../types';
import { countUpcoming } from './myPosts';

const NOW = new Date('2026-11-13T10:00:00+07:00').getTime();

const post = (id: string, startsAt: string, status: PostSummary['status'] = 'open') =>
  ({ id, startsAt, status }) as PostSummary;

describe('countUpcoming', () => {
  it('đếm kèo chưa diễn ra, bỏ kèo đã hủy, không đếm trùng kèo vừa đăng vừa tham gia', () => {
    const authored = [
      post('a', '2026-11-14T19:00:00+07:00'),
      post('b', '2026-11-15T19:00:00+07:00', 'closed'),
      post('c', '2026-11-12T19:00:00+07:00'),
    ];
    const joined = [post('a', '2026-11-14T19:00:00+07:00'), post('d', '2026-11-16T19:00:00+07:00', 'full')];

    expect(countUpcoming(authored, joined, NOW)).toBe(2);
  });

  it('không có kèo nào → 0', () => {
    expect(countUpcoming([], [], NOW)).toBe(0);
  });
});
