// WBS 4.10 — Kho cầu, khoản "Cầu" theo số quả, thống kê đã dùng
const request = require('supertest');
const app = require('../../src/app');
const Post = require('../../src/modules/post/post.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');
const { mondayOf, averagePrice } = require('../../src/modules/shuttle/shuttle.service');
const { shuttleAmount } = require('../../src/modules/post/post.costs');

setupDatabase();

const createPost = async (token) =>
    (
        await request(app)
            .post('/api/posts')
            .set(auth(token))
            .send({
                courtName: 'Sân Thanh Xuân',
                district: 'Thanh Xuân',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots: { any: 3 }
            })
            .expect(201)
    ).body.data;

const addShuttle = (token, body) => request(app).post('/api/shuttles').set(auth(token)).send(body);
const myShuttles = async (token) => (await request(app).get('/api/shuttles').set(auth(token)).expect(200)).body.data;
const saveCosts = (token, postId, expenses) =>
    request(app).put(`/api/posts/${postId}/costs`).set(auth(token)).send({ guests: [], expenses });

describe('Hàm tính', () => {
    test('tiền cầu = số quả × giá, làm tròn lên 1.000đ', () => {
        expect(shuttleAmount(12, 23_333)).toBe(280_000);
        expect(shuttleAmount(6, 23_333)).toBe(140_000);
        expect(shuttleAmount(1, 25_000)).toBe(25_000);
    });

    test('giá bình quân khi nhập thêm; kho hết thì lấy giá mới', () => {
        expect(averagePrice({ quantity: 10, unitPrice: 23_000 }, 12, 300_000)).toBe(24_091);
        expect(averagePrice({ quantity: 0, unitPrice: 23_000 }, 12, 300_000)).toBe(25_000);
    });

    test('thứ Hai đầu tuần theo lịch', () => {
        expect(mondayOf('2026-11-25')).toBe('2026-11-23'); // thứ Tư
        expect(mondayOf('2026-11-23')).toBe('2026-11-23'); // thứ Hai
        expect(mondayOf('2026-11-29')).toBe('2026-11-23'); // Chủ nhật
    });
});

describe('Kho cầu', () => {
    test('thêm loại cầu: chia tổng tiền ra giá mỗi quả; chỉ chủ kho thấy', async () => {
        const me = await createUserAndLogin();
        const other = await createUserAndLogin();
        const res = await addShuttle(me.token, { name: '  Thành Công 77 ', quantity: 24, totalPrice: 560_000 });

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ name: 'Thành Công 77', quantity: 24, unitPrice: 23_333, fullLevel: 24 });
        expect(await myShuttles(other.token)).toEqual([]);
        await request(app).get('/api/shuttles').expect(401);
    });

    test('dữ liệu sai → 400', async () => {
        const me = await createUserAndLogin();
        for (const body of [
            { name: '', quantity: 12, totalPrice: 1 },
            { name: 'A', quantity: 0, totalPrice: 1 },
            { name: 'A', quantity: 1.5, totalPrice: 1 },
            { name: 'A', quantity: 12, totalPrice: -1 },
            { name: 'A'.repeat(41), quantity: 12, totalPrice: 1 }
        ]) {
            const res = await addShuttle(me.token, body);
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        }
    });

    test('nhập thêm: cộng số quả, giá bình quân, thanh mức cầu về 100%', async () => {
        const me = await createUserAndLogin();
        const s = (await addShuttle(me.token, { name: 'VicTec', quantity: 12, totalPrice: 276_000 })).body.data;
        await request(app).patch(`/api/shuttles/${s.id}`).set(auth(me.token)).send({ quantity: 10 }).expect(200);

        const res = await request(app)
            .post(`/api/shuttles/${s.id}/restock`)
            .set(auth(me.token))
            .send({ quantity: 12, totalPrice: 300_000 })
            .expect(200);
        // (23.000 × 10 + 300.000) / 22 = 24.090,9
        expect(res.body.data).toMatchObject({ quantity: 22, unitPrice: 24_091, fullLevel: 22 });
    });

    test('kiểm kê, đổi tên, xóa; người khác không sửa được (404)', async () => {
        const me = await createUserAndLogin();
        const other = await createUserAndLogin();
        const s = (await addShuttle(me.token, { name: 'Hải Yến', quantity: 12, totalPrice: 240_000 })).body.data;

        await request(app).patch(`/api/shuttles/${s.id}`).set(auth(other.token)).send({ quantity: 1 }).expect(404);
        await request(app).delete(`/api/shuttles/${s.id}`).set(auth(other.token)).expect(404);

        const res = await request(app)
            .patch(`/api/shuttles/${s.id}`)
            .set(auth(me.token))
            .send({ name: 'Hải Yến S70', quantity: 30 })
            .expect(200);
        // Kiểm kê nhiều hơn mức đầy cũ → mức đầy mới
        expect(res.body.data).toMatchObject({ name: 'Hải Yến S70', quantity: 30, fullLevel: 30 });

        await request(app).delete(`/api/shuttles/${s.id}`).set(auth(me.token)).expect(200);
        expect(await myShuttles(me.token)).toEqual([]);
        await request(app).delete('/api/shuttles/abc').set(auth(me.token)).expect(404);
    });

    test('tối đa 20 loại cầu', async () => {
        const me = await createUserAndLogin();
        for (let i = 0; i < 20; i += 1) await addShuttle(me.token, { name: `Cầu ${i}`, quantity: 1, totalPrice: 1 }).expect(201);
        const res = await addShuttle(me.token, { name: 'Thừa', quantity: 1, totalPrice: 1 });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('SHUTTLE_LIMIT');
    });
});

