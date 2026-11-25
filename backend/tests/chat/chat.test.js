// WBS 4.13 — nhắn tin trong app: nhóm theo kèo, nhắn riêng, thời hạn 2 giờ, chặn, chưa đọc, WebSocket
const http = require('http');
const request = require('supertest');
const WebSocket = require('ws');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const hub = require('../../src/modules/chat/chat.hub');
const chat = require('../../src/modules/chat/chat.service');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

setupDatabase();

const createPost = async (token) =>
    (
        await request(app)
            .post('/api/posts')
            .set(auth(token))
            .send({
                courtName: 'Sân Nhắn Tin',
                district: 'Ba Đình',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots: { any: 4 }
            })
            .expect(201)
    ).body.data;

const join = (token, postId) => request(app).post(`/api/posts/${postId}/join`).set(auth(token)).expect(200);
const say = (token, key, text) => request(app).post(`/api/chats/${key}/messages`).set(auth(token)).send({ text });
const openChat = (token, key) => request(app).get(`/api/chats/${key}`).set(auth(token));

/** Chủ kèo A, người chơi B, người ngoài C; kèo ngày mai */
const setup = async () => {
    const a = await createUserAndLogin();
    const b = await createUserAndLogin();
    const c = await createUserAndLogin();
    const post = await createPost(a.token);
    await join(b.token, post.id);
    return { a, b, c, post, key: `p-${post.id}` };
};

beforeEach(() => chat._resetRateLimit());

describe('Nhóm chat của kèo', () => {
    test('người trong kèo nhắn được; người ngoài 403; khách 401; khóa sai 404', async () => {
        const { a, b, c, key } = await setup();
        const res = await say(b.token, key, '  Mình đến muộn 10 phút nhé  ');
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ text: 'Mình đến muộn 10 phút nhé', sender: { id: b.user.id } });

        const seen = await openChat(a.token, key);
        expect(seen.status).toBe(200);
        expect(seen.body.data.conversation).toMatchObject({ kind: 'post', title: 'Sân Nhắn Tin', canSend: true });
        expect(seen.body.data.members.map((m) => m.id)).toEqual([a.user.id, b.user.id]);
        expect(seen.body.data.members[0].isHost).toBe(true);
        expect(seen.body.data.messages.map((m) => m.text)).toEqual(['Mình đến muộn 10 phút nhé']);

        expect((await openChat(c.token, key)).body.code).toBe('NOT_CONNECTED');
        expect((await say(c.token, key, 'xin chào')).status).toBe(403);
        await request(app).get(`/api/chats/${key}`).expect(401);
        await openChat(a.token, 'p-123').expect(404);
        await openChat(a.token, 'abc').expect(404);
    });

    test('người rời kèo mất quyền vào nhóm', async () => {
        const { b, post, key } = await setup();
        await request(app).delete(`/api/posts/${post.id}/join`).set(auth(b.token)).expect(200);
        expect((await openChat(b.token, key)).status).toBe(403);
    });

    test('quá 2 giờ sau giờ kết thúc: chỉ xem lại (409 CHAT_CLOSED khi gửi)', async () => {
        const { a, b, post, key } = await setup();
        await say(b.token, key, 'tin cũ').expect(201);
        const end = new Date(Date.now() - 2 * 3600e3 - 60_000);
        await Post.updateOne({ _id: post.id }, { $set: { startsAt: new Date(end.getTime() - 7_200_000), endsAt: end } });

        const res = await say(a.token, key, 'muộn rồi');
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('CHAT_CLOSED');
        const seen = (await openChat(a.token, key)).body.data;
        expect(seen.conversation.canSend).toBe(false);
        expect(seen.messages.map((m) => m.text)).toEqual(['tin cũ']);

        // Vẫn trong 2 giờ sau khi kết thúc → còn gửi được
        const recent = new Date(Date.now() - 3600e3);
        await Post.updateOne({ _id: post.id }, { $set: { endsAt: recent } });
        expect((await say(a.token, key, 'cảm ơn mọi người')).status).toBe(201);
    });

    test('tin rỗng / quá 1.000 ký tự → 400; quá 20 tin / phút → 429', async () => {
        const { b, key } = await setup();
        expect((await say(b.token, key, '   ')).status).toBe(400);
        expect((await say(b.token, key, 'a'.repeat(1001))).status).toBe(400);
        expect((await say(b.token, key, 123)).status).toBe(400);
        for (let i = 0; i < 20; i += 1) await say(b.token, key, `tin ${i}`).expect(201);
        const res = await say(b.token, key, 'tin 21');
        expect(res.status).toBe(429);
        expect(res.body.code).toBe('RATE_LIMITED');
    });

    test('tải tin cũ theo trang (50 tin / lần)', async () => {
        const { a, b, key } = await setup();
        for (let i = 0; i < 55; i += 1) {
            chat._resetRateLimit();
            await say(i % 2 ? a.token : b.token, key, `tin ${i}`).expect(201);
        }
        const first = (await openChat(a.token, key)).body.data;
        expect(first.messages).toHaveLength(50);
        expect(first.hasMore).toBe(true);
        expect(first.messages.at(-1).text).toBe('tin 54');
        const older = (await request(app).get(`/api/chats/${key}?before=${encodeURIComponent(first.messages[0].at)}`).set(auth(a.token)))
            .body.data;
        expect(older.messages.map((m) => m.text)).toEqual(['tin 0', 'tin 1', 'tin 2', 'tin 3', 'tin 4']);
        expect(older.hasMore).toBe(false);
    });
});

