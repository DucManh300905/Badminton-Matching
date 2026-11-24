// Kiểu dữ liệu dùng chung, khớp với JSON backend trả về (docs/API.md)
import type { Gender, SkillLevel } from './utils/constants';

/** Tài khoản nhận tiền chuyển khoản (chỉ người trong kèo của chủ tài khoản mới thấy) */
export interface BankAccount {
  bankBin: string;
  accountNumber: string;
  /** In hoa, không dấu */
  accountName: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  gender: Gender;
  level: SkillLevel;
  bankAccount?: BankAccount;
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
  /** Ba trường dưới chỉ có khi người xem là chủ kèo hoặc người trong kèo */
  paid?: boolean;
  /** Điểm danh khi chốt chi phí: true có mặt, false vắng, null chưa điểm danh */
  attended?: boolean | null;
  /** Số tiền người này phải trả (0 = vắng và chủ kèo không thu của người vắng) */
  amountDue?: number;
}

/** Chi phí thật đã chốt sau buổi (WBS 4.8.2) */
export interface Settlement {
  courtFee: number;
  shuttleFee: number;
  otherFee: number;
  total: number;
  /** Tổng số người chơi trong buổi (gồm chủ kèo và bạn của chủ kèo không dùng app) */
  headcount: number;
  /** Người vắng vẫn phải trả phần của mình */
  chargeAbsent: boolean;
  perPerson: number;
  settledAt: string;
}

export interface SettleInput {
  courtFee: number;
  shuttleFee: number;
  otherFee: number;
  headcount: number;
  chargeAbsent: boolean;
  attendance: { userId: string; attended: boolean }[];
}

/** Thanh toán kèo: chỉ có khi người xem là chủ kèo hoặc người đã tham gia */
export interface PostPayment {
  amount: number;
  /** Có thể chuyển khoản bằng mã QR (kèo có thu tiền, chưa hủy, chủ kèo đã nhập tài khoản) */
  available: boolean;
  bank: { bin: string; shortName: string } | null;
  accountNumber: string | null;
  accountName: string | null;
  /** participantCount = số người phải trả (không tính người vắng không bị thu) */
  summary: { paidCount: number; participantCount: number; collected: number; expected: number };
  /** Chỉ có với chủ kèo: đang trong khung được chốt chi phí (từ giờ bắt đầu tới 24 giờ sau giờ kết thúc) */
  canSettle?: boolean;
  /** Các trường dưới chỉ có với người tham gia (không có với chủ kèo) */
  content?: string;
  qr?: string | null;
  paid?: boolean;
  attended?: boolean | null;
}

/** Kèo ở trang chi tiết */
export interface PostDetail extends PostSummary {
  participants: Participant[];
  /** Chỉ người trong kèo; null = chưa chốt */
  settlement?: Settlement | null;
  payment?: PostPayment;
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
