// Đọc / ghi kèo trong MongoDB. Quy tắc nghiệp vụ nằm ở post.rules.js;
// file này chỉ lấy dữ liệu, gọi quy tắc, rồi ghi kết quả lại.
const mongoose = require('mongoose');

const Post = require('./post.model');
const rules = require('./post.rules');
const costs = require('./post.costs');
const { saveImage, removeImage } = require('../../utils/images');
const AppError = require('../../utils/AppError');
const { SKILL_LEVELS, levelIndex } = require('../../utils/skillLevel');
const { vnDayRange } = require('../../utils/vnTime');
const User = require('../user/user.model');
const { sendMail, appUrl } = require('../../utils/mailer');
const Shuttle = require('../shuttle/shuttle.model');
const shuttleService = require('../shuttle/shuttle.service');
const { logEvents } = require('./postEvent.model');

const LIST_LIMIT = 100;

/** Chạy `work(session)` trong một transaction (thao tác + nhật ký ghi cùng nhau hoặc cùng không ghi) */
const inTransaction = async (work) => {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
};

const notFound = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy kèo');

const AUTHOR_FIELDS = 'displayName avatar';
const PARTICIPANT_FIELDS = 'displayName gender level avatar phone';
// Trang chi tiết cần thêm tài khoản nhận tiền của chủ kèo; serializer chỉ đưa cho người trong kèo (BR-15)
const AUTHOR_DETAIL_FIELDS = 'displayName avatar bankAccount phone';

/** Đọc kèo kèm tên chủ kèo + thông tin người tham gia */
const findDetail = (id) =>
    Post.findById(id)
        .populate('author', AUTHOR_DETAIL_FIELDS)
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

const MY_POSTS_LIMIT = 50;

/**
 * Kèo của một người: đã đăng và đã tham gia — gồm cả kèo đã qua / đã hủy, mới nhất trước.
 * @param {string} userId
 */
