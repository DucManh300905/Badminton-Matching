// Kiểu dữ liệu dùng chung, khớp với JSON backend trả về (docs/API.md)
import type { Gender, SkillLevel } from './utils/constants';

export interface User {
  id: string;
  email: string;
  displayName: string;
  gender: Gender;
  level: SkillLevel;
}

/** Kết quả đăng ký / đăng nhập */
export interface AuthResult {
  token: string;
  user: User;
}

export interface SlotNeed {
  male: number;
  female: number;
  any: number;
}

export type SlotKind = keyof SlotNeed;

/** open = còn chỗ · full = đủ người · closed = chủ kèo đã hủy */
export type PostStatus = 'open' | 'full' | 'closed';

export interface PublicUser {
  id: string;
  displayName: string;
}

/** Kèo trong danh sách */
export interface PostSummary {
  id: string;
  courtName: string;
  district: string;
  address: string | null;
  startsAt: string;
  endsAt: string;
  levelMin: SkillLevel;
  levelMax: SkillLevel;
  pricePerPerson: number;
  slots: SlotNeed;
  remaining: SlotNeed;
  participantCount: number;
  status: PostStatus;
  note: string | null;
  author: PublicUser;
}

export interface Participant extends PublicUser {
  gender: Gender | null;
  level: SkillLevel | null;
  slot: SlotKind;
  joinedAt: string;
}

/** Kèo ở trang chi tiết */
export interface PostDetail extends PostSummary {
  participants: Participant[];
}

export interface PostFilter {
  district?: string;
  date?: string;
  level?: SkillLevel;
}

export interface CreatePostInput {
  courtName: string;
  district: string;
  address?: string;
  startsAt: string;
  endsAt: string;
  levelMin: SkillLevel;
  levelMax: SkillLevel;
  pricePerPerson: number;
  slots: SlotNeed;
  note?: string;
  rawText?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  gender: Gender;
  level: SkillLevel;
}

export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Kết quả bộ trích xuất bài đăng (POST /api/parse) */
export interface ParsedPost {
  dayOffset?: number;
  weekday?: number;
  start?: TimeOfDay;
  end?: TimeOfDay;
  pricePerPerson?: number;
  slots?: SlotNeed;
  levelMin?: SkillLevel;
  levelMax?: SkillLevel;
  confidence: number;
}
