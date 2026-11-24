import type { CreatePostInput } from '../types';
import type { SkillLevel } from './constants';
import { toDateInput } from './format';

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

/** Chuyển giá trị form thành dữ liệu gửi lên API. */
export function formToInput(v: PostFormValues): CreatePostInput {
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
  };
}
