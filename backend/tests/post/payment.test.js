// WBS 4.8.1, 4.8.2 — chi phí theo từng khoản và thu tiền bằng mã QR
// BR-14: chỉ chủ kèo đánh dấu đã trả · BR-15: chi phí, số tài khoản chỉ người trong kèo thấy
// BR-16: chỉ chủ kèo sửa chi phí, bất cứ lúc nào · BR-17: cách chia · BR-18: còn thiếu / trả dư
const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

setupDatabase();

const ACCOUNT = '0123456789';

const createPost = async (token, overrides = {}) => {
    const res = await request(app)
        .post('/api/posts')
        .set(auth(token))
        .send({
            courtName: 'Sân Cầu Giấy',
            district: 'Cầu Giấy',
            startsAt: vnDateTime(1, 19).toISOString(),
            endsAt: vnDateTime(1, 21).toISOString(),
            levelMin: 'YEU',
            levelMax: 'GIOI',
            pricePerPerson: 50_000,
            slots: { any: 3 },
            ...overrides
        })
        .expect(201);
    return res.body.data;
};

const getPost = (id, token) => {
    const req = request(app).get(`/api/posts/${id}`);
    return token ? req.set(auth(token)) : req;
};
const join = (token, id) => request(app).post(`/api/posts/${id}/join`).set(auth(token)).expect(200);
const markPaid = (token, postId, userId, paid) =>
    request(app).patch(`/api/posts/${postId}/participants/${userId}/payment`).set(auth(token)).send({ paid });
const putCosts = (token, postId, body) => request(app).put(`/api/posts/${postId}/costs`).set(auth(token)).send(body);

let owner;
let an;
let binh;
let post;

beforeEach(async () => {
    owner = await createUserAndLogin({ displayName: 'Chủ kèo' });
    an = await createUserAndLogin({ displayName: 'Đức Mạnh' });
    binh = await createUserAndLogin({ displayName: 'Bình' });
    await request(app)
        .put('/api/users/me/bank-account')
        .set(auth(owner.token))
        .send({ bankBin: '970436', accountNumber: ACCOUNT, accountName: 'Chu Keo' })
        .expect(200);
    post = await createPost(owner.token);
    await join(an.token, post.id);
    await join(binh.token, post.id);
});

/** Sân 320k chia tất cả (chủ kèo, An, Bình, bạn Tuấn = 4 người); ăn 300k chỉ chủ kèo, An, Tuấn */
const standardCosts = () => ({
    guests: [{ key: 'tmp-tuan', name: 'Tuấn' }],
    expenses: [
        { kind: 'court', amount: 320_000, everyone: true },
        { kind: 'food', amount: 300_000, everyone: false, sharedBy: ['host', `u:${an.user.id}`, 'g:tmp-tuan'] }
    ]
});

