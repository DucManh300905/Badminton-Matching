// Danh mục tiện ích (WBS 4.12): nguồn duy nhất cho trang Tổng quan, ô tìm kiếm và thanh dưới.
// Thêm tính năng mới = thêm một dòng ở FEATURES; nó tự xuất hiện ở Tổng quan và tìm kiếm được.
import type { IconName } from '../components/Icon';

// "Hôm nay" đã thành bộ lọc của Tìm kèo (WBS 4.15)
export type FeatureKey = 'search' | 'new' | 'mine' | 'shuttles' | 'profile';
/** Tiện ích chọn được cho 3 ô của thanh dưới (khớp backend TAB_BAR_ITEMS) */
export type TabItemKey = Exclude<FeatureKey, 'new' | 'profile'>;

export interface Feature {
  key: FeatureKey;
  label: string;
  /** Tên ngắn trên thanh dưới */
  short: string;
  description: string;
  icon: IconName;
  group: 'match' | 'money' | 'account';
  /** Từ khóa phụ cho ô tìm kiếm */
  keywords: string;
  needsAuth: boolean;
  to: (today: string) => string;
}

export const FEATURE_GROUPS: { key: Feature['group']; label: string }[] = [
  { key: 'match', label: 'Kèo' },
  { key: 'money', label: 'Chi phí và cầu' },
  { key: 'account', label: 'Tài khoản' },
];

export const FEATURES: Feature[] = [
  {
    key: 'search',
    label: 'Tìm kèo',
    short: 'Tìm kèo',
    description: 'Kèo còn chỗ, lọc hôm nay, ngày mai, khu vực, trình độ',
    icon: 'search',
    group: 'match',
    keywords: 'danh sach loc khu vuc trinh do hom nay ngay mai',
    needsAuth: false,
    to: () => '/',
  },
  {
    key: 'new',
    label: 'Đăng kèo',
    short: 'Đăng kèo',
    description: 'Tạo kèo mới để tìm thêm người',
    icon: 'plus',
    group: 'match',
    keywords: 'tao keo moi tuyen nguoi',
    needsAuth: true,
    to: () => '/keo/moi',
  },
  {
    key: 'mine',
    label: 'Lịch sử',
    short: 'Lịch sử',
    description: 'Kèo đã đăng, đã tham gia và tin nhắn',
    icon: 'calendar',
    group: 'match',
    keywords: 'keo cua toi da dang da tham gia tin nhan chat nhan tin',
    needsAuth: true,
    to: () => '/lich-su',
  },
  {
    key: 'shuttles',
    label: 'Kho cầu',
    short: 'Kho cầu',
    description: 'Số cầu đang có, giá mỗi quả, số quả đã dùng',
    icon: 'shuttle',
    group: 'money',
    keywords: 'qua cau ong cau thong ke tuan thang',
    needsAuth: true,
    to: () => '/kho-cau',
  },
  {
    key: 'profile',
    label: 'Hồ sơ cá nhân',
    short: 'Hồ sơ',
    description: 'Tên, ảnh đại diện, số điện thoại, tài khoản nhận tiền',
    icon: 'user',
    group: 'account',
    keywords: 'ho so ca nhan so dien thoai sdt zalo lien he ngan hang so tai khoan',
    needsAuth: true,
    to: () => '/tai-khoan/ho-so',
  },
];

export const TAB_ITEM_KEYS: TabItemKey[] = ['search', 'mine', 'shuttles'];
export const DEFAULT_TAB_BAR: TabItemKey[] = ['search', 'mine', 'shuttles'];

export const featureOf = (key: FeatureKey) => FEATURES.find((f) => f.key === key)!;

/** Chữ thường, bỏ dấu tiếng Việt: "Kho cầu" → "kho cau" */
export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/** Lọc tiện ích theo ô tìm kiếm: mọi từ gõ vào phải có trong tên / mô tả / từ khóa (không phân biệt dấu) */
export function searchFeatures(query: string, list: Feature[] = FEATURES): Feature[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return list;
  return list.filter((f) => {
    const hay = fold(`${f.label} ${f.short} ${f.description} ${f.keywords}`);
    return words.every((w) => hay.includes(w));
  });
}

/** 3 tiện ích của thanh dưới: theo tài khoản nếu hợp lệ, không thì mặc định */
export function tabBarOf(saved: readonly string[] | null | undefined): TabItemKey[] {
  const ok =
    Array.isArray(saved) &&
    saved.length === 3 &&
    new Set(saved).size === 3 &&
    saved.every((k) => (TAB_ITEM_KEYS as string[]).includes(k));
  return ok ? (saved as TabItemKey[]) : DEFAULT_TAB_BAR;
}
