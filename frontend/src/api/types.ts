import type { Gender, SkillLevel } from '../lib/constants'

export interface User {
  id: string
  email: string
  displayName: string
  gender: Gender
  level: SkillLevel
}

export interface SlotNeed {
  male: number
  female: number
  any: number
}

export type PostStatus = 'open' | 'full' | 'closed'

export interface PostSummary {
  id: string
  courtName: string
  district: string
  address: string | null
  startsAt: string
  endsAt: string
  levelMin: SkillLevel
  levelMax: SkillLevel
  pricePerPerson: number
  slots: SlotNeed
  remaining: SlotNeed
  participantCount: number
  status: PostStatus
  note: string | null
  author: { id: string; displayName: string }
}

export interface PostDetail extends PostSummary {
  participants: {
    id: string
    displayName: string
    gender: Gender
    level: SkillLevel
    slot: 'male' | 'female' | 'any'
  }[]
}

export interface CreatePostInput {
  courtName: string
  district: string
  address?: string
  startsAt: string
  endsAt: string
  levelMin: SkillLevel
  levelMax: SkillLevel
  pricePerPerson: number
  slots: SlotNeed
  note?: string
  rawText?: string
}

export interface TimeOfDay {
  hour: number
  minute: number
}

/** Kết quả của bộ trích xuất bài đăng (POST /api/parse). */
export interface ParsedPost {
  dayOffset?: number
  weekday?: number
  start?: TimeOfDay
  end?: TimeOfDay
  pricePerPerson?: number
  slots?: SlotNeed
  levelMin?: SkillLevel
  levelMax?: SkillLevel
  confidence: number
}

export interface RegisterInput {
  email: string
  password: string
  displayName: string
  gender: Gender
  level: SkillLevel
}

export interface PostFilter {
  district?: string
  date?: string
  level?: SkillLevel
}
