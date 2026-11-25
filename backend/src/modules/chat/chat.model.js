// Nhắn tin trong app (WBS 4.13).
// Mỗi cuộc trò chuyện có một khóa (key):
//   p-<postId>        nhóm chat của một kèo (chủ kèo + người tham gia)
//   d-<userA>-<userB> nhắn riêng giữa hai người đã cùng ở trong một kèo (hai id xếp tăng dần)
const mongoose = require('mongoose');

const MAX_TEXT = 1000;

const { ObjectId } = mongoose.Schema.Types;

// Một cuộc trò chuyện: tạo khi có tin đầu tiên; giữ tin cuối để hiện danh sách nhanh
const conversationSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        kind: { type: String, enum: ['post', 'direct'], required: true },
        post: { type: ObjectId, ref: 'Post', default: undefined },
        // Chỉ nhắn riêng: đúng 2 người
        members: { type: [ObjectId], default: undefined },
        lastMessage: {
            text: String,
            sender: ObjectId,
            at: Date
        }
    },
    { timestamps: true }
);
conversationSchema.index({ members: 1 });
conversationSchema.index({ post: 1 });

const messageSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        sender: { type: ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, trim: true, minlength: 1, maxlength: MAX_TEXT }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);
// Đọc tin mới nhất trước của một cuộc trò chuyện
messageSchema.index({ key: 1, createdAt: -1 });

// Lần cuối mỗi người mở một cuộc trò chuyện → tính "chưa đọc"
const chatReadSchema = new mongoose.Schema({
    user: { type: ObjectId, required: true },
    key: { type: String, required: true },
    at: { type: Date, required: true }
});
chatReadSchema.index({ user: 1, key: 1 }, { unique: true });

// Chặn nhắn riêng: blocker không nhận tin riêng từ blocked (và ngược lại không nhắn được cho nhau)
const blockSchema = new mongoose.Schema(
    {
        blocker: { type: ObjectId, required: true },
        blocked: { type: ObjectId, required: true }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = {
    MAX_TEXT,
    Conversation: mongoose.model('Conversation', conversationSchema),
    Message: mongoose.model('Message', messageSchema),
    ChatRead: mongoose.model('ChatRead', chatReadSchema),
    Block: mongoose.model('Block', blockSchema)
};
