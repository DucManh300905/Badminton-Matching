const express = require('express');
const { body } = require('express-validator');

const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const service = require('./chat.service');
const { MAX_TEXT } = require('./chat.model');

const router = express.Router();
router.use(authenticate);

// GET /api/chats — các cuộc trò chuyện của tôi
router.get(
    '/',
    asyncHandler(async (req, res) => {
        res.json({ success: true, data: await service.list(req.user.userId, new Date()) });
    })
);

// GET /api/chats/unread — số cuộc trò chuyện có tin chưa đọc
router.get(
    '/unread',
    asyncHandler(async (req, res) => {
        res.json({ success: true, data: { count: await service.unreadCount(req.user.userId, new Date()) } });
    })
);

// GET /api/chats/direct/:userId — khóa nhắn riêng với một người đã cùng chơi
router.get(
    '/direct/:userId',
    asyncHandler(async (req, res) => {
        res.json({ success: true, data: { key: await service.directKeyWith(req.user.userId, req.params.userId) } });
    })
);

// POST /api/chats/blocks/:userId — chặn; DELETE — bỏ chặn
router.post(
    '/blocks/:userId',
    asyncHandler(async (req, res) => {
        await service.block(req.user.userId, req.params.userId);
        res.json({ success: true, message: 'Đã chặn người này' });
    })
);
router.delete(
    '/blocks/:userId',
    asyncHandler(async (req, res) => {
        await service.unblock(req.user.userId, req.params.userId);
        res.json({ success: true, message: 'Đã bỏ chặn' });
    })
);

// GET /api/chats/:key?before=ISO — mở cuộc trò chuyện
router.get(
    '/:key',
    asyncHandler(async (req, res) => {
        const before = typeof req.query.before === 'string' ? req.query.before : undefined;
        res.json({ success: true, data: await service.open(req.params.key, req.user.userId, { before }, new Date()) });
    })
);

// POST /api/chats/:key/messages — gửi tin
router.post(
    '/:key/messages',
    [body('text').isString().withMessage(`Tin nhắn từ 1 đến ${MAX_TEXT} ký tự`)],
    validate,
    asyncHandler(async (req, res) => {
        const message = await service.send(req.params.key, req.user.userId, req.body.text, new Date());
        res.status(201).json({ success: true, data: message });
    })
);

// POST /api/chats/:key/read — đã đọc tới bây giờ
router.post(
    '/:key/read',
    asyncHandler(async (req, res) => {
        await service.read(req.params.key, req.user.userId, new Date());
        res.json({ success: true });
    })
);

module.exports = router;
