// WBS 4.8.2 — chi phí theo từng khoản (BR-16, BR-17, BR-18), hàm thuần
const {
    computeDues,
    paymentStatus,
    normalizeCosts,
    normalizeAttendance,
    memberRefs,
    sharersOf
} = require('../../src/modules/post/post.costs');

const base = (overrides = {}) => ({
    participantIds: ['a', 'b'],
    guests: [{ id: 'g1', name: 'Tuấn' }],
    expenses: [],
    ...overrides
});

const errorOf = (fn) => {
    try {
        fn();
    } catch (e) {
        return { status: e.status, code: e.code, fields: (e.errors ?? []).map((x) => x.field) };
    }
    return null;
};

describe('computeDues (BR-17)', () => {
    test('chưa có khoản chi → null (chưa có mã QR)', () => {
        expect(computeDues(base())).toBeNull();
    });

    test('sân chia tất cả, ăn chỉ người đi ăn; làm tròn lên 1.000đ mỗi người', () => {
        const dues = computeDues(
            base({
                expenses: [
                    { kind: 'court', amount: 320_000, everyone: true, sharedBy: [] },
                    { kind: 'food', amount: 450_000, everyone: false, sharedBy: ['host', 'u:a', 'g:g1'] }
                ]
            })
        );
        // 4 người chia sân = 80.000; 3 người ăn = 150.000
        expect(Object.fromEntries(dues)).toEqual({ host: 230_000, 'u:a': 230_000, 'u:b': 80_000, 'g:g1': 230_000 });
    });

    test('chia lẻ: cộng phần lẻ trước rồi mới làm tròn một lần cho mỗi người', () => {
        const dues = computeDues(base({ guests: [], expenses: [{ kind: 'water', amount: 100_000, everyone: true, sharedBy: [] }] }));
        expect(dues.get('u:a')).toBe(34_000);
        const exact = computeDues(base({ guests: [], expenses: [{ kind: 'water', amount: 90_000, everyone: true, sharedBy: [] }] }));
        expect(exact.get('host')).toBe(30_000);
    });

    test('"Tất cả" tự gồm người vào sau; người đã rời tự bị loại khỏi phần chia', () => {
        const expense = { kind: 'court', amount: 300_000, everyone: false, sharedBy: ['host', 'u:a', 'u:gone'] };
        const refs = memberRefs(base({ guests: [] }));
        expect(sharersOf(expense, refs)).toEqual(['host', 'u:a']);
        expect(sharersOf({ ...expense, everyone: true }, refs)).toEqual(['host', 'u:a', 'u:b']);
    });
});

describe('paymentStatus (BR-18)', () => {
    test('chưa trả / đã trả / còn thiếu / trả dư', () => {
        expect(paymentStatus(50_000, { paidAt: null })).toEqual({ status: 'unpaid', toPay: 50_000, diff: 0 });
        expect(paymentStatus(0, { paidAt: null })).toEqual({ status: 'none', toPay: 0, diff: 0 });
        const paidAt = new Date();
        expect(paymentStatus(50_000, { paidAt, paidAmount: 50_000 })).toEqual({ status: 'paid', toPay: 0, diff: 0 });
        expect(paymentStatus(70_000, { paidAt, paidAmount: 50_000 })).toEqual({ status: 'owe', toPay: 20_000, diff: 20_000 });
        expect(paymentStatus(40_000, { paidAt, paidAmount: 50_000 })).toEqual({ status: 'overpaid', toPay: 0, diff: 10_000 });
    });
});

