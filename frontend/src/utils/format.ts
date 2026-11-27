import type { SlotNeed } from '../types';
import { LEVEL_LABELS, type SkillLevel } from './constants';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad = (n: number) => String(n).padStart(2, '0');

/** 50000 → "50.000đ"; 0 → "Miễn phí" */
export function formatPrice(vnd: number): string {
  return vnd === 0 ? 'Miễn phí' : formatMoney(vnd);
}

/** Số tiền thuần (0 → "0đ"), dùng cho tổng đã thu / phải thu */
export function formatMoney(vnd: number): string {
  return `${vnd.toLocaleString('vi-VN')}đ`;
}

/** "T6, 14/11 · 19:00–21:00" */
export function formatTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = `${WEEKDAYS[s.getDay()]}, ${pad(s.getDate())}/${pad(s.getMonth() + 1)}`;
  return `${day} · ${pad(s.getHours())}:${pad(s.getMinutes())}–${pad(e.getHours())}:${pad(e.getMinutes())}`;
}

/** "TB- → TB+" hoặc "TB" nếu chỉ một mức */
export function formatLevelRange(min: SkillLevel, max: SkillLevel): string {
  return min === max ? LEVEL_LABELS[min] : `${LEVEL_LABELS[min]} → ${LEVEL_LABELS[max]}`;
}

/** { male: 2, female: 1, any: 0 } → "2 nam · 1 nữ"; hết chỗ → "" */
export function formatSlots(s: SlotNeed): string {
  const parts: string[] = [];
  if (s.male > 0) parts.push(`${s.male} nam`);
  if (s.female > 0) parts.push(`${s.female} nữ`);
  if (s.any > 0) parts.push(`${s.any} bất kỳ`);
  return parts.join(' · ');
}

/** "2026-11-28" → "T7, 28/11" (chip ngày trên điện thoại) */
export function formatDateShort(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${pad(d)}/${pad(m)}`;
}

/** Date → "YYYY-MM-DD" theo giờ máy người dùng (dùng cho <input type="date">). */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Chữ cái đại diện cho ảnh đại diện. Tên Việt gọi theo chữ cuối:
 * "An Đức Mạnh" → "M"; "minh" → "M"; "" → "?"
 */
export function initials(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? '';
  return last ? last.charAt(0).toLocaleUpperCase('vi-VN') : '?';
}

/** Số điện thoại 0912345678 → "0912 345 678" */
export function formatPhone(p: string): string {
  return p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}