const listMyPosts = async (userId) => {
    const recentFirst = (query, authorFields) =>
        Post.find(query).sort({ startsAt: -1, _id: -1 }).limit(MY_POSTS_LIMIT).populate('author', authorFields);

    // Kèo đã tham gia cần số của chủ kèo (nút gọi nhanh, WBS 4.16)
    const [authored, joined] = await Promise.all([
        recentFirst({ author: userId }, AUTHOR_FIELDS),
        recentFirst({ 'participants.user': userId }, `${AUTHOR_FIELDS} phone`)
    ]);
    return { authored, joined };
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

    const post = await inTransaction(async (session) => {
        const [created] = await Post.create(
            [
                {
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
                    // "" (để trống) lưu là null; không gửi thì để trống trường = dùng số trong hồ sơ
                    ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone || null })
                }
            ],
            { session }
        );
        // "Lưu số này vào hồ sơ": chỉ khi hồ sơ chưa có số, không ghi đè số cũ
        if (input.savePhone === true && input.contactPhone) {
            await User.updateOne({ _id: authorId, phone: { $exists: false } }, { $set: { phone: input.contactPhone } }, { session });
        }
        const s = created.slots;
        await logEvents(
            [{ post: created._id, user: authorId, type: 'created', at: created.createdAt ?? now, meta: { slots: s.male + s.female + s.any } }],
            session
        );
        return created;
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
const updateParticipants = async (postId, change, actorId) => {
    await inTransaction(async (session) => {
        const post = await Post.findById(postId).session(session);
        if (!post) {
            throw notFound();
        }

        const next = change(post.toRules());
        const at = new Date();

        // Ghi lại đúng danh sách người tham gia mới, giữ nguyên joinedAt của người cũ
        const before = new Map(post.participants.map((p) => [String(p.user), p]));
        const after = new Set(next.participants.map((p) => p.playerId));
        const prevStatus = post.status;
        post.participants = next.participants.map(
            (p) => before.get(p.playerId) ?? { user: p.playerId, slot: p.slot, joinedAt: at }
        );
        post.status = next.status;
        await post.save({ session });

        // Nhật ký: ai vào / ra, kèo vừa đủ / mở lại / bị hủy
        const events = [
            ...next.participants
                .filter((p) => !before.has(p.playerId))
                .map((p) => ({ post: post._id, user: p.playerId, type: 'join', at, meta: { slot: p.slot } })),
            ...[...before.values()]
                .filter((p) => !after.has(String(p.user)))
                .map((p) => ({ post: post._id, user: p.user, type: 'leave', at, meta: { slot: p.slot } }))
        ];
        if (prevStatus !== next.status) {
            if (next.status === 'closed') events.push({ post: post._id, user: actorId, type: 'cancel', at });
            else if (next.status === 'full') events.push({ post: post._id, user: null, type: 'full', at });
            else if (prevStatus === 'full' && next.status === 'open') events.push({ post: post._id, user: null, type: 'reopen', at });
        }
        await logEvents(events, session);
    });

    return getPost(postId);
};

/** @param {string} postId @param {{ userId: string, gender: string, level: string }} user @param {Date} now */
const joinPost = (postId, user, now) =>
    updateParticipants(postId, (post) => rules.joinPost(post, { id: user.userId, gender: user.gender, level: user.level }, now), user.userId);

/** @param {string} postId @param {string} userId @param {Date} now */
const leavePost = (postId, userId, now) => updateParticipants(postId, (post) => rules.leavePost(post, userId, now), userId);

/** @param {string} postId @param {string} userId @param {Date} now */
const cancelPost = (postId, userId, now) => updateParticipants(postId, (post) => rules.cancelPost(post, userId, now), userId);

/**
 * Chủ kèo đánh dấu một người đã / chưa chuyển tiền (BR-14).
 * Không cần transaction: chỉ đổi đúng một trường của một người, ghi nguyên tử bằng toán tử vị trí "$".
 * @param {string} postId
 * @param {string} authorId  Người đang thao tác
 * @param {string} playerId  Người được đánh dấu
 * @param {boolean} paid
 * @param {Date} now
 */
const setPaid = async (postId, authorId, playerId, paid, now) => {
    const post = await Post.findById(postId).select('author status participants.user guests expenses');
    if (!post) {
        throw notFound();
    }
    if (String(post.author) !== authorId) {
        throw new AppError(403, 'NOT_AUTHOR', 'Chỉ chủ kèo mới đánh dấu được');
    }
    if (post.status === 'closed') {
        throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');
    }
    if (!post.participants.some((p) => String(p.user) === playerId)) {
        throw new AppError(409, 'NOT_JOINED', 'Người này không tham gia kèo');
    }

    // Lưu số tiền phải trả tại lúc đánh dấu (BR-18) để sau này biết "còn thiếu" / "trả dư"
    const dues = costs.computeDues(costs.toCostPost(post));
    const paidAmount = dues?.get(costs.userRef(playerId)) ?? 0;

    await inTransaction(async (session) => {
        await Post.updateOne(
            { _id: postId, 'participants.user': playerId },
            {
                $set: {
                    'participants.$.paidAt': paid ? now : null,
                    'participants.$.paidAmount': paid ? paidAmount : null
                }
            },
            { session }
        );
        await logEvents(
            [{ post: postId, user: playerId, type: paid ? 'paid' : 'unpaid', at: now, meta: paid ? { amount: paidAmount } : undefined }],
            session
        );
    });
    return getPost(postId);
};

/**
 * Chủ kèo lưu toàn bộ chi phí: các khoản chi + bạn không dùng app (BR-16, BR-17).
 * Chỉ ghi 3 trường chi phí bằng $set, nên không đụng tới danh sách người tham gia đang được
 * tham gia / rời song song; người đã rời tự bị loại khỏi phần chia khi tính tiền.
 * @param {string} postId
 * @param {string} actorId
 * @param {{ guests?: { key: string, name: string }[], expenses?: object[] }} input
 * @param {Date} now
 */
const updateCosts = async (postId, actorId, input, now) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const post = await Post.findById(postId).select('author status participants.user guests expenses').session(session);
            if (!post) {
                throw notFound();
            }

            const { guests, expenses } = costs.normalizeCosts(
                {
                    authorId: String(post.author),
                    status: post.status,
                    participantIds: post.participants.map((p) => String(p.user)),
                    guests: post.guests.map((g) => ({ id: String(g._id), name: g.name }))
                },
                actorId,
                input,
                () => String(new mongoose.Types.ObjectId())
            );

            // Khoản "Cầu" chọn từ kho (WBS 4.10): chỉ nhận loại cầu của chính chủ kèo, chép tên để hiện lại về sau
            const ids = [...new Set(expenses.filter((e) => e.shuttle).map((e) => e.shuttle))];
            const owned = new Map(
                (await Shuttle.find({ _id: { $in: ids }, owner: actorId }).select('name').session(session)).map((s) => [
                    String(s._id),
                    s.name
                ])
            );
            const previous = new Map(
                post.expenses.filter((e) => e.shuttle).map((e) => [String(e.shuttle), e.shuttleName])
            );
            for (const e of expenses) {
                if (!e.shuttle) continue;
                if (owned.has(e.shuttle)) e.shuttleName = owned.get(e.shuttle);
                else if (previous.has(e.shuttle)) e.shuttleName = previous.get(e.shuttle); // loại cầu đã xóa khỏi kho
                else e.shuttle = null; // không phải cầu của mình → coi như nhập giá tay
            }

            await Post.updateOne(
                { _id: postId },
                {
                    $set: {
                        guests: guests.map((g) => ({ _id: g.id, name: g.name })),
                        expenses,
                        costsUpdatedAt: now
                    }
                },
                { runValidators: true, session }
            );

            // Trừ / hoàn kho theo chênh lệch số quả so với lần lưu trước (2a); kho hết thì dừng ở 0
            const before = shuttleService.usageOf(post.expenses);
            const after = shuttleService.usageOf(expenses);
            const deltas = new Map();
            for (const id of new Set([...before.keys(), ...after.keys()])) {
                deltas.set(id, (after.get(id) ?? 0) - (before.get(id) ?? 0));
            }
            await shuttleService.applyStockChanges(actorId, deltas, session);

            await logEvents(
                [
                    {
                        post: post._id,
                        user: actorId,
                        type: 'costs_saved',
                        at: now,
                        meta: {
                            total: costs.totalOf(expenses),
                            expenses: expenses.length,
                            notAll: expenses.filter((e) => !e.everyone).length,
                            guests: guests.length
                        }
                    }
                ],
                session
            );
        });
    } finally {
        await session.endSession();
    }
    return getPost(postId);
};

