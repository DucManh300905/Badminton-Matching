// Chế độ sáng / tối (WBS 4.12). Lựa chọn lưu trên thiết bị (localStorage), mặc định "Theo máy".
// index.html có một đoạn script nhỏ đặt data-theme TRƯỚC khi React chạy để trang không nháy trắng;
// hai nơi phải dùng cùng khóa THEME_KEY và cùng cách tính.

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'bm-theme';
export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Theo máy' },
];

/** Màu thanh trạng thái trình duyệt (meta theme-color) theo chế độ */
const BAR_COLORS = { light: '#11924c', dark: '#0e1612' } as const;

const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Chế độ thật sự áp dụng */
export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice;
  return darkQuery()?.matches ? 'dark' : 'light';
}

export function applyTheme(choice: ThemeChoice) {
  const mode = resolveTheme(choice);
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[mode]);
}

export function saveTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // bỏ qua: chỉ mất lựa chọn khi tải lại trang
  }
  applyTheme(choice);
}

/** "Theo máy": đổi ngay khi người dùng đổi chế độ của điện thoại / máy tính. Trả về hàm hủy theo dõi. */
export function watchSystemTheme(): () => void {
  const q = darkQuery();
  if (!q) return () => {};
  const onChange = () => readTheme() === 'system' && applyTheme('system');
  q.addEventListener('change', onChange);
  return () => q.removeEventListener('change', onChange);
}
