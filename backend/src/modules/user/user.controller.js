const User = require('./user.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { saveImage, removeImage } = require('../../utils/images');

// Trường người dùng được tự sửa (email đổi qua luồng riêng — chưa có trong MVP)
const EDITABLE_FIELDS = ['displayName', 'gender', 'level'];

// GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, data: user });
});

// PUT /api/users/me — sửa tên, giới tính, trình độ
const updateMe = asyncHandler(async (req, res) => {
    const changes = {};
    for (const field of EDITABLE_FIELDS) {
        if (req.body[field] !== undefined) {
            changes[field] = req.body[field];
        }
    }

    // Số điện thoại: "" (đã chuẩn hóa từ ""/null) = xóa
    const update = { $set: changes };
    if (req.body.phone !== undefined) {
        if (req.body.phone) changes.phone = req.body.phone;
        else update.$unset = { phone: 1 };
    }

    const user = await User.findByIdAndUpdate(req.user.userId, update, { returnDocument: 'after', runValidators: true });
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, message: 'Cập nhật thành công', data: user });
});

// PUT /api/users/me/bank-account — lưu / sửa tài khoản nhận tiền (WBS 4.8.1)
const setBankAccount = asyncHandler(async (req, res) => {
    const { bankBin, accountNumber, accountName } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { bankAccount: { bankBin, accountNumber, accountName } } },
        { returnDocument: 'after', runValidators: true }
    );
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, message: 'Đã lưu tài khoản nhận tiền', data: user });
});

// PUT /api/users/me/tab-bar — chọn 3 tiện ích cho thanh dưới (WBS 4.12); items: null = về mặc định
const setTabBar = asyncHandler(async (req, res) => {
    const { items } = req.body;
    const update = items === null ? { $unset: { tabBar: 1 } } : { $set: { tabBar: items } };
    const user = await User.findByIdAndUpdate(req.user.userId, update, { returnDocument: 'after', runValidators: true });
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, message: 'Đã lưu thanh dưới', data: user });
});

// DELETE /api/users/me/bank-account
const deleteBankAccount = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user.userId, { $unset: { bankAccount: 1 } }, { returnDocument: 'after' });
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, message: 'Đã xóa tài khoản nhận tiền', data: user });
});

// PUT /api/users/me/avatar — tải ảnh đại diện (multipart, trường "image"); ảnh cũ bị xóa
const setAvatar = asyncHandler(async (req, res) => {
    const fileName = await saveImage('avatars', req.file?.buffer);
    const old = await User.findByIdAndUpdate(req.user.userId, { $set: { avatar: fileName } });
    if (!old) {
        await removeImage('avatars', fileName);
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }
    await removeImage('avatars', old.avatar);

    res.json({ success: true, message: 'Đã đổi ảnh đại diện', data: await User.findById(req.user.userId) });
});

// DELETE /api/users/me/avatar
const deleteAvatar = asyncHandler(async (req, res) => {
    const old = await User.findByIdAndUpdate(req.user.userId, { $set: { avatar: null } });
    if (!old) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }
    await removeImage('avatars', old.avatar);

    res.json({ success: true, message: 'Đã xóa ảnh đại diện', data: await User.findById(req.user.userId) });
});

module.exports = {
    setAvatar,
    deleteAvatar,
    getMe,
    updateMe,
    setBankAccount,
    deleteBankAccount,
    setTabBar
};
