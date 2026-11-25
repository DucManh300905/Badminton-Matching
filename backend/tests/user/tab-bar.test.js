// WBS 4.12 — thanh dưới trên điện thoại: 3 tiện ích người dùng chọn, lưu theo tài khoản
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');

setupDatabase();

const put = (token, items) => request(app).put('/api/users/me/tab-bar').set(auth(token)).send({ items });

describe('PUT /api/users/me/tab-bar', () => {
    test('mặc định chưa có; lưu 3 tiện ích theo thứ tự; đăng nhập lại vẫn giữ; null → về mặc định', async () => {
        const me = await createUserAndLogin();
        expect((await request(app).get('/api/users/me').set(auth(me.token))).body.data.tabBar).toBeUndefined();

        const res = await put(me.token, ['shuttles', 'search', 'mine']);
        expect(res.status).toBe(200);
        expect(res.body.data.tabBar).toEqual(['shuttles', 'search', 'mine']);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: me.user.email, password: me.password })
            .expect(200);
        expect(login.body.data.user.tabBar).toEqual(['shuttles', 'search', 'mine']);

        const reset = await put(me.token, null);
        expect(reset.status).toBe(200);
        expect(reset.body.data.tabBar).toBeUndefined();
        expect((await User.findById(me.user.id).lean()).tabBar).toBeUndefined();
    });

    test('sai số lượng, trùng, tiện ích lạ (kể cả ô cố định "Đăng kèo", "Tổng quan") → 400', async () => {
        const me = await createUserAndLogin();
        for (const items of [
            ['search', 'today'],
            ['search', 'today', 'mine', 'shuttles'],
            ['search', 'search', 'mine'],
            ['search', 'today', 'new'],
            ['search', 'today', 'overview'],
            'search',
            undefined
        ]) {
            const res = await put(me.token, items);
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        }
    });

    test('chưa đăng nhập → 401', async () => {
        await request(app).put('/api/users/me/tab-bar').send({ items: ['search', 'today', 'mine'] }).expect(401);
    });
});
