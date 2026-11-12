import { compareLevel, isLevelInRange } from './level';
import type { Player, Post, PostInput, SlotKind, SlotNeed } from './types';

export const MAX_DURATION_HOURS = 6;
export const MAX_PRICE_PER_PERSON = 1_000_000;
export const MAX_TOTAL_SLOTS = 20;

export interface ValidationError {
  field: keyof PostInput;
  message: string;
}

export class PostValidationError extends Error {
  readonly errors: ValidationError[];
  constructor(errors: ValidationError[]) {
    super(errors.map((e) => e.message).join('; '));
    this.name = 'PostValidationError';
    this.errors = errors;
  }
}

export type JoinErrorCode =
  | 'POST_NOT_OPEN'
  | 'POST_STARTED'
  | 'IS_AUTHOR'
  | 'ALREADY_JOINED'
  | 'NOT_JOINED'
  | 'LEVEL_MISMATCH'
  | 'NO_SLOT';

export class JoinError extends Error {
  readonly code: JoinErrorCode;
  constructor(code: JoinErrorCode) {
    super(code);
    this.name = 'JoinError';
    this.code = code;
  }
}

function isNonNegativeInt(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

export function totalSlots(s: SlotNeed): number {
  return s.male + s.female + s.any;
}

/** Kiểm tra dữ liệu bài đăng. Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validatePostInput(input: PostInput, now: Date): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.courtName.trim() === '') {
    errors.push({ field: 'courtName', message: 'Tên sân không được để trống' });
  }

  if (input.startsAt.getTime() <= now.getTime()) {
    errors.push({ field: 'startsAt', message: 'Giờ bắt đầu phải ở tương lai' });
  }

  const durationMs = input.endsAt.getTime() - input.startsAt.getTime();
  if (durationMs <= 0) {
    errors.push({ field: 'endsAt', message: 'Giờ kết thúc phải sau giờ bắt đầu' });
  } else if (durationMs > MAX_DURATION_HOURS * 3_600_000) {
    errors.push({ field: 'endsAt', message: `Thời lượng không quá ${MAX_DURATION_HOURS} giờ` });
  }

  if (compareLevel(input.levelMin, input.levelMax) > 0) {
    errors.push({ field: 'levelMin', message: 'Trình độ tối thiểu không được cao hơn tối đa' });
  }

  if (!isNonNegativeInt(input.pricePerPerson) || input.pricePerPerson > MAX_PRICE_PER_PERSON) {
    errors.push({
      field: 'pricePerPerson',
      message: `Chi phí phải là số nguyên từ 0 đến ${MAX_PRICE_PER_PERSON.toLocaleString('vi-VN')}đ`,
    });
  }

  const { male, female, any } = input.slots;
  if (![male, female, any].every(isNonNegativeInt)) {
    errors.push({ field: 'slots', message: 'Số chỗ phải là số nguyên không âm' });
  } else {
    const total = totalSlots(input.slots);
    if (total < 1 || total > MAX_TOTAL_SLOTS) {
      errors.push({ field: 'slots', message: `Tổng số chỗ phải từ 1 đến ${MAX_TOTAL_SLOTS}` });
    }
  }

  return errors;
}

export function createPost(id: string, input: PostInput, now: Date): Post {
  const errors = validatePostInput(input, now);
  if (errors.length > 0) throw new PostValidationError(errors);
  return { ...input, id, participants: [], status: 'open' };
}

/** Số chỗ còn trống theo từng loại. */
export function remainingSlots(post: Post): SlotNeed {
  const used: SlotNeed = { male: 0, female: 0, any: 0 };
  for (const p of post.participants) used[p.slot]++;
  return {
    male: post.slots.male - used.male,
    female: post.slots.female - used.female,
    any: post.slots.any - used.any,
  };
}

/**
 * Người chơi tham gia kèo. Ưu tiên chỗ dành riêng cho giới tính của họ,
 * hết thì dùng chỗ "ai cũng được". Tự chuyển sang `full` khi hết chỗ.
 * Không thay đổi `post` gốc mà trả về bản mới.
 */
export function joinPost(post: Post, player: Player, now: Date): Post {
  if (post.status !== 'open') throw new JoinError('POST_NOT_OPEN');
  if (now.getTime() >= post.startsAt.getTime()) throw new JoinError('POST_STARTED');
  if (player.id === post.authorId) throw new JoinError('IS_AUTHOR');
  if (post.participants.some((p) => p.playerId === player.id)) throw new JoinError('ALREADY_JOINED');
  if (!isLevelInRange(player.level, post.levelMin, post.levelMax)) throw new JoinError('LEVEL_MISMATCH');

  const rem = remainingSlots(post);
  let slot: SlotKind;
  if (rem[player.gender] > 0) slot = player.gender;
  else if (rem.any > 0) slot = 'any';
  else throw new JoinError('NO_SLOT');

  const next: Post = { ...post, participants: [...post.participants, { playerId: player.id, slot }] };
  return { ...next, status: totalSlots(remainingSlots(next)) === 0 ? 'full' : 'open' };
}

/** Người chơi rời kèo trước giờ bắt đầu. Kèo đang `full` sẽ mở lại. */
export function leavePost(post: Post, playerId: string, now: Date): Post {
  if (post.status === 'closed') throw new JoinError('POST_NOT_OPEN');
  if (now.getTime() >= post.startsAt.getTime()) throw new JoinError('POST_STARTED');
  if (!post.participants.some((p) => p.playerId === playerId)) throw new JoinError('NOT_JOINED');

  return {
    ...post,
    participants: post.participants.filter((p) => p.playerId !== playerId),
    status: 'open',
  };
}