describe('normalizeCosts (BR-16, BR-17)', () => {
    const post = (o = {}) => ({ authorId: 'owner', status: 'open', participantIds: ['a', 'b'], guests: [{ id: 'g1', name: 'Tuấn' }], ...o });
    let n = 0;
    const newId = () => `new${++n}`;

    test('chủ kèo: giữ id bạn cũ, cấp id cho bạn mới và đổi tham chiếu khóa tạm; bỏ trùng người chịu', () => {
        const out = normalizeCosts(
            post(),
            'owner',
            {
                guests: [
                    { key: 'g1', name: '  Tuấn  ' },
                    { key: 'tmp-1', name: 'Hòa' }
                ],
                expenses: [
                    { kind: 'food', amount: 300_000, everyone: false, sharedBy: ['host', 'g:tmp-1', 'g:tmp-1', 'u:a'] },
                    { kind: 'other', label: ' Gửi xe ', amount: 20_000, everyone: true, sharedBy: ['u:b'] }
                ]
            },
            newId
        );
        const hoa = out.guests.find((g) => g.name === 'Hòa');
        expect(out.guests[0]).toEqual({ id: 'g1', name: 'Tuấn' });
        expect(hoa.id).toMatch(/^new/);
        expect(out.expenses[0].sharedBy).toEqual(['host', `g:${hoa.id}`, 'u:a']);
        expect(out.expenses[1]).toMatchObject({ label: 'Gửi xe', everyone: true, sharedBy: [] });
    });

    test('không phải chủ kèo → 403; kèo đã hủy → 409', () => {
        expect(errorOf(() => normalizeCosts(post(), 'a', {}, newId))).toMatchObject({ status: 403, code: 'NOT_AUTHOR' });
        expect(errorOf(() => normalizeCosts(post({ status: 'closed' }), 'owner', {}, newId))).toMatchObject({ status: 409, code: 'POST_NOT_OPEN' });
    });

    test.each([
        ['loại không hợp lệ', { kind: 'xyz', amount: 1000, everyone: true }],
        ['số tiền âm', { kind: 'court', amount: -1, everyone: true }],
        ['số tiền quá lớn', { kind: 'court', amount: 10_000_001, everyone: true }],
        ['khoản "Khác" không có tên', { kind: 'other', amount: 1000, everyone: true }],
        ['không chọn ai cùng chịu', { kind: 'court', amount: 1000, everyone: false, sharedBy: [] }],
        ['người cùng chịu không có trong kèo', { kind: 'court', amount: 1000, everyone: false, sharedBy: ['u:x'] }]
    ])('%s → 400 VALIDATION_ERROR', (_n, expense) => {
        expect(errorOf(() => normalizeCosts(post(), 'owner', { expenses: [expense] }, newId))).toMatchObject({
            status: 400,
            code: 'VALIDATION_ERROR',
            fields: ['expenses[0]']
        });
    });

    test('tên bạn không dùng app rỗng / trùng khóa → 400', () => {
        expect(errorOf(() => normalizeCosts(post(), 'owner', { guests: [{ key: 'k', name: ' ' }] }, newId)).fields).toContain('guests');
        expect(
            errorOf(() => normalizeCosts(post(), 'owner', { guests: [{ key: 'k', name: 'A' }, { key: 'k', name: 'B' }] }, newId)).fields
        ).toContain('guests');
    });
});

describe('normalizeAttendance', () => {
    const start = new Date('2026-11-24T12:00:00Z');
    const post = { authorId: 'owner', status: 'full', startsAt: start, participantIds: ['a', 'b'] };
    const after = new Date(start.getTime() + 3600e3);

    test('chủ kèo, sau giờ bắt đầu → lưu từng người', () => {
        const map = normalizeAttendance(post, 'owner', { attendance: [{ userId: 'a', attended: false }] }, after);
        expect(Object.fromEntries(map)).toEqual({ a: false });
    });

    test('trước giờ bắt đầu → 409 NOT_STARTED; người lạ trong danh sách → 400; không phải chủ kèo → 403', () => {
        expect(errorOf(() => normalizeAttendance(post, 'owner', { attendance: [] }, new Date(start.getTime() - 1)))).toMatchObject({
            status: 409,
            code: 'NOT_STARTED'
        });
        expect(errorOf(() => normalizeAttendance(post, 'owner', { attendance: [{ userId: 'x', attended: true }] }, after)).status).toBe(400);
        expect(errorOf(() => normalizeAttendance(post, 'a', { attendance: [] }, after)).status).toBe(403);
    });
});
