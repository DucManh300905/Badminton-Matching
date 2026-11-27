const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../user/user.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, BCRYPT_ROUNDS } = require('./auth.service');
const { sendMail, appUrl } = require('../../utils/mailer');

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

// ── Quên mật khẩu (WBS 4.14) ──

const RESET_TTL_MS = 30 * 60 * 1000;
// Cùng một email: chỉ gửi lại thư sau 60 giây (chống bấm liên tục / gửi thư hàng loạt)
const RESEND_GAP_MS = 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// POST /api/auth/forgot-password — luôn trả cùng một câu, không cho biết email có tồn tại hay không
const forgotPassword = asyncHandler(async (req, res) => {
    const now = new Date();
    const user = await User.findOne({ email: req.body.email }).select('+resetRequestedAt');

    if (user && !(user.resetRequestedAt && now - user.resetRequestedAt < RESEND_GAP_MS)) {
        const token = crypto.randomBytes(32).toString('hex');
        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetTokenHash: hashToken(token),
                    resetTokenExpires: new Date(now.getTime() + RESET_TTL_MS),
                    resetRequestedAt: now
                }
            }
        );
        await sendMail({
            to: user.email,
            subject: 'Đặt lại mật khẩu Badminton Matching',
            paragraphs: [
                `Chào ${user.displayName},`,
                'Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu. Bấm nút bên dưới để đặt mật khẩu mới. Link có hiệu lực trong 30 phút và chỉ dùng được một lần.',
                'Nếu không phải bạn yêu cầu, hãy bỏ qua thư này, mật khẩu của bạn không thay đổi.'
            ],
            button: { label: 'Đặt lại mật khẩu', url: `${appUrl()}/dat-lai-mat-khau?token=${token}` }
        });
    }

    res.json({
        success: true,
        message: 'Nếu email này đã đăng ký, chúng tôi đã gửi link đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục Spam).'
    });
});

// POST /api/auth/reset-password — đặt mật khẩu mới bằng link trong thư; mọi phiên đăng nhập cũ hết hiệu lực
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const user = await User.findOne({
        resetTokenHash: hashToken(token),
        resetTokenExpires: { $gt: new Date() }
    }).select('+tokenVersion');

    if (!user) {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    await User.updateOne(
        { _id: user._id },
        {
            $set: { password: await bcrypt.hash(password, BCRYPT_ROUNDS), passwordChangedAt: new Date() },
            $inc: { tokenVersion: 1 },
            $unset: { resetTokenHash: 1, resetTokenExpires: 1 }
        }
    );

    res.json({ success: true, message: 'Đã đặt mật khẩu mới, vui lòng đăng nhập lại' });
});

module.exports = {
    forgotPassword,
    resetPassword,
    register,
    login,
    changePassword
};
