// Nhắn tin trong app (WBS 4.13) — quyền truy cập và đọc / ghi tin.
//
// Quy tắc (đã chốt):
//  - Chỉ người "đã kết nối" mới nhắn được: đã cùng ở trong một kèo (chủ kèo hoặc người tham gia).
//    Người rời kèo trước giờ chơi mất quyền vào nhóm của kèo đó.
//  - Nhóm chat của kèo mở tới 2 giờ sau giờ kết thúc; sau đó chỉ xem lại (Lịch sử).
//  - Nhắn riêng gửi được khi hai người đang cùng một kèo còn trong thời hạn trên và không ai chặn ai;
//    ngoài thời hạn chỉ xem lại tin cũ.
//  - Chỉ gửi chữ, tối đa 1.000 ký tự, tối đa 20 tin / phút / người.
const mongoose = require('mongoose');

const Post = require('../post/post.model');
const User = require('../user/user.model');
const { Conversation, Message, ChatRead, Block, MAX_TEXT } = require('./chat.model');
const hub = require('./chat.hub');
const AppError = require('../../utils/AppError');
const { publicUrl } = require('../../utils/images');

const OPEN_AFTER_END_MS = 2 * 3600 * 1000;
const PAGE = 50;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const notFound = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy cuộc trò chuyện');
const isId = (s) => mongoose.isValidObjectId(s) && /^[a-f0-9]{24}$/i.test(s);

const postKey = (postId) => `p-${postId}`;
const directKey = (a, b) => `d-${[String(a), String(b)].sort().join('-')}`;

/** Phân tích khóa; sai dạng → 404 */
const parseKey = (key) => {
    let m = /^p-([a-f0-9]{24})$/i.exec(key ?? '');
    if (m) return { kind: 'post', postId: m[1] };
    m = /^d-([a-f0-9]{24})-([a-f0-9]{24})$/i.exec(key ?? '');
    if (m && m[1] < m[2]) return { kind: 'direct', ids: [m[1], m[2]] };
    throw notFound();
};

const openUntilOf = (endsAt) => new Date(endsAt.getTime() + OPEN_AFTER_END_MS);

const memberIdsOf = (post) => [String(post.author?._id ?? post.author), ...post.participants.map((p) => String(p.user?._id ?? p.user))];

const publicUser = (u) => ({
    id: String(u?._id ?? u),
    displayName: u?.displayName ?? 'Người dùng đã xóa',
    avatarUrl: publicUrl('avatars', u?.avatar)
});

/** Các kèo cả hai người cùng ở trong (một người là chủ kèo hoặc cả hai cùng tham gia) */
const sharedPosts = (a, b) =>
    Post.find({
        $or: [
            { author: a, 'participants.user': b },
            { author: b, 'participants.user': a },
            { 'participants.user': { $all: [a, b] } }
        ]
    }).select('endsAt author status contactPhone');

/**
 * Số điện thoại của người kia trong chat riêng (WBS 4.16): chỉ khi hai người còn chung một kèo chưa hủy,
 * chưa quá 2 giờ sau giờ kết thúc. Người kia là chủ kèo của kèo đó và đã đặt số liên hệ riêng → dùng số đó.
 */
const phoneInChat = (posts, other, otherId, now) => {
    const active = posts
        .filter((p) => p.status !== 'closed' && now <= openUntilOf(p.endsAt))
        .sort((x, y) => x.endsAt - y.endsAt);
    if (active.length === 0) return null;
    const hosted = active.find((p) => String(p.author) === otherId && p.contactPhone !== undefined);
    return hosted ? hosted.contactPhone : other?.phone ?? null;
};

const isBlocked = async (a, b) =>
    !!(await Block.exists({
        $or: [
            { blocker: a, blocked: b },
            { blocker: b, blocked: a }
        ]
    }));

/**
 * Quyền của `userId` với một cuộc trò chuyện. Không được xem → 404 / 403.
 * @returns {Promise<{ key, kind, members: string[], canSend: boolean, openUntil: Date | null, reason: string | null,
 *   post?: any, other?: any, blockedByMe?: boolean }>}
 */