describe('Danh sách và tin chưa đọc', () => {
    test('nhóm của kèo hiện cả khi chưa có tin; tin của người khác = chưa đọc cho tới khi mở', async () => {
        const { a, b, key } = await setup();
        const empty = (await request(app).get('/api/chats').set(auth(a.token))).body.data;
        expect(empty).toHaveLength(1);
        expect(empty[0]).toMatchObject({ key, kind: 'post', lastMessage: null, unread: false, canSend: true });

        await say(b.token, key, 'Ai mang cầu không?').expect(201);
        const list = (await request(app).get('/api/chats').set(auth(a.token))).body.data;
        expect(list[0]).toMatchObject({ key, unread: true, lastMessage: { text: 'Ai mang cầu không?', mine: false } });
        expect((await request(app).get('/api/chats/unread').set(auth(a.token))).body.data.count).toBe(1);
        // Người gửi không thấy tin của mình là chưa đọc
        expect((await request(app).get('/api/chats/unread').set(auth(b.token))).body.data.count).toBe(0);

        // Cuộc có tin đứng trước nhóm chưa có tin (dù kèo đó diễn ra muộn hơn)
        const later = await createPost(a.token);
        const order = (await request(app).get('/api/chats').set(auth(a.token))).body.data.map((x) => x.key);
        expect(order).toEqual([key, `p-${later.id}`]);

        await request(app).post(`/api/chats/${key}/read`).set(auth(a.token)).expect(200);
        expect((await request(app).get('/api/chats/unread').set(auth(a.token))).body.data.count).toBe(0);
    });
});

