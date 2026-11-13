const AppError = require('../../src/utils/AppError');
const {
    cancelPost,
    createPost,
    joinPost,
    leavePost,
    remainingSlots,
    validatePostInput,
} = require('../../src/modules/post/post.rules');

const NOW = new Date('2026-11-12T10:00:00+07:00');
const START = new Date('2026-11-12T19:00:00+07:00');
const END = new Date('2026-11-12T21:00:00+07:00');

/** @param {Partial<import('../../src/modules/post/post.rules').PostInput>} [overrides] */
function input(overrides = {}) {
    return {
        authorId: 'author',
        courtName: 'Sân Cầu Giấy',
        startsAt: START,
        endsAt: END,
        levelMin: 'TB_MINUS',
        levelMax: 'TB_PLUS',
        pricePerPerson: 50_000,
        slots: { male: 1, female: 1, any: 1 },
        ...overrides,
    };
}

/** @returns {import('../../src/modules/post/post.rules').Player} */
const player = (id, gender = 'male', level = 'TB') => ({
    id,
    gender,
    level,
});

function expectJoinError(fn, code) {
    try {
        fn();
    } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.status).toBe(409);
        expect(e.code).toBe(code);
        return;
    }
    throw new Error(`Expected AppError ${code}`);
}

describe('validatePostInput', () => {
    test('chấp nhận dữ liệu hợp lệ', () => {
        expect(validatePostInput(input(), NOW)).toEqual([]);
    });

    test.each([
        ['tên sân trống', { courtName: '   ' }, 'courtName'],
        ['BR-01 giờ bắt đầu ở quá khứ', { startsAt: new Date('2026-11-12T09:00:00+07:00') }, 'startsAt'],
        ['BR-02 kết thúc trước khi bắt đầu', { endsAt: new Date('2026-11-12T18:00:00+07:00') }, 'endsAt'],
        ['BR-02 thời lượng quá 6 giờ', { endsAt: new Date('2026-11-13T02:00:00+07:00') }, 'endsAt'],
        ['BR-03 trình độ min > max', { levelMin: 'KHA', levelMax: 'TB' }, 'levelMin'],
        ['BR-04 giá âm', { pricePerPerson: -1 }, 'pricePerPerson'],
        ['BR-04 giá không nguyên', { pricePerPerson: 50_000.5 }, 'pricePerPerson'],
        ['BR-04 giá quá cao', { pricePerPerson: 2_000_000 }, 'pricePerPerson'],
        ['BR-05 không có chỗ nào', { slots: { male: 0, female: 0, any: 0 } }, 'slots'],
        ['BR-05 quá 20 chỗ', { slots: { male: 10, female: 10, any: 1 } }, 'slots'],
        ['BR-05 số chỗ âm', { slots: { male: -1, female: 2, any: 0 } }, 'slots'],
    ])('từ chối khi %s', (_name, overrides, field) => {
        const errors = validatePostInput(input(overrides), NOW);
        expect(errors.map((e) => e.field)).toContain(field);
    });

    test('báo nhiều lỗi cùng lúc', () => {
        const errors = validatePostInput(input({ courtName: '', pricePerPerson: -5 }), NOW);
        expect(errors).toHaveLength(2);
    });
});

describe('createPost', () => {
    test('tạo kèo ở trạng thái open, chưa có ai tham gia', () => {
        const post = createPost('p1', input(), NOW);
        expect(post).toMatchObject({ id: 'p1', status: 'open', participants: [] });
    });

    test('dữ liệu sai → AppError 400 VALIDATION_ERROR kèm danh sách lỗi theo trường', () => {
        try {
            createPost('p1', input({ courtName: '', pricePerPerson: -1 }), NOW);
            throw new Error('Expected AppError');
        } catch (e) {
            expect(e).toBeInstanceOf(AppError);
            expect(e).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Tên sân không được để trống' });
            expect(e.errors.map((x) => x.field)).toEqual(['courtName', 'pricePerPerson']);
        }
    });
});