const access = async (key, userId, now) => {
    const k = parseKey(key);

    if (k.kind === 'post') {
        const post = await Post.findById(k.postId).select('author participants.user courtName district startsAt endsAt status cover');
        if (!post) throw notFound();
        const members = memberIdsOf(post);
        if (!members.includes(userId)) throw new AppError(403, 'NOT_CONNECTED', 'Bạn không ở trong kèo này');
        const openUntil = openUntilOf(post.endsAt);
        const open = now <= openUntil;
        return {
            key,
            kind: 'post',
            members,
            post,
            canSend: open,
            openUntil,
            reason: open ? null : 'Kèo đã kết thúc quá 2 giờ, chỉ xem lại được'
        };
    }

    const [a, b] = k.ids;
    if (userId !== a && userId !== b) throw notFound();
    const otherId = userId === a ? b : a;
    const posts = await sharedPosts(a, b);
    if (posts.length === 0) throw new AppError(403, 'NOT_CONNECTED', 'Chỉ nhắn được cho người đã cùng chơi một kèo');
    const other = await User.findById(otherId).select('displayName avatar phone');
    const openUntil = openUntilOf(new Date(Math.max(...posts.map((p) => p.endsAt.getTime()))));
    const blockedByMe = !!(await Block.exists({ blocker: userId, blocked: otherId }));
    const blocked = blockedByMe || (await isBlocked(userId, otherId));
    const open = now <= openUntil;
    return {
        key,
        kind: 'direct',
        members: [a, b],
        other: { ...publicUser(other ?? otherId), phone: blocked ? null : phoneInChat(posts, other, otherId, now) },
        canSend: open && !blocked,
        openUntil,
        blockedByMe,
        reason: blocked
            ? blockedByMe
                ? 'Bạn đã chặn người này'
                : 'Không thể nhắn cho người này'
            : open
              ? null
              : 'Đã quá 2 giờ sau kèo chung gần nhất, chỉ xem lại được'
    };
};

/** Thông tin hiển thị của cuộc trò chuyện */
const metaOf = (a) =>
    a.kind === 'post'
        ? {
              key: a.key,
              kind: 'post',
              title: a.post.courtName,
              subtitle: a.post.district,
              postId: String(a.post._id),
              startsAt: a.post.startsAt,
              coverUrl: publicUrl('covers', a.post.cover),
              canSend: a.canSend,
              openUntil: a.openUntil,
              reason: a.reason
          }
        : {
              key: a.key,
              kind: 'direct',
              title: a.other.displayName,
              subtitle: 'Nhắn riêng',
              other: a.other,
              blockedByMe: a.blockedByMe,
              canSend: a.canSend,
              openUntil: a.openUntil,
              reason: a.reason
          };

const toMessage = (m, sender) => ({
    id: String(m._id),
    text: m.text,
    at: m.createdAt,
    sender: publicUser(sender ?? m.sender)
});

/**
 * Mở một cuộc trò chuyện: thông tin, thành viên (nhóm), tin nhắn (mới nhất 50, cũ → mới).
 * @param {string} key
 * @param {string} userId
 * @param {{ before?: string }} query  before = ISO: lấy các tin cũ hơn
 * @param {Date} now
 */
const open = async (key, userId, { before } = {}, now) => {
    const a = await access(key, userId, now);
    const filter = { key };
    if (before) {
        const d = new Date(before);
        if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
    }
    const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(PAGE + 1).populate('sender', 'displayName avatar');
    const hasMore = rows.length > PAGE;
    const messages = rows.slice(0, PAGE).reverse().map((m) => toMessage(m));

    let members;
    if (a.kind === 'post') {
        const users = await User.find({ _id: { $in: a.members } }).select('displayName avatar');
        const byId = new Map(users.map((u) => [String(u._id), u]));
        members = a.members.map((id) => ({ ...publicUser(byId.get(id) ?? id), isHost: id === a.members[0] }));
    }
    return { conversation: metaOf(a), members, messages, hasMore };
};