/**
 * Chủ kèo điểm danh người tham gia, từ giờ bắt đầu trở đi.
 * @param {string} postId
 * @param {string} actorId
 * @param {{ attendance?: { userId: string, attended: boolean }[] }} input
 * @param {Date} now
 */
const setAttendance = async (postId, actorId, input, now) => {
    const post = await Post.findById(postId).select('author status startsAt participants.user');
    if (!post) {
        throw notFound();
    }

    const attendance = costs.normalizeAttendance(
        {
            authorId: String(post.author),
            status: post.status,
            startsAt: post.startsAt,
            participantIds: post.participants.map((p) => String(p.user))
        },
        actorId,
        input,
        now
    );

    await inTransaction(async (session) => {
        for (const [userId, attended] of attendance) {
            await Post.updateOne(
                { _id: postId, 'participants.user': userId },
                { $set: { 'participants.$.attended': attended } },
                { session }
            );
        }
        await logEvents(
            [...attendance].map(([userId, attended]) => ({ post: postId, user: userId, type: 'attendance', at: now, meta: { attended } })),
            session
        );
    });
    return getPost(postId);
};

/**
 * Chủ kèo đổi / xóa ảnh bìa (WBS 4.9). Chỉ chủ kèo, kèo chưa hủy. Ảnh cũ bị xóa.
 * @param {string} postId
 * @param {string} actorId
 * @param {Buffer | null} buffer  null = xóa ảnh bìa
 */
const setCover = async (postId, actorId, buffer) => {
    const post = await Post.findById(postId).select('author status cover');
    if (!post) {
        throw notFound();
    }
    if (String(post.author) !== actorId) {
        throw new AppError(403, 'NOT_AUTHOR', 'Chỉ chủ kèo mới đổi được ảnh bìa');
    }
    if (post.status === 'closed') {
        throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');
    }

    const fileName = buffer === null ? null : await saveImage('covers', buffer);
    await Post.updateOne({ _id: postId }, { $set: { cover: fileName } });
    await removeImage('covers', post.cover);
    return getPost(postId);
};

/**
 * Đổi / xóa số liên hệ của kèo (WBS 4.16): chủ kèo, kèo chưa hủy. "" = không để số.
 * @param {string} postId
 * @param {string} actorId
 * @param {string} phone  Đã chuẩn hóa ("" hoặc số di động VN)
 */
const setContactPhone = async (postId, actorId, phone) => {
    await findOwnOpenPost(postId, actorId, '', 'sửa được số liên hệ');
    await Post.updateOne({ _id: postId }, { $set: { contactPhone: phone || null } });
    return getPost(postId);
};

/** Chủ kèo, kèo chưa hủy */
const findOwnOpenPost = async (postId, actorId, fields, action) => {
    const post = await Post.findById(postId).select(`author status ${fields}`);
    if (!post) {
        throw notFound();
    }
    if (String(post.author) !== actorId) {
        throw new AppError(403, 'NOT_AUTHOR', `Chỉ chủ kèo mới ${action}`);
    }
    if (post.status === 'closed') {
        throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');
    }
    return post;
};

/**
 * Thêm một ảnh bill (WBS 4.11), tối đa MAX_BILLS ảnh. Điều kiện "chưa đủ" nằm ngay trong lệnh ghi
 * nên hai lần tải cùng lúc cũng không vượt quá giới hạn.
 */
