// Rule express-validator cho các trường của người dùng (dùng chung cho auth và user).
// Mỗi hàm trả về chain MỚI (chain của express-validator không được dùng lại giữa các route).
const { body } = require('express-validator');
const { GENDERS } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');

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

module.exports = {
    emailRule,
    displayNameRule,
    genderRule,
    levelRule
};
