/**
 * Bộ trích xuất thông tin dựa trên luật (rule-based) cho bài đăng ghép kèo
 * tiếng Việt phi cấu trúc, ví dụ:
 *   "Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng"
 *
 * Đây là baseline của đề tài; phiên bản LLM / hybrid sẽ được so sánh với nó.
 * Bộ trích xuất KHÔNG lấy thông tin cá nhân (tên, SĐT, link profile).
 */
import { compareLevel } from '../domain/level';
import type { SkillLevel, SlotNeed } from '../domain/types';

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface ParsedPost {
  /** 0 = hôm nay, 1 = mai, 2 = ngày kia. */
  dayOffset?: number;
  /** Thứ trong tuần theo quy ước JS: 0 = Chủ nhật … 6 = Thứ bảy. */
  weekday?: number;
  start?: TimeOfDay;
  end?: TimeOfDay;
  /** VND / người. */
  pricePerPerson?: number;
  slots?: SlotNeed;
  levelMin?: SkillLevel;
  levelMax?: SkillLevel;
  /** Tỉ lệ nhóm trường trích được (thời gian, giá, số chỗ, trình độ), từ 0 đến 1. */
  confidence: number;
}

/** Ranh giới "từ" có hỗ trợ Unicode (\b của JS không hiểu chữ có dấu). */
const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';
const word = (src: string) => `${NOT_WORD_BEFORE}(?:${src})${NOT_WORD_AFTER}`;

function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

// ---------------------------------------------------------------- Ngày ----

const DAY_OFFSET_RULES: [RegExp, number][] = [
  [new RegExp(word('(?:hôm|sáng|trưa|chiều|tối|đêm) nay'), 'u'), 0],
  [new RegExp(word('mai'), 'u'), 1],
  [new RegExp(word('ngày kia|ngày mốt|mốt'), 'u'), 2],
];

const WEEKDAY_RE = new RegExp(
  word('(?:thứ\\s*|t)(2|3|4|5|6|7|hai|ba|tư|năm|sáu|bảy)|cn|chủ nhật'),
  'u',
);
const WEEKDAY_WORDS: Record<string, number> = {
  '2': 1, hai: 1, '3': 2, ba: 2, '4': 3, tư: 3, '5': 4, năm: 4, '6': 5, sáu: 5, '7': 6, bảy: 6,
};

function parseDay(text: string): Pick<ParsedPost, 'dayOffset' | 'weekday'> {
  const result: Pick<ParsedPost, 'dayOffset' | 'weekday'> = {};
  for (const [re, offset] of DAY_OFFSET_RULES) {
    if (re.test(text)) {
      result.dayOffset = offset;
      break;
    }
  }
  const wd = WEEKDAY_RE.exec(text);
  if (wd) result.weekday = wd[1] === undefined ? 0 : WEEKDAY_WORDS[wd[1]];
  return result;
}

// ----------------------------------------------------------- Thời gian ----

// Nhóm bắt: giờ, phút, "rưỡi"
// "(?!\p{L})" sau đơn vị để "1 gậy" không bị hiểu là "1g".
const TIME = '(?<!\\d)(\\d{1,2})\\s*(?:h|giờ|g|:)(?!\\p{L})(\\d{2})?(\\s*rưỡi)?';
const RANGE_SEP = '\\s*(?:-|–|—|~|->|đến|tới)\\s*';
const TIME_RANGE_RE = new RegExp(TIME + RANGE_SEP + TIME, 'u');
const TIME_SINGLE_RE = new RegExp(TIME, 'u');
const PM_RE = new RegExp(word('chiều|tối|đêm'), 'u');
const AM_RE = new RegExp(word('sáng'), 'u');

function toTime(h?: string, m?: string, ruoi?: string): TimeOfDay | undefined {
  if (h === undefined) return undefined;
  const hour = Number(h);
  const minute = m !== undefined ? Number(m) : ruoi !== undefined ? 30 : 0;
  if (hour > 23 || minute > 59) return undefined;
  return { hour, minute };
}

function adjustPeriod(t: TimeOfDay, period: 'am' | 'pm' | 'unknown'): TimeOfDay {
  // "7h tối" → 19h. Không có ngữ cảnh: 1h–4h gần như chắc chắn là buổi chiều.
  if (t.hour >= 12) return t;
  if (period === 'pm' || (period === 'unknown' && t.hour >= 1 && t.hour <= 4)) {
    return { ...t, hour: t.hour + 12 };
  }
  return t;
}

function parseTime(text: string): Pick<ParsedPost, 'start' | 'end'> {
  const period = PM_RE.test(text) ? 'pm' : AM_RE.test(text) ? 'am' : 'unknown';
  const range = TIME_RANGE_RE.exec(text);
  if (range) {
    const start = toTime(range[1], range[2], range[3]);
    const end = toTime(range[4], range[5], range[6]);
    if (start && end) return { start: adjustPeriod(start, period), end: adjustPeriod(end, period) };
  }
  const single = TIME_SINGLE_RE.exec(text);
  const start = single ? toTime(single[1], single[2], single[3]) : undefined;
  return start ? { start: adjustPeriod(start, period) } : {};
}

