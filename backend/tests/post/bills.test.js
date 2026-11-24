// WBS 4.11 — ảnh bill / hóa đơn của kèo
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');
const app = require('../../src/app');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');
const { uploadDir } = require('../../src/utils/images');

setupDatabase();

const png = (w, h) =>
    sharp({ create: { width: w, height: h, channels: 3, background: '#fafafa' } }).png().toBuffer();

const createPost = async (token) =>
    (
        await request(app)
            .post('/api/posts')
            .set(auth(token))
            .send({
                courtName: 'Sân Bill',
                district: 'Đống Đa',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots: { any: 2 }
            })
            .expect(201)
    ).body.data;

const upload = async (token, postId, w = 900, h = 1600) =>
    request(app).post(`/api/posts/${postId}/bills`).set(auth(token)).attach('image', await png(w, h), 'bill.png');

describe('Ảnh bill', () => {
    test('chủ kèo tải lên: giữ tỉ lệ, cạnh dài ≤ 1600; người trong kèo thấy, khách và người ngoài không thấy', async () => {
        const host = await createUserAndLogin();
        const player = await createUserAndLogin();
        const outsider = await createUserAndLogin();
        const post = await createPost(host.token);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(player.token)).expect(200);

        const res = await upload(host.token, post.id, 3000, 1000);
        expect(res.status).toBe(200);
        const [bill] = res.body.data.bills;
        expect(bill.url).toMatch(/^\/uploads\/bills\/[a-f0-9]{32}\.webp$/);
        const meta = await sharp(fs.readFileSync(path.join(uploadDir(), 'bills', bill.file))).metadata();
        expect(meta).toMatchObject({ format: 'webp', width: 1600, height: 533 });

        // Ảnh nhỏ không bị phóng to
        const small = (await upload(host.token, post.id, 400, 300)).body.data.bills[1];
        expect(await sharp(fs.readFileSync(path.join(uploadDir(), 'bills', small.file))).metadata()).toMatchObject({
            width: 400,
            height: 300
        });

        const seen = (await request(app).get(`/api/posts/${post.id}`).set(auth(player.token))).body.data;
        expect(seen.bills).toHaveLength(2);
        expect((await request(app).get(`/api/posts/${post.id}`)).body.data.bills).toBeUndefined();
        expect((await request(app).get(`/api/posts/${post.id}`).set(auth(outsider.token))).body.data.bills).toBeUndefined();
    });

    test('tối đa 7 ảnh → ảnh thứ 8 bị từ chối (409 BILL_LIMIT)', async () => {
        const host = await createUserAndLogin();
        const post = await createPost(host.token);
        for (let i = 0; i < 7; i += 1) expect((await upload(host.token, post.id, 200, 200)).status).toBe(200);
        const res = await upload(host.token, post.id, 200, 200);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('BILL_LIMIT');
        expect(fs.readdirSync(path.join(uploadDir(), 'bills')).length).toBeGreaterThanOrEqual(7);
    });

    test('xóa ảnh bill: xóa cả file; tên không có trong kèo → 404', async () => {
        const host = await createUserAndLogin();
        const post = await createPost(host.token);
        const bill = (await upload(host.token, post.id)).body.data.bills[0];
        const file = path.join(uploadDir(), 'bills', bill.file);
        expect(fs.existsSync(file)).toBe(true);

        const res = await request(app).delete(`/api/posts/${post.id}/bills/${bill.file}`).set(auth(host.token));
        expect(res.status).toBe(200);
        expect(res.body.data.bills).toEqual([]);
        expect(fs.existsSync(file)).toBe(false);
        await request(app).delete(`/api/posts/${post.id}/bills/${bill.file}`).set(auth(host.token)).expect(404);
        await request(app).delete(`/api/posts/${post.id}/bills/..%2F..%2Fx`).set(auth(host.token)).expect(404);
    });

    test('không phải chủ kèo → 403; kèo đã hủy → 409; không phải ảnh → 400; chưa đăng nhập → 401', async () => {
        const host = await createUserAndLogin();
        const player = await createUserAndLogin();
        const post = await createPost(host.token);
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(player.token)).expect(200);

        expect((await upload(player.token, post.id)).body.code).toBe('NOT_AUTHOR');
        const bad = await request(app)
            .post(`/api/posts/${post.id}/bills`)
            .set(auth(host.token))
            .attach('image', Buffer.from('not an image'), 'x.png');
        expect(bad.body.code).toBe('INVALID_IMAGE');
        await request(app).post(`/api/posts/${post.id}/bills`).expect(401);

        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(host.token)).expect(200);
        const res = await upload(host.token, post.id);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('POST_NOT_OPEN');
    });
});
