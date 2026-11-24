const express = require('express');
const { body } = require('express-validator');

const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const service = require('./shuttle.service');
const { MAX_NAME, MAX_QUANTITY } = require('./shuttle.model');

const router = express.Router();
router.use(authenticate);

const MAX_RESTOCK = 1000;
const MAX_TOTAL_PRICE = 100_000_000;

const nameRule = (optional = false) => {
    const rule = body('name');
    return (optional ? rule.optional() : rule)
        .isString()
        .withMessage('Tên loại cầu không được để trống')
        .bail()
        .trim()
        .isLength({ min: 1, max: MAX_NAME })
        .withMessage(`Tên loại cầu từ 1 đến ${MAX_NAME} ký tự`);
};

const restockRules = [
    body('quantity')
        .isInt({ min: 1, max: MAX_RESTOCK })
        .withMessage(`Số quả phải là số nguyên từ 1 đến ${MAX_RESTOCK}`)
        .toInt(),
    body('totalPrice')
        .isInt({ min: 0, max: MAX_TOTAL_PRICE })
        .withMessage('Tổng tiền phải là số nguyên không âm')
        .toInt()
];

// GET /api/shuttles — kho cầu của tôi
router.get(
    '/',
    asyncHandler(async (req, res) => {
        res.json({ success: true, data: await service.list(req.user.userId) });
    })
);

// GET /api/shuttles/stats — số quả đã dùng theo tuần / tháng
router.get(
    '/stats',
    asyncHandler(async (req, res) => {
        res.json({ success: true, data: await service.stats(req.user.userId, new Date()) });
    })
);

// POST /api/shuttles — thêm loại cầu + lần nhập đầu
router.post(
    '/',
    [nameRule(), ...restockRules],
    validate,
    asyncHandler(async (req, res) => {
        const { name, quantity, totalPrice } = req.body;
        res.status(201).json({ success: true, data: await service.create(req.user.userId, { name, quantity, totalPrice }) });
    })
);

// POST /api/shuttles/:id/restock — nhập thêm
router.post(
    '/:id/restock',
    restockRules,
    validate,
    asyncHandler(async (req, res) => {
        const { quantity, totalPrice } = req.body;
        res.json({ success: true, data: await service.restock(req.user.userId, req.params.id, { quantity, totalPrice }) });
    })
);

// PATCH /api/shuttles/:id — đổi tên / kiểm kê số quả
router.patch(
    '/:id',
    [
        nameRule(true),
        body('quantity')
            .optional()
            .isInt({ min: 0, max: MAX_QUANTITY })
            .withMessage(`Số quả phải là số nguyên từ 0 đến ${MAX_QUANTITY}`)
            .toInt()
    ],
    validate,
    asyncHandler(async (req, res) => {
        const { name, quantity } = req.body;
        res.json({ success: true, data: await service.update(req.user.userId, req.params.id, { name, quantity }) });
    })
);

// DELETE /api/shuttles/:id
router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        await service.remove(req.user.userId, req.params.id);
        res.json({ success: true, message: 'Đã xóa loại cầu' });
    })
);

module.exports = router;
