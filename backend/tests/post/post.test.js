const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime, vnDateString } = require('../../src/utils/vnTime');

setupDatabase();

/** Dữ liệu kèo hợp lệ: 19:00–21:00 tối mai (giờ VN) */
const postBody = (overrides = {}) => ({
    courtName: 'Sân Cầu Giấy',
    district: 'Cầu Giấy',
    startsAt: vnDateTime(1, 19).toISOString(),
    endsAt: vnDateTime(1, 21).toISOString(),
    levelMin: 'TB_MINUS',
    levelMax: 'TB_PLUS',
    pricePerPerson: 50_000,
    slots: { male: 1, female: 1, any: 0 },
    ...overrides
});

const createPost = async (token, overrides) => {
    const res = await request(app).post('/api/posts').set(auth(token)).send(postBody(overrides)).expect(201);
    return res.body.data;
};

const join = (token, id) => request(app).post(`/api/posts/${id}/join`).set(auth(token));
const leave = (token, id) => request(app).delete(`/api/posts/${id}/join`).set(auth(token));
const cancel = (token, id) => request(app).post(`/api/posts/${id}/cancel`).set(auth(token));

let owner;
beforeEach(async () => {
    owner = await createUserAndLogin({ displayName: 'Chủ kèo', email: 'owner@test.com' });
});

describe('POST /api/posts — tạo kèo', () => {
    test('chưa đăng nhập → 401', async () => {
        await request(app).post('/api/posts').send(postBody()).expect(401);
    });

    test('hợp lệ → 201: status open, còn đủ chỗ, chưa ai tham gia, có tên chủ kèo (không có email)', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set(auth(owner.token))
            .send(postBody({ note: '  Mang nước  ', rawText: 'Tối mai 19h-21h thiếu 1 nam 1 nữ' }));

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            courtName: 'Sân Cầu Giấy',
            status: 'open',
            slots: { male: 1, female: 1, any: 0 },
            remaining: { male: 1, female: 1, any: 0 },
            participantCount: 0,
            participants: [],
            note: 'Mang nước',
            author: { id: owner.user.id, displayName: 'Chủ kèo' }
        });
        expect(JSON.stringify(res.body.data)).not.toContain('owner@test.com');

        // Nội dung gốc được lưu để đánh giá bộ trích xuất, nhưng không trả ra API
        const saved = await Post.findById(res.body.data.id);
        expect(saved.rawText).toBe('Tối mai 19h-21h thiếu 1 nam 1 nữ');
        expect(res.body.data).not.toHaveProperty('rawText');
    });

    test('loại chỗ không gửi lên → mặc định 0', async () => {
        const post = await createPost(owner.token, { slots: { any: 3 } });

        expect(post.slots).toEqual({ male: 0, female: 0, any: 3 });
    });

    test('BR-02 giờ kết thúc trước giờ bắt đầu → 400, field endsAt', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set(auth(owner.token))
            .send(postBody({ endsAt: vnDateTime(1, 18).toISOString() }));

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors).toEqual([{ field: 'endsAt', msg: 'Giờ kết thúc phải sau giờ bắt đầu' }]);
    });

    test('BR-01 giờ bắt đầu ở quá khứ → 400, field startsAt', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set(auth(owner.token))
            .send(postBody({ startsAt: vnDateTime(-1, 19).toISOString(), endsAt: vnDateTime(-1, 21).toISOString() }));

        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field)).toContain('startsAt');
    });

    test('sai kiểu dữ liệu → 400, liệt kê từng trường', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set(auth(owner.token))
            .send(postBody({ district: 'Sao Hỏa', levelMin: 'PRO', pricePerPerson: 50_000.5, startsAt: 'ngày mai', slots: { male: -1 } }));

        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['district', 'levelMin', 'pricePerPerson', 'slots.male', 'startsAt']);
    });

    test('không cho client tự đặt người tham gia / trạng thái / chủ kèo', async () => {
        const other = await createUserAndLogin();
        const post = await createPost(owner.token, {
            status: 'full',
            author: other.user.id,
            participants: [{ user: other.user.id, slot: 'male' }]
        });

        expect(post).toMatchObject({ status: 'open', participants: [], author: { id: owner.user.id } });
    });
});

