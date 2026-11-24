// WBS 4.8.1 — thu tiền kèo bằng mã QR (BR-14: chỉ chủ kèo đánh dấu đã trả; BR-15: số tài khoản chỉ người trong kèo thấy)
const request = require('supertest');
const app = require('../../src/app');
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

let owner;
let player;
let post;

beforeEach(async () => {
    owner = await createUserAndLogin({ displayName: 'Chủ kèo' });
    player = await createUserAndLogin({ displayName: 'Đức Mạnh' });
    await request(app)
        .put('/api/users/me/bank-account')
        .set(auth(owner.token))
        .send({ bankBin: '970436', accountNumber: ACCOUNT, accountName: 'Chu Keo' })
        .expect(200);
    post = await createPost(owner.token);
    await join(player.token, post.id);
});

describe('GET /api/posts/:id — phần thanh toán', () => {
    test('khách và người ngoài kèo: không có payment, không có trạng thái đã trả, không lộ số tài khoản (BR-15)', async () => {
        const stranger = await createUserAndLogin();

        for (const res of [await getPost(post.id), await getPost(post.id, stranger.token)]) {
            expect(res.status).toBe(200);
            expect(res.body.data).not.toHaveProperty('payment');
            expect(res.body.data.participants[0]).not.toHaveProperty('paid');
            expect(JSON.stringify(res.body.data)).not.toContain(ACCOUNT);
        }
    });

    test('token hỏng → vẫn xem được như khách', async () => {
        const res = await getPost(post.id, 'token-gia').expect(200);
        expect(res.body.data).not.toHaveProperty('payment');
    });

    test('người đã tham gia: mã QR đúng tài khoản, đúng giá mỗi người, nội dung có mã kèo và tên không dấu', async () => {
        const { payment } = (await getPost(post.id, player.token).expect(200)).body.data;

        expect(payment).toMatchObject({
            amount: 50_000,
            available: true,
            bank: { bin: '970436', shortName: 'Vietcombank' },
            accountNumber: ACCOUNT,
            accountName: 'CHU KEO',
            content: `BM ${post.id.slice(-6).toUpperCase()} DUC MANH`,
            paid: false
        });
        expect(payment.qr).toContain(`0006970436${'01'}10${ACCOUNT}`);
        expect(payment.qr).toContain('540550000');
    });

    test('chủ kèo: tổng đã thu, trạng thái từng người; không có mã QR của riêng ai', async () => {
        const { payment, participants } = (await getPost(post.id, owner.token).expect(200)).body.data;

        expect(payment.summary).toEqual({ paidCount: 0, participantCount: 1, collected: 0, expected: 50_000 });
        expect(payment).not.toHaveProperty('qr');
        expect(participants[0].paid).toBe(false);
    });

    test('chủ kèo chưa nhập tài khoản → không có mã QR', async () => {
        await request(app).delete('/api/users/me/bank-account').set(auth(owner.token)).expect(200);

        const { payment } = (await getPost(post.id, player.token)).body.data;

        expect(payment).toMatchObject({ available: false, qr: null, bank: null, accountNumber: null });
    });

    test('kèo miễn phí → không có mã QR', async () => {
        const free = await createPost(owner.token, { pricePerPerson: 0 });
        await join(player.token, free.id);

        const { payment } = (await getPost(free.id, player.token)).body.data;

        expect(payment).toMatchObject({ amount: 0, available: false, qr: null });
    });
});

describe('PATCH /api/posts/:id/participants/:userId/payment — đánh dấu đã trả (BR-14)', () => {
    test('chủ kèo đánh dấu → mọi người trong kèo thấy "đã trả", tổng đã thu cập nhật; bỏ đánh dấu được', async () => {
        const res = await markPaid(owner.token, post.id, player.user.id, true);

        expect(res.status).toBe(200);
        expect(res.body.data.payment.summary).toMatchObject({ paidCount: 1, collected: 50_000 });

        const other = await createUserAndLogin();
        await join(other.token, post.id);
        const seenByOther = (await getPost(post.id, other.token)).body.data.participants;
        expect(seenByOther.find((p) => p.id === player.user.id).paid).toBe(true);
        expect((await getPost(post.id, player.token)).body.data.payment.paid).toBe(true);

        const undo = await markPaid(owner.token, post.id, player.user.id, false).expect(200);
        expect(undo.body.data.payment.summary.paidCount).toBe(0);
    });

    test('người khác tham gia / rời kèo không làm mất trạng thái đã trả', async () => {
        await markPaid(owner.token, post.id, player.user.id, true).expect(200);
        const other = await createUserAndLogin();
        await join(other.token, post.id);
        await request(app).delete(`/api/posts/${post.id}/join`).set(auth(other.token)).expect(200);

        expect((await getPost(post.id, player.token)).body.data.payment.paid).toBe(true);
    });

    test('không phải chủ kèo → 403 NOT_AUTHOR', async () => {
        const res = await markPaid(player.token, post.id, player.user.id, true);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NOT_AUTHOR');
    });

    test('người không tham gia kèo → 409 NOT_JOINED', async () => {
        const stranger = await createUserAndLogin();
        const res = await markPaid(owner.token, post.id, stranger.user.id, true);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('NOT_JOINED');
    });

    test('kèo đã hủy → 409 POST_NOT_OPEN', async () => {
        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(owner.token)).expect(200);
        const res = await markPaid(owner.token, post.id, player.user.id, true);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('POST_NOT_OPEN');
    });

    test('paid không phải true/false → 400; chưa đăng nhập → 401; kèo không tồn tại → 404', async () => {
        await markPaid(owner.token, post.id, player.user.id, 'yes').expect(400);
        await request(app).patch(`/api/posts/${post.id}/participants/${player.user.id}/payment`).send({ paid: true }).expect(401);
        await markPaid(owner.token, '6b03ac71dd6dd4f6e0720000', player.user.id, true).expect(404);
    });
});
