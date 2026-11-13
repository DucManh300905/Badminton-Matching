const express = require('express');
const request = require('supertest');
const { body } = require('express-validator');

const AppError = require('../../src/utils/AppError');
const asyncHandler = require('../../src/utils/asyncHandler');
const { validate } = require('../../src/middlewares/validate.middleware');
const { notFound, errorHandler } = require('../../src/middlewares/error.middleware');

// App nhỏ chỉ để thử middleware, không dùng app thật
const buildApp = () => {
    const app = express();
    app.use(express.json());

    app.get(
        '/app-error',
        asyncHandler(async () => {
            throw new AppError(409, 'POST_NOT_OPEN', 'Kèo đã đủ người', [{ field: 'post', msg: 'đủ người' }]);
        })
    );
    app.get(
        '/crash',
        asyncHandler(async () => {
            throw new Error('mật khẩu CSDL: abc123');
        })
    );
    app.post(
        '/validate',
        [
            body('courtName').trim().notEmpty().withMessage('Tên sân không được để trống'),
            body('price').isInt({ min: 0 }).withMessage('Chi phí phải là số nguyên không âm')
        ],
        validate,
        (req, res) => res.json({ success: true, data: req.body })
    );

    // Lỗi kiểu Mongoose / MongoDB (tạo giả, không cần kết nối CSDL)
    const Post = require('../../src/modules/post/post.model');
    const fakeErrors = {
        validation: () => new Post({ district: 'Sao Hỏa' }).validate().catch((e) => e),
        cast: () => Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' }),
        duplicate: () => Object.assign(new Error('E11000'), { code: 11000, keyPattern: { email: 1 } }),
        writeConflict: () => Object.assign(new Error('WriteConflict'), { code: 112, codeName: 'WriteConflict' })
    };
    app.get('/mongo/:kind', async (req, res, next) => next(await fakeErrors[req.params.kind]()));

    app.use(notFound);
    app.use(errorHandler);
    return app;
};

describe('Xử lý lỗi', () => {
    const app = buildApp();

    test('AppError → đúng status, code, message và errors', async () => {
        const res = await request(app).get('/app-error');

        expect(res.status).toBe(409);
        expect(res.body).toEqual({
            success: false,
            message: 'Kèo đã đủ người',
            code: 'POST_NOT_OPEN',
            errors: [{ field: 'post', msg: 'đủ người' }]
        });
    });

    test('asyncHandler chuyển lỗi của hàm async sang errorHandler; lỗi lạ → 500 không lộ chi tiết', async () => {
        const res = await request(app).get('/crash');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' });
        expect(JSON.stringify(res.body)).not.toContain('abc123');
    });

    test('validate: dữ liệu sai → 400 VALIDATION_ERROR, message là lỗi đầu tiên, errors liệt kê từng trường', async () => {
        const res = await request(app).post('/validate').send({ courtName: '   ', price: -5 });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.message).toBe('Tên sân không được để trống');
        expect(res.body.errors).toEqual([
            { field: 'courtName', msg: 'Tên sân không được để trống' },
            { field: 'price', msg: 'Chi phí phải là số nguyên không âm' }
        ]);
    });

    test('ValidationError của Mongoose → 400 VALIDATION_ERROR, errors theo từng trường', async () => {
        const res = await request(app).get('/mongo/validation');

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['district', 'courtName', 'author']));
    });

    test('ObjectId sai định dạng (CastError) → 404 NOT_FOUND', async () => {
        const res = await request(app).get('/mongo/cast');

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });

    test('trùng unique (11000) → 409 DUPLICATE, chỉ rõ trường bị trùng', async () => {
        const res = await request(app).get('/mongo/duplicate');

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ code: 'DUPLICATE', errors: [{ field: 'email' }] });
    });

    test('xung đột ghi của transaction → 409 SYSTEM_BUSY (client thử lại được)', async () => {
        const res = await request(app).get('/mongo/writeConflict');

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('SYSTEM_BUSY');
    });

    test('validate: dữ liệu đúng → đi tiếp tới controller', async () => {
        const res = await request(app).post('/validate').send({ courtName: ' Sân A ', price: 50000 });

        expect(res.status).toBe(200);
        expect(res.body.data.courtName).toBe('Sân A');
    });
});
