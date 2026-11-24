const User = require('./user.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

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

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: changes }, { returnDocument: 'after', runValidators: true });
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

// DELETE /api/users/me/bank-account
const deleteBankAccount = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user.userId, { $unset: { bankAccount: 1 } }, { returnDocument: 'after' });
    if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    res.json({ success: true, message: 'Đã xóa tài khoản nhận tiền', data: user });
});

module.exports = {
    getMe,
    updateMe,
    setBankAccount,
    deleteBankAccount
};
