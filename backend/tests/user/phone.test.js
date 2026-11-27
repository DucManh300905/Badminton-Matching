const request = require('supertest');
const app = require('../../src/app');
const { normalizePhone } = require('../../src/utils/phone');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

// ── WBS 4.15 — số điện thoại: không bắt buộc, chỉ người cùng kèo thấy ──

setupDatabase();

describe('normalizePhone', () => {
    test.each([
        ['0912345678', '0912345678'],
        ['091 234 5678', '0912345678'],
        ['091.234.5678', '0912345678'],
        ['+84912345678', '0912345678'],
        ['84912345678', '0912345678'],
        ['', ''],
        [null, ''],
        ['0212345678', null], // không phải đầu số di động
        ['091234567', null], // thiếu số
        ['09123456789', null],
        ['abc', null],
        [912345678, null]
    ])('%p → %p', (input, expected) => {
        expect(normalizePhone(input)).toBe(expected);
    });
});

describe('Số điện thoại', () => {
    test('đăng ký kèm số (tự chuẩn hóa); không nhập cũng được; số sai → 400', async () => {
        const a = await createUserAndLogin({ phone: '+84 912 345 678' });
        expect(a.user.phone).toBe('0912345678');
        const b = await createUserAndLogin();
        expect(b.user.phone).toBeUndefined();

        const bad = await request(app)
            .post('/api/auth/register')
            .send({ email: 'sai-so@test.com', password: 'Test@12345', displayName: 'Sai', gender: 'male', level: 'TB', phone: '12345' });
        expect(bad.status).toBe(400);
        expect(bad.body.errors[0].field).toBe('phone');
    });

    test('sửa / xóa trong hồ sơ', async () => {
        const me = await createUserAndLogin();
        const set = await request(app).put('/api/users/me').set(auth(me.token)).send({ phone: '0987 654 321' });
        expect(set.body.data.phone).toBe('0987654321');
        const del = await request(app).put('/api/users/me').set(auth(me.token)).send({ phone: '' });
        expect(del.status).toBe(200);
        expect(del.body.data.phone).toBeUndefined();
        expect((await request(app).put('/api/users/me').set(auth(me.token)).send({ phone: '0123' })).status).toBe(400);
    });

    test('chỉ người cùng kèo thấy số của chủ kèo và người tham gia; khách và danh sách kèo không thấy', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin({ phone: '0912000002' });
        const outsider = await createUserAndLogin();
        const post = (
            await request(app)
                .post('/api/posts')
                .set(auth(host.token))
                .send({
                    courtName: 'Sân Số',
                    district: 'Hà Đông',
                    startsAt: vnDateTime(1, 19).toISOString(),
                    endsAt: vnDateTime(1, 21).toISOString(),
                    levelMin: 'YEU',
                    levelMax: 'GIOI',
                    pricePerPerson: 50_000,
                    slots: { any: 2 }
                })
        ).body.data;
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(player.token)).expect(200);

        const seen = (await request(app).get(`/api/posts/${post.id}`).set(auth(player.token))).body.data;
        expect(seen.author.phone).toBe('0912000001');
        expect(seen.participants[0].phone).toBe('0912000002');

        for (const res of [
            await request(app).get(`/api/posts/${post.id}`),
            await request(app).get(`/api/posts/${post.id}`).set(auth(outsider.token))
        ]) {
            expect(res.body.data.author.phone).toBeUndefined();
            expect(res.body.data.participants[0].phone).toBeUndefined();
        }
        const list = (await request(app).get('/api/posts')).body.data;
        expect(JSON.stringify(list)).not.toContain('0912000001');
    });
});
