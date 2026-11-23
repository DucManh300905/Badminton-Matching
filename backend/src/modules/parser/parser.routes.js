const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../../middlewares/validate.middleware');
const { parsePost } = require('./parsePost');

const router = express.Router();

// POST /api/parse — "dán bài → tự điền": trích thông tin kèo từ nội dung bài đăng.
// Bộ trích xuất dựa trên luật chạy ngay trên server, không gọi dịch vụ ngoài, không lưu nội dung.
router.post(
    '/',
    [
        body('text')
            .isString()
            .withMessage('Vui lòng dán nội dung bài đăng')
            .bail()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage('Nội dung bài đăng từ 1 đến 5000 ký tự')
    ],
    validate,
    (req, res) => {
        res.json({ success: true, data: parsePost(req.body.text) });
    }
);

module.exports = router;
