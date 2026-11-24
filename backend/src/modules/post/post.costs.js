// Chi phí theo từng khoản (WBS 4.8.2, Charter 2.0) — hàm thuần, không đụng tới CSDL.
//
// "Người" trong phần chia tiền được gọi bằng một mã (ref):
//   host       = chủ kèo
//   u:<userId> = người tham gia qua app
//   g:<guestId>= bạn của chủ kèo không dùng app (chủ kèo tự thêm bằng tên)
//
// BR-16: chỉ chủ kèo sửa chi phí, bất cứ lúc nào, trừ kèo đã hủy. Mọi người trong kèo xem được (BR-15).
// BR-17: mỗi khoản chia đều cho người được chọn; khoản "Tất cả" tính theo danh sách người HIỆN TẠI
//        (người vào sau tự được tính, người đã rời tự bị loại); mỗi người trả tổng phần của mình, làm tròn lên 1.000đ.
// BR-18: đánh dấu đã trả lưu số tiền lúc đó; nếu sau đó phải trả nhiều hơn → "còn thiếu", ít hơn → "trả dư".
const AppError = require('../../utils/AppError');

const EXPENSE_KINDS = /** @type {const} */ (['court', 'shuttle', 'water', 'food', 'other']);
const MAX_EXPENSE = 10_000_000;
const MAX_EXPENSES = 30;
const MAX_GUESTS = 20;
const MAX_GUEST_NAME = 30;
const MAX_LABEL = 40;
const ROUND_TO = 1000;

const HOST = 'host';
const userRef = (userId) => `u:${userId}`;
const guestRef = (guestId) => `g:${guestId}`;

/**
 * @typedef {{ id: string, name: string }} Guest
 * @typedef {{ kind: string, label?: string, amount: number, everyone: boolean, sharedBy: string[] }} Expense
 * @typedef {{ participantIds: string[], guests: Guest[], expenses: Expense[] }} CostPost
 */

/**
 * Lấy phần dữ liệu cần cho việc tính tiền từ document kèo (participants có thể đã populate hoặc chưa).
 * @returns {CostPost}
 */
const toCostPost = (post) => ({
    participantIds: post.participants.map((p) => String(p.user?._id ?? p.user)),
    guests: (post.guests ?? []).map((g) => ({ id: String(g._id ?? g.id), name: g.name })),
    expenses: (post.expenses ?? []).map((e) => ({
        kind: e.kind,
        label: e.label,
        amount: e.amount,
        everyone: e.everyone,
        sharedBy: [...(e.sharedBy ?? [])]
    }))
});

/** Danh sách mã người hiện có trong kèo: chủ kèo, người tham gia, bạn không dùng app */
const memberRefs = (post) => [HOST, ...post.participantIds.map(userRef), ...post.guests.map((g) => guestRef(g.id))];

/** Người cùng chịu một khoản, chỉ tính người còn trong kèo */
const sharersOf = (expense, refs) => (expense.everyone ? refs : expense.sharedBy.filter((r) => refs.includes(r)));

/**
 * Số tiền mỗi người phải trả. null khi chưa có khoản chi nào (1b: chưa có mã QR).
 * Cộng phần lẻ của từng khoản trước, làm tròn một lần cho mỗi người (lên 1.000đ).
 * @param {CostPost} post
 * @returns {Map<string, number> | null}
 */
const computeDues = (post) => {
    if (post.expenses.length === 0) return null;
    const refs = memberRefs(post);
    const exact = new Map(refs.map((r) => [r, 0]));
    for (const e of post.expenses) {
        const sharers = sharersOf(e, refs);
        if (sharers.length === 0) continue;
        for (const r of sharers) exact.set(r, exact.get(r) + e.amount / sharers.length);
    }
    // Trừ sai số dấu phẩy động trước khi làm tròn lên (vd 100000/3*3)
    return new Map([...exact].map(([r, v]) => [r, v === 0 ? 0 : Math.ceil(Math.round(v * 1000) / 1000 / ROUND_TO) * ROUND_TO]));
};

/** Tổng các khoản chi */
const totalOf = (expenses) => expenses.reduce((sum, e) => sum + e.amount, 0);

/**
 * Trạng thái trả tiền của một người tham gia (BR-18).
 * @param {number} due  Số phải trả hiện tại
 * @param {{ paidAt?: Date | null, paidAmount?: number | null }} p
 */
const paymentStatus = (due, p) => {
    if (!p.paidAt) return { status: due > 0 ? 'unpaid' : 'none', toPay: due, diff: 0 };
    const paid = p.paidAmount ?? 0;
    if (due > paid) return { status: 'owe', toPay: due - paid, diff: due - paid };
    if (due < paid) return { status: 'overpaid', toPay: 0, diff: paid - due };
    return { status: 'paid', toPay: 0, diff: 0 };
};

const forbid = () => new AppError(403, 'NOT_AUTHOR', 'Chỉ chủ kèo mới sửa được chi phí');
const closedPost = () => new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');

/**
 * Kiểm tra dữ liệu chi phí chủ kèo gửi lên và chuẩn hóa (BR-16, BR-17).
 * Bạn không dùng app gửi kèm `key`: id cũ (giữ nguyên) hoặc khóa tạm cho người mới thêm;
 * các khoản tham chiếu bạn đó bằng "g:<key>". Server cấp id mới cho khóa tạm và đổi lại tham chiếu.
 * @param {{ authorId: string, status: string, participantIds: string[], guests: Guest[] }} post
 * @param {string} actorId
 * @param {{ guests?: { key: string, name: string }[], expenses?: any[] }} input
 * @param {() => string} newId  Tạo id cho bạn mới thêm
 * @returns {{ guests: Guest[], expenses: Expense[] }}
 */
