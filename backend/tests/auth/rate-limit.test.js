const express = require('express');
const request = require('supertest');

const { limiter } = require('../../src/middlewares/rateLimit.middleware');

// App nhỏ: ?ok=1 → đăng nhập đúng (200), còn lại → sai (401)
const buildApp = (options) => {
    // Test chung đặt AUTH_RATE_LIMIT rất lớn (đọc lúc tạo limiter); tạm bỏ để dùng đúng số nhỏ
    const saved = process.env.AUTH_RATE_LIMIT;
    delete process.env.AUTH_RATE_LIMIT;
    const middleware = limiter(options);
    process.env.AUTH_RATE_LIMIT = saved;

    const app = express();
    app.post('/login', middleware, (req, res) => res.status(req.query.ok ? 200 : 401).json({ success: !!req.query.ok }));
    return app;
};

describe('Giới hạn số lần thử', () => {
    test('sai quá số lần cho phép → 429 RATE_LIMITED', async () => {
        const app = buildApp({ windowMs: 60_000, limit: 3, onlyFailures: true });

        for (let i = 0; i < 3; i++) {
            await request(app).post('/login').expect(401);
        }
        const res = await request(app).post('/login');

        expect(res.status).toBe(429);
        expect(res.body).toEqual({ success: false, message: 'Thử quá nhiều lần, vui lòng thử lại sau', code: 'RATE_LIMITED' });
    });

    test('chỉ đếm lần SAI: người dùng đăng nhập đúng nhiều lần không bị chặn', async () => {
        const app = buildApp({ windowMs: 60_000, limit: 2, onlyFailures: true });

        for (let i = 0; i < 5; i++) {
            await request(app).post('/login?ok=1').expect(200);
        }
        await request(app).post('/login').expect(401);
    });

    test('có header RateLimit chuẩn cho client biết còn bao nhiêu lượt', async () => {
        const app = buildApp({ windowMs: 60_000, limit: 5 });

        const res = await request(app).post('/login?ok=1');
        // Chuẩn IETF draft-8: "5-in-1min"; r=4; t=60  (r = số lượt còn lại)
        expect(res.headers.ratelimit).toMatch(/;\s*r=4;/);
    });
});
