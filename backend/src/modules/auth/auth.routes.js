const express = require('express');
const { body } = require('express-validator');

const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { loginLimiter, registerLimiter, changePasswordLimiter } = require('../../middlewares/rateLimit.middleware');
const { register, login, changePassword } = require('./auth.controller');
const { emailRule, displayNameRule, genderRule, levelRule } = require('../user/user.rules');
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
    [emailRule(), newPasswordRule('password'), displayNameRule(), genderRule(), levelRule()],
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

module.exports = router;
