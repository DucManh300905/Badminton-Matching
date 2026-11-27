import { describe, expect, it } from 'vitest';
import { activeTab } from './nav';

const TODAY = '2026-11-13';

describe('activeTab', () => {
  it.each([
    ['/', '', 'search'],
    ['/', '?district=Cầu+Giấy', 'search'],
    ['/', `?date=${TODAY}`, 'search'],
    ['/', '?date=2026-11-20', 'search'],
    ['/keo/moi', '', 'new'],
    ['/keo/665f1f77bcf86cd799439011', '', 'search'],
    ['/keo-cua-toi', '?tab=authored', 'mine'],
    ['/lich-su', '?tab=messages', 'mine'],
    ['/lich-su/tin-nhan/p-665f1f77bcf86cd799439011', '', 'mine'],
    ['/kho-cau', '', 'shuttles'],
    ['/tong-quan', '', 'overview'],
    ['/tai-khoan/cai-dat', '', null],
    ['/tai-khoan/doi-mat-khau', '', null],
    ['/dang-nhap', '', null],
    ['/khong-co', '', null],
  ])('%s%s → %s', (pathname, _search, expected) => {
    expect(activeTab(pathname)).toBe(expected);
  });
});