describe('GET /api/posts — danh sách', () => {
    test('chỉ kèo sắp diễn ra và chưa hủy, sắp theo giờ bắt đầu; không cần đăng nhập', async () => {
        const later = await createPost(owner.token, { courtName: 'Sau', startsAt: vnDateTime(2, 19).toISOString(), endsAt: vnDateTime(2, 21).toISOString() });
        const sooner = await createPost(owner.token, { courtName: 'Trước' });
        const cancelled = await createPost(owner.token, { courtName: 'Đã hủy' });
        await cancel(owner.token, cancelled.id).expect(200);
        // Kèo đã qua (ghi thẳng vào DB, vì API không cho tạo kèo ở quá khứ)
        await Post.create({ ...postBody({ courtName: 'Đã qua' }), author: owner.user.id, startsAt: vnDateTime(-1, 19), endsAt: vnDateTime(-1, 21) });

        const res = await request(app).get('/api/posts').expect(200);

        expect(res.body.data.map((p) => p.id)).toEqual([sooner.id, later.id]);
        expect(res.body.data[0]).not.toHaveProperty('participants');
    });

    test('lọc theo khu vực', async () => {
        await createPost(owner.token);
        await createPost(owner.token, { courtName: 'Sân Long Biên', district: 'Long Biên' });

        const res = await request(app).get('/api/posts').query({ district: 'Long Biên' }).expect(200);

        expect(res.body.data.map((p) => p.courtName)).toEqual(['Sân Long Biên']);
    });

    test('lọc theo ngày THEO GIỜ VIỆT NAM (kèo 5h30 sáng không bị tính sang hôm trước như giờ UTC)', async () => {
        await createPost(owner.token, { courtName: 'Tối mai' });
        await createPost(owner.token, {
            courtName: 'Sáng ngày kia',
            startsAt: vnDateTime(2, 5, 30).toISOString(),
            endsAt: vnDateTime(2, 7, 30).toISOString()
        });

        const res = await request(app).get('/api/posts').query({ date: vnDateString(vnDateTime(2, 12)) }).expect(200);

        expect(res.body.data.map((p) => p.courtName)).toEqual(['Sáng ngày kia']);
    });

    test('BR-09 lọc theo trình độ người xem', async () => {
        await createPost(owner.token, { courtName: 'Kèo TB' });
        await createPost(owner.token, { courtName: 'Kèo Khá', levelMin: 'KHA', levelMax: 'GIOI' });

        const res = await request(app).get('/api/posts').query({ level: 'GIOI' }).expect(200);
        expect(res.body.data.map((p) => p.courtName)).toEqual(['Kèo Khá']);

        const tb = await request(app).get('/api/posts').query({ level: 'TB' }).expect(200);
        expect(tb.body.data.map((p) => p.courtName)).toEqual(['Kèo TB']);
    });

    test('tham số lọc sai → 400', async () => {
        const res = await request(app).get('/api/posts').query({ date: '07/01/2027', district: 'Sao Hỏa', level: 'PRO' });

        expect(res.status).toBe(400);
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['date', 'district', 'level']);
    });
});

describe('GET /api/posts/:id — chi tiết', () => {
    test('kèo không tồn tại / id sai định dạng → 404 NOT_FOUND', async () => {
        for (const id of ['665f1f77bcf86cd799439011', 'khong-phai-id']) {
            const res = await request(app).get(`/api/posts/${id}`);
            expect(res.status).toBe(404);
            expect(res.body.code).toBe('NOT_FOUND');
        }
    });
});

