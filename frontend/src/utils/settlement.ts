// Xem trước kết quả chốt chi phí trên giao diện. Phải khớp backend/src/modules/post/post.settlement.js

/** Mỗi người = tổng ÷ số người, làm tròn LÊN 1.000đ */
export const perPersonOf = (total: number, headcount: number) =>
  headcount > 0 ? Math.ceil(total / headcount / 1000) * 1000 : 0;

/** Số người chơi tối thiểu = người phải trả trong app + chủ kèo */
export const minHeadcount = (attended: boolean[], chargeAbsent: boolean) =>
  (chargeAbsent ? attended.length : attended.filter(Boolean).length) + 1;
