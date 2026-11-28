const {
    makePseudonym,
    median,
    buildExport,
    computeMetrics,
    summaryText,
    toCsv
} = require('../../src/modules/research/research.compute');

// ── US-22, WBS 6.3 — tính số liệu nghiên cứu trên bộ dữ liệu đã biết đáp án ──

const SALT = 'khoa-bi-mat-cho-test-123';
const NOW = new Date('2026-12-20T12:00:00Z');
const MIN = 60_000;
const HOUR = 60 * MIN;

const at = (base, minutes) => new Date(base.getTime() + minutes * MIN);

/** Kèo dạng lean, chỉ những trường bộ tính cần */
const post = (id, { startsAt, createdAt, slots = 2, participants = [], expenses = [], guests = [], status = 'open', author = 'host' }) => ({
    _id: id,
    author,
    district: 'Long Biên',
    startsAt,
    endsAt: at(startsAt, 120),
    createdAt: createdAt ?? at(startsAt, -24 * 60),
    status,
    slots: { male: 0, female: 0, any: slots },
    participants,
    guests,
    expenses
});

// Kèo A: chia theo khoản (khoản ăn chỉ chủ kèo và u1), có người rời sát giờ rồi vào lại, u1 bị bỏ đánh dấu một lần
const startA = new Date('2026-12-10T12:00:00Z');
const createdA = at(startA, -24 * 60);
const endA = at(startA, 120);
const A = post('a', {
    startsAt: startA,
    createdAt: createdA,
    participants: [
        { user: 'u1', slot: 'any', joinedAt: at(createdA, 60), paidAt: at(endA, 120), paidAmount: 150_000, attended: true, proofs: [] },
        { user: 'u2', slot: 'any', joinedAt: at(startA, -30), paidAt: at(endA, 1800), paidAmount: 100_000, attended: false, proofs: ['ck.webp'] }
    ],
    expenses: [
        { kind: 'court', amount: 300_000, everyone: true, sharedBy: [] },
        { kind: 'food', amount: 100_000, everyone: false, sharedBy: ['host', 'u:u1'] }
    ]
});
const eventsA = [
    { post: 'a', user: 'host', type: 'created', at: createdA, meta: { slots: 2 } },
    { post: 'a', user: 'u1', type: 'join', at: at(createdA, 60), meta: { slot: 'any' } },
    { post: 'a', user: 'u2', type: 'join', at: at(createdA, 120), meta: { slot: 'any' } },
    { post: 'a', user: null, type: 'full', at: at(createdA, 120) },
    { post: 'a', user: 'u2', type: 'leave', at: at(startA, -60), meta: { slot: 'any' } },
    { post: 'a', user: null, type: 'reopen', at: at(startA, -60) },
    { post: 'a', user: 'u2', type: 'join', at: at(startA, -30), meta: { slot: 'any' } },
    { post: 'a', user: null, type: 'full', at: at(startA, -30) },
    { post: 'a', user: 'host', type: 'costs_saved', at: endA, meta: { total: 400_000, expenses: 2, notAll: 1, guests: 0 } },
    { post: 'a', user: 'u1', type: 'paid', at: at(endA, 60), meta: { amount: 150_000 } },
    { post: 'a', user: 'u1', type: 'unpaid', at: at(endA, 90) },
    { post: 'a', user: 'u1', type: 'paid', at: at(endA, 120), meta: { amount: 150_000 } },
    { post: 'a', user: 'u2', type: 'paid', at: at(endA, 1800), meta: { amount: 100_000 } }
];

// Kèo B: thiếu người; kèo C: bị hủy; kèo D: chưa tới giờ chơi; kèo E: kèo cũ không có nhật ký, chia đều
const startB = new Date('2026-12-11T12:00:00Z');
const B = post('b', { startsAt: startB, participants: [{ user: 'u3', slot: 'any', joinedAt: at(startB, -600) }] });
const eventsB = [{ post: 'b', user: 'host', type: 'created', at: at(startB, -24 * 60) }];
const C = post('c', { startsAt: new Date('2026-12-12T12:00:00Z'), slots: 1, status: 'closed' });
const D = post('d', { startsAt: at(NOW, 24 * 60), slots: 1 });
const startE = new Date('2026-11-25T12:00:00Z');
const E = post('e', {
    startsAt: startE,
    slots: 1,
    status: 'full',
    participants: [{ user: 'u4', slot: 'any', joinedAt: at(startE, -300), paidAt: at(startE, 120 + 300), paidAmount: 100_000 }],
    expenses: [{ kind: 'court', amount: 200_000, everyone: true, sharedBy: [] }]
});

