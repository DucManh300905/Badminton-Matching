import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB_BAR, fold, searchFeatures, tabBarOf } from './features';

describe('fold', () => {
  it('bỏ dấu tiếng Việt, chữ thường', () => {
    expect(fold('Kho Cầu Đống Đa')).toBe('kho cau dong da');
  });
});

describe('searchFeatures (ô tìm kiếm ở Tổng quan)', () => {
  const keys = (q: string) => searchFeatures(q).map((f) => f.key);

  it('trống → mọi tiện ích', () => {
    expect(keys('')).toEqual(['search', 'new', 'mine', 'shuttles']);
  });

  it('gõ có dấu hoặc không dấu đều ra', () => {
    expect(keys('kho cau')).toEqual(['shuttles']);
    expect(keys('Kho cầu')).toEqual(['shuttles']);
    // "Hôm nay" là bộ lọc của Tìm kèo
    expect(keys('hom nay')).toEqual(['search']);
  });

  it('tìm theo mô tả / từ khóa; không khớp → rỗng', () => {
    expect(keys('thong ke')).toEqual(['shuttles']);
    expect(keys('tao keo')).toEqual(['new']);
    expect(keys('xyz')).toEqual([]);
  });
});

describe('tabBarOf (3 ô tự chọn của thanh dưới)', () => {
  it('chưa chọn hoặc dữ liệu hỏng → mặc định', () => {
    expect(tabBarOf(undefined)).toEqual(DEFAULT_TAB_BAR);
    expect(tabBarOf(['search', 'today'])).toEqual(DEFAULT_TAB_BAR);
    expect(tabBarOf(['search', 'search', 'mine'])).toEqual(DEFAULT_TAB_BAR);
    expect(tabBarOf(['search', 'mine', 'new'])).toEqual(DEFAULT_TAB_BAR);
    // Ai còn lưu "Hôm nay" (đã bỏ) → mặc định
    expect(tabBarOf(['search', 'today', 'mine'])).toEqual(DEFAULT_TAB_BAR);
  });

  it('hợp lệ → giữ đúng thứ tự', () => {
    expect(tabBarOf(['shuttles', 'search', 'mine'])).toEqual(['shuttles', 'search', 'mine']);
  });
});
