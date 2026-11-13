const { rateLimit } = require('express-rate-limit');

// Chống dò mật khẩu / spam tạo tài khoản. Đếm theo IP:
// chạy sau proxy thì phải đặt TRUST_PROXY=1 trong .env, nếu không mọi người dùng chung IP của proxy.
// AUTH_RATE_LIMIT ghi đè số lần cho phép (test đặt số lớn để không bị chặn).

const MINUTE = 60 * 1000;
const override = () => Number(process.env.AUTH_RATE_LIMIT) || 0;

const tooMany = (req, res) =>
    res.status(429).json({
        success: false,
        message: 'Thử quá nhiều lần, vui lòng thử lại sau',
        code: 'RATE_LIMITED'
    });

/**
 * @param {{ windowMs: number, limit: number, onlyFailures?: boolean }} options
 */
const limiter = ({ windowMs, limit, onlyFailures = false }) =>
    rateLimit({
        windowMs,
        limit: override() || limit,
        // Chỉ đếm lần thất bại: người dùng đăng nhập đúng không bị chặn
        skipSuccessfulRequests: onlyFailures,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: tooMany
    });

// Đăng nhập sai quá 10 lần / 15 phút / IP
const loginLimiter = limiter({ windowMs: 15 * MINUTE, limit: 10, onlyFailures: true });
// Tạo quá 10 tài khoản / giờ / IP
const registerLimiter = limiter({ windowMs: 60 * MINUTE, limit: 10 });
// Đổi mật khẩu sai quá 5 lần / 15 phút / IP
const changePasswordLimiter = limiter({ windowMs: 15 * MINUTE, limit: 5, onlyFailures: true });

module.exports = {
    limiter,
    loginLimiter,
    registerLimiter,
    changePasswordLimiter
};