const addBill = async (postId, actorId, buffer) => {
    const post = await findOwnOpenPost(postId, actorId, 'bills', 'thêm được ảnh bill');
    if (post.bills.length >= costs.MAX_BILLS) {
        throw new AppError(409, 'BILL_LIMIT', `Tối đa ${costs.MAX_BILLS} ảnh bill`);
    }
    const fileName = await saveImage('bills', buffer);
    const res = await Post.updateOne(
        { _id: postId, [`bills.${costs.MAX_BILLS - 1}`]: { $exists: false } },
        { $push: { bills: fileName } }
    );
    if (res.modifiedCount === 0) {
        await removeImage('bills', fileName);
        throw new AppError(409, 'BILL_LIMIT', `Tối đa ${costs.MAX_BILLS} ảnh bill`);
    }
    return getPost(postId);
};

/** Xóa một ảnh bill theo tên file */
const removeBill = async (postId, actorId, fileName) => {
    const post = await findOwnOpenPost(postId, actorId, 'bills', 'xóa được ảnh bill');
    if (!post.bills.includes(fileName)) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh bill');
    }
    await Post.updateOne({ _id: postId }, { $pull: { bills: fileName } });
    await removeImage('bills', fileName);
    return getPost(postId);
};

/**
 * Người chơi gửi ảnh chuyển khoản (WBS 4.14), tối đa MAX_PROOFS ảnh mỗi người.
 * Không tự đánh dấu đã trả: chủ kèo xem ảnh rồi tự bấm. Gửi email báo chủ kèo.
 */
const addProof = async (postId, userId, buffer, now) => {
    const post = await Post.findById(postId).select('author status courtName startsAt participants.user participants.proofs');
    if (!post) {
        throw notFound();
    }
    if (post.status === 'closed') {
        throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã bị hủy');
    }
    const me = post.participants.find((p) => String(p.user) === userId);
    if (!me) {
        throw new AppError(403, 'NOT_JOINED', 'Chỉ người tham gia kèo mới gửi được ảnh chuyển khoản');
    }
    if (me.proofs.length >= costs.MAX_PROOFS) {
        throw new AppError(409, 'PROOF_LIMIT', `Tối đa ${costs.MAX_PROOFS} ảnh chuyển khoản`);
    }

    const fileName = await saveImage('proofs', buffer);
    const res = await inTransaction(async (session) => {
        const r = await Post.updateOne(
            { _id: postId, participants: { $elemMatch: { user: userId, [`proofs.${costs.MAX_PROOFS - 1}`]: { $exists: false } } } },
            { $push: { 'participants.$.proofs': fileName }, $set: { 'participants.$.proofAt': now } },
            { session }
        );
        if (r.modifiedCount > 0) await logEvents([{ post: postId, user: userId, type: 'proof', at: now }], session);
        return r;
    });
    if (res.modifiedCount === 0) {
        await removeImage('proofs', fileName);
        throw new AppError(409, 'PROOF_LIMIT', `Tối đa ${costs.MAX_PROOFS} ảnh chuyển khoản`);
    }

    const [host, player] = await Promise.all([
        User.findById(post.author).select('email displayName'),
        User.findById(userId).select('displayName')
    ]);
    if (host?.email) {
        await sendMail({
            to: host.email,
            subject: `${player?.displayName ?? 'Người chơi'} đã gửi ảnh chuyển khoản`,
            paragraphs: [
                `Chào ${host.displayName},`,
                `${player?.displayName ?? 'Một người chơi'} vừa gửi ảnh chuyển khoản cho kèo "${post.courtName}".`,
                'Mở trang kèo để xem ảnh, đối chiếu với tài khoản ngân hàng của bạn, rồi bấm "Đã trả" cho người này.'
            ],
            button: { label: 'Xem kèo', url: `${appUrl()}/keo/${postId}` }
        });
    }
    return getPost(postId);
};

/** Người chơi xóa ảnh chuyển khoản mình đã gửi (gửi nhầm ảnh) */
const removeProof = async (postId, userId, fileName) => {
    const post = await Post.findById(postId).select('participants.user participants.proofs');
    if (!post) {
        throw notFound();
    }
    const me = post.participants.find((p) => String(p.user) === userId);
    if (!me || !me.proofs.includes(fileName)) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh chuyển khoản');
    }
    await Post.updateOne({ _id: postId, 'participants.user': userId }, { $pull: { 'participants.$.proofs': fileName } });
    await removeImage('proofs', fileName);
    return getPost(postId);
};

module.exports = {
    addProof,
    removeProof,
    addBill,
    removeBill,
    setCover,
    setContactPhone,
    updateCosts,
    setAttendance,
    setPaid,
    LIST_LIMIT,
    MY_POSTS_LIMIT,
    listPosts,
    listMyPosts,
    getPost,
    createPost,
    joinPost,
    leavePost,
    cancelPost
};
