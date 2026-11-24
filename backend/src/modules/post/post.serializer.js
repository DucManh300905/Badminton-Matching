// Chuyển document Post (đã populate) thành JSON trả cho client.
// Chỉ lộ tên hiển thị của chủ kèo / người tham gia — không bao giờ có email.
// Tài khoản nhận tiền của chủ kèo chỉ đưa cho người trong kèo (BR-15).
const { remainingSlots } = require('./post.rules');
const { bankByBin } = require('../../utils/banks');
const { buildVietQr, transferContent } = require('../../utils/vietqr');

/** @param {any} user  User đã populate (hoặc ObjectId nếu tài khoản đã bị xóa) */
const toPublicUser = (user) => ({
    id: String(user?._id ?? user),
    displayName: user?.displayName ?? 'Người dùng đã xóa'
});

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

/**
 * Phần thanh toán (WBS 4.8.1), chỉ dành cho chủ kèo và người đã tham gia.
 * @param {any} post
 * @param {string} viewerId
 * @param {boolean} isAuthor
 */
const toPayment = (post, viewerId, isAuthor) => {
    const amount = post.pricePerPerson;
    const account = post.author?.bankAccount;
    const bank = account ? bankByBin(account.bankBin) : null;
    const paidCount = post.participants.filter((p) => p.paidAt).length;

    const payment = {
        amount,
        // Có thể chuyển khoản bằng QR: kèo có thu tiền, chưa hủy, chủ kèo đã nhập tài khoản
        available: amount > 0 && post.status !== 'closed' && !!bank,
        bank: bank && { bin: bank.bin, shortName: bank.shortName },
        accountNumber: bank ? account.accountNumber : null,
        accountName: bank ? account.accountName : null,
        summary: {
            paidCount,
            participantCount: post.participants.length,
            collected: paidCount * amount,
            expected: post.participants.length * amount
        }
    };

    if (isAuthor) {
        return payment;
    }

    const me = post.participants.find((p) => String(p.user?._id ?? p.user) === viewerId);
    const content = transferContent(post._id, me.user?.displayName ?? '');
    return {
        ...payment,
        content,
        qr: payment.available ? buildVietQr({ bin: bank.bin, accountNumber: account.accountNumber, amount, content }) : null,
        paid: !!me.paidAt
    };
};

/**
 * Dạng đầy đủ cho trang chi tiết: thêm danh sách người tham gia.
 * Người xem là chủ kèo hoặc người đã tham gia → thêm trạng thái đã trả của từng người và phần `payment`.
 * @param {any} post
 * @param {string} [viewerId]  Người đang xem (không có = khách)
 */
const toPostDetail = (post, viewerId) => {
    const authorId = String(post.author?._id ?? post.author);
    const isAuthor = !!viewerId && viewerId === authorId;
    const isParticipant = !!viewerId && post.participants.some((p) => String(p.user?._id ?? p.user) === viewerId);
    const insider = isAuthor || isParticipant;

    return {
        ...toPostSummary(post),
        participants: post.participants.map((p) => ({
            ...toPublicUser(p.user),
            gender: p.user?.gender ?? null,
            level: p.user?.level ?? null,
            slot: p.slot,
            joinedAt: p.joinedAt,
            ...(insider && { paid: !!p.paidAt })
        })),
        ...(insider && { payment: toPayment(post, viewerId, isAuthor) })
    };
};

module.exports = {
    toPostSummary,
    toPostDetail
};
