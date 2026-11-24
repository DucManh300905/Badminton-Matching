import { describe, expect, it } from 'vitest';
import { expenseName, previewDues, shuttleAmount } from './costs';

const members = ['host', 'u:a', 'u:b', 'g:t'];

describe('previewDues (giống server, BR-17)', () => {
  it('chưa có khoản nào → null', () => {
    expect(previewDues(members, [])).toBeNull();
  });

  it('sân chia tất cả, ăn chỉ người đi ăn', () => {
    const dues = previewDues(members, [
      { amount: 320_000, everyone: true, sharedBy: [] },
      { amount: 300_000, everyone: false, sharedBy: ['host', 'u:a', 'g:t'] },
    ]);
    expect(Object.fromEntries(dues!)).toEqual({ host: 180_000, 'u:a': 180_000, 'u:b': 80_000, 'g:t': 180_000 });
  });

  it('làm tròn lên 1.000đ; bỏ qua người không còn trong kèo', () => {
    const dues = previewDues(
      ['host', 'u:a', 'u:b'],
      [{ amount: 100_000, everyone: false, sharedBy: ['host', 'u:a', 'u:b', 'u:x'] }],
    );
    expect(dues!.get('u:a')).toBe(34_000);
  });
});

describe('expenseName', () => {
  it('loại có sẵn dùng tên tiếng Việt; khoản "Khác" dùng tên chủ kèo đặt', () => {
    expect(expenseName({ kind: 'court' })).toBe('Tiền sân');
    expect(expenseName({ kind: 'other', label: 'Gửi xe' })).toBe('Gửi xe');
    expect(expenseName({ kind: 'other', label: '' })).toBe('Khác');
  });
});

describe('shuttleAmount (giống server)', () => {
  it('số quả × giá mỗi quả, làm tròn lên 1.000đ', () => {
    expect(shuttleAmount(12, 23_333)).toBe(280_000);
    expect(shuttleAmount(6, 23_333)).toBe(140_000);
    expect(shuttleAmount(3, 25_000)).toBe(75_000);
    expect(shuttleAmount(1, 0)).toBe(0);
  });
});
