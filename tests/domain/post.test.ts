import { describe, expect, it } from 'vitest';
import {
  JoinError,
  PostValidationError,
  createPost,
  joinPost,
  leavePost,
  remainingSlots,
  validatePostInput,
} from '../../src/domain/post';
import type { Player, PostInput } from '../../src/domain/types';

const NOW = new Date('2026-11-12T10:00:00+07:00');
const START = new Date('2026-11-12T19:00:00+07:00');
const END = new Date('2026-11-12T21:00:00+07:00');

function input(overrides: Partial<PostInput> = {}): PostInput {
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

const player = (id: string, gender: Player['gender'] = 'male', level: Player['level'] = 'TB'): Player => ({
  id,
  gender,
  level,
});

function expectJoinError(fn: () => unknown, code: JoinError['code']) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(JoinError);
    expect((e as JoinError).code).toBe(code);
    return;
  }
  throw new Error(`Expected JoinError ${code}`);
}

describe('validatePostInput', () => {
  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(validatePostInput(input(), NOW)).toEqual([]);
  });

  it.each<[string, Partial<PostInput>, keyof PostInput]>([
    ['tên sân trống', { courtName: '   ' }, 'courtName'],
    ['giờ bắt đầu ở quá khứ', { startsAt: new Date('2026-11-12T09:00:00+07:00') }, 'startsAt'],
    ['kết thúc trước khi bắt đầu', { endsAt: new Date('2026-11-12T18:00:00+07:00') }, 'endsAt'],
    ['thời lượng quá 6 giờ', { endsAt: new Date('2026-11-13T02:00:00+07:00') }, 'endsAt'],
    ['trình độ min > max', { levelMin: 'KHA', levelMax: 'TB' }, 'levelMin'],
    ['giá âm', { pricePerPerson: -1 }, 'pricePerPerson'],
    ['giá không nguyên', { pricePerPerson: 50_000.5 }, 'pricePerPerson'],
    ['giá quá cao', { pricePerPerson: 2_000_000 }, 'pricePerPerson'],
    ['không có chỗ nào', { slots: { male: 0, female: 0, any: 0 } }, 'slots'],
    ['quá 20 chỗ', { slots: { male: 10, female: 10, any: 1 } }, 'slots'],
    ['số chỗ âm', { slots: { male: -1, female: 2, any: 0 } }, 'slots'],
  ])('từ chối khi %s', (_name, overrides, field) => {
    const errors = validatePostInput(input(overrides), NOW);
    expect(errors.map((e) => e.field)).toContain(field);
  });

  it('báo nhiều lỗi cùng lúc', () => {
    const errors = validatePostInput(input({ courtName: '', pricePerPerson: -5 }), NOW);
    expect(errors).toHaveLength(2);
  });
});

describe('createPost', () => {
  it('tạo kèo ở trạng thái open, chưa có ai tham gia', () => {
    const post = createPost('p1', input(), NOW);
    expect(post).toMatchObject({ id: 'p1', status: 'open', participants: [] });
  });

  it('ném PostValidationError kèm danh sách lỗi', () => {
    expect(() => createPost('p1', input({ courtName: '' }), NOW)).toThrow(PostValidationError);
  });
});

describe('joinPost', () => {
  const post = createPost('p1', input(), NOW);

  it('ưu tiên chỗ dành cho đúng giới tính', () => {
    const next = joinPost(post, player('a', 'female'), NOW);
    expect(next.participants).toEqual([{ playerId: 'a', slot: 'female' }]);
    expect(remainingSlots(next)).toEqual({ male: 1, female: 0, any: 1 });
  });

  it('dùng chỗ "ai cũng được" khi hết chỗ theo giới tính', () => {
    const p = joinPost(joinPost(post, player('a', 'male'), NOW), player('b', 'male'), NOW);
    expect(p.participants[1]).toEqual({ playerId: 'b', slot: 'any' });
  });

  it('chuyển sang full khi hết chỗ', () => {
    let p = joinPost(post, player('a', 'male'), NOW);
    p = joinPost(p, player('b', 'female'), NOW);
    expect(p.status).toBe('open');
    p = joinPost(p, player('c', 'male'), NOW);
    expect(p.status).toBe('full');
    expectJoinError(() => joinPost(p, player('d', 'female'), NOW), 'POST_NOT_OPEN');
  });

  it('không thay đổi bài gốc (immutable)', () => {
    joinPost(post, player('a'), NOW);
    expect(post.participants).toHaveLength(0);
  });

  it('báo NO_SLOT khi còn chỗ nhưng không hợp giới tính', () => {
    const p0 = createPost('p2', input({ slots: { male: 0, female: 2, any: 0 } }), NOW);
    expectJoinError(() => joinPost(p0, player('a', 'male'), NOW), 'NO_SLOT');
  });

  it('từ chối người chơi lệch trình độ', () => {
    expectJoinError(() => joinPost(post, player('a', 'male', 'GIOI'), NOW), 'LEVEL_MISMATCH');
    expectJoinError(() => joinPost(post, player('b', 'male', 'YEU'), NOW), 'LEVEL_MISMATCH');
  });

  it('không cho tác giả tự tham gia kèo của mình', () => {
    expectJoinError(() => joinPost(post, player('author'), NOW), 'IS_AUTHOR');
  });

  it('không cho tham gia hai lần', () => {
    const p = joinPost(post, player('a'), NOW);
    expectJoinError(() => joinPost(p, player('a'), NOW), 'ALREADY_JOINED');
  });

  it('không cho tham gia khi kèo đã bắt đầu', () => {
    expectJoinError(() => joinPost(post, player('a'), START), 'POST_STARTED');
  });
});

describe('leavePost', () => {
  const full = createPost('p1', input({ slots: { male: 0, female: 0, any: 1 } }), NOW);
  const joined = joinPost(full, player('a'), NOW);

  it('mở lại kèo đã full khi có người rời', () => {
    expect(joined.status).toBe('full');
    const next = leavePost(joined, 'a', NOW);
    expect(next.status).toBe('open');
    expect(next.participants).toHaveLength(0);
  });

  it('báo NOT_JOINED nếu người đó chưa tham gia', () => {
    expectJoinError(() => leavePost(joined, 'zzz', NOW), 'NOT_JOINED');
  });

  it('không cho rời sau giờ bắt đầu', () => {
    expectJoinError(() => leavePost(joined, 'a', START), 'POST_STARTED');
  });

  it('không cho rời kèo đã đóng', () => {
    expectJoinError(() => leavePost({ ...joined, status: 'closed' }, 'a', NOW), 'POST_NOT_OPEN');
  });
});
