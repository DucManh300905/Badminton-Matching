const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime, vnDateString } = require('../../src/utils/vnTime');
const { parseArgs, runExport, isTestEmail } = require('../../src/modules/research/research.export');
const { makePseudonym } = require('../../src/modules/research/research.compute');

// ── US-22, WBS 6.3 — lệnh xuất số liệu: đọc CSDL thật, loại tài khoản thử, ghi file, không lộ thông tin cá nhân ──

setupDatabase();

const SALT = 'khoa-bi-mat-cho-test-export';
let out;

beforeEach(() => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-research-'));
});
afterEach(() => fs.rmSync(out, { recursive: true, force: true }));

let n = 0;
/** Người dùng thật (không thuộc tên miền thử) */
const realUser = (extra = {}) => {
    n += 1;
    return createUserAndLogin({ email: `nguoichoi${n}@nguoidung.vn`, ...extra });
};

const createPost = async (token, courtName, note) =>
    (
        await request(app)
            .post('/api/posts')
            .set(auth(token))
            .send({
                courtName,
                district: 'Long Biên',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots: { any: 2 },
                note
            })
            .expect(201)
    ).body.data;

const readCsv = (dir, name) => {
    const [head, ...rows] = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^﻿/, '').trim().split('\r\n');
    const cols = head.split(',');
    return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

const range = () => ({ from: vnDateString(), to: vnDateString(vnDateTime(3, 12)) });

describe('Lệnh xuất số liệu nghiên cứu', () => {
    test('xuất kèo thật, loại kèo có tài khoản thử, ghi đủ file và không có thông tin cá nhân', async () => {
        const host = await realUser({ displayName: 'Chủ Kèo Bí Mật', phone: '0912000077' });
        const player = await realUser({ displayName: 'Người Chơi Bí Mật', gender: 'female' });
        const tester = await createUserAndLogin(); // @test.com

        const post = await createPost(host.token, 'Sân Bí Mật', 'ghi chú riêng tư');
        await request(app).post(`/api/posts/${post.id}/join`).set(auth(player.token)).expect(200);
        await request(app)
            .put(`/api/posts/${post.id}/costs`)
            .set(auth(host.token))
            .send({
                guests: [{ key: 'moi-1', name: 'Bạn Không Dùng App' }],
                expenses: [
                    { kind: 'court', amount: 300_000, everyone: true },
                    { kind: 'other', label: 'Khoản riêng tư', amount: 60_000, everyone: false, sharedBy: ['host'] }
                ]
            })
            .expect(200);
        await request(app)
            .patch(`/api/posts/${post.id}/participants/${player.user.id}/payment`)
            .set(auth(host.token))
            .send({ paid: true })
            .expect(200);

        // Kèo có tài khoản thử tham gia: bị loại
        const other = await createPost(host.token, 'Sân Khác', undefined);
        await request(app).post(`/api/posts/${other.id}/join`).set(auth(tester.token)).expect(200);

        const { dir, posts, excludedPosts } = await runExport({ ...range(), out, salt: SALT });
        expect(posts).toBe(1);
        expect(excludedPosts).toBe(1);
        expect(fs.readdirSync(dir).sort()).toEqual(
            ['README.txt', 'dues.csv', 'events.csv', 'expenses.csv', 'participants.csv', 'posts.csv', 'summary.txt'].sort()
        );

        const ps = makePseudonym(SALT);
        const [row] = readCsv(dir, 'posts.csv');
        expect(row).toMatchObject({
            post: ps.post(post.id),
            host: ps.user(host.user.id),
            started: '0',
            has_log: '1',
            participants_final: '1',
            has_costs: '1',
            guests: '1',
            costs_total: '360000',
            costs_saves: '1'
        });
        expect(readCsv(dir, 'participants.csv')).toEqual([
            expect.objectContaining({ user: ps.user(player.user.id), gender: 'female', attended: '' })
        ]);
        expect(readCsv(dir, 'events.csv').map((e) => e.type)).toEqual(['created', 'join', 'costs_saved', 'paid']);
        // 300.000đ chia 3 người (chủ kèo, người chơi, bạn) + 60.000đ chỉ chủ kèo; chia đều 360.000 / 3
        expect(readCsv(dir, 'dues.csv').map((d) => [d.role, d.due_itemized, d.due_equal, d.paid])).toEqual([
            ['host', '160000', '120000', ''],
            ['participant', '100000', '120000', '1'],
            ['guest', '100000', '120000', '']
        ]);
        expect(fs.readFileSync(path.join(dir, 'summary.txt'), 'utf8')).toContain('Số kèo: 1 (đã loại 1 kèo');

        const everything = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
        for (const secret of [
            host.user.email,
            player.user.email,
            tester.user.email,
            'Chủ Kèo Bí Mật',
            'Người Chơi Bí Mật',
            'Bạn Không Dùng App',
            '0912000077',
            'Sân Bí Mật',
            'ghi chú riêng tư',
            'Khoản riêng tư',
            post.id,
            host.user.id,
            player.user.id
        ]) {
            expect(everything).not.toContain(secret);
        }
    });

    test('cùng khóa thì cùng mã giả giữa hai lần xuất; mỗi lần một thư mục mới', async () => {
        const host = await realUser();
        await createPost(host.token, 'Sân A', undefined);
        const now = new Date();
        const first = await runExport({ ...range(), out, salt: SALT, now });
        const second = await runExport({ ...range(), out, salt: SALT, now });
        expect(second.dir).not.toBe(first.dir);
        expect(path.basename(second.dir)).toBe(`${path.basename(first.dir)}-2`);
        expect(readCsv(second.dir, 'posts.csv')[0].post).toBe(readCsv(first.dir, 'posts.csv')[0].post);
        const third = await runExport({ ...range(), out, salt: 'mot-khoa-khac-hoan-toan', now });
        expect(readCsv(third.dir, 'posts.csv')[0].post).not.toBe(readCsv(first.dir, 'posts.csv')[0].post);
    });

    test('kèo ngoài khoảng ngày không được xuất; không có kèo thì summary ghi chưa đủ dữ liệu', async () => {
        const host = await realUser();
        await createPost(host.token, 'Sân A', undefined);
        const { dir, posts } = await runExport({ from: '2026-01-01', to: '2026-01-31', out, salt: SALT });
        expect(posts).toBe(0);
        expect(readCsv(dir, 'posts.csv')).toEqual([]);
        expect(fs.readFileSync(path.join(dir, 'summary.txt'), 'utf8')).toContain('CHƯA ĐỦ DỮ LIỆU');
    });

    test('khóa quá ngắn thì dừng, không ghi file', async () => {
        await expect(runExport({ ...range(), out, salt: 'ngan' })).rejects.toThrow(/RESEARCH_SALT/);
        expect(fs.readdirSync(out)).toEqual([]);
    });
});

