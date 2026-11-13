import type { CreatePostInput, ParsedPost } from '../types';
import type { SkillLevel } from './constants';
import { toDateInput, toTimeInput } from './format';

/** Giá trị form đăng kèo. Giữ dạng chuỗi để gắn trực tiếp vào <input>. */
export interface PostFormValues {
  courtName: string;
  district: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  levelMin: SkillLevel;
  levelMax: SkillLevel;
  pricePerPerson: string;
  slotsMale: string;
  slotsFemale: string;
  slotsAny: string;
  note: string;
}

export const emptyPostForm = (today: Date): PostFormValues => ({
  courtName: '',
  district: '',
  address: '',
  date: toDateInput(today),
  startTime: '19:00',
  endTime: '21:00',
  levelMin: 'TB_MINUS',
  levelMax: 'TB_PLUS',
  pricePerPerson: '50000',
  slotsMale: '0',
  slotsFemale: '0',
  slotsAny: '1',
  note: '',
});

/**
 * Chuyển kết quả bộ trích xuất thành giá trị form.
 * Chỉ trả về những trường trích được, để form giữ nguyên các trường còn lại.
 */
export function parsedToForm(parsed: ParsedPost, now: Date): Partial<PostFormValues> {
  const out: Partial<PostFormValues> = {};

  if (parsed.dayOffset !== undefined) {
    const d = new Date(now);
    d.setDate(d.getDate() + parsed.dayOffset);
    out.date = toDateInput(d);
  } else if (parsed.weekday !== undefined) {
    // Ngày gần nhất có thứ đó, tính cả hôm nay.
    const d = new Date(now);
    d.setDate(d.getDate() + ((parsed.weekday - d.getDay() + 7) % 7));
    out.date = toDateInput(d);
  }

  if (parsed.start) {
    out.startTime = toTimeInput(parsed.start);
    // Bài đăng chỉ ghi giờ bắt đầu → mặc định chơi 2 tiếng.
    const end = parsed.end ?? { hour: (parsed.start.hour + 2) % 24, minute: parsed.start.minute };
    out.endTime = toTimeInput(end);
  }

  if (parsed.pricePerPerson !== undefined) out.pricePerPerson = String(parsed.pricePerPerson);
  if (parsed.slots) {
    out.slotsMale = String(parsed.slots.male);
    out.slotsFemale = String(parsed.slots.female);
    out.slotsAny = String(parsed.slots.any);
  }
  if (parsed.levelMin) out.levelMin = parsed.levelMin;
  if (parsed.levelMax) out.levelMax = parsed.levelMax;

  return out;
}

/** Chuyển giá trị form thành dữ liệu gửi lên API. */
export function formToInput(v: PostFormValues, rawText?: string): CreatePostInput {
  const startsAt = new Date(`${v.date}T${v.startTime}`);
  const endsAt = new Date(`${v.date}T${v.endTime}`);
  // Kèo qua nửa đêm, ví dụ 22:00–00:30
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1);

  return {
    courtName: v.courtName.trim(),
    district: v.district,
    address: v.address.trim() || undefined,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    levelMin: v.levelMin,
    levelMax: v.levelMax,
    pricePerPerson: Number(v.pricePerPerson) || 0,
    slots: {
      male: Number(v.slotsMale) || 0,
      female: Number(v.slotsFemale) || 0,
      any: Number(v.slotsAny) || 0,
    },
    note: v.note.trim() || undefined,
    rawText: rawText?.trim() || undefined,
  };
}