describe('Tham gia / rời kèo', () => {
    test('luồng đầy đủ: nam vào chỗ nam → nữ vào → full → nam rời → open, trả lại đúng chỗ', async () => {
        const post = await createPost(owner.token, { slots: { male: 1, female: 1, any: 0 } });
        const nam = await createUserAndLogin({ gender: 'male', level: 'TB', displayName: 'An' });
        const nu = await createUserAndLogin({ gender: 'female', level: 'TB_MINUS', displayName: 'Bình' });

        let res = await join(nam.token, post.id).expect(200);
        expect(res.body.data.participants).toEqual([
            { id: nam.user.id, displayName: 'An', gender: 'male', level: 'TB', slot: 'male', joinedAt: expect.any(String) }
        ]);
        expect(res.body.data.status).toBe('open');

        res = await join(nu.token, post.id).expect(200);
        expect(res.body.data.status).toBe('full');
        expect(res.body.data.remaining).toEqual({ male: 0, female: 0, any: 0 });

        res = await leave(nam.token, post.id).expect(200);
        expect(res.body.data.status).toBe('open');
        expect(res.body.data.remaining).toEqual({ male: 1, female: 0, any: 0 });
        expect(res.body.data.participants.map((p) => p.displayName)).toEqual(['Bình']);
    });

    test.each([
        ['BR-07', 'IS_AUTHOR', async (post) => join(owner.token, post.id)],
        ['BR-09', 'LEVEL_MISMATCH', async (post) => join((await createUserAndLogin({ level: 'GIOI' })).token, post.id)],
        ['BR-12', 'NOT_JOINED', async (post) => leave((await createUserAndLogin()).token, post.id)],
        ['BR-10', 'NO_SLOT', async (post) => {
            await join((await createUserAndLogin({ gender: 'female', level: 'TB' })).token, post.id).expect(200);
            return join((await createUserAndLogin({ gender: 'female', level: 'TB' })).token, post.id);
        }]
    ])('%s → 409 %s', async (_br, code, act) => {
        const post = await createPost(owner.token);

        const res = await act(post);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe(code);
    });

    test('BR-08 không tham gia hai lần', async () => {
        const post = await createPost(owner.token);
        const p = await createUserAndLogin();

        await join(p.token, post.id).expect(200);
        const res = await join(p.token, post.id);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('ALREADY_JOINED');
    });

    test('BR-06 kèo đã bắt đầu → không tham gia / rời được', async () => {
        const p = await createUserAndLogin();
        const started = await Post.create({
            ...postBody(),
            author: owner.user.id,
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 3_600_000),
            participants: [{ user: p.user.id, slot: 'male' }]
        });

        expect((await join((await createUserAndLogin()).token, started.id)).body.code).toBe('POST_STARTED');
        expect((await leave(p.token, started.id)).body.code).toBe('POST_STARTED');
    });

    test('BR-10/BR-11 năm người bấm tham gia CÙNG LÚC kèo còn 2 chỗ → đúng 2 người vào được', async () => {
        const post = await createPost(owner.token, { slots: { male: 0, female: 0, any: 2 } });
        const players = await Promise.all([1, 2, 3, 4, 5].map(() => createUserAndLogin()));

        const results = await Promise.all(players.map((p) => join(p.token, post.id)));

        expect(results.filter((r) => r.status === 200)).toHaveLength(2);
        for (const r of results.filter((x) => x.status !== 200)) {
            expect(r.status).toBe(409);
            expect(['POST_NOT_OPEN', 'NO_SLOT']).toContain(r.body.code);
        }
        const saved = await Post.findById(post.id);
        expect(saved.participants).toHaveLength(2);
        expect(saved.status).toBe('full');
    });

    test('chưa đăng nhập → 401; kèo không tồn tại → 404', async () => {
        const post = await createPost(owner.token);
        await request(app).post(`/api/posts/${post.id}/join`).expect(401);

        const p = await createUserAndLogin();
        const res = await join(p.token, '665f1f77bcf86cd799439011');
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });
});

describe('POST /api/posts/:id/cancel — hủy kèo', () => {
    test('BR-13 chủ kèo hủy → closed, người đã tham gia không rời / người mới không vào được', async () => {
        const post = await createPost(owner.token);
        const p = await createUserAndLogin();
        await join(p.token, post.id).expect(200);

        const res = await cancel(owner.token, post.id);
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('closed');

        expect((await join((await createUserAndLogin()).token, post.id)).body.code).toBe('POST_NOT_OPEN');
        expect((await leave(p.token, post.id)).body.code).toBe('POST_NOT_OPEN');
        expect((await cancel(owner.token, post.id)).body.code).toBe('POST_NOT_OPEN');
    });

    test('BR-13 người khác hủy → 403 NOT_AUTHOR', async () => {
        const post = await createPost(owner.token);
        const p = await createUserAndLogin();

        const res = await cancel(p.token, post.id);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NOT_AUTHOR');
    });
});
