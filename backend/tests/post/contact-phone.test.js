const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

// ── WBS 4.16 — số liên hệ của từng kèo: đăng kèo, đổi số, Lịch sử, chat riêng ──

setupDatabase();

const createPost = (token, extra = {}) =>
    request(app)
        .post('/api/posts')
        .set(auth(token))
        .send({
            courtName: 'Sân Liên Hệ',
            district: 'Đống Đa',
            startsAt: vnDateTime(1, 19).toISOString(),
            endsAt: vnDateTime(1, 21).toISOString(),
            levelMin: 'YEU',
            levelMax: 'GIOI',
            pricePerPerson: 50_000,
            slots: { any: 3 },
            ...extra
        });

const join = (token, id) => request(app).post(`/api/posts/${id}/join`).set(auth(token)).expect(200);
const detail = async (token, id) => {
    const req = request(app).get(`/api/posts/${id}`);
    return (await (token ? req.set(auth(token)) : req).expect(200)).body.data;
};
const setPhone = (token, id, contactPhone) =>
    request(app).patch(`/api/posts/${id}/contact-phone`).set(auth(token)).send({ contactPhone });

describe('Số liên hệ khi đăng kèo', () => {
    test('số riêng của kèo khác số hồ sơ: người tham gia thấy số của kèo, khách và người ngoài không thấy', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin();
        const outsider = await createUserAndLogin();
        const post = (await createPost(host.token, { contactPhone: '+84 987 654 321' }).expect(201)).body.data;
        expect(post.author.phone).toBe('0987654321');
        await join(player.token, post.id);

        expect((await detail(player.token, post.id)).author.phone).toBe('0987654321');
        expect((await detail(outsider.token, post.id)).author.phone).toBeUndefined();
        expect((await detail(null, post.id)).author.phone).toBeUndefined();
        // Số trong hồ sơ không đổi
        expect((await User.findById(host.user.id)).phone).toBe('0912000001');
    });

    test('để trống = không để số, kể cả khi hồ sơ có số', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const post = (await createPost(host.token, { contactPhone: '' }).expect(201)).body.data;
        expect(post.author.phone).toBeNull();
        expect((await Post.findById(post.id)).contactPhone).toBeNull();
    });

    test('kèo cũ (không có trường số liên hệ) dùng số trong hồ sơ', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const post = (await createPost(host.token).expect(201)).body.data;
        expect((await Post.findById(post.id)).contactPhone).toBeUndefined();
        expect(post.author.phone).toBe('0912000001');
    });

    test('"Lưu vào hồ sơ" chỉ khi hồ sơ chưa có số; không ghi đè số cũ', async () => {
        const empty = await createUserAndLogin();
        await createPost(empty.token, { contactPhone: '0987654321', savePhone: true }).expect(201);
        expect((await User.findById(empty.user.id)).phone).toBe('0987654321');

        const has = await createUserAndLogin({ phone: '0912000001' });
        await createPost(has.token, { contactPhone: '0987654321', savePhone: true }).expect(201);
        expect((await User.findById(has.user.id)).phone).toBe('0912000001');

        const no = await createUserAndLogin();
        await createPost(no.token, { contactPhone: '0987654321' }).expect(201);
        expect((await User.findById(no.user.id)).phone).toBeUndefined();
    });

    test('số sai định dạng hoặc savePhone sai kiểu bị từ chối, chỉ rõ ô sai', async () => {
        const host = await createUserAndLogin();
        const bad = await createPost(host.token, { contactPhone: '12345' }).expect(400);
        expect(bad.body.errors.map((e) => e.field)).toContain('contactPhone');
        const badFlag = await createPost(host.token, { contactPhone: '0987654321', savePhone: 'yes' }).expect(400);
        expect(badFlag.body.errors.map((e) => e.field)).toContain('savePhone');
    });
});

