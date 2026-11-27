const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../user/user.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, BCRYPT_ROUNDS } = require('./auth.service');
const { sendMail } = require('../../utils/mailer');

// Hash giả để khi email không tồn tại vẫn tốn thời gian bcrypt như bình thường
// → không đo được thời gian phản hồi để dò email nào đã đăng ký.
const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', BCRYPT_ROUNDS);

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');

// POST /api/auth/register — tạo tài khoản và đăng nhập luôn
const register = asyncHandler(async (req, res) => {
    // Chỉ lấy đúng các trường cho phép (không cho client tự đặt tokenVersion…)
    const { email, password, displayName, gender, level, phone } = req.body;

    // Email trùng → lỗi unique 11000 → errorHandler trả 409 DUPLICATE (an toàn cả khi 2 request đến cùng lúc)
    const user = await User.create({
        email,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        displayName,
        gender,
        level,
        ...(phone && { phone })
    });

    res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: { token: signToken(user), user }
    });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +tokenVersion');

    // Sai email và sai mật khẩu trả CÙNG một lỗi → không lộ email nào đã đăng ký
    const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !ok) {
        throw invalidCredentials();
    }

    res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: { token: signToken(user), user }
    });
});

// PUT /api/auth/change-password — trả token mới; mọi token cũ hết hiệu lực ngay
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select('+password +tokenVersion');

    if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new AppError(400, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không đúng', [
            { field: 'currentPassword', msg: 'Mật khẩu hiện tại không đúng' }
        ]);
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
        success: true,
        message: 'Đổi mật khẩu thành công',
        data: { token: signToken(user) }
    });
});

// ── Quên mật khẩu bằng mã OTP 4 số qua email (WBS 4.14) ──

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
// Cùng một email: chỉ gửi lại mã sau 60 giây (chống bấm liên tục / gửi thư hàng loạt)
const RESEND_GAP_MS = 60 * 1000;

/** Mã băm gắn với từng tài khoản và khóa bí mật của máy chủ: lộ CSDL cũng không tra ngược được bằng bảng có sẵn */
const hashCode = (userId, code) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');

const sameHash = (a, b) => !!a && !!b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const invalidCode = () => new AppError(400, 'INVALID_RESET_CODE', 'Mã không đúng hoặc đã hết hạn');

// POST /api/auth/forgot-password — gửi mã 4 số; luôn trả cùng một câu, không cho biết email có tồn tại hay không
const forgotPassword = asyncHandler(async (req, res) => {
    const now = new Date();
    const user = await User.findOne({ email: req.body.email }).select('+resetRequestedAt');

    if (user && !(user.resetRequestedAt && now - user.resetRequestedAt < RESEND_GAP_MS)) {
        const code = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetCodeHash: hashCode(user._id, code),
                    resetCodeExpires: new Date(now.getTime() + CODE_TTL_MS),
                    resetAttempts: 0,
                    resetRequestedAt: now
                }
            }
        );
        await sendMail({
            to: user.email,
            subject: `Mã đặt lại mật khẩu: ${code}`,
            paragraphs: [
                `Chào ${user.displayName},`,
                `Mã đặt lại mật khẩu Badminton Matching của bạn là: ${code}`,
                'Nhập mã này ở trang "Quên mật khẩu" để đặt mật khẩu mới. Mã có hiệu lực trong 10 phút, chỉ dùng được một lần; nhập sai 5 lần thì mã bị hủy.',
                'Không chia sẻ mã này cho ai. Nếu không phải bạn yêu cầu, hãy bỏ qua thư này, mật khẩu của bạn không thay đổi.'
            ],
            code
        });
    }

    res.json({
        success: true,
        message: 'Nếu email này đã đăng ký, chúng tôi đã gửi mã 4 số. Hãy kiểm tra hộp thư (cả mục Spam).'
    });
});

// POST /api/auth/reset-password — email + mã 4 số + mật khẩu mới; mọi phiên đăng nhập cũ hết hiệu lực
const resetPassword = asyncHandler(async (req, res) => {
    const { email, code, password } = req.body;
    const user = await User.findOne({ email }).select('+resetCodeHash +resetCodeExpires +resetAttempts');

    // Email không tồn tại / chưa yêu cầu mã / mã hết hạn / đã sai quá số lần: cùng một lỗi
    if (!user?.resetCodeHash || !(user.resetCodeExpires > new Date()) || (user.resetAttempts ?? 0) >= MAX_ATTEMPTS) {
        throw invalidCode();
    }

    if (!sameHash(hashCode(user._id, code), user.resetCodeHash)) {
        // Tăng số lần sai ngay trong lệnh ghi (an toàn khi gửi đồng thời); đủ 5 lần thì hủy mã
        const after = await User.findOneAndUpdate(
            { _id: user._id, resetCodeHash: user.resetCodeHash },
            { $inc: { resetAttempts: 1 } },
            { returnDocument: 'after', projection: { resetAttempts: 1 } }
        ).select('+resetAttempts');
        if ((after?.resetAttempts ?? MAX_ATTEMPTS) >= MAX_ATTEMPTS) {
            await User.updateOne(
                { _id: user._id },
                { $unset: { resetCodeHash: 1, resetCodeExpires: 1, resetAttempts: 1 } }
            );
        }
        throw invalidCode();
    }

    // Chỉ một request dùng được mã: điều kiện nằm trong lệnh ghi
    const used = await User.updateOne(
        { _id: user._id, resetCodeHash: user.resetCodeHash },
        {
            $set: { password: await bcrypt.hash(password, BCRYPT_ROUNDS), passwordChangedAt: new Date() },
            $inc: { tokenVersion: 1 },
            $unset: { resetCodeHash: 1, resetCodeExpires: 1, resetAttempts: 1 }
        }
    );
    if (used.modifiedCount === 0) {
        throw invalidCode();
    }

    res.json({ success: true, message: 'Đã đặt mật khẩu mới, vui lòng đăng nhập lại' });
});

module.exports = {
    forgotPassword,
    resetPassword,
    register,
    login,
    changePassword
};
