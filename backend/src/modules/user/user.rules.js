// Rule express-validator cho các trường của người dùng (dùng chung cho auth và user).
// Mỗi hàm trả về chain MỚI (chain của express-validator không được dùng lại giữa các route).
const { body } = require('express-validator');
const { GENDERS } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');
const { BANK_BINS } = require('../../utils/banks');
const { toBankText } = require('../../utils/vietqr');

const emailRule = () =>
    body('email')
        .isString()
        .withMessage('Email không hợp lệ')
        .bail()
        .trim()
        .toLowerCase()
        .isEmail()
        .withMessage('Email không hợp lệ')
        .isLength({ max: 254 })
        .withMessage('Email quá dài');

/** @param {{ optional?: boolean }} [options] */
const displayNameRule = ({ optional = false } = {}) => {
    const chain = body('displayName');
    return (optional ? chain.optional() : chain)
        .isString()
        .withMessage('Tên hiển thị tối thiểu 2 ký tự')
        .bail()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tên hiển thị từ 2 đến 50 ký tự');
};

/** @param {{ optional?: boolean }} [options] */
const genderRule = ({ optional = false } = {}) => {
    const chain = body('gender');
    return (optional ? chain.optional() : chain).isIn(GENDERS).withMessage('Giới tính không hợp lệ');
};

/** @param {{ optional?: boolean }} [options] */
const levelRule = ({ optional = false } = {}) => {
    const chain = body('level');
    return (optional ? chain.optional() : chain).isIn(SKILL_LEVELS).withMessage('Trình độ không hợp lệ');
};

/** Tài khoản nhận tiền: số tài khoản bỏ khoảng trắng, tên đổi sang in hoa không dấu */
const bankAccountRules = () => [
    body('bankBin').isIn(BANK_BINS).withMessage('Chọn ngân hàng trong danh sách'),
    body('accountNumber')
        .isString()
        .withMessage('Số tài khoản chỉ gồm 6 đến 19 chữ số')
        .bail()
        .customSanitizer((value) => value.replace(/[\s.-]/g, ''))
        .matches(/^\d{6,19}$/)
        .withMessage('Số tài khoản chỉ gồm 6 đến 19 chữ số'),
    body('accountName')
        .isString()
        .withMessage('Tên chủ tài khoản từ 2 đến 50 chữ cái')
        .bail()
        .customSanitizer((value) => toBankText(value).replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim())
        .matches(/^[A-Z ]{2,50}$/)
        .withMessage('Tên chủ tài khoản từ 2 đến 50 chữ cái')
];

module.exports = {
    emailRule,
    displayNameRule,
    genderRule,
    levelRule,
    bankAccountRules
};
