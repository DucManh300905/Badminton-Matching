import { describe, expect, it } from 'vitest';
import { minHeadcount, perPersonOf } from './settlement';

describe('perPersonOf', () => {
  it('làm tròn lên 1.000đ, giống server', () => {
    expect(perPersonOf(420_000, 8)).toBe(53_000);
    expect(perPersonOf(400_000, 8)).toBe(50_000);
    expect(perPersonOf(100_000, 3)).toBe(34_000);
  });

  it('số người không hợp lệ → 0', () => {
    expect(perPersonOf(100_000, 0)).toBe(0);
  });
});

describe('minHeadcount', () => {
  it('người có mặt + chủ kèo; nếu thu cả người vắng thì tính cả người vắng', () => {
    expect(minHeadcount([true, true, false], false)).toBe(3);
    expect(minHeadcount([true, true, false], true)).toBe(4);
  });
});
