// Chuyển document Post (đã populate) thành JSON trả cho client.
// Chỉ lộ tên hiển thị của chủ kèo / người tham gia — không bao giờ có email.
const { remainingSlots } = require('./post.rules');

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

/** Dạng đầy đủ cho trang chi tiết: thêm danh sách người tham gia */
const toPostDetail = (post) => ({
    ...toPostSummary(post),
    participants: post.participants.map((p) => ({
        ...toPublicUser(p.user),
        gender: p.user?.gender ?? null,
        level: p.user?.level ?? null,
        slot: p.slot,
        joinedAt: p.joinedAt
    }))
});

module.exports = {
    toPostSummary,
    toPostDetail
};