describe('Đổi số liên hệ sau khi đăng', () => {
    test('chủ kèo đổi, xóa số; người tham gia thấy ngay', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin();
        const post = (await createPost(host.token).expect(201)).body.data;
        await join(player.token, post.id);

        const changed = await setPhone(host.token, post.id, '0901 234 567').expect(200);
        expect(changed.body.data.author.phone).toBe('0901234567');
        expect((await detail(player.token, post.id)).author.phone).toBe('0901234567');

        await setPhone(host.token, post.id, '').expect(200);
        expect((await detail(player.token, post.id)).author.phone).toBeNull();
    });

    test('không phải chủ kèo 403, số sai 400, thiếu số 400, kèo đã hủy 409, kèo không có 404', async () => {
        const host = await createUserAndLogin();
        const player = await createUserAndLogin();
        const post = (await createPost(host.token).expect(201)).body.data;
        await join(player.token, post.id);

        expect((await setPhone(player.token, post.id, '0901234567').expect(403)).body.code).toBe('NOT_AUTHOR');
        await setPhone(host.token, post.id, 'abc').expect(400);
        await request(app).patch(`/api/posts/${post.id}/contact-phone`).set(auth(host.token)).send({}).expect(400);
        await setPhone(host.token, '64b000000000000000000000', '0901234567').expect(404);
        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(host.token)).expect(200);
        expect((await setPhone(host.token, post.id, '0901234567').expect(409)).body.code).toBe('POST_NOT_OPEN');
    });
});

describe('Lịch sử: số chủ kèo ở kèo đã tham gia', () => {
    test('kèo sắp diễn ra có hostPhone; kèo đã hủy, kèo đã qua, kèo mình đăng thì không', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin();
        const upcoming = (await createPost(host.token, { contactPhone: '0987654321' }).expect(201)).body.data;
        const cancelled = (await createPost(host.token).expect(201)).body.data;
        const past = (await createPost(host.token).expect(201)).body.data;
        for (const p of [upcoming, cancelled, past]) await join(player.token, p.id);
        await request(app).post(`/api/posts/${cancelled.id}/cancel`).set(auth(host.token)).expect(200);
        await Post.updateOne(
            { _id: past.id },
            { $set: { startsAt: new Date(Date.now() - 4 * 3600_000), endsAt: new Date(Date.now() - 2 * 3600_000) } }
        );

        const mine = (await request(app).get('/api/users/me/posts').set(auth(player.token)).expect(200)).body.data;
        const byId = new Map(mine.joined.map((p) => [p.id, p]));
        expect(byId.get(upcoming.id).hostPhone).toBe('0987654321');
        expect(byId.get(cancelled.id)).not.toHaveProperty('hostPhone');
        expect(byId.get(past.id)).not.toHaveProperty('hostPhone');

        const hostView = (await request(app).get('/api/users/me/posts').set(auth(host.token)).expect(200)).body.data;
        expect(hostView.authored.every((p) => !('hostPhone' in p))).toBe(true);
        // Danh sách kèo công khai không bao giờ có số
        const list = (await request(app).get('/api/posts').expect(200)).body.data;
        expect(JSON.stringify(list)).not.toMatch(/0987654321|0912000001/);
    });
});

describe('Chat riêng: số của người kia', () => {
    const key = (a, b) => `d-${[a, b].sort().join('-')}`;
    const openDirect = async (me, other) =>
        (await request(app).get(`/api/chats/${key(me.user.id, other.user.id)}`).set(auth(me.token)).expect(200)).body.data
            .conversation.other;

    test('còn chung kèo: thấy số; chủ kèo có số riêng của kèo thì dùng số đó', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin({ phone: '0912000002' });
        const post = (await createPost(host.token, { contactPhone: '0987654321' }).expect(201)).body.data;
        await join(player.token, post.id);

        expect((await openDirect(player, host)).phone).toBe('0987654321');
        expect((await openDirect(host, player)).phone).toBe('0912000002');
    });

    test('kèo chung đã hủy hoặc đã kết thúc quá 2 giờ: không còn số; bị chặn: không có số', async () => {
        const host = await createUserAndLogin({ phone: '0912000001' });
        const player = await createUserAndLogin({ phone: '0912000002' });
        const post = (await createPost(host.token).expect(201)).body.data;
        await join(player.token, post.id);

        await Post.updateOne(
            { _id: post.id },
            { $set: { startsAt: new Date(Date.now() - 6 * 3600_000), endsAt: new Date(Date.now() - 3 * 3600_000) } }
        );
        expect((await openDirect(player, host)).phone).toBeNull();

        await Post.updateOne({ _id: post.id }, { $set: { startsAt: vnDateTime(1, 19), endsAt: vnDateTime(1, 21) } });
        expect((await openDirect(player, host)).phone).toBe('0912000001');
        await request(app).post(`/api/chats/blocks/${host.user.id}`).set(auth(player.token)).expect(200);
        expect((await openDirect(host, player)).phone).toBeNull();
        expect((await openDirect(player, host)).phone).toBeNull();

        await request(app).delete(`/api/chats/blocks/${host.user.id}`).set(auth(player.token)).expect(200);
        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(host.token)).expect(200);
        expect((await openDirect(player, host)).phone).toBeNull();
    });
});
