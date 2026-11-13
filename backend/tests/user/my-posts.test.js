const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

setupDatabase();

const postBody = (days, courtName, overrides = {}) => ({
    courtName,
    district: 'Cầu Giấy',
    startsAt: vnDateTime(days, 19).toISOString(),
    endsAt: vnDateTime(days, 21).toISOString(),
    levelMin: 'YEU',
    levelMax: 'GIOI',
    pricePerPerson: 50_000,
    slots: { male: 2, female: 2, any: 0 },
    ...overrides
});

const create = async (token, days, courtName) =>
    (await request(app).post('/api/posts').set(auth(token)).send(postBody(days, courtName)).expect(201)).body.data;

describe('GET /api/users/me/posts — kèo của tôi', () => {
    test('trả riêng kèo đã đăng và kèo đã tham gia, mới nhất trước, gồm cả kèo đã hủy và đã qua', async () => {
        const me = await createUserAndLogin({ gender: 'male' });
        const other = await createUserAndLogin();

        const mine1 = await create(me.token, 1, 'Của tôi - mai');
        const mine2 = await create(me.token, 3, 'Của tôi - 3 ngày nữa');
        await request(app).post(`/api/posts/${mine1.id}/cancel`).set(auth(me.token)).expect(200);

        const theirs = await create(other.token, 2, 'Của người khác');
        await create(other.token, 2, 'Không liên quan');
        await request(app).post(`/api/posts/${theirs.id}/join`).set(auth(me.token)).expect(200);

        // Kèo đã qua mà tôi từng tham gia (ghi thẳng DB vì API không cho tạo kèo ở quá khứ)
        const past = await Post.create({
            ...postBody(-2, 'Đã qua'),
            author: other.user.id,
            startsAt: vnDateTime(-2, 19),
            endsAt: vnDateTime(-2, 21),
            participants: [{ user: me.user.id, slot: 'male' }]
        });

        const res = await request(app).get('/api/users/me/posts').set(auth(me.token));

        expect(res.status).toBe(200);
        expect(res.body.data.authored.map((p) => p.id)).toEqual([mine2.id, mine1.id]);
        expect(res.body.data.authored[1].status).toBe('closed');
        expect(res.body.data.joined.map((p) => p.id)).toEqual([theirs.id, String(past._id)]);
        expect(res.body.data.joined[0]).toMatchObject({ courtName: 'Của người khác', participantCount: 1 });
    });

    test('người mới chưa có kèo nào → hai danh sách rỗng', async () => {
        const me = await createUserAndLogin();

        const res = await request(app).get('/api/users/me/posts').set(auth(me.token)).expect(200);
        expect(res.body.data).toEqual({ authored: [], joined: [] });
    });

    test('chưa đăng nhập → 401', async () => {
        await request(app).get('/api/users/me/posts').expect(401);
    });
});
