import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, activeFilters, matchesQuery, readFilter, writeFilter } from './postFilter';

const TODAY = '2026-11-29';
const TOMORROW = '2026-11-30';
const ctx = { today: TODAY, tomorrow: TOMORROW, loggedIn: true };

describe('readFilter / writeFilter (bộ lọc trên URL)', () => {
  it('đọc đủ 3 bộ lọc; thiếu thì là rỗng', () => {
    expect(readFilter(new URLSearchParams('date=2026-12-01&district=Ba%20%C4%90%C3%ACnh&myLevel=1'))).toEqual({
      date: '2026-12-01',
      district: 'Ba Đình',
      myLevel: true,
    });
    expect(readFilter(new URLSearchParams(''))).toEqual(EMPTY_FILTER);
  });

  it('ghi bộ lọc, bỏ tham số rỗng, giữ ô tìm tên sân', () => {
    const next = writeFilter(new URLSearchParams('q=cau+giay&date=2026-12-01'), { date: '', district: 'Tây Hồ', myLevel: true });
    expect(next.get('q')).toBe('cau giay');
    expect(next.has('date')).toBe(false);
    expect(next.get('district')).toBe('Tây Hồ');
    expect(next.get('myLevel')).toBe('1');
    expect(writeFilter(next, EMPTY_FILTER).toString()).toBe('q=cau+giay');
  });
});

describe('activeFilters (nhãn bộ lọc đang bật)', () => {
  it('không lọc gì → rỗng', () => {
    expect(activeFilters(EMPTY_FILTER, ctx)).toEqual([]);
  });

  it('hôm nay, ngày mai, ngày khác; khu vực; hợp trình độ', () => {
    expect(activeFilters({ date: TODAY, district: 'Cầu Giấy', myLevel: true }, ctx)).toEqual([
      { key: 'date', label: 'Hôm nay' },
      { key: 'district', label: 'Cầu Giấy' },
      { key: 'myLevel', label: 'Hợp trình độ' },
    ]);
    expect(activeFilters({ ...EMPTY_FILTER, date: TOMORROW }, ctx)[0].label).toBe('Ngày mai');
    expect(activeFilters({ ...EMPTY_FILTER, date: '2026-12-03' }, ctx)[0].label).toMatch(/03\/12/);
  });

  it('khách: "Hợp trình độ" không tính', () => {
    expect(activeFilters({ ...EMPTY_FILTER, myLevel: true }, { ...ctx, loggedIn: false })).toEqual([]);
  });
});

describe('matchesQuery (ô tìm tên sân)', () => {
  const post = { courtName: 'Sân Cầu Giấy Club', address: '12 Trần Thái Tông', district: 'Cầu Giấy' };

  it('trống → khớp mọi kèo', () => {
    expect(matchesQuery(post, '  ')).toBe(true);
  });

  it('có dấu hoặc không dấu, tìm cả địa chỉ và khu vực', () => {
    expect(matchesQuery(post, 'cau giay')).toBe(true);
    expect(matchesQuery(post, 'Trần Thái')).toBe(true);
    expect(matchesQuery(post, 'club tran')).toBe(true);
  });

  it('thiếu một từ → không khớp; địa chỉ null vẫn chạy', () => {
    expect(matchesQuery(post, 'cau giay long')).toBe(false);
    expect(matchesQuery({ ...post, address: null }, 'tran')).toBe(false);
  });
});
