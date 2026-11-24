// WBS 4.8.2 — quy tắc chốt chi phí (BR-16, BR-17), hàm thuần
const { perPersonOf, isInSettleWindow, canSettle, settle, amountDue } = require('../../src/modules/post/post.settlement');

const H = 3600 * 1000;
const START = new Date('2026-11-24T12:00:00Z');
const END = new Date('2026-11-24T14:00:00Z');

const post = (overrides = {}) => ({
    authorId: 'owner',
    status: 'full',
    startsAt: START,
    endsAt: END,
    participantIds: ['a', 'b', 'c'],
    ...overrides
});

const input = (overrides = {}) => ({
    courtFee: 320_000,
    shuttleFee: 80_000,
    otherFee: 20_000,
    headcount: 8,
    chargeAbsent: false,
    attendance: [
        { userId: 'a', attended: true },
        { userId: 'b', attended: true },
        { userId: 'c', attended: false }
    ],
    ...overrides
});

const afterGame = new Date(END.getTime() + H);

const fieldsOf = (fn) => {
    try {
        fn();
    } catch (e) {
        return { status: e.status, code: e.code, fields: (e.errors ?? []).map((x) => x.field) };
    }
    return null;
};

describe('perPersonOf — làm tròn LÊN 1.000đ', () => {
    test.each([
        [420_000, 8, 53_000],
        [400_000, 8, 50_000],
        [100_000, 3, 34_000],
        [1, 2, 1_000]
    ])('%i đ ÷ %i người → %i đ', (total, headcount, expected) => {
        expect(perPersonOf(total, headcount)).toBe(expected);
    });
});

describe('isInSettleWindow / canSettle (BR-16)', () => {
    test('từ giờ bắt đầu tới đúng 24 giờ sau giờ kết thúc', () => {
        expect(isInSettleWindow(post(), new Date(START.getTime() - 1))).toBe(false);
        expect(isInSettleWindow(post(), START)).toBe(true);
        expect(isInSettleWindow(post(), new Date(END.getTime() + 24 * H))).toBe(true);
        expect(isInSettleWindow(post(), new Date(END.getTime() + 24 * H + 1))).toBe(false);
    });

    test('kèo đã hủy hoặc chưa có người tham gia → không chốt được', () => {
        expect(canSettle(post(), afterGame)).toBe(true);
        expect(canSettle(post({ status: 'closed' }), afterGame)).toBe(false);
        expect(canSettle(post({ participantIds: [] }), afterGame)).toBe(false);
    });
});

describe('settle (BR-16, BR-17)', () => {
    test('hợp lệ → tiền mỗi người tính theo tổng số người chơi, điểm danh đúng từng người', () => {
        const { settlement, attendance } = settle(post(), 'owner', input(), afterGame);

        expect(settlement).toMatchObject({ headcount: 8, chargeAbsent: false, perPerson: 53_000, settledAt: afterGame });
        expect(Object.fromEntries(attendance)).toEqual({ a: true, b: true, c: false });
    });

    test('không phải chủ kèo → 403 NOT_AUTHOR; kèo đã hủy → 409 POST_NOT_OPEN; ngoài khung giờ → 409 SETTLEMENT_CLOSED', () => {
        expect(fieldsOf(() => settle(post(), 'a', input(), afterGame))).toMatchObject({ status: 403, code: 'NOT_AUTHOR' });
        expect(fieldsOf(() => settle(post({ status: 'closed' }), 'owner', input(), afterGame))).toMatchObject({
            status: 409,
            code: 'POST_NOT_OPEN'
        });
        expect(fieldsOf(() => settle(post(), 'owner', input(), new Date(START.getTime() - H)))).toMatchObject({
            status: 409,
            code: 'SETTLEMENT_CLOSED'
        });
    });

    test.each([
        ['chi phí âm', { courtFee: -1 }, 'courtFee'],
        ['chi phí quá lớn', { otherFee: 10_000_001 }, 'otherFee'],
        ['tổng chi phí bằng 0', { courtFee: 0, shuttleFee: 0, otherFee: 0 }, 'courtFee'],
        ['điểm danh thiếu người', { attendance: [{ userId: 'a', attended: true }] }, 'attendance'],
        [
            'điểm danh có người lạ',
            {
                attendance: [
                    { userId: 'a', attended: true },
                    { userId: 'b', attended: true },
                    { userId: 'x', attended: true }
                ]
            },
            'attendance'
        ],
        [
            'điểm danh trùng người',
            {
                attendance: [
                    { userId: 'a', attended: true },
                    { userId: 'a', attended: true },
                    { userId: 'b', attended: true },
                    { userId: 'c', attended: true }
                ]
            },
            'attendance'
        ],
        ['số người chơi ít hơn người có mặt + chủ kèo (2 + 1)', { headcount: 2 }, 'headcount'],
        ['số người chơi quá 50', { headcount: 51 }, 'headcount']
    ])('%s → 400 VALIDATION_ERROR (%s)', (_name, change, field) => {
        const result = fieldsOf(() => settle(post(), 'owner', input(change), afterGame));
        expect(result).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        expect(result.fields).toContain(field);
    });

    test('người vắng vẫn phải trả → số người chơi tối thiểu tính cả người vắng', () => {
        expect(fieldsOf(() => settle(post(), 'owner', input({ headcount: 3 }), afterGame))).toBeNull();
        expect(fieldsOf(() => settle(post(), 'owner', input({ headcount: 3, chargeAbsent: true }), afterGame)).fields).toContain(
            'headcount'
        );
    });
});

describe('amountDue', () => {
    const settled = (chargeAbsent) => ({ pricePerPerson: 50_000, settlement: { perPerson: 53_000, chargeAbsent } });

    test('chưa chốt → giá đăng kèo', () => {
        expect(amountDue({ pricePerPerson: 50_000 }, { attended: null })).toBe(50_000);
    });

    test('đã chốt → tiền mỗi người; người vắng không phải trả, trừ khi chủ kèo chọn thu cả người vắng', () => {
        expect(amountDue(settled(false), { attended: true })).toBe(53_000);
        expect(amountDue(settled(false), { attended: false })).toBe(0);
        expect(amountDue(settled(true), { attended: false })).toBe(53_000);
    });
});