describe('Khoản "Cầu" theo số quả (trừ / hoàn kho)', () => {
    test('chọn cầu trong kho: server tính tiền, trừ kho; sửa số quả → trừ thêm / hoàn lại; xóa khoản → hoàn hết', async () => {
        const host = await createUserAndLogin();
        const s = (await addShuttle(host.token, { name: 'Thành Công 77', quantity: 24, totalPrice: 560_000 })).body.data;
        const post = await createPost(host.token);

        const res = await saveCosts(host.token, post.id, [
            { kind: 'shuttle', quantity: 6, unitPrice: s.unitPrice, shuttleId: s.id, amount: 1, everyone: true }
        ]);
        expect(res.status).toBe(200);
        expect(res.body.data.costs.expenses[0]).toMatchObject({
            kind: 'shuttle',
            amount: 140_000,
            quantity: 6,
            unitPrice: 23_333,
            shuttleId: s.id,
            shuttleName: 'Thành Công 77'
        });
        expect((await myShuttles(host.token))[0].quantity).toBe(18);

        await saveCosts(host.token, post.id, [
            { kind: 'shuttle', quantity: 10, unitPrice: s.unitPrice, shuttleId: s.id, everyone: true }
        ]).expect(200);
        expect((await myShuttles(host.token))[0].quantity).toBe(14);

        await saveCosts(host.token, post.id, [
            { kind: 'shuttle', quantity: 4, unitPrice: s.unitPrice, shuttleId: s.id, everyone: true }
        ]).expect(200);
        expect((await myShuttles(host.token))[0].quantity).toBe(20);

        await saveCosts(host.token, post.id, [{ kind: 'court', amount: 200_000, everyone: true }]).expect(200);
        expect((await myShuttles(host.token))[0].quantity).toBe(24);
    });

    test('kho không đủ: vẫn lưu bình thường, kho dừng ở 0', async () => {
        const host = await createUserAndLogin();
        const s = (await addShuttle(host.token, { name: 'Lining', quantity: 5, totalPrice: 100_000 })).body.data;
        const post = await createPost(host.token);

        const res = await saveCosts(host.token, post.id, [
            { kind: 'shuttle', quantity: 12, unitPrice: s.unitPrice, shuttleId: s.id, everyone: true }
        ]);
        expect(res.status).toBe(200);
        expect(res.body.data.costs.total).toBe(240_000);
        expect((await myShuttles(host.token))[0].quantity).toBe(0);
    });

    test('nhập giá tay (không chọn kho); cầu của người khác bị coi như giá tay và kho của họ không đổi', async () => {
        const host = await createUserAndLogin();
        const other = await createUserAndLogin();
        const theirs = (await addShuttle(other.token, { name: 'Của người khác', quantity: 12, totalPrice: 240_000 })).body.data;
        const post = await createPost(host.token);

        const res = await saveCosts(host.token, post.id, [
            { kind: 'shuttle', quantity: 3, unitPrice: 25_000, everyone: true },
            { kind: 'shuttle', quantity: 2, unitPrice: 20_000, shuttleId: theirs.id, everyone: true }
        ]);
        expect(res.status).toBe(200);
        expect(res.body.data.costs.expenses.map((e) => [e.amount, e.shuttleId])).toEqual([
            [75_000, null],
            [40_000, null]
        ]);
        expect((await myShuttles(other.token))[0].quantity).toBe(12);
    });

    test('xóa loại cầu khỏi kho: khoản đã lưu vẫn giữ tên, sửa lại không lỗi', async () => {
        const host = await createUserAndLogin();
        const s = (await addShuttle(host.token, { name: 'Yonex AS30', quantity: 12, totalPrice: 600_000 })).body.data;
        const post = await createPost(host.token);
        const exp = { kind: 'shuttle', quantity: 2, unitPrice: s.unitPrice, shuttleId: s.id, everyone: true };
        await saveCosts(host.token, post.id, [exp]).expect(200);
        await request(app).delete(`/api/shuttles/${s.id}`).set(auth(host.token)).expect(200);

        const res = await saveCosts(host.token, post.id, [{ ...exp, quantity: 3 }]);
        expect(res.status).toBe(200);
        expect(res.body.data.costs.expenses[0]).toMatchObject({ shuttleName: 'Yonex AS30', amount: 150_000 });
    });

    test('số quả / giá sai → 400; khoản cầu kiểu cũ (chỉ số tiền) vẫn dùng được', async () => {
        const host = await createUserAndLogin();
        const post = await createPost(host.token);
        for (const e of [
            { kind: 'shuttle', quantity: 0, unitPrice: 1000, everyone: true },
            { kind: 'shuttle', quantity: 501, unitPrice: 1000, everyone: true },
            { kind: 'shuttle', quantity: 2, unitPrice: -1, everyone: true },
            { kind: 'shuttle', quantity: 2, everyone: true },
            { kind: 'shuttle', quantity: 2, unitPrice: 1000, shuttleId: 'abc', everyone: true }
        ]) {
            const res = await saveCosts(host.token, post.id, [e]);
            expect(res.status).toBe(400);
        }
        const res = await saveCosts(host.token, post.id, [{ kind: 'shuttle', amount: 90_000, everyone: true }]);
        expect(res.status).toBe(200);
        expect(res.body.data.costs.expenses[0]).toMatchObject({ amount: 90_000, quantity: null });
    });
});

