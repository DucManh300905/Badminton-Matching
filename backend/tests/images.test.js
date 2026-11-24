// WBS 4.9 — ảnh đại diện, ảnh bìa kèo
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');
const app = require('../src/app');
const { setupDatabase } = require('./helpers/db');
const { createUserAndLogin, auth } = require('./helpers/auth');
const { vnDateTime } = require('../src/utils/vnTime');
const { uploadDir } = require('../src/utils/images');

setupDatabase();

const png = (w = 800, h = 600) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 160, b: 90 } } }).png().toBuffer();

/** JPEG có EXIF chứa tọa độ GPS (giống ảnh chụp bằng điện thoại) */
const jpegWithGps = () =>
    sharp({ create: { width: 640, height: 480, channels: 3, background: '#888' } })
        .jpeg()
        .withExif({ IFD0: { Copyright: 'Nguoi chup' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '21/1 1/1 0/1' } })
        .toBuffer();

const fileOf = (url) => path.join(uploadDir(), url.replace(/^\/uploads\//, ''));

const createPost = async (token) =>
    (
        await request(app)
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
                slots: { any: 2 }
            })
            .expect(201)
    ).body.data;

describe('Ảnh đại diện', () => {
    test('tải lên → WebP 256×256, avatarUrl có trong hồ sơ và ở các kèo của người đó; đổi ảnh thì ảnh cũ bị xóa', async () => {
        const me = await createUserAndLogin();
        const res = await request(app).put('/api/users/me/avatar').set(auth(me.token)).attach('image', await png(), 'a.png');

        expect(res.status).toBe(200);
        const url = res.body.data.avatarUrl;
        expect(url).toMatch(/^\/uploads\/avatars\/[a-f0-9]{32}\.webp$/);
        const meta = await sharp(fs.readFileSync(fileOf(url))).metadata();
        expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256 });

        // Ảnh được phục vụ qua /uploads khi chạy trên máy
        await request(app).get(url).expect(200).expect('Content-Type', /image\/webp/);

        const post = await createPost(me.token);
        expect((await request(app).get(`/api/posts/${post.id}`)).body.data.author.avatarUrl).toBe(url);

        const again = await request(app).put('/api/users/me/avatar').set(auth(me.token)).attach('image', await png(), 'b.png');
        expect(again.body.data.avatarUrl).not.toBe(url);
        expect(fs.existsSync(fileOf(url))).toBe(false);
    });

    test('ảnh chụp có GPS → EXIF (kể cả vị trí) bị xóa sạch', async () => {
        const me = await createUserAndLogin();
        expect((await sharp(await jpegWithGps()).metadata()).exif).toBeDefined();

        const res = await request(app).put('/api/users/me/avatar').set(auth(me.token)).attach('image', await jpegWithGps(), 'gps.jpg');

        const meta = await sharp(fs.readFileSync(fileOf(res.body.data.avatarUrl))).metadata();
        expect(meta.exif).toBeUndefined();
    });

    test('xóa ảnh đại diện → avatarUrl null, file bị xóa', async () => {
        const me = await createUserAndLogin();
        const url = (await request(app).put('/api/users/me/avatar').set(auth(me.token)).attach('image', await png(), 'a.png')).body.data
            .avatarUrl;

        const res = await request(app).delete('/api/users/me/avatar').set(auth(me.token)).expect(200);

        expect(res.body.data.avatarUrl).toBeNull();
        expect(fs.existsSync(fileOf(url))).toBe(false);
    });

    test.each([
        ['file không phải ảnh', () => Buffer.from('day khong phai anh'), 400, 'INVALID_IMAGE'],
        ['ảnh GIF (định dạng không nhận)', () => sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer(), 400, 'INVALID_IMAGE'],
        ['file quá 5 MB', () => Buffer.alloc(5 * 1024 * 1024 + 10), 413, 'FILE_TOO_LARGE']
    ])('%s → %i %s', async (_n, make, status, code) => {
        const me = await createUserAndLogin();
        const res = await request(app).put('/api/users/me/avatar').set(auth(me.token)).attach('image', await make(), 'x.bin');
        expect(res.status).toBe(status);
        expect(res.body.code).toBe(code);
    });

    test('không gửi file → 400; chưa đăng nhập → 401', async () => {
        const me = await createUserAndLogin();
        expect((await request(app).put('/api/users/me/avatar').set(auth(me.token))).body.code).toBe('INVALID_IMAGE');
        await request(app).put('/api/users/me/avatar').attach('image', await png(), 'a.png').expect(401);
    });
});

describe('Ảnh bìa kèo', () => {
    test('chủ kèo tải lên → WebP 1200×630, coverUrl ở danh sách và chi tiết; xóa được', async () => {
        const owner = await createUserAndLogin();
        const post = await createPost(owner.token);
        expect(post.coverUrl).toBeNull();

        const res = await request(app).put(`/api/posts/${post.id}/cover`).set(auth(owner.token)).attach('image', await png(1600, 1200), 'c.png');

        expect(res.status).toBe(200);
        const url = res.body.data.coverUrl;
        expect(await sharp(fs.readFileSync(fileOf(url))).metadata()).toMatchObject({ format: 'webp', width: 1200, height: 630 });
        const list = (await request(app).get('/api/posts')).body.data;
        expect(list.find((p) => p.id === post.id).coverUrl).toBe(url);

        const del = await request(app).delete(`/api/posts/${post.id}/cover`).set(auth(owner.token)).expect(200);
        expect(del.body.data.coverUrl).toBeNull();
        expect(fs.existsSync(fileOf(url))).toBe(false);
    });

    test('người khác → 403; kèo đã hủy → 409; kèo không tồn tại → 404', async () => {
        const owner = await createUserAndLogin();
        const other = await createUserAndLogin();
        const post = await createPost(owner.token);

        const forbidden = await request(app).put(`/api/posts/${post.id}/cover`).set(auth(other.token)).attach('image', await png(), 'c.png');
        expect(forbidden.status).toBe(403);

        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(owner.token)).expect(200);
        const closed = await request(app).put(`/api/posts/${post.id}/cover`).set(auth(owner.token)).attach('image', await png(), 'c.png');
        expect(closed.body.code).toBe('POST_NOT_OPEN');

        await request(app).delete('/api/posts/6b03ac71dd6dd4f6e0720000/cover').set(auth(owner.token)).expect(404);
    });
});