describe('Nhắn riêng', () => {
    test('chỉ người đã cùng chơi; chặn → không nhắn được cho nhau; bỏ chặn → nhắn lại được', async () => {
        const { a, b, c } = await setup();
        const k = (await request(app).get(`/api/chats/direct/${a.user.id}`).set(auth(b.token)).expect(200)).body.data.key;
        expect(k).toBe(`d-${[a.user.id, b.user.id].sort().join('-')}`);
        await request(app).get(`/api/chats/direct/${c.user.id}`).set(auth(b.token)).expect(403);
        await request(app).get(`/api/chats/direct/${b.user.id}`).set(auth(b.token)).expect(404);

        await say(b.token, k, 'Anh ơi em chuyển khoản rồi nhé').expect(201);
        const list = (await request(app).get('/api/chats').set(auth(a.token))).body.data;
        expect(list.find((x) => x.key === k)).toMatchObject({ kind: 'direct', title: b.user.displayName, unread: true });
        // Người ngoài không đọc được tin riêng của người khác
        expect((await openChat(c.token, k)).status).toBe(404);

        await request(app).post(`/api/chats/blocks/${b.user.id}`).set(auth(a.token)).expect(200);
        const blocked = await say(b.token, k, 'Anh ơi?');
        expect(blocked.status).toBe(409);
        expect(blocked.body.code).toBe('CHAT_CLOSED');
        expect((await openChat(a.token, k)).body.data.conversation).toMatchObject({ blockedByMe: true, canSend: false });

        await request(app).delete(`/api/chats/blocks/${b.user.id}`).set(auth(a.token)).expect(200);
        expect((await say(b.token, k, 'Anh ơi?')).status).toBe(201);
    });

    test('hai người chơi cùng tham gia một kèo cũng nhắn riêng được; quá hạn mọi kèo chung → chỉ xem lại', async () => {
        const { a, b, post } = await setup();
        const d = await createUserAndLogin();
        await join(d.token, post.id);
        const k = (await request(app).get(`/api/chats/direct/${d.user.id}`).set(auth(b.token)).expect(200)).body.data.key;
        await say(b.token, k, 'Chiều mai đánh tiếp không?').expect(201);

        const end = new Date(Date.now() - 3 * 3600e3);
        await Post.updateOne({ _id: post.id }, { $set: { startsAt: new Date(end.getTime() - 7_200_000), endsAt: end } });
        expect((await say(d.token, k, 'Ok')).body.code).toBe('CHAT_CLOSED');
        expect((await openChat(d.token, k)).body.data.messages).toHaveLength(1);
        expect(a).toBeTruthy();
    });
});

describe('WebSocket /api/ws', () => {
    let server;
    let url;

    beforeAll(async () => {
        server = http.createServer(app);
        hub.attach(server);
        await new Promise((r) => server.listen(0, r));
        url = `ws://127.0.0.1:${server.address().port}/api/ws`;
    });
    afterAll(() => new Promise((r) => server.close(r)));

    const connect = (token, origin = process.env.CLIENT_URL || 'http://localhost:5173') =>
        new Promise((resolve, reject) => {
            const ws = new WebSocket(url, { headers: { Origin: origin } });
            const inbox = [];
            ws.on('message', (d) => inbox.push(JSON.parse(String(d))));
            ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
            ws.on('error', reject);
            const wait = setInterval(() => {
                if (inbox.some((m) => m.type === 'ready')) {
                    clearInterval(wait);
                    resolve({ ws, inbox });
                }
            }, 20);
            ws.on('close', (code) => {
                clearInterval(wait);
                reject(Object.assign(new Error('closed'), { code }));
            });
        });

    const until = (fn, ms = 3000) =>
        new Promise((resolve, reject) => {
            const t0 = Date.now();
            const tick = setInterval(() => {
                if (fn()) {
                    clearInterval(tick);
                    resolve();
                } else if (Date.now() - t0 > ms) {
                    clearInterval(tick);
                    reject(new Error('timeout'));
                }
            }, 20);
        });

    test('tin mới được đẩy ngay tới thành viên đang kết nối, không tới người ngoài', async () => {
        const { a, b, c, key } = await setup();
        const ca = await connect(a.token);
        const cc = await connect(c.token);
        await say(b.token, key, 'Tới sân rồi').expect(201);
        await until(() => ca.inbox.some((m) => m.type === 'message'));
        expect(ca.inbox.find((m) => m.type === 'message')).toMatchObject({ key, message: { text: 'Tới sân rồi' } });
        await new Promise((r) => setTimeout(r, 200));
        expect(cc.inbox.some((m) => m.type === 'message')).toBe(false);
        ca.ws.close();
        cc.ws.close();
    });

    test('token sai → đóng (4003); sai địa chỉ web hoặc sai đường dẫn → từ chối', async () => {
        await expect(connect('khong-hop-le')).rejects.toMatchObject({ code: 4003 });
        const me = await createUserAndLogin();
        await expect(connect(me.token, 'https://trang-la.example')).rejects.toThrow();
        await expect(
            new Promise((resolve, reject) => {
                const ws = new WebSocket(url.replace('/api/ws', '/khac'));
                ws.on('open', resolve);
                ws.on('error', reject);
            })
        ).rejects.toThrow();
    });
});
