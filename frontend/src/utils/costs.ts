// Chi phí theo từng khoản (WBS 4.8.2). Cách tính phải khớp backend/src/modules/post/post.costs.js (BR-17)
import type { IconName } from '../components/Icon';
import type { ExpenseKind, MemberRef } from '../types';

export const EXPENSE_KINDS: { kind: ExpenseKind; label: string }[] = [
  { kind: 'court', label: 'Tiền sân' },
  { kind: 'shuttle', label: 'Tiền cầu' },
  { kind: 'water', label: 'Tiền nước' },
  { kind: 'food', label: 'Tiền ăn' },
  { kind: 'other', label: 'Khác' },
];

/** Icon nét mảnh cho từng loại khoản */
export const EXPENSE_ICONS: Record<ExpenseKind, IconName> = {
  court: 'court',
  shuttle: 'shuttle',
  water: 'water',
  food: 'food',
  other: 'dots',
};

/** Tên hiển thị của một khoản: khoản "Khác" dùng tên chủ kèo đặt */
export const expenseName = (e: { kind: ExpenseKind; label?: string | null }) =>
  e.kind === 'other' ? e.label?.trim() || 'Khác' : (EXPENSE_KINDS.find((k) => k.kind === e.kind)?.label ?? e.kind);

export interface DraftExpense {
  amount: number;
  everyone: boolean;
  sharedBy: MemberRef[];
}

/**
 * Xem trước số tiền mỗi người: mỗi khoản chia đều cho người được chọn ("Tất cả" = mọi người hiện có),
 * cộng phần lẻ rồi làm tròn lên 1.000đ cho mỗi người. null khi chưa có khoản nào.
 */
export function previewDues(members: MemberRef[], expenses: DraftExpense[]): Map<MemberRef, number> | null {
  if (expenses.length === 0) return null;
  const exact = new Map(members.map((m) => [m, 0]));
  for (const e of expenses) {
    const sharers = e.everyone ? members : e.sharedBy.filter((r) => members.includes(r));
    if (sharers.length === 0) continue;
    for (const r of sharers) exact.set(r, (exact.get(r) ?? 0) + e.amount / sharers.length);
  }
  return new Map([...exact].map(([r, v]) => [r, v === 0 ? 0 : Math.ceil(Math.round(v * 1000) / 1000 / 1000) * 1000]));
}
