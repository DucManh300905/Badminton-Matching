const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { outbox, maskEmail } = require('../../src/utils/mailer');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');

// ── WBS 4.14 — quên mật khẩu bằng mã OTP 4 số qua email ──

setupDatabase();

beforeEach(() => {
    outbox.length = 0;
});

const forgot = (email) => request(app).post('/api/auth/forgot-password').send({ email });
const reset = (email, code, password = 'MatKhauMoi@2026') =>
    request(app).post('/api/auth/reset-password').send({ email, code, password });
const codeFrom = (mail) => /:\s*(\d{4})/.exec(mail.subject)[1];
const otherCode = (code) => String((Number(code) + 1) % 10_000).padStart(4, '0');

describe('Quên mật khẩu (mã OTP 4 số)', () => {
    test('email có thật → thư có mã 4 số; nhập đúng → đặt được mật khẩu mới, phiên cũ hết hiệu lực, mã dùng một lần', async () => {
        const me = await createUserAndLogin();
        expect((await forgot(me.user.email)).status).toBe(200);
        expect(outbox).toHaveLength(1);
        const code = codeFrom(outbox[0]);
        expect(code).toMatch(/^\d{4}$/);
        expect(outbox[0].to).toBe(me.user.email);
        expect(outbox[0].text).toContain(code);
        expect(outbox[0].html).toContain(`>${code}</span>`);

        // CSDL chỉ lưu mã băm
        const stored = await User.findById(me.user.id).select('+resetCodeHash').lean();
        expect(stored.resetCodeHash).toMatch(/^[a-f0-9]{64}$/);
        expect(stored.resetCodeHash).not.toContain(code);

        expect((await reset(me.user.email, code)).status).toBe(200);
        await request(app).get('/api/users/me').set(auth(me.token)).expect(401);
        await request(app).post('/api/auth/login').send({ email: me.user.email, password: me.password }).expect(401);
        await request(app).post('/api/auth/login').send({ email: me.user.email, password: 'MatKhauMoi@2026' }).expect(200);

        const again = await reset(me.user.email, code, 'MatKhauKhac@2026');
        expect(again.status).toBe(400);
        expect(again.body.code).toBe('INVALID_RESET_CODE');
    });

    test('sai 5 lần → mã bị hủy, kể cả nhập đúng sau đó cũng không được', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const code = codeFrom(outbox[0]);
        for (let i = 0; i < 5; i += 1) {
            const res = await reset(me.user.email, otherCode(code));
            expect(res.body.code).toBe('INVALID_RESET_CODE');
        }
        expect((await reset(me.user.email, code)).body.code).toBe('INVALID_RESET_CODE');
        const stored = await User.findById(me.user.id).select('+resetCodeHash').lean();
        expect(stored.resetCodeHash).toBeUndefined();
    });

    test('sai vài lần rồi nhập đúng (chưa tới 5 lần) → vẫn được', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const code = codeFrom(outbox[0]);
        for (let i = 0; i < 4; i += 1) await reset(me.user.email, otherCode(code));
        expect((await reset(me.user.email, code)).status).toBe(200);
    });

    test('mã của người này không dùng được cho email khác; email không tồn tại → cùng lỗi', async () => {
        const a = await createUserAndLogin();
        const b = await createUserAndLogin();
        await forgot(a.user.email);
        const code = codeFrom(outbox[0]);
        expect((await reset(b.user.email, code)).body.code).toBe('INVALID_RESET_CODE');
        expect((await reset('khong-ai@test.com', code)).body.code).toBe('INVALID_RESET_CODE');
    });

    test('hết hạn (quá 10 phút) → 400; mã sai dạng / mật khẩu yếu → 400 VALIDATION_ERROR', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const code = codeFrom(outbox[0]);

        for (const bad of ['123', '12345', 'abcd', '']) {
            expect((await reset(me.user.email, bad)).body.code).toBe('VALIDATION_ERROR');
        }
        expect((await reset(me.user.email, code, '12345678')).body.code).toBe('VALIDATION_ERROR');

        await User.updateOne({ _id: me.user.id }, { $set: { resetCodeExpires: new Date(Date.now() - 1000) } });
        expect((await reset(me.user.email, code)).body.code).toBe('INVALID_RESET_CODE');
    });

    test('email không tồn tại → cùng câu trả lời, không gửi thư; gửi liên tục → 1 thư / phút', async () => {
        const me = await createUserAndLogin();
        const real = await forgot(me.user.email);
        const fake = await forgot('khong-ai@test.com');
        expect(fake.body.message).toBe(real.body.message);
        await forgot(me.user.email);
        expect(outbox).toHaveLength(1);
    });

    test('mã không bao giờ có trong dữ liệu trả về; email trong log được che bớt', async () => {
        const me = await createUserAndLogin();
        await forgot(me.user.email);
        const data = (await request(app).get('/api/users/me').set(auth(me.token))).body.data;
        for (const k of ['resetCodeHash', 'resetCodeExpires', 'resetAttempts', 'resetRequestedAt']) {
            expect(data[k]).toBeUndefined();
        }
        expect(maskEmail('manh.an@gmail.com')).toBe('m***@gmail.com');
    });
});
