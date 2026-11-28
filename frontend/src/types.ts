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
  /** Ảnh đại diện (null = dùng chữ cái đầu) */
  avatarUrl?: string | null;
  /** 3 tiện ích của thanh dưới (WBS 4.12); không có = mặc định */
  tabBar?: string[];
  /** Số di động (WBS 4.15), không bắt buộc */
  phone?: string;
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
  avatarUrl?: string | null;
  /** Chỉ có khi người xem ở trong kèo (WBS 4.15) */
  phone?: string | null;
}

/** Ảnh đã tải lên: tên file (để xóa) và đường dẫn */
export interface UploadedImage {
  file: string;
  url: string;
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
  /** Ảnh bìa (null = dải màu mặc định) */
  coverUrl?: string | null;
  author: PublicUser;
  /** Lịch sử → Đã tham gia, kèo sắp diễn ra (WBS 4.16): số liên hệ của chủ kèo; null = chủ kèo không để số */
  hostPhone?: string | null;
}

export interface Participant extends PublicUser {
  gender: Gender | null;
  level: SkillLevel | null;
  slot: SlotKind;
  joinedAt: string;
  /** Các trường dưới chỉ có khi người xem là chủ kèo hoặc người trong kèo */
  paid?: boolean;
  /** Điểm danh sau giờ bắt đầu: true có mặt, false vắng, null chưa điểm danh */
  attended?: boolean | null;
  /** Số tiền người này phải trả; null = chủ kèo chưa nhập khoản chi nào */
  amountDue?: number | null;
  paymentStatus?: PaymentStatus;
  /** Ảnh chuyển khoản (WBS 4.14): chủ kèo thấy của mọi người, người chơi chỉ thấy của mình */
  proofs?: UploadedImage[];
  /** Đã gửi ảnh chuyển khoản nhưng chủ kèo chưa đánh dấu đã trả */
  pendingProof?: boolean;
}

/** none: chưa có khoản phải trả · unpaid · paid · owe: còn thiếu · overpaid: trả dư */
export type PaymentStatus = 'none' | 'unpaid' | 'paid' | 'owe' | 'overpaid';

export type ExpenseKind = 'court' | 'shuttle' | 'water' | 'food' | 'other';

/**
 * Mã người trong phần chia tiền: "host" (chủ kèo), "u:<userId>" (người tham gia),
 * "g:<id>" (bạn của chủ kèo không dùng app)
 */
export type MemberRef = string;

export interface Expense {
  kind: ExpenseKind;
  label: string | null;
  amount: number;
  /** "Chọn tất cả": luôn gồm mọi người hiện có trong kèo, kể cả người vào sau */
  everyone: boolean;
  sharedBy: MemberRef[];
  /** Người đang cùng chịu (server tính) và phần của mỗi người (chưa làm tròn) */
  sharers: MemberRef[];
  share: number;
  /** Khoản "Cầu" theo số quả (WBS 4.10); null với khoản thường / khoản cầu nhập số tiền */
  quantity?: number | null;
  unitPrice?: number | null;
  shuttleId?: string | null;
  shuttleName?: string | null;
}

export interface CostMember {
  ref: MemberRef;
  type: 'host' | 'user' | 'guest';
  name: string;
  /** null = chưa có khoản chi nào */
  due: number | null;
  userId?: string;
  status?: PaymentStatus;
  diff?: number;
  attended?: boolean | null;
}

/** Chi phí theo từng khoản (WBS 4.8.2): ai trong kèo cũng xem được, chỉ chủ kèo sửa */
export interface PostCosts {
  updatedAt: string | null;
  total: number;
  guests: { id: string; name: string }[];
  expenses: Expense[];
  members: CostMember[];
}

export interface CostsInput {
  /** key: id cũ hoặc khóa tạm cho bạn mới thêm; khoản chi tham chiếu bằng "g:<key>" */
  guests: { key: string; name: string }[];
  expenses: {
    kind: ExpenseKind;
    label?: string;
    /** Khoản "Cầu" theo số quả không cần gửi: server tính = số quả × giá, làm tròn lên 1.000đ */
    amount?: number;
    everyone: boolean;
    sharedBy: MemberRef[];
    quantity?: number;
    unitPrice?: number;
    shuttleId?: string | null;
  }[];
}

/** Một loại cầu trong kho (WBS 4.10) */
export interface Shuttle {
  id: string;
  name: string;
  /** Số quả còn */
  quantity: number;
  /** Giá mỗi quả (bình quân) */
  unitPrice: number;
  /** Số quả ngay sau lần nhập gần nhất = 100% thanh mức cầu */
  fullLevel: number;
  updatedAt: string;
}

/** Số quả đã dùng (kèo mình làm chủ, đã diễn ra, chưa hủy) */
export interface ShuttleStats {
  thisWeek: number;
  thisMonth: number;
  /** 8 tuần, cũ → mới; start = thứ Hai "YYYY-MM-DD" */
  weeks: { start: string; quantity: number }[];
  /** 6 tháng, cũ → mới; month = "YYYY-MM" */
  months: { month: string; quantity: number }[];
}

/** Thanh toán kèo: chỉ có khi người xem là chủ kèo hoặc người đã tham gia */
export interface PostPayment {
  /** Chủ kèo đã nhập ít nhất một khoản chi (chưa có thì chưa có mã QR) */
  hasCosts: boolean;
  /** Chi phí dự kiến mỗi người lúc đăng kèo, để tham khảo */
  estimate: number;
  bank: { bin: string; shortName: string } | null;
  accountNumber: string | null;
  accountName: string | null;
  /** Chỉ tính người tham gia qua app phải trả > 0 */
  summary: { paidCount: number; participantCount: number; collected: number; expected: number };
  /** Chỉ có với chủ kèo */
  canEditCosts?: boolean;
  canMarkAttendance?: boolean;
  /** Các trường dưới chỉ có với người tham gia */
  amount?: number;
  status?: PaymentStatus;
  /** Số còn phải chuyển (còn thiếu nếu đã trả trước đó) */
  toPay?: number;
  diff?: number;
  paid?: boolean;
  paidAmount?: number | null;
  attended?: boolean | null;
  available?: boolean;
  content?: string;
  qr?: string | null;
  /** QR không ghi số tiền (in lên hóa đơn của chủ kèo); null khi chưa có số tài khoản */
  qrOpen?: string | null;
  /** Ảnh chuyển khoản mình đã gửi (người chơi) */
  myProofs?: UploadedImage[];
}

/** Kèo ở trang chi tiết */
export interface PostDetail extends PostSummary {
  participants: Participant[];
  /** Chỉ người trong kèo */
  costs?: PostCosts;
  /** Ảnh bill / hóa đơn (WBS 4.11), chỉ người trong kèo */
  bills?: { file: string; url: string }[];
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
  /** Số liên hệ của kèo (WBS 4.16): "" = không để số */
  contactPhone?: string;
  /** Lưu số này vào hồ sơ (chỉ khi hồ sơ chưa có số) */
  savePhone?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  gender: Gender;
  level: SkillLevel;
  phone?: string;
}
