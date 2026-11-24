const express = require('express');
const { body, query } = require('express-validator');

const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { HANOI_AREAS } = require('../../utils/constants');
const { SKILL_LEVELS } = require('../../utils/skillLevel');
const { MAX_PRICE_PER_PERSON, MAX_TOTAL_SLOTS } = require('./post.rules');
const { listPosts, getPost, createPost, joinPost, leavePost, cancelPost, setPaid, updateCosts, setAttendance, setCover, deleteCover } = require('./post.controller');
const { receiveImage } = require('../../utils/images');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const listRules = [
    query('district').optional().isIn(HANOI_AREAS).withMessage('Khu vực không hợp lệ'),
    query('date')
        .optional()
        .matches(DATE_REGEX)
        .withMessage('Ngày phải có dạng YYYY-MM-DD')
        .bail()
        .custom((value) => !Number.isNaN(new Date(`${value}T00:00:00+07:00`).getTime()))
        .withMessage('Ngày không hợp lệ'),
    query('level').optional().isIn(SKILL_LEVELS).withMessage('Trình độ không hợp lệ')
];

const slotRule = (kind) =>
    body(`slots.${kind}`)
        .default(0)
        .isInt({ min: 0, max: MAX_TOTAL_SLOTS })
        .withMessage(`Số chỗ phải là số nguyên từ 0 đến ${MAX_TOTAL_SLOTS}`)
        .toInt();

const createRules = [
    body('courtName')
        .isString()
        .withMessage('Tên sân không được để trống')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Tên sân không được để trống')
        .isLength({ max: 100 })
        .withMessage('Tên sân tối đa 100 ký tự'),
    body('district').isIn(HANOI_AREAS).withMessage('Khu vực không hợp lệ'),
    body('address').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }).withMessage('Địa chỉ tối đa 200 ký tự'),
    body('startsAt').isISO8601().withMessage('Giờ bắt đầu không hợp lệ').bail().toDate(),
    body('endsAt').isISO8601().withMessage('Giờ kết thúc không hợp lệ').bail().toDate(),
    body('levelMin').isIn(SKILL_LEVELS).withMessage('Trình độ không hợp lệ'),
    body('levelMax').isIn(SKILL_LEVELS).withMessage('Trình độ không hợp lệ'),
    body('pricePerPerson')
        .isInt({ min: 0, max: MAX_PRICE_PER_PERSON })
        .withMessage(`Chi phí phải là số nguyên từ 0 đến ${MAX_PRICE_PER_PERSON.toLocaleString('vi-VN')}đ`)
        .toInt(),
    slotRule('male'),
    slotRule('female'),
    slotRule('any'),
    body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự')
];

// :id sai định dạng ObjectId → Mongoose báo CastError → errorHandler trả 404 NOT_FOUND
router.get('/', listRules, validate, listPosts);
// Có token thì người trong kèo thấy thêm phần thanh toán; không có vẫn xem được như khách
router.get('/:id', optionalAuthenticate, getPost);

router.post('/', authenticate, createRules, validate, createPost);
router.post('/:id/join', authenticate, joinPost);
router.delete('/:id/join', authenticate, leavePost);
router.post('/:id/cancel', authenticate, cancelPost);
router.patch(
    '/:id/participants/:userId/payment',
    authenticate,
    [body('paid').isBoolean({ strict: true }).withMessage('paid phải là true hoặc false')],
    validate,
    setPaid
);

// Chỉ kiểm tra kiểu dữ liệu ở đây; ràng buộc nghiệp vụ (BR-16, BR-17) nằm trong post.costs.js
router.put(
    '/:id/costs',
    authenticate,
    [
        body('guests').default([]).isArray({ max: 50 }).withMessage('Danh sách bạn không dùng app không hợp lệ'),
        body('expenses').default([]).isArray({ max: 50 }).withMessage('Danh sách khoản chi không hợp lệ'),
        body('expenses.*.amount').isInt().withMessage('Số tiền phải là số nguyên').bail().toInt(),
        body('expenses.*.everyone').default(false).isBoolean({ strict: true }).withMessage('everyone phải là true hoặc false'),
        body('expenses.*.sharedBy').default([]).isArray({ max: 100 }).withMessage('Người cùng chịu không hợp lệ')
    ],
    validate,
    updateCosts
);
router.put(
    '/:id/attendance',
    authenticate,
    [
        body('attendance').isArray({ max: 50 }).withMessage('Điểm danh không hợp lệ'),
        body('attendance.*.userId').isString().withMessage('Điểm danh không hợp lệ'),
        body('attendance.*.attended').isBoolean({ strict: true }).withMessage('Điểm danh không hợp lệ')
    ],
    validate,
    setAttendance
);

// Ảnh bìa (WBS 4.9): kiểm tra quyền trong service; nhận file trước để trả lỗi kích thước rõ ràng
router.put('/:id/cover', authenticate, receiveImage, setCover);
router.delete('/:id/cover', authenticate, deleteCover);

module.exports = router;
