const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { outbox } = require('../../src/utils/mailer');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');

// ── WBS 4.14 — quên mật khẩu qua email ──

setupDatabase();

beforeEach(() => {
    outbox.length = 0;
});

const forgot = (email) => request(app).post('/api/auth/forgot-password').send({ email });
const tokenFrom = (mail) => /token=([a-f0-9]{64})/.exec(mail.text)[1];

describe('Quên mật khẩu', () => {
    test('email có thật → thư có link; đặt mật khẩu mới → đăng nhập được, token cũ hết hiệu lực, link dùng một lần', async () => {
        const me = await createUserAndLogin();
        const res = await forgot(me.user.email);
        expect(res.status).toBe(200);
        expect(outbox).toHaveLength(1);
        expect(outbox[0]).toMatchObject({ to: me.user.email, subject: 'Đặt lại mật khẩu Badminton Matching' });
        expect(outbox[0].text).toContain('/dat-lai-mat-khau?token=');

        // CSDL chỉ lưu mã băm, không lưu link gốc
        const token = tokenFrom(outbox[0]);
        const stored = await User.findById(me.user.id).select('+resetTokenHash').lean();
        expect(stored.resetTokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(stored.resetTokenHash).not.toBe(token);

        const reset = await request(app).post('/api/auth/reset-password').send({ token, password: 'MatKhauMoi@2026' });
        expect(reset.status).toBe(200);

        await request(app).get('/api/users/me').set(auth(me.token)).expect(401);
        await request(app).post('/api/auth/login').send({ email: me.user.email, password: me.password }).expect(401);
        await request(app).post('/api/auth/login').send({ email: me.user.email, password: 'MatKhauMoi@2026' }).expect(200);

        const again = await request(app).post('/api/auth/reset-password').send({ token, password: 'MatKhauKhac@2026' });
        expect(again.status).toBe(400);
        expect(again.body.code).toBe('INVALID_RESET_TOKEN');
    });

    test('email không tồn tại → cùng câu trả lời, không gửi thư (không lộ email đã đăng ký)', async () => {
        const me = await createUserAndLogin();
        const real = await forgot(me.user.email);
        outbox.length = 0;
        const fake = await forgot('khong-ai@test.com');
        expect(fake.status).toBe(200);
        expect(fake.body.message).toBe(real.body.message);
        expect(outbox).toHaveLength(0);
    });

    test('cùng email gửi liên tục → chỉ một thư trong 60 giây', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email).expect(200);
        await forgot(me.user.email).expect(200);
        expect(outbox).toHaveLength(1);
    });

    test('link hết hạn (quá 30 phút) hoặc sai → 400; mật khẩu mới yếu → 400', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const token = tokenFrom(outbox[0]);

        const weak = await request(app).post('/api/auth/reset-password').send({ token, password: '12345678' });
        expect(weak.status).toBe(400);
        expect(weak.body.code).toBe('VALIDATION_ERROR');

        await User.updateOne({ _id: me.user.id }, { $set: { resetTokenExpires: new Date(Date.now() - 1000) } });
        const expired = await request(app).post('/api/auth/reset-password').send({ token, password: 'MatKhauMoi@2026' });
        expect(expired.body.code).toBe('INVALID_RESET_TOKEN');

        const wrong = await request(app).post('/api/auth/reset-password').send({ token: 'a'.repeat(64), password: 'MatKhauMoi@2026' });
        expect(wrong.body.code).toBe('INVALID_RESET_TOKEN');
        const malformed = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'MatKhauMoi@2026' });
        expect(malformed.status).toBe(400);
    });

    test('mã đặt lại không bao giờ có trong dữ liệu trả về', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const data = (await request(app).get('/api/users/me').set(auth(me.token))).body.data;
        expect(data.resetTokenHash).toBeUndefined();
        expect(data.resetTokenExpires).toBeUndefined();
        expect(data.resetRequestedAt).toBeUndefined();
    });
});