describe('joinPost', () => {
    const post = createPost('p1', input(), NOW);

    test('BR-10 ưu tiên chỗ dành cho đúng giới tính', () => {
        const next = joinPost(post, player('a', 'female'), NOW);
        expect(next.participants).toEqual([{ playerId: 'a', slot: 'female' }]);
        expect(remainingSlots(next)).toEqual({ male: 1, female: 0, any: 1 });
    });

    test('BR-10 dùng chỗ "ai cũng được" khi hết chỗ theo giới tính', () => {
        const p = joinPost(joinPost(post, player('a', 'male'), NOW), player('b', 'male'), NOW);
        expect(p.participants[1]).toEqual({ playerId: 'b', slot: 'any' });
    });

    test('BR-11 chuyển sang full khi hết chỗ; BR-06 kèo full không nhận thêm', () => {
        let p = joinPost(post, player('a', 'male'), NOW);
        p = joinPost(p, player('b', 'female'), NOW);
        expect(p.status).toBe('open');
        p = joinPost(p, player('c', 'male'), NOW);
        expect(p.status).toBe('full');
        expectJoinError(() => joinPost(p, player('d', 'female'), NOW), 'POST_NOT_OPEN');
    });

    test('không thay đổi bài gốc (immutable)', () => {
        joinPost(post, player('a'), NOW);
        expect(post.participants).toHaveLength(0);
    });

    test('BR-10 báo NO_SLOT khi còn chỗ nhưng không hợp giới tính', () => {
        const p0 = createPost('p2', input({ slots: { male: 0, female: 2, any: 0 } }), NOW);
        expectJoinError(() => joinPost(p0, player('a', 'male'), NOW), 'NO_SLOT');
    });

    test('BR-09 từ chối người chơi lệch trình độ', () => {
        expectJoinError(() => joinPost(post, player('a', 'male', 'GIOI'), NOW), 'LEVEL_MISMATCH');
        expectJoinError(() => joinPost(post, player('b', 'male', 'YEU'), NOW), 'LEVEL_MISMATCH');
    });

    test('BR-07 không cho chủ kèo tự tham gia kèo của mình', () => {
        expectJoinError(() => joinPost(post, player('author'), NOW), 'IS_AUTHOR');
    });

    test('BR-08 không cho tham gia hai lần', () => {
        const p = joinPost(post, player('a'), NOW);
        expectJoinError(() => joinPost(p, player('a'), NOW), 'ALREADY_JOINED');
    });

    test('BR-06 không cho tham gia khi kèo đã bắt đầu', () => {
        expectJoinError(() => joinPost(post, player('a'), START), 'POST_STARTED');
    });
});

describe('leavePost', () => {
    const full = createPost('p1', input({ slots: { male: 0, female: 0, any: 1 } }), NOW);
    const joined = joinPost(full, player('a'), NOW);

    test('BR-12 mở lại kèo đã full khi có người rời', () => {
        expect(joined.status).toBe('full');
        const next = leavePost(joined, 'a', NOW);
        expect(next.status).toBe('open');
        expect(next.participants).toHaveLength(0);
    });

    test('báo NOT_JOINED nếu người đó chưa tham gia', () => {
        expectJoinError(() => leavePost(joined, 'zzz', NOW), 'NOT_JOINED');
    });

    test('BR-12 không cho rời sau giờ bắt đầu', () => {
        expectJoinError(() => leavePost(joined, 'a', START), 'POST_STARTED');
    });

    test('không cho rời kèo đã đóng', () => {
        expectJoinError(() => leavePost({ ...joined, status: 'closed' }, 'a', NOW), 'POST_NOT_OPEN');
    });
});

describe('cancelPost', () => {
    const post = createPost('p1', input(), NOW);

    test('BR-13 chủ kèo hủy kèo trước giờ bắt đầu → closed', () => {
        expect(cancelPost(post, 'author', NOW).status).toBe('closed');
    });

    test('BR-13 người khác hủy → 403 NOT_AUTHOR', () => {
        try {
            cancelPost(post, 'nguoi-khac', NOW);
            throw new Error('Expected AppError');
        } catch (e) {
            expect(e).toBeInstanceOf(AppError);
            expect(e).toMatchObject({ status: 403, code: 'NOT_AUTHOR' });
        }
    });

    test('BR-13 không hủy được sau giờ bắt đầu, hoặc kèo đã hủy', () => {
        expectJoinError(() => cancelPost(post, 'author', START), 'POST_STARTED');
        expectJoinError(() => cancelPost({ ...post, status: 'closed' }, 'author', NOW), 'POST_NOT_OPEN');
    });

    test('BR-06 kèo đã hủy không ai tham gia được nữa', () => {
        const closed = cancelPost(post, 'author', NOW);
        expectJoinError(() => joinPost(closed, player('a'), NOW), 'POST_NOT_OPEN');
    });
});
