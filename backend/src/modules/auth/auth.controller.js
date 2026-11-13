const bcrypt = require('bcryptjs');

const User = require('../user/user.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, BCRYPT_ROUNDS } = require('./auth.service');

// Hash giả để khi email không tồn tại vẫn tốn thời gian bcrypt như bình thường
// → không đo được thời gian phản hồi để dò email nào đã đăng ký.
const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', BCRYPT_ROUNDS);

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');

// POST /api/auth/register — tạo tài khoản và đăng nhập luôn
const register = asyncHandler(async (req, res) => {
    // Chỉ lấy đúng các trường cho phép (không cho client tự đặt tokenVersion…)
    const { email, password, displayName, gender, level } = req.body;

    // Email trùng → lỗi unique 11000 → errorHandler trả 409 DUPLICATE (an toàn cả khi 2 request đến cùng lúc)
    const user = await User.create({
        email,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        displayName,
        gender,
        level
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

module.exports = {
    register,
    login,
    changePassword
};
