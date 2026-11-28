const mongoose = require('mongoose');
const { HANOI_AREAS, POST_STATUSES, SLOT_KINDS } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');
const { MAX_PRICE_PER_PERSON, MAX_TOTAL_SLOTS } = require('./post.rules');
const { VN_MOBILE } = require('../../utils/phone');
const { EXPENSE_KINDS, MAX_EXPENSE, MAX_SHUTTLES, MAX_UNIT_PRICE, MAX_BILLS } = require('./post.costs');

const slotCount = {
    type: Number,
    default: 0,
    min: 0,
    max: MAX_TOTAL_SLOTS,
    validate: { validator: Number.isInteger, message: 'Số chỗ phải là số nguyên' }
};

// Người tham gia nằm NGAY TRONG document kèo: kèo luôn được đọc kèm danh sách này,
// tối đa 20 người nên document không bao giờ lớn; tham gia / rời chỉ cần khóa 1 document.
const participantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Loại chỗ người này đang giữ (BR-10)
        slot: {
            type: String,
            enum: SLOT_KINDS,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        // Lúc chủ kèo đánh dấu người này đã chuyển tiền (BR-14); null = chưa trả
        paidAt: {
            type: Date,
            default: null
        },
        // Số tiền phải trả tại lúc được đánh dấu đã trả (BR-18): so với số hiện tại để biết "còn thiếu" / "trả dư"
        paidAmount: {
            type: Number,
            default: null
        },
        // Điểm danh sau giờ bắt đầu: true có mặt, false vắng, null chưa điểm danh
        attended: {
            type: Boolean,
            default: null
        },
        // Ảnh chuyển khoản người chơi tự gửi (WBS 4.14), tối đa MAX_PROOFS; chủ kèo xem rồi tự đánh dấu đã trả
        proofs: { type: [String], default: [] },
        proofAt: { type: Date, default: null }
    },
    { _id: false }
);

// Bạn của chủ kèo không dùng app: chỉ có tên, vẫn được tính trong phần chia tiền (WBS 4.8.2)
const guestSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 }
});

// Một khoản chi của kèo (BR-17). sharedBy là mã người: "host", "u:<userId>", "g:<guestId>"
const expenseSchema = new mongoose.Schema(
    {
        kind: { type: String, enum: EXPENSE_KINDS, required: true },
        label: { type: String, trim: true, maxlength: 40 },
        amount: {
            type: Number,
            required: true,
            min: 0,
            max: MAX_EXPENSE,
            validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên' }
        },
        // "Chọn tất cả": luôn tính theo danh sách người hiện tại của kèo
        everyone: { type: Boolean, default: false },
        sharedBy: { type: [String], default: [] },
        // Khoản "Cầu" theo số quả (WBS 4.10): amount = số quả × giá mỗi quả, làm tròn lên 1.000đ.
        // shuttle = loại cầu trong kho của chủ kèo (null = nhập giá tay); tên chép lại để vẫn hiện khi loại cầu bị xóa
        quantity: {
            type: Number,
            min: 1,
            max: MAX_SHUTTLES,
            validate: { validator: Number.isInteger, message: 'Số quả phải là số nguyên' }
        },
        unitPrice: { type: Number, min: 0, max: MAX_UNIT_PRICE },
        shuttle: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', default: undefined },
        shuttleName: { type: String, trim: true, maxlength: 40 }
    },
    { _id: false }
);

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        courtName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        district: {
            type: String,
            enum: HANOI_AREAS,
            required: true
        },
        address: {
            type: String,
            trim: true,
            maxlength: 200
        },
        startsAt: {
            type: Date,
            required: true
        },
        endsAt: {
            type: Date,
            required: true
        },
        levelMin: {
            type: String,
            enum: SKILL_LEVELS,
            required: true
        },
        levelMax: {
            type: String,
            enum: SKILL_LEVELS,
            required: true
        },
        // VND / người
        pricePerPerson: {
            type: Number,
            required: true,
            min: 0,
            max: MAX_PRICE_PER_PERSON,
            validate: { validator: Number.isInteger, message: 'Chi phí phải là số nguyên' }
        },
        // Số chỗ CẦN THÊM theo từng loại (không tính chủ kèo)
        slots: {
            male: slotCount,
            female: slotCount,
            any: slotCount
        },
        participants: {
            type: [participantSchema],
            default: []
        },
        status: {
            type: String,
            enum: POST_STATUSES,
            default: 'open'
        },
        note: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        // Số liên hệ của kèo (WBS 4.16): chỉ người trong kèo thấy. Không có trường (kèo cũ) = dùng số trong hồ sơ
        // chủ kèo; null = chủ kèo chọn không để số
        contactPhone: {
            type: String,
            default: undefined,
            validate: { validator: (v) => v === null || VN_MOBILE.test(v), message: 'Số điện thoại không hợp lệ' }
        },
        // Chi phí theo từng khoản (WBS 4.8.2); chỉ chủ kèo sửa (BR-16)
        guests: { type: [guestSchema], default: [] },
        expenses: { type: [expenseSchema], default: [] },
        // Lần sửa chi phí gần nhất (số liệu cho RQ1, RQ2)
        costsUpdatedAt: { type: Date, default: null },
        // Tên file ảnh bìa (WBS 4.9); null = dải màu mặc định
        cover: { type: String, default: null },
        // Ảnh bill / hóa đơn chủ kèo tải lên (WBS 4.11), tối đa MAX_BILLS; chỉ người trong kèo xem được
        bills: {
            type: [String],
            default: [],
            validate: { validator: (v) => v.length <= MAX_BILLS, message: `Tối đa ${MAX_BILLS} ảnh bill` }
        }
    },
    { timestamps: true }
);

// Trang chủ: kèo sắp diễn ra, chưa đóng, theo thời gian (lọc thêm khu vực)
postSchema.index({ status: 1, startsAt: 1 });
postSchema.index({ district: 1, startsAt: 1 });
// "Các kèo tôi đã tham gia"
postSchema.index({ 'participants.user': 1 });

/**
 * Chuyển document sang dạng mà post.rules.js hiểu (id dạng chuỗi).
 * @returns {import('./post.rules').Post}
 */
postSchema.methods.toRules = function toRules() {
    return {
        id: String(this._id),
        authorId: String(this.author?._id ?? this.author),
        courtName: this.courtName,
        startsAt: this.startsAt,
        endsAt: this.endsAt,
        levelMin: this.levelMin,
        levelMax: this.levelMax,
        pricePerPerson: this.pricePerPerson,
        slots: { male: this.slots.male, female: this.slots.female, any: this.slots.any },
        participants: this.participants.map((p) => ({ playerId: String(p.user?._id ?? p.user), slot: p.slot })),
        status: this.status
    };
};

module.exports = mongoose.model('Post', postSchema);
