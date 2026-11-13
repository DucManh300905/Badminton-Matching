const jwt = require('jsonwebtoken');

// Người chơi chỉ vào app vài lần mỗi tuần để tìm kèo → 7 ngày, tránh bắt đăng nhập lại liên tục. Không có refresh token.
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 10;

/**
 * Ký JWT cho người dùng. `v` = tokenVersion hiện tại (đổi mật khẩu → tăng → token cũ hết hiệu lực).
 * @param {{ _id: unknown, tokenVersion?: number }} user
 */
const signToken = (user) =>
    jwt.sign({ userId: String(user._id), v: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
        expiresIn: TOKEN_TTL
    });

module.exports = {
    TOKEN_TTL,
    BCRYPT_ROUNDS,
    signToken
};