describe('Thống kê số quả đã dùng', () => {
    test('tính theo tuần / tháng, chỉ kèo của mình, chưa hủy, đã diễn ra', async () => {
        const host = await createUserAndLogin();
        const other = await createUserAndLogin();
        const now = new Date();
        const mk = async (token, quantity, startsAt, status = 'open') => {
            const p = await createPost(token);
            await saveCosts(token, p.id, [{ kind: 'shuttle', quantity, unitPrice: 20_000, everyone: true }]).expect(200);
            await Post.updateOne({ _id: p.id }, { $set: { startsAt, endsAt: new Date(startsAt.getTime() + 7_200_000), status } });
        };
        await mk(host.token, 6, new Date(now.getTime() - 60_000)); // vừa diễn ra
        await mk(host.token, 4, new Date(now.getTime() - 70 * 86_400_000)); // ~10 tuần trước: ngoài 8 tuần
        await mk(host.token, 9, new Date(now.getTime() - 60_000), 'closed'); // đã hủy: không tính
        await mk(other.token, 5, new Date(now.getTime() - 60_000)); // kèo người khác
        await createPost(host.token); // kèo sắp tới: không tính

        const res = await request(app).get('/api/shuttles/stats').set(auth(host.token)).expect(200);
        const st = res.body.data;
        expect(st.thisWeek).toBe(6);
        expect(st.thisMonth).toBe(6);
        expect(st.weeks).toHaveLength(8);
        expect(st.months).toHaveLength(6);
        expect(st.weeks.reduce((s, w) => s + w.quantity, 0)).toBe(6);
        // Kèo 70 ngày trước nằm trong 6 tháng (trừ khi rơi đúng ngoài biên tháng)
        expect(st.months.reduce((s, m) => s + m.quantity, 0)).toBeGreaterThanOrEqual(6);
    });
});
