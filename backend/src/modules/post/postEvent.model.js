const mongoose = require('mongoose');

// ── Nhật ký sự kiện của kèo (US-22, WBS 6.3) ──
// Số liệu cho RQ1–RQ3: ai tham gia / rời lúc nào, kèo đủ người lần đầu khi nào, chi phí sửa bao nhiêu lần,
// đánh dấu đã trả sau bao lâu. Trạng thái hiện tại của kèo không giữ được những điều này (người rời bị xóa,
// đánh dấu lại thì mất lần đầu). Chỉ lưu mã và số, KHÔNG có tên, email, số điện thoại, nội dung tin nhắn.
// Luôn ghi trong cùng transaction với thao tác chính.

const EVENT_TYPES = /** @type {const} */ ([
    'created',
    'join',
    'leave',
    'full',
    'reopen',
    'cancel',
    'costs_saved',
    'paid',
    'unpaid',
    'proof',
    'attendance'
]);

const postEventSchema = new mongoose.Schema(
    {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
        // Người liên quan (người tham gia / rời, người được đánh dấu…); null với sự kiện của cả kèo (full, reopen)
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        type: { type: String, enum: EVENT_TYPES, required: true },
        at: { type: Date, required: true },
        // Thông tin phụ theo loại: slot (join / leave), amount (paid), total / expenses / notAll (costs_saved),
        // attended (attendance), slots (created)
        meta: { type: mongoose.Schema.Types.Mixed, default: undefined }
    },
    { versionKey: false }
);

postEventSchema.index({ post: 1, at: 1 });
postEventSchema.index({ at: 1 });

const PostEvent = mongoose.model('PostEvent', postEventSchema);

/**
 * Ghi các sự kiện (bỏ qua nếu rỗng).
 * @param {{ post: unknown, user?: unknown, type: typeof EVENT_TYPES[number], at: Date, meta?: object }[]} events
 * @param {mongoose.ClientSession} [session]
 */
const logEvents = async (events, session) => {
    if (events.length === 0) return;
    await PostEvent.insertMany(events, { session });
};

module.exports = { PostEvent, EVENT_TYPES, logEvents };
