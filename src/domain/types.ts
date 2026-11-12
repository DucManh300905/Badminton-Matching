/**
 * Các kiểu dữ liệu lõi của hệ thống ghép kèo cầu lông.
 */

/** Thang trình độ phổ biến trong cộng đồng cầu lông phong trào Việt Nam (thấp → cao). */
export const SKILL_LEVELS = ['YEU', 'TB_YEU', 'TB_MINUS', 'TB', 'TB_PLUS', 'KHA', 'GIOI'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  YEU: 'Yếu / mới chơi',
  TB_YEU: 'TB yếu',
  TB_MINUS: 'TB-',
  TB: 'TB',
  TB_PLUS: 'TB+ / TB khá',
  KHA: 'Khá',
  GIOI: 'Giỏi',
};

export type Gender = 'male' | 'female';
/** Loại chỗ trống: dành riêng cho nam, cho nữ, hoặc ai cũng được. */
export type SlotKind = Gender | 'any';

export interface SlotNeed {
  male: number;
  female: number;
  any: number;
}

export type PostStatus = 'open' | 'full' | 'closed';

export interface Player {
  id: string;
  gender: Gender;
  level: SkillLevel;
}

export interface Participant {
  playerId: string;
  slot: SlotKind;
}

/** Một bài đăng tìm người ("kèo"). */
export interface Post {
  id: string;
  authorId: string;
  courtName: string;
  startsAt: Date;
  endsAt: Date;
  levelMin: SkillLevel;
  levelMax: SkillLevel;
  /** Chi phí mỗi người, đơn vị VND. */
  pricePerPerson: number;
  slots: SlotNeed;
  participants: Participant[];
  status: PostStatus;
}

export type PostInput = Omit<Post, 'id' | 'participants' | 'status'>;
