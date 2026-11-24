// Chuyển document Post (đã populate) thành JSON trả cho client.
// Chỉ lộ tên hiển thị của chủ kèo / người tham gia — không bao giờ có email.
// Tài khoản nhận tiền của chủ kèo, trạng thái đã trả, điểm danh, chi phí đã chốt chỉ đưa cho người trong kèo (BR-15).
const { remainingSlots } = require('./post.rules');
const { amountDue, canSettle } = require('./post.settlement');
const { bankByBin } = require('../../utils/banks');
const { buildVietQr, transferContent } = require('../../utils/vietqr');

/** @param {any} user  User đã populate (hoặc ObjectId nếu tài khoản đã bị xóa) */
const toPublicUser = (user) => ({
    id: String(user?._id ?? user),
    displayName: user?.displayName ?? 'Người dùng đã xóa'
});

const userIdOf = (participant) => String(participant.user?._id ?? participant.user);

/** Dạng rút gọn cho danh sách kèo */
const toPostSummary = (post) => ({
    id: String(post._id),
    courtName: post.courtName,
    district: post.district,
    address: post.address ?? null,
    startsAt: post.startsAt,
    endsAt: post.endsAt,
    levelMin: post.levelMin,
    levelMax: post.levelMax,
    pricePerPerson: post.pricePerPerson,
    slots: { male: post.slots.male, female: post.slots.female, any: post.slots.any },
    remaining: remainingSlots(post.toRules()),
    participantCount: post.participants.length,
    status: post.status,
    note: post.note ?? null,
    author: toPublicUser(post.author)
});

/** Chi phí đã chốt (WBS 4.8.2), null nếu chưa chốt */
const toSettlement = (post) => {
    const s = post.settlement;
    if (!s) return null;
    return {
        courtFee: s.courtFee,
        shuttleFee: s.shuttleFee,
        otherFee: s.otherFee,
        total: s.courtFee + s.shuttleFee + s.otherFee,
        headcount: s.headcount,
        chargeAbsent: s.chargeAbsent,
        perPerson: s.perPerson,
        settledAt: s.settledAt
    };
};

/**
 * Phần thanh toán (WBS 4.8.1, 4.8.2), chỉ dành cho chủ kèo và người đã tham gia.
 * @param {any} post
 * @param {string} viewerId
 * @param {boolean} isAuthor
 * @param {Date} now
 */
const toPayment = (post, viewerId, isAuthor, now) => {
    const account = post.author?.bankAccount;
    const bank = account ? bankByBin(account.bankBin) : null;

    // Chỉ tính người thực sự phải trả (người vắng không bị thu thì không tính)
    const payers = post.participants.map((p) => ({ p, due: amountDue(post, p) })).filter((x) => x.due > 0);
    const paid = payers.filter((x) => x.p.paidAt);
    const summary = {
        paidCount: paid.length,
        participantCount: payers.length,
        collected: paid.reduce((sum, x) => sum + x.due, 0),
        expected: payers.reduce((sum, x) => sum + x.due, 0)
    };
    const receiving = {
        bank: bank && { bin: bank.bin, shortName: bank.shortName },
        accountNumber: bank ? account.accountNumber : null,
        accountName: bank ? account.accountName : null
    };

    if (isAuthor) {
        return {
            amount: post.settlement ? post.settlement.perPerson : post.pricePerPerson,
            available: post.status !== 'closed' && !!bank,
            ...receiving,
            summary,
            canSettle: canSettle(
                {
                    status: post.status,
                    startsAt: post.startsAt,
                    endsAt: post.endsAt,
                    participantIds: post.participants.map(userIdOf)
                },
                now
            )
        };
    }

    const me = post.participants.find((p) => userIdOf(p) === viewerId);
    const amount = amountDue(post, me);
    const available = amount > 0 && post.status !== 'closed' && !!bank;
    const content = transferContent(post._id, me.user?.displayName ?? '');
    return {
        amount,
        available,
        ...receiving,
        summary,
        content,
        qr: available ? buildVietQr({ bin: bank.bin, accountNumber: account.accountNumber, amount, content }) : null,
        paid: !!me.paidAt,
        attended: me.attended ?? null
    };
};

/**
 * Dạng đầy đủ cho trang chi tiết: thêm danh sách người tham gia.
 * Người xem là chủ kèo hoặc người đã tham gia → thêm trạng thái đã trả, điểm danh, chi phí đã chốt và phần `payment`.
 * @param {any} post
 * @param {string} [viewerId]  Người đang xem (không có = khách)
 * @param {Date} [now]
 */
const toPostDetail = (post, viewerId, now = new Date()) => {
    const authorId = String(post.author?._id ?? post.author);
    const isAuthor = !!viewerId && viewerId === authorId;
    const isParticipant = !!viewerId && post.participants.some((p) => userIdOf(p) === viewerId);
    const insider = isAuthor || isParticipant;

    return {
        ...toPostSummary(post),
        participants: post.participants.map((p) => ({
            ...toPublicUser(p.user),
            gender: p.user?.gender ?? null,
            level: p.user?.level ?? null,
            slot: p.slot,
            joinedAt: p.joinedAt,
            ...(insider && { paid: !!p.paidAt, attended: p.attended ?? null, amountDue: amountDue(post, p) })
        })),
        ...(insider && { settlement: toSettlement(post), payment: toPayment(post, viewerId, isAuthor, now) })
    };
};

module.exports = {
    toPostSummary,
    toPostDetail
};