// Giới hạn tốc độ gửi: userId → các mốc thời gian gửi trong 1 phút gần nhất (một tiến trình PM2)
const sentAt = new Map();
const rateLimited = (userId, now) => {
    const t = now.getTime();
    const recent = (sentAt.get(userId) ?? []).filter((x) => t - x < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) {
        sentAt.set(userId, recent);
        return true;
    }
    recent.push(t);
    sentAt.set(userId, recent);
    return false;
};

/** Gửi tin; đẩy ngay tới các thành viên đang mở app */
const send = async (key, userId, text, now) => {
    const a = await access(key, userId, now);
    if (!a.canSend) throw new AppError(409, 'CHAT_CLOSED', a.reason ?? 'Không gửi được tin nhắn');
    const clean = typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim() : '';
    if (!clean || clean.length > MAX_TEXT) {
        throw new AppError(400, 'VALIDATION_ERROR', `Tin nhắn từ 1 đến ${MAX_TEXT} ký tự`, [
            { field: 'text', msg: `Tin nhắn từ 1 đến ${MAX_TEXT} ký tự` }
        ]);
    }
    if (rateLimited(userId, now)) {
        throw new AppError(429, 'RATE_LIMITED', 'Bạn gửi quá nhanh, vui lòng đợi một chút');
    }

    const msg = await Message.create({ key, sender: userId, text: clean });
    await Conversation.updateOne(
        { key },
        {
            $set: { lastMessage: { text: clean.slice(0, 200), sender: userId, at: msg.createdAt } },
            $setOnInsert:
                a.kind === 'post'
                    ? { key, kind: 'post', post: a.post._id }
                    : { key, kind: 'direct', members: a.members.map((id) => new mongoose.Types.ObjectId(id)) }
        },
        { upsert: true }
    );
    await markRead(key, userId, msg.createdAt);

    const sender = await User.findById(userId).select('displayName avatar');
    const message = toMessage(msg, sender);
    hub.notify(a.members, { type: 'message', key, message });
    return message;
};

/** Đánh dấu đã đọc tới thời điểm `at` */
const markRead = (key, userId, at) =>
    ChatRead.updateOne({ user: userId, key }, { $max: { at } }, { upsert: true });

const read = async (key, userId, now) => {
    await access(key, userId, now);
    await markRead(key, userId, now);
};

/**
 * Danh sách cuộc trò chuyện của tôi, mới nhất trước:
 * nhóm của mọi kèo tôi đang ở trong (kể cả chưa có tin, nếu còn mở) + các cuộc nhắn riêng đã có tin.
 */
