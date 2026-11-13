const mongoose = require('mongoose');
const { GENDERS } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');

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
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
