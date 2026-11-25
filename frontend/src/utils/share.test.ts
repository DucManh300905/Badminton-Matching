import { describe, expect, it } from 'vitest';
import type { PostDetail } from '../types';
import { moneyText, recruitText } from './share';

const post = {
  id: 'p1',
  courtName: 'Sân Cầu Giấy',
  district: 'Cầu Giấy',
  address: '12 Trần Thái Tông',
  startsAt: new Date(2026, 10, 26, 19, 0).toISOString(),
  endsAt: new Date(2026, 10, 26, 21, 0).toISOString(),
  levelMin: 'TB_MINUS',
  levelMax: 'TB_PLUS',
  pricePerPerson: 50_000,
  slots: { male: 2, female: 1, any: 0 },
  remaining: { male: 1, female: 1, any: 0 },
  participantCount: 1,
  status: 'open',
  note: null,
  author: { id: 'u1', displayName: 'Minh' },
  participants: [],
} as unknown as PostDetail;

const ORIGIN = 'https://sv22.bcse-vju.com';

describe('recruitText (tin tuyển người)', () => {
  it('có giờ, sân, trình độ, số chỗ còn, địa chỉ và link kèo; không emoji', () => {
    const t = recruitText(post, ORIGIN);
    expect(t).toContain('[Kèo cầu lông] T5, 26/11 · 19:00–21:00');
    expect(t).toContain('Sân Cầu Giấy (Cầu Giấy)');
    expect(t).toContain('Còn 2 chỗ: 1 nam · 1 nữ');
    expect(t).toContain('Địa chỉ: 12 Trần Thái Tông');
    expect(t).toContain(`Tham gia: ${ORIGIN}/keo/p1`);
    expect(t).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('kèo đủ người / đã hủy ghi rõ', () => {
    expect(recruitText({ ...post, status: 'full' } as PostDetail, ORIGIN)).toContain('Kèo đã đủ người');
    expect(recruitText({ ...post, status: 'closed' } as PostDetail, ORIGIN)).toContain('Kèo đã hủy');
  });
});

describe('moneyText (tin thu tiền)', () => {
  it('chưa có chi phí → null', () => {
    expect(moneyText(post, ORIGIN)).toBeNull();
  });

  it('liệt kê khoản (cầu ghi số quả), mỗi người phải trả, ai đã trả, link quét QR', () => {
    const withCosts = {
      ...post,
      costs: {
        updatedAt: null,
        total: 460_000,
        guests: [],
        expenses: [
          { kind: 'court', label: null, amount: 320_000, everyone: true, sharedBy: [], sharers: [], share: 0 },
          {
            kind: 'shuttle',
            label: null,
            amount: 140_000,
            everyone: true,
            sharedBy: [],
            sharers: [],
            share: 0,
            quantity: 6,
            unitPrice: 23_333,
          },
        ],
        members: [
          { ref: 'host', type: 'host', name: 'Minh', due: 230_000 },
          { ref: 'u:2', type: 'user', name: 'Lan', due: 230_000, status: 'paid' },
        ],
      },
    } as unknown as PostDetail;
    const t = moneyText(withCosts, ORIGIN)!;
    expect(t).toContain('Tổng 460.000đ:');
    expect(t).toContain('- Tiền sân: 320.000đ');
    expect(t).toContain('- Tiền cầu (6 quả): 140.000đ');
    expect(t).toContain('- Minh (chủ kèo): 230.000đ');
    expect(t).toContain('- Lan: 230.000đ (đã trả)');
    expect(t).toContain(`${ORIGIN}/keo/p1`);
  });
});
