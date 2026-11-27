const express = require('express');
const { body } = require('express-validator');

const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
    loginLimiter,
    registerLimiter,
    changePasswordLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter
} = require('../../middlewares/rateLimit.middleware');
const { register, login, changePassword, forgotPassword, resetPassword } = require('./auth.controller');
const { emailRule, displayNameRule, genderRule, levelRule, phoneRule } = require('../user/user.rules');
const { passwordError } = require('../../utils/passwordPolicy');

const router = express.Router();

/** Mật khẩu MỚI phải theo chính sách (đăng ký, đổi mật khẩu) */
const newPasswordRule = (field) =>
    body(field).custom((value) => {
        const error = passwordError(value);
        if (error) {
            throw new Error(error);
        }
        return true;
    });

router.post(
    '/register',
    registerLimiter,
    [emailRule(), newPasswordRule('password'), displayNameRule(), genderRule(), levelRule(), phoneRule()],
    validate,
    register
);

router.post(
    '/login',
    loginLimiter,
    [emailRule(), body('password').isString().withMessage('Vui lòng nhập mật khẩu').bail().notEmpty().withMessage('Vui lòng nhập mật khẩu')],
    validate,
    login
);

router.put(
    '/change-password',
    authenticate,
    changePasswordLimiter,
    [
        body('currentPassword').isString().withMessage('Vui lòng nhập mật khẩu hiện tại').bail().notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại'),
        newPasswordRule('newPassword')
    ],
    validate,
    changePassword
);

// Quên mật khẩu (WBS 4.14)
router.post('/forgot-password', forgotPasswordLimiter, [emailRule()], validate, forgotPassword);
router.post(
    '/reset-password',
    resetPasswordLimiter,
    [
        body('token')
            .isString()
            .matches(/^[a-f0-9]{64}$/)
            .withMessage('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'),
        newPasswordRule('password')
    ],
    validate,
    resetPassword
);

module.exports = router;
