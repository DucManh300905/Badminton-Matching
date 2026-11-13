const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth, PASSWORD } = require('../helpers/auth');

setupDatabase();

const me = (token) => request(app).get('/api/users/me').set(auth(token));
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('Xác thực JWT', () => {
    test('không gửi token → 401 UNAUTHORIZED', async () => {
        const res = await request(app).get('/api/users/me');

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('UNAUTHORIZED');
    });

    test('header không phải "Bearer …" → 401 UNAUTHORIZED', async () => {
        const { token } = await createUserAndLogin();

        const res = await request(app).get('/api/users/me').set('Authorization', token);
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('UNAUTHORIZED');
    });

    test.each([
        ['chuỗi bất kỳ', () => 'khong-phai-jwt'],
        ['ký bằng secret khác', (user) => jwt.sign({ userId: user.id, v: 0 }, 'secret-cua-ke-xau')],
        ['đã hết hạn', (user) => jwt.sign({ userId: user.id, v: 0 }, process.env.JWT_SECRET, { expiresIn: -10 })],
        // Tấn công kinh điển: đổi thuật toán thành "none" để bỏ qua chữ ký
        ['alg "none" (không có chữ ký)', (user) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ userId: user.id, v: 0 })}.`]
    ])('token %s → 401 TOKEN_EXPIRED', async (_name, makeToken) => {
        const { user } = await createUserAndLogin();

        const res = await me(makeToken(user));
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    test('tài khoản đã bị xóa → token cũ hết hiệu lực', async () => {
        const { token, user } = await createUserAndLogin();
        await User.deleteOne({ _id: user.id });

        const res = await me(token);
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    test('token có hạn 7 ngày', async () => {
        const { token } = await createUserAndLogin();
        const { iat, exp } = jwt.decode(token);

        expect(exp - iat).toBe(7 * 24 * 3600);
    });
});

describe('PUT /api/auth/change-password', () => {
    const change = (token, currentPassword, newPassword) =>
        request(app).put('/api/auth/change-password').set(auth(token)).send({ currentPassword, newPassword });

    test('sai mật khẩu hiện tại → 400 INVALID_PASSWORD', async () => {
        const { token } = await createUserAndLogin();

        const res = await change(token, 'SaiMatKhau1', 'MatKhauMoi@2027');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    test('mật khẩu mới không đạt chính sách → 400 VALIDATION_ERROR', async () => {
        const { token } = await createUserAndLogin();

        const res = await change(token, PASSWORD, '12345678');
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([{ field: 'newPassword', msg: 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác' }]);
    });

    test('đổi thành công → token cũ hết hiệu lực NGAY, token mới dùng được, mật khẩu cũ không đăng nhập được', async () => {
        const { token: oldToken, user } = await createUserAndLogin();

        const res = await change(oldToken, PASSWORD, 'MatKhauMoi@2027');
        expect(res.status).toBe(200);
        const newToken = res.body.data.token;

        expect((await me(oldToken)).status).toBe(401);
        expect((await me(newToken)).status).toBe(200);

        await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
        await request(app).post('/api/auth/login').send({ email: user.email, password: 'MatKhauMoi@2027' }).expect(200);
    });

    test('chưa đăng nhập → 401', async () => {
        await request(app).put('/api/auth/change-password').send({ currentPassword: 'a', newPassword: 'b' }).expect(401);
    });
});
