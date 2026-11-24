// WBS 4.8.2 — PUT /api/posts/:id/settlement: chốt chi phí sau buổi + điểm danh (BR-16, BR-17)
const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

setupDatabase();

const H = 3600 * 1000;

let owner;
let an;
let binh;
let post;

/** Dời giờ kèo để giả lập buổi chơi đã diễn ra (kèo luôn phải tạo ở tương lai, BR-01) */
const moveGame = (startsAt) =>
    Post.updateOne({ _id: post.id }, { $set: { startsAt, endsAt: new Date(startsAt.getTime() + 2 * H) } });

const settle = (token, body) => request(app).put(`/api/posts/${post.id}/settlement`).set(auth(token)).send(body);

const body = (overrides = {}) => ({
    courtFee: 320_000,
    shuttleFee: 80_000,
    otherFee: 20_000,
    headcount: 8,
    attendance: [
        { userId: an.user.id, attended: true },
        { userId: binh.user.id, attended: false }
    ],
    ...overrides
});

const detail = async (token) => (await request(app).get(`/api/posts/${post.id}`).set(auth(token)).expect(200)).body.data;

beforeEach(async () => {
    owner = await createUserAndLogin({ displayName: 'Chủ kèo' });
    an = await createUserAndLogin({ displayName: 'An' });
    binh = await createUserAndLogin({ displayName: 'Bình' });
    await request(app)
        .put('/api/users/me/bank-account')
        .set(auth(owner.token))
        .send({ bankBin: '970436', accountNumber: '0123456789', accountName: 'Chu Keo' })
        .expect(200);
    const res = await request(app)
        .post('/api/posts')
        .set(auth(owner.token))
        .send({
            courtName: 'Sân Cầu Giấy',
            district: 'Cầu Giấy',
            startsAt: vnDateTime(1, 19).toISOString(),
            endsAt: vnDateTime(1, 21).toISOString(),
            levelMin: 'YEU',
            levelMax: 'GIOI',
            pricePerPerson: 50_000,
            slots: { any: 3 }
        })
        .expect(201);
    post = res.body.data;
    for (const p of [an, binh]) {
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(p.token)).expect(200);
    }
});

describe('PUT /api/posts/:id/settlement', () => {
    test('trước giờ bắt đầu → 409 SETTLEMENT_CLOSED; chủ kèo chưa thấy nút chốt', async () => {
        const res = await settle(owner.token, body());
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('SETTLEMENT_CLOSED');
        expect((await detail(owner.token)).payment.canSettle).toBe(false);
    });

    describe('sau buổi chơi', () => {
        beforeEach(() => moveGame(new Date(Date.now() - 3 * H)));

        test('chủ kèo chốt → tiền mỗi người làm tròn lên 1.000đ, điểm danh được lưu, tổng đã thu chỉ tính người phải trả', async () => {
            expect((await detail(owner.token)).payment.canSettle).toBe(true);

            const res = await settle(owner.token, body());

            expect(res.status).toBe(200);
            const data = res.body.data;
            expect(data.settlement).toMatchObject({
                courtFee: 320_000,
                shuttleFee: 80_000,
                otherFee: 20_000,
                total: 420_000,
                headcount: 8,
                chargeAbsent: false,
                perPerson: 53_000
            });
            const byName = Object.fromEntries(data.participants.map((p) => [p.displayName, p]));
            expect(byName.An).toMatchObject({ attended: true, amountDue: 53_000 });
            expect(byName['Bình']).toMatchObject({ attended: false, amountDue: 0 });
            expect(data.payment.summary).toEqual({ paidCount: 0, participantCount: 1, collected: 0, expected: 53_000 });
        });

        test('người có mặt: mã QR theo số tiền mới; người vắng (không bị thu): không có mã QR', async () => {
            await settle(owner.token, body()).expect(200);

            const anPay = (await detail(an.token)).payment;
            expect(anPay).toMatchObject({ amount: 53_000, available: true, attended: true });
            expect(anPay.qr).toContain('540553000');

            const binhPay = (await detail(binh.token)).payment;
            expect(binhPay).toMatchObject({ amount: 0, available: false, qr: null, attended: false });
        });

        test('chủ kèo chọn "người vắng vẫn phải trả" → người vắng có mã QR, tính vào tổng phải thu', async () => {
            await settle(owner.token, body({ chargeAbsent: true })).expect(200);

            const binhPay = (await detail(binh.token)).payment;
            expect(binhPay).toMatchObject({ amount: 53_000, available: true, attended: false });
            expect((await detail(owner.token)).payment.summary).toMatchObject({ participantCount: 2, expected: 106_000 });
        });

        test('chốt lại được (sửa chi phí); trạng thái đã trả giữ nguyên', async () => {
            await settle(owner.token, body()).expect(200);
            await request(app)
                .patch(`/api/posts/${post.id}/participants/${an.user.id}/payment`)
                .set(auth(owner.token))
                .send({ paid: true })
                .expect(200);

            const res = await settle(owner.token, body({ otherFee: 100_000 })).expect(200);

            expect(res.body.data.settlement.perPerson).toBe(63_000);
            expect(res.body.data.participants.find((p) => p.displayName === 'An').paid).toBe(true);
        });

        test('khách và người ngoài kèo không thấy chi phí đã chốt, điểm danh', async () => {
            await settle(owner.token, body()).expect(200);
            const stranger = await createUserAndLogin();

            for (const res of [
                await request(app).get(`/api/posts/${post.id}`),
                await request(app).get(`/api/posts/${post.id}`).set(auth(stranger.token))
            ]) {
                expect(res.body.data).not.toHaveProperty('settlement');
                expect(res.body.data.participants[0]).not.toHaveProperty('attended');
            }
        });

        test('không phải chủ kèo → 403; kèo đã hủy → 409 POST_NOT_OPEN', async () => {
            expect((await settle(an.token, body())).status).toBe(403);

            await Post.updateOne({ _id: post.id }, { $set: { status: 'closed' } });
            const res = await settle(owner.token, body());
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('POST_NOT_OPEN');
        });

        test('dữ liệu sai kiểu → 400; điểm danh thiếu người → 400 (attendance); số người chơi quá ít → 400 (headcount)', async () => {
            expect((await settle(owner.token, body({ courtFee: 'nhieu' }))).status).toBe(400);
            expect((await settle(owner.token, body({ chargeAbsent: 'co' }))).status).toBe(400);

            const missing = await settle(owner.token, body({ attendance: [{ userId: an.user.id, attended: true }] }));
            expect(missing.status).toBe(400);
            expect(missing.body.errors.map((e) => e.field)).toContain('attendance');

            const few = await settle(owner.token, body({ headcount: 1 }));
            expect(few.status).toBe(400);
            expect(few.body.errors.map((e) => e.field)).toContain('headcount');
        });
    });

    test('quá 24 giờ sau giờ kết thúc → 409 SETTLEMENT_CLOSED', async () => {
        await moveGame(new Date(Date.now() - 30 * H));
        expect((await settle(owner.token, body())).body.code).toBe('SETTLEMENT_CLOSED');
    });

    test('chưa đăng nhập → 401; kèo không tồn tại → 404', async () => {
        await request(app).put(`/api/posts/${post.id}/settlement`).send(body()).expect(401);
        await request(app).put('/api/posts/6b03ac71dd6dd4f6e0720000/settlement').set(auth(owner.token)).send(body()).expect(404);
    });
});