const users = new Map([
    ['u1', { gender: 'male', level: 'TB' }],
    ['u2', { gender: 'female', level: 'KHA' }],
    ['u3', { gender: 'male', level: 'YEU' }],
    ['u4', { gender: 'male', level: 'TB' }]
]);

const run = (posts = [A, B, C, D, E], events = [...eventsA, ...eventsB]) =>
    buildExport({ posts, events, users, salt: SALT, now: NOW, from: '2026-11-20', to: '2026-12-31', excludedPosts: 3 });

/** Đọc CSV (bỏ BOM) thành mảng object */
const parse = (csv) => {
    const [head, ...rows] = csv.replace(/^﻿/, '').trim().split('\r\n');
    const cols = head.split(',');
    return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

describe('Mã giả', () => {
    test('cố định với cùng khóa, khác với khóa khác, không chứa id thật', () => {
        const a = makePseudonym(SALT);
        const b = makePseudonym('mot-khoa-khac-hoan-toan');
        expect(a.user('u1')).toBe(makePseudonym(SALT).user('u1'));
        expect(a.user('u1')).not.toBe(b.user('u1'));
        expect(a.user('u1')).toMatch(/^U-[0-9a-f]{10}$/);
        expect(a.post('a')).toMatch(/^P-[0-9a-f]{10}$/);
        expect(a.guest('a', 'g1')).toMatch(/^G-[0-9a-f]{10}$/);
        expect(a.user('u1')).not.toBe(a.post('u1'));
    });

    test('khóa thiếu hoặc quá ngắn thì dừng', () => {
        expect(() => makePseudonym(undefined)).toThrow(/RESEARCH_SALT/);
        expect(() => makePseudonym('ngan')).toThrow(/16/);
    });
});

describe('Các file CSV', () => {
    const { files } = run();
    const ps = makePseudonym(SALT);

    test('posts.csv: đủ người, lần đầu đủ, rời sát giờ, chi phí, kèo không có nhật ký', () => {
        const rows = parse(files['posts.csv']);
        expect(rows.map((r) => r.post)).toEqual(['e', 'a', 'b', 'c', 'd'].map(ps.post));
        const [e, a, b, c, d] = rows;
        expect(a).toMatchObject({
            host: ps.user('host'),
            date: '2026-12-10',
            start_hour_vn: '19',
            duration_min: '120',
            posted_min_before_start: '1440',
            started: '1',
            has_log: '1',
            slots_total: '2',
            participants_final: '2',
            full_before_start: '1',
            min_to_first_full: '120',
            leaves: '1',
            late_leaves: '1',
            has_costs: '1',
            expenses: '2',
            costs_total: '400000',
            costs_saves: '1'
        });
        expect(b).toMatchObject({ full_before_start: '0', min_to_first_full: '', leaves: '0', has_costs: '0', costs_total: '' });
        expect(c).toMatchObject({ status: 'closed', full_before_start: '0', has_log: '0' });
        expect(d).toMatchObject({ started: '0' });
        expect(e).toMatchObject({ has_log: '0', full_before_start: '1', min_to_first_full: '', leaves: '', costs_saves: '' });
    });

    test('participants.csv: thời điểm tham gia, giới tính, trình độ, điểm danh', () => {
        const rows = parse(files['participants.csv']).filter((r) => r.post === ps.post('a'));
        expect(rows).toEqual([
            { post: ps.post('a'), user: ps.user('u1'), slot: 'any', gender: 'male', level: 'TB', joined_min_after_post: '60', joined_min_before_start: '1380', attended: '1' },
            { post: ps.post('a'), user: ps.user('u2'), slot: 'any', gender: 'female', level: 'KHA', joined_min_after_post: '1410', joined_min_before_start: '30', attended: '0' }
        ]);
        expect(parse(files['participants.csv']).find((r) => r.user === ps.user('u3')).attended).toBe('');
    });

    test('events.csv: mọi sự kiện, mốc thời gian so với lúc đăng và giờ chơi', () => {
        const rows = parse(files['events.csv']);
        expect(rows).toHaveLength(eventsA.length + eventsB.length);
        const leave = rows.find((r) => r.type === 'leave');
        expect(leave).toMatchObject({ user: ps.user('u2'), min_before_start: '60', slot: 'any' });
        expect(rows.find((r) => r.type === 'full').user).toBe('');
        expect(rows.find((r) => r.type === 'costs_saved').amount).toBe('400000');
    });

    test('expenses.csv: khoản chia cho tất cả và khoản chỉ một số người', () => {
        const rows = parse(files['expenses.csv']).filter((r) => r.post === ps.post('a'));
        expect(rows).toEqual([
            { post: ps.post('a'), item: '1', kind: 'court', amount: '300000', everyone: '1', sharers: '3', members: '3', quantity: '', unit_price: '' },
            { post: ps.post('a'), item: '2', kind: 'food', amount: '100000', everyone: '0', sharers: '2', members: '3', quantity: '', unit_price: '' }
        ]);
    });

    test('dues.csv: theo khoản, chia đều, chênh lệch, lần đầu đã trả, bỏ đánh dấu, ảnh chuyển khoản', () => {
        const rows = parse(files['dues.csv']);
        const a = rows.filter((r) => r.post === ps.post('a'));
        expect(a).toEqual([
            { post: ps.post('a'), person: ps.user('host'), role: 'host', due_itemized: '150000', due_equal: '134000', diff: '16000', pay_status: '', paid: '', paid_min_after_end: '', unpaid_marks: '', sent_proof: '' },
            { post: ps.post('a'), person: ps.user('u1'), role: 'participant', due_itemized: '150000', due_equal: '134000', diff: '16000', pay_status: 'paid', paid: '1', paid_min_after_end: '60', unpaid_marks: '1', sent_proof: '0' },
            { post: ps.post('a'), person: ps.user('u2'), role: 'participant', due_itemized: '100000', due_equal: '134000', diff: '-34000', pay_status: 'paid', paid: '1', paid_min_after_end: '1800', unpaid_marks: '0', sent_proof: '1' }
        ]);
        // Kèo không có nhật ký: lấy thời điểm đã trả hiện tại
        expect(rows.find((r) => r.person === ps.user('u4'))).toMatchObject({ diff: '0', paid_min_after_end: '300', unpaid_marks: '' });
    });

    test('bạn không dùng app có mã G-, không có cột thanh toán', () => {
        const withGuest = post('g', {
            startsAt: startB,
            guests: [{ _id: 'gx', name: 'Tuấn' }],
            expenses: [{ kind: 'court', amount: 90_000, everyone: true, sharedBy: [] }]
        });
        const rows = parse(run([withGuest], []).files['dues.csv']);
        expect(rows.map((r) => r.role)).toEqual(['host', 'guest']);
        expect(rows[1]).toMatchObject({ person: makePseudonym(SALT).guest('g', 'gx'), due_itemized: '45000', paid: '' });
        expect(run([withGuest], []).files['dues.csv']).not.toContain('Tuấn');
    });
});

describe('Chỉ số H1–H3', () => {
    test('đúng đáp án đã tính tay', () => {
        const { metrics } = run();
        expect(metrics.h1).toEqual({ posts: 2, unevenPosts: 1, share: 0.5, people: 3, meanAbsDiff: 22_000 });
        // u1 trả sau 60 phút, u2 sau 30 giờ, u4 sau 5 giờ; thu đủ kèo A sau 30 giờ, kèo E sau 5 giờ
        expect(metrics.h2).toEqual({ payers: 3, onTime: 2, share: 2 / 3, posts: 2, fullyPaid: 2, medianHours: 17.5 });
        // Đã tới giờ: A, B, C, E (D chưa); đủ: A, E; không tính kèo hủy: 2/3
        expect(metrics.h3).toEqual({ posts: 4, full: 2, share: 0.5, postsNotCancelled: 3, shareNotCancelled: 2 / 3 });
    });

    test('kèo chưa kết thúc đủ 24 giờ không tính vào H2; người chưa trả làm kèo chưa thu đủ', () => {
        const recent = post('r', {
            startsAt: at(NOW, -180),
            participants: [{ user: 'u1', slot: 'any', joinedAt: at(NOW, -600) }],
            expenses: [{ kind: 'court', amount: 100_000, everyone: true, sharedBy: [] }]
        });
        const unpaid = post('n', {
            startsAt: startB,
            participants: [{ user: 'u3', slot: 'any', joinedAt: at(startB, -600) }],
            expenses: [{ kind: 'court', amount: 100_000, everyone: true, sharedBy: [] }]
        });
        const { h2 } = run([recent, unpaid], []).metrics;
        expect(h2).toEqual({ payers: 1, onTime: 0, share: 0, posts: 1, fullyPaid: 0, medianHours: null });
    });

    test('trung vị', () => {
        expect(median([])).toBeNull();
        expect(median([5, 1, 3])).toBe(3);
        expect(median([4, 1, 3, 2])).toBe(2.5);
    });
});

describe('summary.txt', () => {
    test('ghi số, n, ngưỡng và kết luận', () => {
        const text = run().files['summary.txt'];
        expect(text).toContain('Số kèo: 5 (đã loại 3 kèo');
        expect(text).toContain('1/2 = 50,0% (ngưỡng ≥ 30,0%) → ĐẠT');
        expect(text).toContain('22.000đ (n = 3 người; ngưỡng ≥ 20.000đ) → ĐẠT');
        expect(text).toContain('2/3 = 66,7% (ngưỡng ≥ 80,0%) → CHƯA ĐẠT');
        expect(text).toContain('17,5 giờ (2/2 kèo đã thu đủ; ngưỡng ≤ 12,0 giờ) → CHƯA ĐẠT');
        expect(text).toContain('2/4 = 50,0% (ngưỡng ≥ 60,0%) → CHƯA ĐẠT');
        expect(text).toContain('Không tính kèo hủy: 66,7% (n = 3)');
    });

    test('không có dữ liệu thì ghi "chưa đủ dữ liệu", không ghi 0%', () => {
        const text = summaryText(computeMetrics([], NOW), { from: 'x', to: 'y', generatedAt: NOW, posts: 0, excludedPosts: 0 });
        expect(text.match(/CHƯA ĐỦ DỮ LIỆU/g)).toHaveLength(3);
        expect(text).not.toMatch(/0,0%/);
    });

    test('có người phải trả nhưng chưa kèo nào thu đủ', () => {
        const unpaid = post('n', {
            startsAt: startB,
            participants: [{ user: 'u3', slot: 'any', joinedAt: at(startB, -600) }],
            expenses: [{ kind: 'court', amount: 100_000, everyone: true, sharedBy: [] }]
        });
        expect(run([unpaid], []).files['summary.txt']).toContain('Trung vị thời gian thu đủ một kèo: CHƯA ĐỦ DỮ LIỆU');
    });
});

describe('toCsv', () => {
    test('có BOM, CRLF, bọc ô có dấu phẩy / ngoặc kép / xuống dòng', () => {
        const csv = toCsv(['a', 'b'], [{ a: 'x,y', b: 'nói "chào"' }, { a: null, b: 'dòng\nmới' }]);
        expect(csv).toBe('﻿a,b\r\n"x,y","nói ""chào"""\r\n,"dòng\nmới"\r\n');
    });
});

describe('ẩn danh', () => {
    test('file xuất không chứa id thật của người và kèo', () => {
        const all = Object.values(run().files).join('\n');
        // "host" vẫn xuất hiện ở cột role, nên chỉ kiểm tra mã người tham gia và mã kèo
        for (const raw of ['u1', 'u2', 'u3', 'u4', 'a', 'b', 'c', 'd', 'e']) {
            expect(all).not.toMatch(new RegExp(`(^|[,\\n])${raw}(,|\\r|$)`, 'm'));
        }
    });
});
