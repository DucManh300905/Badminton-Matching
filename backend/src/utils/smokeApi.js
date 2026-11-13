// Kiểm tra nhanh API đang chạy thật (server + MongoDB trên máy), in [ĐẠT] / [LỖI] từng bước.
// Cần: server đang chạy (npm run dev) và đã có dữ liệu mẫu (npm run seed:demo).
// Chạy: npm run smoke
// Tài khoản / kèo tạo ra trong lúc kiểm tra được xóa ở cuối.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const API = process.env.SMOKE_API_URL || `http://localhost:${process.env.PORT || 8080}/api`;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@123';
const RUN_ID = Date.now();
const TEST_DOMAIN = '@smoke.local';

let passed = 0;
let failed = 0;

const check = (ok, label, detail = '') => {
    if (ok) passed += 1;
    else failed += 1;
    console.log(`${ok ? '[ĐẠT]' : '[LỖI]'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const call = async (method, path, body, token) => {
    const res = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: body && JSON.stringify(body)
    });
    return { status: res.status, body: await res.json() };
};

const login = async (name) => (await call('POST', '/auth/login', { email: `${name}@example.com`, password: DEMO_PASSWORD })).body.data?.token;

const run = async () => {
    console.log(`Kiểm tra API tại ${API}\n`);

    const health = await call('GET', '/health').catch(() => null);
    if (!health) {
        console.log('[LỖI] Không kết nối được server. Hãy chạy "npm run dev" ở một terminal khác trước.');
        process.exitCode = 1;
        return;
    }
    check(health.status === 200, 'Server đang chạy');

    const thu = await login('thu');
    const hung = await login('hung');
    if (!thu || !hung) {
        console.log('[LỖI] Không đăng nhập được tài khoản mẫu. Hãy chạy "npm run seed:demo" trước.');
        process.exitCode = 1;
        return;
    }
    check(true, 'Đăng nhập tài khoản mẫu (thu, hung @example.com)');

    const me = await call('GET', '/users/me', null, thu);
    check(me.status === 200 && me.body.data.email === 'thu@example.com', 'Xem hồ sơ của mình', me.body.data?.displayName);

    const wrong = await call('POST', '/auth/login', { email: 'thu@example.com', password: 'sai-mat-khau' });
    check(wrong.status === 401 && wrong.body.code === 'INVALID_CREDENTIALS', 'Sai mật khẩu → 401 INVALID_CREDENTIALS');

    const list = await call('GET', '/posts');
    check(list.status === 200 && list.body.data.length > 0, 'Danh sách kèo sắp diễn ra', `${list.body.data.length} kèo`);

    const gioi = await call('GET', '/posts?level=GIOI');
    check(gioi.status === 200, 'Lọc theo trình độ Giỏi', gioi.body.data.map((p) => p.courtName).join(', ') || '(không có)');

    const parse = await call('POST', '/parse', { text: 'Tối mai 7h-9h sân Mỹ Đình tuyển 2 nam TB+ trở lên, 60k/ng' });
    const p = parse.body.data;
    check(
        parse.status === 200 && p.start?.hour === 19 && p.slots?.male === 2 && p.levelMax === 'GIOI' && p.pricePerPerson === 60_000,
        'Dán bài → tự điền',
        `19h–21h, 2 nam, TB+ trở lên, 60.000đ (độ tin cậy ${p.confidence})`
    );

    const start = new Date(Date.now() + 24 * 3600 * 1000);
    const created = await call(
        'POST',
        '/posts',
        {
            courtName: `Sân kiểm tra ${RUN_ID}`,
            district: 'Thanh Xuân',
            startsAt: start.toISOString(),
            endsAt: new Date(start.getTime() + 2 * 3600 * 1000).toISOString(),
            levelMin: 'YEU',
            levelMax: 'GIOI',
            pricePerPerson: 40_000,
            slots: { any: 2 }
        },
        hung
    );
    check(created.status === 201 && created.body.data.status === 'open', 'Hùng đăng kèo 2 chỗ');
    const postId = created.body.data.id;

    const notLoggedIn = await call('POST', `/posts/${postId}/join`);
    check(notLoggedIn.status === 401, 'Chưa đăng nhập mà tham gia → 401');

    const self = await call('POST', `/posts/${postId}/join`, null, hung);
    check(self.status === 409 && self.body.code === 'IS_AUTHOR', 'Chủ kèo tự tham gia → 409 IS_AUTHOR');

    const players = [];
    for (let i = 1; i <= 5; i++) {
        const reg = await call('POST', '/auth/register', {
            email: `smoke${RUN_ID}-${i}${TEST_DOMAIN}`,
            password: `Smoke@${RUN_ID}`,
            displayName: `Người thử ${i}`,
            gender: 'male',
            level: 'TB'
        });
        players.push(reg.body.data.token);
    }
    const results = await Promise.all(players.map((t) => call('POST', `/posts/${postId}/join`, null, t)));
    const ok = results.filter((r) => r.status === 200).length;
    check(ok === 2, '5 người tham gia CÙNG LÚC kèo còn 2 chỗ → đúng 2 người vào', results.map((r) => (r.status === 200 ? '200' : `409 ${r.body.code}`)).join(', '));

    const detail = await call('GET', `/posts/${postId}`);
    check(detail.body.data.participants.length === 2 && detail.body.data.status === 'full', 'Kèo chuyển sang "đủ người"');

    const leave = await call('DELETE', `/posts/${postId}/join`, null, players[results.findIndex((r) => r.status === 200)]);
    check(leave.status === 200 && leave.body.data.status === 'open', 'Một người rời → kèo mở lại');

    const otherCancel = await call('POST', `/posts/${postId}/cancel`, null, thu);
    check(otherCancel.status === 403 && otherCancel.body.code === 'NOT_AUTHOR', 'Người khác hủy kèo → 403 NOT_AUTHOR');

    const cancel = await call('POST', `/posts/${postId}/cancel`, null, hung);
    check(cancel.status === 200 && cancel.body.data.status === 'closed', 'Chủ kèo hủy kèo');

    const after = await call('GET', '/posts');
    check(!after.body.data.some((x) => x.id === postId), 'Kèo đã hủy không còn trong danh sách');
};

const cleanup = async () => {
    if (!process.env.MONGODB_URI) return;
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ email: { $regex: `smoke${RUN_ID}-` } }).toArray();
    await db.collection('posts').deleteMany({ courtName: `Sân kiểm tra ${RUN_ID}` });
    await db.collection('users').deleteMany({ _id: { $in: users.map((u) => u._id) } });
    await mongoose.disconnect();
};

run()
    .catch((error) => {
        failed += 1;
        console.log(`[LỖI] Lỗi không mong đợi: ${error.message}`);
    })
    .finally(async () => {
        await cleanup().catch(() => {});
        if (passed + failed > 0) {
            console.log(`\n${failed === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ BƯỚC LỖI'}: ${passed} đạt, ${failed} lỗi (đã dọn dữ liệu thử)`);
        }
        if (failed > 0) process.exitCode = 1;
    });
