import { describe, expect, it } from 'vitest';
import { activeTab } from './nav';

const TODAY = '2026-11-13';

describe('activeTab', () => {
  it.each([
    ['/', '', 'search'],
    ['/', '?district=Cầu+Giấy', 'search'],
    ['/', `?date=${TODAY}`, 'today'],
    ['/', '?date=2026-11-20', 'search'],
    ['/keo/moi', '', 'new'],
    ['/keo/665f1f77bcf86cd799439011', '', 'search'],
    ['/keo-cua-toi', '?tab=authored', 'mine'],
    ['/tai-khoan', '', 'account'],
    ['/tai-khoan/doi-mat-khau', '', 'account'],
    ['/dang-nhap', '', 'account'],
    ['/khong-co', '', null],
  ])('%s%s → %s', (pathname, search, expected) => {
    expect(activeTab(pathname, search, TODAY)).toBe(expected);
  });
});
