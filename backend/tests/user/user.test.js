const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');

setupDatabase();

describe('/api/users/me', () => {
    test('GET → thông tin của chính mình', async () => {
        const { token, user } = await createUserAndLogin({ displayName: 'Thu', gender: 'female', level: 'TB_PLUS' });

        const res = await request(app).get('/api/users/me').set(auth(token));

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ id: user.id, displayName: 'Thu', gender: 'female', level: 'TB_PLUS' });
        expect(res.body.data).not.toHaveProperty('password');
    });

    test('PUT → sửa tên, giới tính, trình độ', async () => {
        const { token } = await createUserAndLogin();

        const res = await request(app)
            .put('/api/users/me')
            .set(auth(token))
            .send({ displayName: '  Hùng Mới ', level: 'KHA' });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ displayName: 'Hùng Mới', level: 'KHA', gender: 'male' });
    });

    test('PUT dữ liệu sai → 400 VALIDATION_ERROR', async () => {
        const { token } = await createUserAndLogin();

        const res = await request(app).put('/api/users/me').set(auth(token)).send({ level: 'PRO', displayName: 'A' });

        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['displayName', 'level']);
    });

    test('PUT không đổi được email, mật khẩu, tokenVersion', async () => {
        const { token, user } = await createUserAndLogin({ email: 'goc@test.com' });

        await request(app)
            .put('/api/users/me')
            .set(auth(token))
            .send({ email: 'hacker@test.com', password: 'x', tokenVersion: 5 })
            .expect(200);

        const saved = await User.findById(user.id).select('+password +tokenVersion');
        expect(saved.email).toBe('goc@test.com');
        expect(saved.password).toMatch(/^\$2/);
        expect(saved.tokenVersion).toBe(0);
    });

    test('chưa đăng nhập → 401', async () => {
        await request(app).get('/api/users/me').expect(401);
        await request(app).put('/api/users/me').send({ level: 'KHA' }).expect(401);
    });
});