const normalizeCosts = (post, actorId, input, newId) => {
    if (actorId !== post.authorId) throw forbid();
    if (post.status === 'closed') throw closedPost();

    const errors = [];
    const guestsIn = Array.isArray(input.guests) ? input.guests : [];
    const expensesIn = Array.isArray(input.expenses) ? input.expenses : [];

    if (guestsIn.length > MAX_GUESTS) errors.push({ field: 'guests', msg: `Tối đa ${MAX_GUESTS} bạn không dùng app` });
    if (expensesIn.length > MAX_EXPENSES) errors.push({ field: 'expenses', msg: `Tối đa ${MAX_EXPENSES} khoản chi` });

    const existing = new Set(post.guests.map((g) => String(g.id)));
    const keyToId = new Map();
    const guests = [];
    for (const g of guestsIn) {
        const name = typeof g.name === 'string' ? g.name.trim().replace(/\s+/g, ' ') : '';
        const key = String(g.key ?? '');
        if (!name || name.length > MAX_GUEST_NAME) {
            errors.push({ field: 'guests', msg: `Tên bạn không dùng app từ 1 đến ${MAX_GUEST_NAME} ký tự` });
            continue;
        }
        if (!key || keyToId.has(key)) {
            errors.push({ field: 'guests', msg: 'Danh sách bạn không dùng app không hợp lệ' });
            continue;
        }
        const id = existing.has(key) ? key : newId();
        keyToId.set(key, id);
        guests.push({ id, name });
    }

    const refs = [HOST, ...post.participantIds.map(userRef), ...guests.map((g) => guestRef(g.id))];
    const expenses = [];
    expensesIn.forEach((e, i) => {
        const field = `expenses[${i}]`;
        if (!EXPENSE_KINDS.includes(e.kind)) errors.push({ field, msg: 'Loại chi phí không hợp lệ' });
        if (!Number.isInteger(e.amount) || e.amount < 0 || e.amount > MAX_EXPENSE) {
            errors.push({ field, msg: `Số tiền phải là số nguyên từ 0 đến ${MAX_EXPENSE.toLocaleString('vi-VN')}đ` });
        }
        const label = typeof e.label === 'string' ? e.label.trim() : '';
        if (e.kind === 'other' && !label) errors.push({ field, msg: 'Khoản "Khác" cần có tên' });
        if (label.length > MAX_LABEL) errors.push({ field, msg: `Tên khoản tối đa ${MAX_LABEL} ký tự` });

        const everyone = e.everyone === true;
        // Đổi "g:<khóa tạm>" thành "g:<id thật>", bỏ trùng, chỉ giữ người có trong kèo
        const sharedBy = everyone
            ? []
            : [...new Set((Array.isArray(e.sharedBy) ? e.sharedBy : []).map((r) => {
                  const m = /^g:(.+)$/.exec(String(r));
                  return m && keyToId.has(m[1]) ? guestRef(keyToId.get(m[1])) : String(r);
              }))];
        if (!everyone && sharedBy.some((r) => !refs.includes(r))) {
            errors.push({ field, msg: 'Người cùng chịu không có trong kèo' });
        }
        if (!everyone && sharedBy.length === 0) errors.push({ field, msg: 'Chọn ít nhất một người cùng chịu khoản này' });

        expenses.push({ kind: e.kind, label: label || undefined, amount: e.amount, everyone, sharedBy: everyone ? [] : sharedBy });
    });

    if (errors.length > 0) {
        throw new AppError(400, 'VALIDATION_ERROR', errors[0].msg, errors);
    }
    return { guests, expenses };
};

/**
 * Điểm danh: chỉ chủ kèo, kèo chưa hủy, từ giờ bắt đầu; chỉ những người đang tham gia.
 * @returns {Map<string, boolean>}
 */
const normalizeAttendance = (post, actorId, input, now) => {
    if (actorId !== post.authorId) throw new AppError(403, 'NOT_AUTHOR', 'Chỉ chủ kèo mới điểm danh được');
    if (post.status === 'closed') throw closedPost();
    if (now.getTime() < post.startsAt.getTime()) {
        throw new AppError(409, 'NOT_STARTED', 'Chỉ điểm danh được từ giờ bắt đầu');
    }
    const list = Array.isArray(input.attendance) ? input.attendance : [];
    const map = new Map();
    for (const a of list) {
        const id = String(a.userId);
        if (!post.participantIds.includes(id) || map.has(id) || typeof a.attended !== 'boolean') {
            throw new AppError(400, 'VALIDATION_ERROR', 'Điểm danh không hợp lệ', [{ field: 'attendance', msg: 'Điểm danh không hợp lệ' }]);
        }
        map.set(id, a.attended);
    }
    return map;
};

module.exports = {
    EXPENSE_KINDS,
    MAX_EXPENSE,
    MAX_EXPENSES,
    MAX_GUESTS,
    HOST,
    userRef,
    guestRef,
    toCostPost,
    memberRefs,
    sharersOf,
    computeDues,
    totalOf,
    paymentStatus,
    normalizeCosts,
    normalizeAttendance
};
