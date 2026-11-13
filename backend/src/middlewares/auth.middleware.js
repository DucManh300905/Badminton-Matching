const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const AppError = require('../utils/AppError');

const tokenExpired = () => new AppError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn');

/**
 * Giải mã JWT và đọc lại user trong DB (không tin dữ liệu trong token).
 * Tài khoản đã bị xóa / đã đổi mật khẩu sau khi cấp token → mất hiệu lực ngay.
 * @param {string} token
 * @returns {Promise<{ userId: string, gender: string, level: string }>}
 * @throws AppError 401 TOKEN_EXPIRED
 */
const verifyToken = async (token) => {
    let decoded;

    try {
        // Chỉ chấp nhận đúng thuật toán đã ký, chặn kiểu tấn công đổi "alg"
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        throw tokenExpired();
    }

    const user = await User.findById(decoded.userId).select('gender level +tokenVersion').lean();

    if (!user || (user.tokenVersion ?? 0) !== decoded.v) {
        throw tokenExpired();
    }

    return {
        userId: String(user._id),
        gender: user.gender,
        level: user.level
    };
};

/** Bắt buộc đăng nhập: gắn req.user = { userId, gender, level } */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
        });
    }

    try {
        req.user = await verifyToken(authHeader.split(' ')[1]);
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    verifyToken
};
