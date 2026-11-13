// Phải khớp với server/src/domain/types.js và server/src/domain/districts.js

export const SKILL_LEVELS = ['YEU', 'TB_YEU', 'TB_MINUS', 'TB', 'TB_PLUS', 'KHA', 'GIOI'] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  YEU: 'Yếu / mới chơi',
  TB_YEU: 'TB yếu',
  TB_MINUS: 'TB-',
  TB: 'TB',
  TB_PLUS: 'TB+ / TB khá',
  KHA: 'Khá',
  GIOI: 'Giỏi',
}

export const HANOI_AREAS = [
  'Ba Đình',
  'Hoàn Kiếm',
  'Tây Hồ',
  'Long Biên',
  'Cầu Giấy',
  'Đống Đa',
  'Hai Bà Trưng',
  'Hoàng Mai',
  'Thanh Xuân',
  'Nam Từ Liêm',
  'Bắc Từ Liêm',
  'Hà Đông',
  'Khác',
] as const
export type Area = (typeof HANOI_AREAS)[number]

export const GENDER_LABELS = { male: 'Nam', female: 'Nữ' } as const
export type Gender = keyof typeof GENDER_LABELS