const list = async (userId, now) => {
    const uid = new mongoose.Types.ObjectId(userId);
    const posts = await Post.find({ $or: [{ author: uid }, { 'participants.user': uid }] })
        .select('courtName district startsAt endsAt cover')
        .sort({ startsAt: -1 })
        .limit(100);
    const postConvs = await Conversation.find({ kind: 'post', post: { $in: posts.map((p) => p._id) } });
    const byPost = new Map(postConvs.map((c) => [String(c.post), c]));
    const directs = await Conversation.find({ kind: 'direct', members: uid });
    const reads = new Map(
        (await ChatRead.find({ user: uid, key: { $in: [...postConvs, ...directs].map((c) => c.key) } })).map((r) => [r.key, r.at])
    );

    const hasUnread = (c) =>
        !!c?.lastMessage?.at && String(c.lastMessage.sender) !== userId && !(reads.get(c.key) >= c.lastMessage.at);

    // Số tin chưa xem của từng cuộc: tin của người khác mới hơn lần đọc cuối (một lần truy vấn cho mọi cuộc)
    const pending = [...postConvs, ...directs].filter(hasUnread);
    const counts = new Map();
    if (pending.length > 0) {
        const rows = await Message.aggregate([
            {
                $match: {
                    sender: { $ne: uid },
                    $or: pending.map((c) => ({ key: c.key, createdAt: { $gt: reads.get(c.key) ?? new Date(0) } }))
                }
            },
            { $group: { _id: '$key', n: { $sum: 1 } } }
        ]);
        for (const r of rows) counts.set(r._id, r.n);
    }
    const unreadOf = (c) => (c && hasUnread(c) ? (counts.get(c.key) ?? 1) : 0);
    const lastOf = (c) =>
        c?.lastMessage?.at ? { text: c.lastMessage.text, at: c.lastMessage.at, mine: String(c.lastMessage.sender) === userId } : null;

    const items = [];
    for (const p of posts) {
        const c = byPost.get(String(p._id));
        const openUntil = openUntilOf(p.endsAt);
        if (!c && now > openUntil) continue; // kèo cũ chưa ai nhắn: không cần hiện
        items.push({
            key: postKey(p._id),
            kind: 'post',
            title: p.courtName,
            subtitle: p.district,
            postId: String(p._id),
            startsAt: p.startsAt,
            coverUrl: publicUrl('covers', p.cover),
            canSend: now <= openUntil,
            lastMessage: lastOf(c),
            unread: unreadOf(c),
            sortAt: c?.lastMessage?.at ?? p.startsAt
        });
    }

    const otherIds = directs.map((c) => c.members.map(String).find((id) => id !== userId));
    const others = new Map((await User.find({ _id: { $in: otherIds } }).select('displayName avatar')).map((u) => [String(u._id), u]));
    for (const [i, c] of directs.entries()) {
        const other = others.get(otherIds[i]);
        items.push({
            key: c.key,
            kind: 'direct',
            title: other?.displayName ?? 'Người dùng đã xóa',
            subtitle: 'Nhắn riêng',
            other: publicUser(other ?? otherIds[i]),
            lastMessage: lastOf(c),
            unread: unreadOf(c),
            sortAt: c.lastMessage.at
        });
    }

    // Cuộc có tin trước (mới nhất ở trên); nhóm chưa có tin sau (kèo gần nhất ở trên)
    items.sort((x, y) => {
        if (!!x.lastMessage !== !!y.lastMessage) return x.lastMessage ? -1 : 1;
        const tx = new Date(x.sortAt).getTime();
        const ty = new Date(y.sortAt).getTime();
        return x.lastMessage ? ty - tx : tx - ty;
    });
    return items.map(({ sortAt, ...rest }) => rest);
};

/** Tin chưa xem: tổng số tin và số cuộc trò chuyện có tin chưa xem (số đỏ ở "Lịch sử") */
const unreadCount = async (userId, now) => {
    const items = await list(userId, now);
    return {
        count: items.reduce((sum, c) => sum + c.unread, 0),
        conversations: items.filter((c) => c.unread > 0).length
    };
};

/** Khóa nhắn riêng với một người; chỉ cho người đã cùng chơi */
const directKeyWith = async (userId, otherId) => {
    if (!isId(otherId) || otherId === userId) throw notFound();
    const posts = await sharedPosts(userId, otherId);
    if (posts.length === 0) throw new AppError(403, 'NOT_CONNECTED', 'Chỉ nhắn được cho người đã cùng chơi một kèo');
    return directKey(userId, otherId);
};

const block = async (userId, otherId) => {
    if (!isId(otherId) || otherId === userId) throw notFound();
    await Block.updateOne({ blocker: userId, blocked: otherId }, { $setOnInsert: { blocker: userId, blocked: otherId } }, { upsert: true });
};

const unblock = async (userId, otherId) => {
    if (!isId(otherId)) throw notFound();
    await Block.deleteOne({ blocker: userId, blocked: otherId });
};

module.exports = {
    OPEN_AFTER_END_MS,
    PAGE,
    RATE_LIMIT,
    postKey,
    directKey,
    parseKey,
    list,
    unreadCount,
    open,
    send,
    read,
    directKeyWith,
    block,
    unblock,
    _resetRateLimit: () => sentAt.clear()
};
