// Kiểm tra nhanh API đang chạy thật, in [ĐẠT] / [LỖI] từng bước.
// Không cần dữ liệu mẫu: tự tạo 4 tài khoản tạm (1 chủ kèo + 3 người tham gia), dùng được cả trên máy chủ chạy thật.
// Chạy trên máy:      npm run smoke                      (server đang chạy: npm run dev)
// Chạy với máy chủ:   SMOKE_API_URL=https://.../api npm run smoke
// Tài khoản / kèo tạo ra được xóa ở cuối (cần MONGODB_URI trong .env trỏ tới đúng CSDL của server).
// Mỗi lần chạy tạo 4 tài khoản; giới hạn là 10 tài khoản / giờ / IP → tối đa 2 lần mỗi giờ.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const API = process.env.SMOKE_API_URL || `http://localhost:${process.env.PORT || 8080}/api`;
const RUN_ID = Date.now();
const TEST_DOMAIN = '@smoke.local';
const PASSWORD = `Smoke@${RUN_ID}`;

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

const email = (name) => `smoke${RUN_ID}-${name}${TEST_DOMAIN}`;

/** Tạo tài khoản tạm, trả về token (null nếu lỗi) */
const register = async (name, displayName) => {
    const res = await call('POST', '/auth/register', {
        email: email(name),
        password: PASSWORD,
        displayName,
        gender: 'male',
        level: 'TB'
    });
    if (res.status !== 201) console.log(`       đăng ký ${name}: ${res.status} ${res.body.code ?? ''}`);
    return res.body.data?.token ?? null;
};

const run = async () => {
    console.log(`Kiểm tra API tại ${API}\n`);

    const health = await call('GET', '/health').catch(() => null);
    if (!health) {
        console.log('[LỖI] Không kết nối được server. Chạy trên máy thì mở "npm run dev" ở terminal khác trước.');
        process.exitCode = 1;
        return;
    }
    check(health.status === 200, 'Server đang chạy');

    const author = await register('author', 'Chủ kèo thử');
    if (!author) {
        check(false, 'Tạo tài khoản tạm (có thể đã vượt giới hạn 10 tài khoản / giờ)');
        return;
    }
    check(true, 'Đăng ký tài khoản mới');

    const login = await call('POST', '/auth/login', { email: email('author'), password: PASSWORD });
    check(login.status === 200 && !!login.body.data?.token, 'Đăng nhập bằng tài khoản vừa tạo');

    const me = await call('GET', '/users/me', null, author);
    check(me.status === 200 && me.body.data.email === email('author'), 'Xem hồ sơ của mình', me.body.data?.displayName);

    const wrong = await call('POST', '/auth/login', { email: email('author'), password: 'sai-mat-khau' });
    check(wrong.status === 401 && wrong.body.code === 'INVALID_CREDENTIALS', 'Sai mật khẩu → 401 INVALID_CREDENTIALS');

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
        author
    );
    check(created.status === 201 && created.body.data.status === 'open', 'Đăng kèo 2 chỗ');
    const postId = created.body.data.id;

    const list = await call('GET', '/posts');
    check(list.status === 200 && list.body.data.some((x) => x.id === postId), 'Kèo vừa đăng có trong danh sách', `${list.body.data.length} kèo`);

    const gioi = await call('GET', '/posts?level=GIOI');
    check(gioi.status === 200 && gioi.body.data.some((x) => x.id === postId), 'Lọc theo trình độ Giỏi vẫn thấy kèo YEU → GIOI');

    const notLoggedIn = await call('POST', `/posts/${postId}/join`);
    check(notLoggedIn.status === 401, 'Chưa đăng nhập mà tham gia → 401');

    const self = await call('POST', `/posts/${postId}/join`, null, author);
    check(self.status === 409 && self.body.code === 'IS_AUTHOR', 'Chủ kèo tự tham gia → 409 IS_AUTHOR');

    const players = [];
    for (let i = 1; i <= 3; i++) players.push(await register(`p${i}`, `Người thử ${i}`));
    if (players.some((t) => !t)) {
        check(false, 'Tạo 3 tài khoản người tham gia');
        return;
    }
    const results = await Promise.all(players.map((t) => call('POST', `/posts/${postId}/join`, null, t)));
    const ok = results.filter((r) => r.status === 200).length;
    check(ok === 2, '3 người tham gia CÙNG LÚC kèo còn 2 chỗ → đúng 2 người vào', results.map((r) => (r.status === 200 ? '200' : `409 ${r.body.code}`)).join(', '));

    const detail = await call('GET', `/posts/${postId}`);
    check(detail.body.data.participants.length === 2 && detail.body.data.status === 'full', 'Kèo chuyển sang "đủ người"');

    const leave = await call('DELETE', `/posts/${postId}/join`, null, players[results.findIndex((r) => r.status === 200)]);
    check(leave.status === 200 && leave.body.data.status === 'open', 'Một người rời → kèo mở lại');

    // Người không được vào ở lượt tranh chỗ thử hủy kèo của người khác
    const outsider = players[results.findIndex((r) => r.status !== 200)] ?? players[0];
    const otherCancel = await call('POST', `/posts/${postId}/cancel`, null, outsider);
    check(otherCancel.status === 403 && otherCancel.body.code === 'NOT_AUTHOR', 'Người khác hủy kèo → 403 NOT_AUTHOR');

    const cancel = await call('POST', `/posts/${postId}/cancel`, null, author);
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
