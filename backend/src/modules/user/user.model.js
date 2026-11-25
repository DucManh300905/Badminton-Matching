const mongoose = require('mongoose');
const { GENDERS, TAB_BAR_ITEMS, TAB_BAR_SIZE } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');
const { BANK_BINS } = require('../../utils/banks');
const { publicUrl } = require('../../utils/images');

// Tài khoản nhận tiền chuyển khoản (WBS 4.8.1). Tùy chọn, người dùng tự nhập / xóa;
// chỉ người đã tham gia kèo của chủ tài khoản mới thấy (BR-15).
const bankAccountSchema = new mongoose.Schema(
    {
        bankBin: { type: String, enum: BANK_BINS, required: true },
        accountNumber: { type: String, required: true, match: /^\d{6,19}$/ },
        // In hoa, không dấu: giống tên hiện trong ứng dụng ngân hàng
        accountName: { type: String, required: true, match: /^[A-Z ]{2,50}$/ }
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },
        // Hash bcrypt. Không bao giờ trả ra ngoài: select: false + plugin toJSON xóa trường này
        password: {
            type: String,
            required: true,
            select: false
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },
        // Dùng để xếp vào đúng chỗ trống của kèo (BR-10)
        gender: {
            type: String,
            enum: GENDERS,
            required: true
        },
        // Dùng để kiểm tra khoảng trình độ của kèo (BR-09)
        level: {
            type: String,
            enum: SKILL_LEVELS,
            required: true
        },
        // Tăng 1 mỗi lần đổi mật khẩu. JWT mang số phiên bản lúc được cấp;
        // khác số hiện tại → token cũ hết hiệu lực ngay (không phụ thuộc đồng hồ như so thời gian).
        tokenVersion: {
            type: Number,
            default: 0,
            select: false
        },
        passwordChangedAt: {
            type: Date
        },
        bankAccount: {
            type: bankAccountSchema,
            default: undefined
        },
        // Tên file ảnh đại diện (WBS 4.9); null = dùng chữ cái đầu
        avatar: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// Thanh dưới trên điện thoại (WBS 4.12): 3 tiện ích người dùng chọn; null = mặc định
userSchema.add({
    tabBar: {
        type: [String],
        default: undefined,
        validate: {
            validator: (v) =>
                v == null ||
                (v.length === TAB_BAR_SIZE && new Set(v).size === v.length && v.every((k) => TAB_BAR_ITEMS.includes(k))),
            message: 'Thanh dưới cần đúng 3 tiện ích khác nhau'
        }
    }
});

// Đường dẫn ảnh đại diện trả cho client (plugin toJSON bật virtuals)
userSchema.virtual('avatarUrl').get(function avatarUrl() {
    return publicUrl('avatars', this.avatar);
});

module.exports = mongoose.model('User', userSchema);