describe('Xem chi phí và thanh toán', () => {
    test('khách, người ngoài kèo, token hỏng: không có costs, payment, paid; không lộ số tài khoản (BR-15)', async () => {
        await putCosts(owner.token, post.id, standardCosts()).expect(200);
        const stranger = await createUserAndLogin();

        for (const res of [await getPost(post.id), await getPost(post.id, stranger.token), await getPost(post.id, 'token-gia')]) {
            expect(res.status).toBe(200);
            expect(res.body.data).not.toHaveProperty('costs');
            expect(res.body.data).not.toHaveProperty('payment');
            expect(res.body.data.participants[0]).not.toHaveProperty('paid');
            expect(JSON.stringify(res.body.data)).not.toContain(ACCOUNT);
        }
    });

    test('chưa có khoản chi nào → chưa có mã QR, có chi phí dự kiến để tham khảo', async () => {
        const { payment, costs } = (await getPost(post.id, an.token)).body.data;

        expect(payment).toMatchObject({ hasCosts: false, estimate: 50_000, amount: 0, status: 'none', available: false, qr: null });
        expect(costs).toMatchObject({ total: 0, expenses: [], guests: [] });
    });

    test('chủ kèo nhập chi phí → mọi người trong kèo thấy toàn bộ khoản chi và số tiền của từng người', async () => {
        const res = await putCosts(owner.token, post.id, standardCosts()).expect(200);
        const tuan = res.body.data.costs.guests[0];
        expect(tuan.name).toBe('Tuấn');

        for (const token of [owner.token, an.token, binh.token]) {
            const { costs } = (await getPost(post.id, token)).body.data;
            expect(costs.total).toBe(620_000);
            expect(costs.expenses[0]).toMatchObject({ kind: 'court', everyone: true, share: 80_000 });
            expect(costs.expenses[0].sharers).toHaveLength(4);
            const due = Object.fromEntries(costs.members.map((m) => [m.name, m.due]));
            expect(due).toEqual({ 'Chủ kèo': 180_000, 'Đức Mạnh': 180_000, 'Bình': 80_000, 'Tuấn': 180_000 });
        }
    });

    test('người tham gia: mã QR đúng số tiền của riêng mình, nội dung có mã kèo và tên không dấu', async () => {
        await putCosts(owner.token, post.id, standardCosts()).expect(200);

        const anPay = (await getPost(post.id, an.token)).body.data.payment;
        expect(anPay).toMatchObject({
            hasCosts: true,
            amount: 180_000,
            toPay: 180_000,
            status: 'unpaid',
            available: true,
            bank: { bin: '970436', shortName: 'Vietcombank' },
            accountName: 'CHU KEO',
            content: `BM ${post.id.slice(-6).toUpperCase()} DUC MANH`
        });
        expect(anPay.qr).toContain(`0006970436011${0}${ACCOUNT}`);
        expect(anPay.qr).toContain('5406180000');

        expect((await getPost(post.id, binh.token)).body.data.payment).toMatchObject({ amount: 80_000, toPay: 80_000 });
    });

    test('"Tất cả" tự gồm người vào sau', async () => {
        await putCosts(owner.token, post.id, standardCosts()).expect(200);
        const chi = await createUserAndLogin({ displayName: 'Chi' });
        await join(chi.token, post.id);

        const { costs } = (await getPost(post.id, chi.token)).body.data;
        // Sân giờ chia 5 người = 64.000
        expect(costs.members.find((m) => m.name === 'Chi').due).toBe(64_000);
    });

    test('chủ kèo chưa nhập tài khoản → có số tiền nhưng không có mã QR', async () => {
        await putCosts(owner.token, post.id, standardCosts()).expect(200);
        await request(app).delete('/api/users/me/bank-account').set(auth(owner.token)).expect(200);

        expect((await getPost(post.id, an.token)).body.data.payment).toMatchObject({ amount: 180_000, available: false, qr: null, bank: null });
    });
});

describe('PUT /api/posts/:id/costs (BR-16)', () => {
    test('sửa bất cứ lúc nào, kể cả sau giờ chơi; lưu lại giữ id của bạn không dùng app', async () => {
        await Post.updateOne(
            { _id: post.id },
            { $set: { startsAt: new Date(Date.now() - 30 * 3600e3), endsAt: new Date(Date.now() - 28 * 3600e3) } }
        );
        const first = await putCosts(owner.token, post.id, standardCosts()).expect(200);
        const tuan = first.body.data.costs.guests[0];

        const again = await putCosts(owner.token, post.id, {
            guests: [{ key: tuan.id, name: 'Tuấn' }],
            expenses: [{ kind: 'shuttle', amount: 100_000, everyone: false, sharedBy: [`g:${tuan.id}`, 'host'] }]
        }).expect(200);
        expect(again.body.data.costs.guests[0].id).toBe(tuan.id);
        expect(again.body.data.costs.total).toBe(100_000);
    });

    test('người tham gia sửa → 403; kèo đã hủy → 409; dữ liệu sai → 400; chưa đăng nhập → 401', async () => {
        expect((await putCosts(an.token, post.id, standardCosts())).status).toBe(403);
        expect((await putCosts(owner.token, post.id, { expenses: [{ kind: 'court', amount: 'nhieu', everyone: true }] })).status).toBe(400);
        expect((await putCosts(owner.token, post.id, { expenses: [{ kind: 'court', amount: 1000, everyone: false, sharedBy: [] }] })).status).toBe(400);
        await request(app).put(`/api/posts/${post.id}/costs`).send(standardCosts()).expect(401);

        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(owner.token)).expect(200);
        const res = await putCosts(owner.token, post.id, standardCosts());
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('POST_NOT_OPEN');
    });
});

