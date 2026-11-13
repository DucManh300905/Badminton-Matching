// Đọc / ghi kèo trong MongoDB. Quy tắc nghiệp vụ nằm ở post.rules.js;
// file này chỉ lấy dữ liệu, gọi quy tắc, rồi ghi kết quả lại.
const mongoose = require('mongoose');

const Post = require('./post.model');
const rules = require('./post.rules');
const AppError = require('../../utils/AppError');
const { SKILL_LEVELS, levelIndex } = require('../../utils/skillLevel');
const { vnDayRange } = require('../../utils/vnTime');

const LIST_LIMIT = 100;

const notFound = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy kèo');

const AUTHOR_FIELDS = 'displayName';
const PARTICIPANT_FIELDS = 'displayName gender level';

/** Đọc kèo kèm tên chủ kèo + thông tin người tham gia */
const findDetail = (id) =>
    Post.findById(id)
        .populate('author', AUTHOR_FIELDS)
        .populate('participants.user', PARTICIPANT_FIELDS);

/**
 * Danh sách kèo sắp diễn ra, chưa hủy, sắp theo giờ bắt đầu.
 * @param {{ district?: string, date?: string, level?: string }} filter
 * @param {Date} now
 */
const listPosts = async ({ district, date, level }, now) => {
    const query = { startsAt: { $gt: now }, status: { $ne: 'closed' } };

    if (district) {
        query.district = district;
    }

    // Lọc theo NGÀY THEO LỊCH VIỆT NAM (server / CI có thể chạy giờ UTC)
    // (vẫn giữ điều kiện "chưa bắt đầu": chọn hôm nay thì không hiện kèo đã qua giờ)
    if (date) {
        const { start, end } = vnDayRange(date);
        query.startsAt = { $gt: now, $gte: start, $lt: end };
    }

    // Trình độ người xem nằm trong [levelMin, levelMax] của kèo (BR-09), lọc ngay trong MongoDB:
    // levelMin là một trong các mức <= level, levelMax là một trong các mức >= level
    if (level) {
        const i = levelIndex(level);
        query.levelMin = { $in: SKILL_LEVELS.slice(0, i + 1) };
        query.levelMax = { $in: SKILL_LEVELS.slice(i) };
    }

    return Post.find(query).sort({ startsAt: 1, _id: 1 }).limit(LIST_LIMIT).populate('author', AUTHOR_FIELDS);
};

/** @param {string} id */
const getPost = async (id) => {
    const post = await findDetail(id);
    if (!post) {
        throw notFound();
    }
    return post;
};

/**
 * @param {string} authorId
 * @param {object} input  Đã qua express-validator (đúng kiểu dữ liệu)
 * @param {Date} now
 */
const createPost = async (authorId, input, now) => {
    // BR-01 → BR-05
    rules.assertValidPostInput({ ...input, authorId }, now);

    const post = await Post.create({
        author: authorId,
        courtName: input.courtName,
        district: input.district,
        address: input.address,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        levelMin: input.levelMin,
        levelMax: input.levelMax,
        pricePerPerson: input.pricePerPerson,
        slots: input.slots,
        note: input.note,
        rawText: input.rawText
    });

    return getPost(post._id);
};

/**
 * Đọc kèo → áp dụng quy tắc → ghi lại, TRONG MỘT TRANSACTION.
 * Hai người bấm "Tham gia" cùng lúc: MongoDB báo xung đột ghi cho transaction đến sau,
 * withTransaction tự chạy lại → lần chạy lại đọc thấy chỗ đã bị lấy → NO_SLOT / POST_NOT_OPEN.
 * Nhờ vậy không bao giờ có 2 người giữ cùng một chỗ cuối cùng.
 * @param {string} postId
 * @param {(post: import('./post.rules').Post) => import('./post.rules').Post} change
 */
const updateParticipants = async (postId, change) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const post = await Post.findById(postId).session(session);
            if (!post) {
                throw notFound();
            }

            const next = change(post.toRules());

            // Ghi lại đúng danh sách người tham gia mới, giữ nguyên joinedAt của người cũ
            const before = new Map(post.participants.map((p) => [String(p.user), p]));
            post.participants = next.participants.map(
                (p) => before.get(p.playerId) ?? { user: p.playerId, slot: p.slot, joinedAt: new Date() }
            );
            post.status = next.status;
            await post.save({ session });
        });
    } finally {
        await session.endSession();
    }

    return getPost(postId);
};

/** @param {string} postId @param {{ userId: string, gender: string, level: string }} user @param {Date} now */
const joinPost = (postId, user, now) =>
    updateParticipants(postId, (post) => rules.joinPost(post, { id: user.userId, gender: user.gender, level: user.level }, now));

/** @param {string} postId @param {string} userId @param {Date} now */
const leavePost = (postId, userId, now) => updateParticipants(postId, (post) => rules.leavePost(post, userId, now));

/** @param {string} postId @param {string} userId @param {Date} now */
const cancelPost = (postId, userId, now) => updateParticipants(postId, (post) => rules.cancelPost(post, userId, now));

module.exports = {
    LIST_LIMIT,
    listPosts,
    getPost,
    createPost,
    joinPost,
    leavePost,
    cancelPost
};
