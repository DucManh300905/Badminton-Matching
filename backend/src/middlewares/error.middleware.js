const AppError = require('../utils/AppError');

const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        code: 'NOT_FOUND'
    });
};

// Express nhận diện error handler qua đủ 4 tham số, nên giữ `next` dù không dùng
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.status).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err.errors && { errors: err.errors })
        });
    }

    // Lỗi validate của Mongoose (lớp bảo vệ thứ hai, sau express-validator ở route)
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({ field: e.path, msg: e.message }));
        return res.status(400).json({
            success: false,
            message: errors[0]?.msg || 'Validation error',
            code: 'VALIDATION_ERROR',
            errors
        });
    }

    // ObjectId sai định dạng (vd: /posts/abc)
    if (err.name === 'CastError') {
        return res.status(404).json({
            success: false,
            message: 'Resource not found',
            code: 'NOT_FOUND'
        });
    }

    // Xung đột ghi khi nhiều người cùng sửa một kèo (transaction đã tự chạy lại mà vẫn xung đột).
    // Thao tác chưa được ghi gì; client thử lại được.
    if (err.code === 112 || err.codeName === 'WriteConflict' || err.errorLabelSet?.has?.('TransientTransactionError')) {
        return res.status(409).json({
            success: false,
            message: 'The system is busy, please try again',
            code: 'SYSTEM_BUSY'
        });
    }

    // Trùng unique index (vd: email đã đăng ký)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        return res.status(409).json({
            success: false,
            message: `${field || 'Value'} already exists`,
            code: 'DUPLICATE',
            ...(field && { errors: [{ field, msg: `${field} already exists` }] })
        });
    }

    // Body vượt giới hạn express.json (100kb)
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Request body is too large',
            code: 'PAYLOAD_TOO_LARGE'
        });
    }

    // Body JSON sai cú pháp
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON body',
            code: 'VALIDATION_ERROR'
        });
    }

    // Lỗi không lường trước: ghi log đầy đủ, nhưng KHÔNG trả chi tiết ra ngoài
    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }
    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
};

module.exports = {
    notFound,
    errorHandler
};
