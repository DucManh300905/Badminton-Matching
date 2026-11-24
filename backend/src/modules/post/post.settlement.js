// Chốt chi phí sau buổi chơi (WBS 4.8.2) — hàm thuần, không đụng tới CSDL.
// BR-16: chỉ chủ kèo, chỉ từ giờ bắt đầu tới 24 giờ sau giờ kết thúc, kèo chưa hủy và có người tham gia.
// BR-17: chi phí hợp lệ, điểm danh khớp đúng người tham gia, số người chia đủ lớn; mỗi người = tổng ÷ số người, làm tròn lên 1.000đ.
const AppError = require('../../utils/AppError');

const SETTLE_WINDOW_HOURS = 24;
const MAX_FEE = 10_000_000;
const MAX_HEADCOUNT = 50;
const ROUND_TO = 1000;

const HOUR = 3600 * 1000;
const FEE_FIELDS = /** @type {const} */ (['courtFee', 'shuttleFee', 'otherFee']);

const isFee = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_FEE;

/** Làm tròn LÊN tới 1.000đ: chủ kèo không bao giờ bị thiếu tiền */
const perPersonOf = (total, headcount) => Math.ceil(total / headcount / ROUND_TO) * ROUND_TO;

/**
 * Khung thời gian được chốt (BR-16)
 * @param {{ startsAt: Date, endsAt: Date }} post
 * @param {Date} now
 */
const isInSettleWindow = (post, now) =>
    now.getTime() >= post.startsAt.getTime() && now.getTime() <= post.endsAt.getTime() + SETTLE_WINDOW_HOURS * HOUR;

/**
 * @typedef {{ authorId: string, status: string, startsAt: Date, endsAt: Date, participantIds: string[] }} SettlePost
 * @typedef {{ courtFee: number, shuttleFee: number, otherFee: number, headcount: number, chargeAbsent: boolean,
 *             attendance: { userId: string, attended: boolean }[] }} SettleInput
 */

/** Chủ kèo có đang chốt được kèo này không (dùng để hiện / ẩn nút trên giao diện) */
const canSettle = (post, now) => post.status !== 'closed' && post.participantIds.length > 0 && isInSettleWindow(post, now);

/**
 * Kiểm tra và tính kết quả chốt chi phí.
 * @param {SettlePost} post
 * @param {string} actorId
 * @param {SettleInput} input
 * @param {Date} now
 * @returns {{ settlement: object, attendance: Map<string, boolean> }}
 * @throws {AppError} 403 NOT_AUTHOR · 409 POST_NOT_OPEN · 409 SETTLEMENT_CLOSED · 400 VALIDATION_ERROR
 */
const settle = (post, actorId, input, now) => {
    if (actorId !== post.authorId) {
        throw new AppError(403, 'NOT_AUTHOR', 'Chỉ chủ kèo mới chốt được chi phí');
    }
    if (post.status === 'closed') {
        throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');
    }
    if (!isInSettleWindow(post, now)) {
        throw new AppError(409, 'SETTLEMENT_CLOSED', `Chỉ chốt được từ giờ bắt đầu tới ${SETTLE_WINDOW_HOURS} giờ sau giờ kết thúc`);
    }

    const errors = [];

    for (const field of FEE_FIELDS) {
        if (!isFee(input[field])) {
            errors.push({ field, msg: `Chi phí phải là số nguyên từ 0 đến ${MAX_FEE.toLocaleString('vi-VN')}đ` });
        }
    }
    const total = FEE_FIELDS.reduce((sum, f) => sum + (isFee(input[f]) ? input[f] : 0), 0);
    if (errors.length === 0 && total === 0) {
        errors.push({ field: 'courtFee', msg: 'Tổng chi phí phải lớn hơn 0' });
    }

    // Điểm danh phải khớp đúng những người đang tham gia, mỗi người một lần
    const attendance = new Map();
    for (const a of input.attendance ?? []) {
        attendance.set(String(a.userId), a.attended === true);
    }
    const sameMembers =
        post.participantIds.length > 0 &&
        attendance.size === (input.attendance ?? []).length &&
        attendance.size === post.participantIds.length &&
        post.participantIds.every((id) => attendance.has(id));
    if (!sameMembers) {
        errors.push({ field: 'attendance', msg: 'Điểm danh phải gồm đúng những người đang tham gia kèo' });
    }

    // Người phải trả trong app: người có mặt, cộng người vắng nếu chủ kèo chọn "người vắng vẫn phải trả"
    const present = [...attendance.values()].filter(Boolean).length;
    const payers = input.chargeAbsent ? attendance.size : present;
    const minHeadcount = payers + 1;
    if (!Number.isInteger(input.headcount) || input.headcount < minHeadcount || input.headcount > MAX_HEADCOUNT) {
        errors.push({
            field: 'headcount',
            msg: `Số người chơi phải từ ${minHeadcount} (người phải trả + chủ kèo) đến ${MAX_HEADCOUNT}`
        });
    }

    if (errors.length > 0) {
        throw new AppError(400, 'VALIDATION_ERROR', errors[0].msg, errors);
    }

    return {
        settlement: {
            courtFee: input.courtFee,
            shuttleFee: input.shuttleFee,
            otherFee: input.otherFee,
            headcount: input.headcount,
            chargeAbsent: input.chargeAbsent === true,
            perPerson: perPersonOf(total, input.headcount),
            settledAt: now
        },
        attendance
    };
};

/**
 * Số tiền một người tham gia phải trả: chưa chốt = giá đăng kèo; đã chốt = tiền mỗi người,
 * trừ người vắng khi chủ kèo không thu của người vắng.
 * @param {{ pricePerPerson: number, settlement?: { perPerson: number, chargeAbsent: boolean } | null }} post
 * @param {{ attended?: boolean | null }} participant
 */
const amountDue = (post, participant) => {
    if (!post.settlement) return post.pricePerPerson;
    if (participant.attended === false && !post.settlement.chargeAbsent) return 0;
    return post.settlement.perPerson;
};

module.exports = {
    SETTLE_WINDOW_HOURS,
    MAX_FEE,
    MAX_HEADCOUNT,
    perPersonOf,
    isInSettleWindow,
    canSettle,
    settle,
    amountDue
};