describe('PATCH …/payment — đánh dấu đã trả (BR-14, BR-18)', () => {
    beforeEach(() => putCosts(owner.token, post.id, standardCosts()).expect(200));

    test('đánh dấu → mọi người trong kèo thấy "đã trả", tổng đã thu cập nhật; bỏ đánh dấu được', async () => {
        const res = await markPaid(owner.token, post.id, an.user.id, true).expect(200);
        expect(res.body.data.payment.summary).toMatchObject({ paidCount: 1, participantCount: 2, collected: 180_000, expected: 260_000 });
        expect((await getPost(post.id, binh.token)).body.data.participants.find((p) => p.id === an.user.id).paid).toBe(true);
        expect((await getPost(post.id, an.token)).body.data.payment).toMatchObject({ status: 'paid', toPay: 0, available: false });

        const undo = await markPaid(owner.token, post.id, an.user.id, false).expect(200);
        expect(undo.body.data.payment.summary.paidCount).toBe(0);
    });

    test('chi phí tăng sau khi đã trả → "còn thiếu" kèm mã QR phần thiếu; giảm → "trả dư"', async () => {
        await markPaid(owner.token, post.id, an.user.id, true).expect(200);
        const more = standardCosts();
        more.expenses.push({ kind: 'water', amount: 40_000, everyone: true });
        await putCosts(owner.token, post.id, more).expect(200);

        const owe = (await getPost(post.id, an.token)).body.data.payment;
        expect(owe).toMatchObject({ amount: 190_000, status: 'owe', toPay: 10_000, diff: 10_000, available: true });
        expect(owe.qr).toContain('540510000');

        await putCosts(owner.token, post.id, { guests: [], expenses: [{ kind: 'court', amount: 300_000, everyone: true }] }).expect(200);
        expect((await getPost(post.id, an.token)).body.data.payment).toMatchObject({ amount: 100_000, status: 'overpaid', diff: 80_000, toPay: 0 });
    });

    test('người khác tham gia / rời kèo không làm mất trạng thái đã trả', async () => {
        await markPaid(owner.token, post.id, an.user.id, true).expect(200);
        const other = await createUserAndLogin();
        await join(other.token, post.id);
        await request(app).delete(`/api/posts/${post.id}/join`).set(auth(other.token)).expect(200);

        expect((await getPost(post.id, an.token)).body.data.payment.paid).toBe(true);
    });

    test('không phải chủ kèo → 403; người ngoài kèo → 409 NOT_JOINED; kèo đã hủy → 409; sai kiểu → 400; kèo không tồn tại → 404', async () => {
        expect((await markPaid(an.token, post.id, an.user.id, true)).status).toBe(403);
        const stranger = await createUserAndLogin();
        expect((await markPaid(owner.token, post.id, stranger.user.id, true)).body.code).toBe('NOT_JOINED');
        await markPaid(owner.token, post.id, an.user.id, 'yes').expect(400);
        await markPaid(owner.token, '6b03ac71dd6dd4f6e0720000', an.user.id, true).expect(404);
        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(owner.token)).expect(200);
        expect((await markPaid(owner.token, post.id, an.user.id, true)).body.code).toBe('POST_NOT_OPEN');
    });
});

describe('PUT /api/posts/:id/attendance', () => {
    const attend = (token, body) => request(app).put(`/api/posts/${post.id}/attendance`).set(auth(token)).send(body);

    test('trước giờ bắt đầu → 409 NOT_STARTED', async () => {
        const res = await attend(owner.token, { attendance: [{ userId: an.user.id, attended: false }] });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('NOT_STARTED');
    });

    test('sau giờ bắt đầu: chủ kèo điểm danh, mọi người trong kèo thấy; người khác → 403; sai dữ liệu → 400', async () => {
        await Post.updateOne({ _id: post.id }, { $set: { startsAt: new Date(Date.now() - 3600e3), endsAt: new Date(Date.now() + 3600e3) } });
        expect((await getPost(post.id, owner.token)).body.data.payment.canMarkAttendance).toBe(true);

        await attend(owner.token, { attendance: [{ userId: binh.user.id, attended: false }] }).expect(200);
        const seen = (await getPost(post.id, an.token)).body.data.participants;
        expect(seen.find((p) => p.id === binh.user.id).attended).toBe(false);
        expect(seen.find((p) => p.id === an.user.id).attended).toBeNull();

        expect((await attend(an.token, { attendance: [] })).status).toBe(403);
        expect((await attend(owner.token, { attendance: [{ userId: an.user.id, attended: 'co' }] })).status).toBe(400);
        expect((await attend(owner.token, { attendance: [{ userId: 'nguoi-la', attended: true }] })).status).toBe(400);
    });
});