// ------------------------------------------------------------------ Giá ----

const PRICE_RE = new RegExp(
  '(?<![\\d.,])(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|nghìn|ngàn|vnđ|vnd|đồng|đ)(?![\\p{L}])' +
    '(\\s*\\/\\s*(?:người|ng|slot|lượt)|\\s*(?:mỗi người|1 người|một người))?',
  'gu',
);
const MIN_PRICE = 5_000;
const MAX_PRICE = 1_000_000;

function toVnd(num: string, unit: string): number {
  if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') {
    return Math.round(Number(num.replace(',', '.')) * 1000);
  }
  return Number(num.replace(/[.,]/g, ''));
}

function parsePrice(text: string): number | undefined {
  let fallback: number | undefined;
  for (const m of text.matchAll(PRICE_RE)) {
    const vnd = toVnd(m[1]!, m[2]!);
    if (!(vnd >= MIN_PRICE && vnd <= MAX_PRICE)) continue;
    if (m[3] !== undefined) return vnd; // có "/ng", "/người"… → chắc chắn là giá mỗi người
    fallback ??= vnd;
  }
  return fallback;
}

// ------------------------------------------------------------- Số chỗ ----

const NEED_RE = new RegExp(word('thiếu|cần|tuyển|tìm|kiếm|giao lưu|gl|còn'), 'u');
const SLOT_RE = new RegExp(
  `${NOT_WORD_BEFORE}(\\d+|một|hai|ba)\\s*(nam|nữ|nu|bạn|người|ng|slot|chân|mạng)(?![\\p{L}])`,
  'gu',
);
const COUNT_WORDS: Record<string, number> = { một: 1, hai: 2, ba: 3 };

function parseSlots(text: string): SlotNeed | undefined {
  const need = NEED_RE.exec(text);
  if (!need) return undefined;
  const slots: SlotNeed = { male: 0, female: 0, any: 0 };
  let found = false;
  for (const m of text.slice(need.index).matchAll(SLOT_RE)) {
    const count = COUNT_WORDS[m[1]!] ?? Number(m[1]);
    const kind = m[2] === 'nam' ? 'male' : m[2] === 'nữ' || m[2] === 'nu' ? 'female' : 'any';
    slots[kind] += count;
    found = true;
  }
  return found ? slots : undefined;
}

// ----------------------------------------------------------- Trình độ ----

// Thứ tự quan trọng: mẫu dài/cụ thể đứng trước.
const LEVEL_TOKENS: [string, SkillLevel][] = [
  ['trung bình khá|tb\\s*khá|tbk', 'TB_PLUS'],
  ['trung bình yếu|tb\\s*yếu|tby', 'TB_YEU'],
  ['tb\\s?\\+', 'TB_PLUS'],
  // "TB-" là TB trừ; còn "TB-TB+" là khoảng từ TB đến TB+.
  ['tb-(?![\\p{L}\\p{N}])', 'TB_MINUS'],
  ['trung bình|tb', 'TB'],
  ['khá', 'KHA'],
  ['giỏi', 'GIOI'],
  ['mới chơi|newbie|yếu', 'YEU'],
];
const LEVEL_RE = new RegExp(
  NOT_WORD_BEFORE +
    '(?:' +
    LEVEL_TOKENS.map(([src]) => `(${src})`).join('|') +
    ')' +
    NOT_WORD_AFTER,
  'gu',
);
const AND_ABOVE_RE = /trở lên|đổ lên/u;
const AND_BELOW_RE = /trở xuống|đổ xuống|đổ lại/u;

function parseLevel(text: string): Pick<ParsedPost, 'levelMin' | 'levelMax'> {
  const found: SkillLevel[] = [];
  for (const m of text.matchAll(LEVEL_RE)) {
    const idx = m.slice(1).findIndex((g) => g !== undefined);
    if (idx >= 0) found.push(LEVEL_TOKENS[idx]![1]);
  }
  if (found.length === 0) return {};

  found.sort(compareLevel);
  let levelMin = found[0]!;
  let levelMax = found[found.length - 1]!;
  if (levelMin === levelMax) {
    if (AND_ABOVE_RE.test(text)) levelMax = 'GIOI';
    else if (AND_BELOW_RE.test(text)) levelMin = 'YEU';
  }
  return { levelMin, levelMax };
}

// -------------------------------------------------------------- Tổng hợp ----

export function parsePost(raw: string): ParsedPost {
  const text = normalize(raw);
  const day = parseDay(text);
  const time = parseTime(text);
  const pricePerPerson = parsePrice(text);
  const slots = parseSlots(text);
  const level = parseLevel(text);

  const groupsFound = [time.start, pricePerPerson, slots, level.levelMin].filter(
    (v) => v !== undefined,
  ).length;

  return {
    ...day,
    ...time,
    ...(pricePerPerson !== undefined && { pricePerPerson }),
    ...(slots && { slots }),
    ...level,
    confidence: groupsFound / 4,
  };
}
