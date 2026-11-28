const request = require('supertest');
const sharp = require('sharp');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { PostEvent } = require('../../src/modules/post/postEvent.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

// ── US-22, WBS 6.3 — nhật ký sự kiện của kèo ──

setupDatabase();

const createPost = async (token, slots = { any: 2 }) =>
    (
        await request(app)
            .post('/api/posts')
            .set(auth(token))
            .send({
                courtName: 'Sân Nhật Ký',
                district: 'Long Biên',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots
            })
            .expect(201)
    ).body.data;

/** Danh sách sự kiện của kèo, gọn để so sánh: [loại, mã người hoặc null, meta] */
const eventsOf = async (postId) =>
    (await PostEvent.find({ post: postId }).sort({ at: 1, _id: 1 }).lean()).map((e) => [
        e.type,
        e.user ? String(e.user) : null,
        e.meta ?? null
    ]);

describe('Nhật ký sự kiện của kèo', () => {
    test('đăng → tham gia → đủ người → rời → mở lại → hủy', async () => {
        const host = await createUserAndLogin();
        const a = await createUserAndLogin();
        const b = await createUserAndLogin();
        const post = await createPost(host.token);

        await request(app).post(`/api/posts/${post.id}/join`).set(auth(a.token)).expect(200);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(b.token)).expect(200);
        await request(app).delete(`/api/posts/${post.id}/join`).set(auth(a.token)).expect(200);
        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(host.token)).expect(200);

        expect(await eventsOf(post.id)).toEqual([
            ['created', host.user.id, { slots: 2 }],
            ['join', a.user.id, { slot: 'any' }],
            ['join', b.user.id, { slot: 'any' }],
            ['full', null, null],
            ['leave', a.user.id, { slot: 'any' }],
            ['reopen', null, null],
            ['cancel', host.user.id, null]
        ]);
    });

    test('thao tác bị từ chối (hết chỗ, sai trình độ…) không ghi nhật ký', async () => {
        const host = await createUserAndLogin();
        const a = await createUserAndLogin();
        const b = await createUserAndLogin();
        const post = await createPost(host.token, { any: 1 });
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(a.token)).expect(200);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(b.token)).expect(409);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(a.token)).expect(409);
        expect((await eventsOf(post.id)).map((e) => e[0])).toEqual(['created', 'join', 'full']);
    });

    test('lưu chi phí, đã trả / bỏ đã trả (kèm số tiền), ảnh chuyển khoản, điểm danh', async () => {
        const host = await createUserAndLogin();
        const a = await createUserAndLogin();
        const post = await createPost(host.token);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(a.token)).expect(200);
        await request(app)
            .put(`/api/posts/${post.id}/costs`)
            .set(auth(host.token))
            .send({
                guests: [{ key: 'moi-1', name: 'Tuấn' }],
                expenses: [
                    { kind: 'court', amount: 300_000, everyone: true },
                    { kind: 'food', amount: 100_000, everyone: false, sharedBy: ['host', `u:${a.user.id}`] }
                ]
            })
            .expect(200);
        const pay = (paid) =>
            request(app).patch(`/api/posts/${post.id}/participants/${a.user.id}/payment`).set(auth(host.token)).send({ paid });
        await pay(true).expect(200);
        await pay(false).expect(200);
        const png = await sharp({ create: { width: 300, height: 500, channels: 3, background: '#ddd' } }).png().toBuffer();
        await request(app).post(`/api/posts/${post.id}/proofs`).set(auth(a.token)).attach('image', png, 'ck.png').expect(200);

        // Điểm danh từ giờ bắt đầu
        const start = new Date(Date.now() - 60_000);
        await Post.updateOne({ _id: post.id }, { $set: { startsAt: start, endsAt: new Date(start.getTime() + 7_200_000) } });
        await request(app)
            .put(`/api/posts/${post.id}/attendance`)
            .set(auth(host.token))
            .send({ attendance: [{ userId: a.user.id, attended: false }] })
            .expect(200);

        const ev = (await eventsOf(post.id)).filter((e) => !['created', 'join'].includes(e[0]));
        expect(ev).toEqual([
            ['costs_saved', host.user.id, { total: 400_000, expenses: 2, notAll: 1, guests: 1 }],
            ['paid', a.user.id, { amount: 150_000 }],
            ['unpaid', a.user.id, null],
            ['proof', a.user.id, null],
            ['attendance', a.user.id, { attended: false }]
        ]);
    });

    test('nhật ký chỉ có mã và số: không tên, email, số điện thoại, tên sân', async () => {
        const host = await createUserAndLogin({ phone: '0912000009' });
        const post = await createPost(host.token);
        const raw = JSON.stringify(await PostEvent.find({ post: post.id }).lean());
        for (const secret of [host.user.displayName, host.user.email, '0912000009', 'Sân Nhật Ký']) {
            expect(raw).not.toContain(secret);
        }
    });
});