describe('Tham số dòng lệnh', () => {
    const now = new Date('2026-12-14T05:00:00Z');

    test('--from bắt buộc; --to mặc định hôm nay (giờ VN); --out mặc định ~/research-exports', () => {
        expect(parseArgs(['--from', '2026-12-01'], now)).toEqual({
            from: '2026-12-01',
            to: '2026-12-14',
            out: path.join(os.homedir(), 'research-exports')
        });
        expect(parseArgs(['--from=2026-12-01', '--to=2026-12-08', '--out', '/tmp/x'], now)).toEqual({
            from: '2026-12-01',
            to: '2026-12-08',
            out: '/tmp/x'
        });
    });

    test.each([
        [[], /Thiếu --from/],
        [['--from', '01/12/2026'], /YYYY-MM-DD/],
        [['--from', '2026-12-08', '--to', '2026-12-01'], /trước hoặc bằng/],
        [['--from'], /Thiếu giá trị/],
        [['--from', '--to'], /Thiếu giá trị/],
        [['--tu', '2026-12-01'], /không hợp lệ/]
    ])('%j báo lỗi', (argv, msg) => {
        expect(() => parseArgs(argv, now)).toThrow(msg);
    });

    test('nhận diện tài khoản demo / thử', () => {
        expect(['a@example.com', 'B@Test.com', 'smoke1-x@smoke.local'].every(isTestEmail)).toBe(true);
        expect(isTestEmail('nguoi@gmail.com')).toBe(false);
    });
});
