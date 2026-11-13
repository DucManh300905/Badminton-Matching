/**
 * Quy tắc nghiệp vụ của kèo (thuần JavaScript, không đụng CSDL → test nhanh, dễ hiểu).
 * post.service.js đọc kèo từ MongoDB, gọi các hàm ở đây, rồi ghi kết quả lại.
 * Mã BR-xx tham chiếu docs/project.md.
 */
const AppError = require('../../utils/AppError');
const { compareLevel, isLevelInRange } = require('../../utils/skillLevel');

/**
 * @typedef {import('../../utils/skillLevel').SkillLevel} SkillLevel
 * @typedef {'male' | 'female'} Gender
 * @typedef {Gender | 'any'} SlotKind
 * @typedef {'open' | 'full' | 'closed'} PostStatus
 *
 * @typedef {object} SlotNeed
 * @property {number} male
 * @property {number} female
 * @property {number} any
 *
 * @typedef {object} Player
 * @property {string} id
 * @property {Gender} gender
 * @property {SkillLevel} level
 *
 * @typedef {object} Participant
 * @property {string} playerId
 * @property {SlotKind} slot
 *
 * @typedef {object} Post  Một bài đăng tìm người ("kèo") ở dạng nghiệp vụ.
 * @property {string} id
 * @property {string} authorId
 * @property {string} courtName
 * @property {Date} startsAt
 * @property {Date} endsAt
 * @property {SkillLevel} levelMin
 * @property {SkillLevel} levelMax
 * @property {number} pricePerPerson  Chi phí mỗi người, đơn vị VND.
 * @property {SlotNeed} slots
 * @property {Participant[]} participants
 * @property {PostStatus} status
 *
 * @typedef {Omit<Post, 'id' | 'participants' | 'status'>} PostInput
 *
 * @typedef {object} FieldError
 * @property {string} field
 * @property {string} msg
 */

const MAX_DURATION_HOURS = 6;
const MAX_PRICE_PER_PERSON = 1_000_000;
const MAX_TOTAL_SLOTS = 20;

/** Thông báo cho từng mã lỗi tham gia / rời kèo (frontend map lại theo `code`). */
const JOIN_ERRORS = {
    POST_NOT_OPEN: 'Kèo đã đủ người hoặc đã đóng',
    POST_STARTED: 'Kèo đã bắt đầu',
    IS_AUTHOR: 'Bạn là chủ kèo này',
    ALREADY_JOINED: 'Bạn đã tham gia kèo này',
    NOT_JOINED: 'Bạn chưa tham gia kèo này',
    LEVEL_MISMATCH: 'Trình độ của bạn không nằm trong khoảng kèo yêu cầu',
    NO_SLOT: 'Kèo không còn chỗ phù hợp với giới tính của bạn'
};

/** @param {keyof typeof JOIN_ERRORS} code */
const joinError = (code) => new AppError(409, code, JOIN_ERRORS[code]);

/** @param {number} n */
const isNonNegativeInt = (n) => Number.isInteger(n) && n >= 0;

/** @param {SlotNeed} s */
const totalSlots = (s) => s.male + s.female + s.any;

/**
 * Kiểm tra dữ liệu bài đăng. Trả về danh sách lỗi (rỗng = hợp lệ).
 * @param {PostInput} input
 * @param {Date} now
 * @returns {FieldError[]}
 */
const validatePostInput = (input, now) => {
    /** @type {FieldError[]} */
    const errors = [];

    if (input.courtName.trim() === '') {
        errors.push({ field: 'courtName', msg: 'Tên sân không được để trống' });
    }

    // BR-01
    if (input.startsAt.getTime() <= now.getTime()) {
        errors.push({ field: 'startsAt', msg: 'Giờ bắt đầu phải ở tương lai' });
    }

    // BR-02
    const durationMs = input.endsAt.getTime() - input.startsAt.getTime();
    if (durationMs <= 0) {
        errors.push({ field: 'endsAt', msg: 'Giờ kết thúc phải sau giờ bắt đầu' });
    } else if (durationMs > MAX_DURATION_HOURS * 3_600_000) {
        errors.push({ field: 'endsAt', msg: `Thời lượng không quá ${MAX_DURATION_HOURS} giờ` });
    }

    // BR-03
    if (compareLevel(input.levelMin, input.levelMax) > 0) {
        errors.push({ field: 'levelMin', msg: 'Trình độ tối thiểu không được cao hơn tối đa' });
    }

    // BR-04
    if (!isNonNegativeInt(input.pricePerPerson) || input.pricePerPerson > MAX_PRICE_PER_PERSON) {
        errors.push({
            field: 'pricePerPerson',
            msg: `Chi phí phải là số nguyên từ 0 đến ${MAX_PRICE_PER_PERSON.toLocaleString('vi-VN')}đ`
        });
    }

    // BR-05
    const { male, female, any } = input.slots;
    if (![male, female, any].every(isNonNegativeInt)) {
        errors.push({ field: 'slots', msg: 'Số chỗ phải là số nguyên không âm' });
    } else {
        const total = totalSlots(input.slots);
        if (total < 1 || total > MAX_TOTAL_SLOTS) {
            errors.push({ field: 'slots', msg: `Tổng số chỗ phải từ 1 đến ${MAX_TOTAL_SLOTS}` });
        }
    }

    return errors;
};

/**
 * Ném AppError 400 VALIDATION_ERROR nếu dữ liệu không hợp lệ.
 * @param {PostInput} input
 * @param {Date} now
 */
const assertValidPostInput = (input, now) => {
    const errors = validatePostInput(input, now);
    if (errors.length > 0) {
        throw new AppError(400, 'VALIDATION_ERROR', errors[0].msg, errors);
    }
};

/**
 * @param {string} id
 * @param {PostInput} input
 * @param {Date} now
 * @returns {Post}
 */
const createPost = (id, input, now) => {
    assertValidPostInput(input, now);
    return { ...input, id, participants: [], status: 'open' };
};

/**
 * Số chỗ còn trống theo từng loại.
 * @param {Post} post
 * @returns {SlotNeed}
 */
const remainingSlots = (post) => {
    /** @type {SlotNeed} */
    const used = { male: 0, female: 0, any: 0 };
    for (const p of post.participants) {
        used[p.slot]++;
    }
    return {
        male: post.slots.male - used.male,
        female: post.slots.female - used.female,
        any: post.slots.any - used.any
    };
};

/**
 * Người chơi tham gia kèo. Không thay đổi `post` gốc mà trả về bản mới.
 * @param {Post} post
 * @param {Player} player
 * @param {Date} now
 * @returns {Post}
 * @throws {AppError} 409 với code trong JOIN_ERRORS
 */
const joinPost = (post, player, now) => {
    // BR-06
    if (post.status !== 'open') throw joinError('POST_NOT_OPEN');
    if (now.getTime() >= post.startsAt.getTime()) throw joinError('POST_STARTED');
    // BR-07
    if (player.id === post.authorId) throw joinError('IS_AUTHOR');
    // BR-08
    if (post.participants.some((p) => p.playerId === player.id)) throw joinError('ALREADY_JOINED');
    // BR-09
    if (!isLevelInRange(player.level, post.levelMin, post.levelMax)) throw joinError('LEVEL_MISMATCH');

    // BR-10: ưu tiên chỗ dành cho đúng giới tính, hết thì dùng chỗ chung
    const rem = remainingSlots(post);
    /** @type {SlotKind} */
    let slot;
    if (rem[player.gender] > 0) slot = player.gender;
    else if (rem.any > 0) slot = 'any';
    else throw joinError('NO_SLOT');

    /** @type {Post} */
    const next = { ...post, participants: [...post.participants, { playerId: player.id, slot }] };
    // BR-11
    return { ...next, status: totalSlots(remainingSlots(next)) === 0 ? 'full' : 'open' };
};

/**
 * Người chơi rời kèo (BR-12): chỉ trước giờ bắt đầu; kèo đang `full` sẽ mở lại.
 * @param {Post} post
 * @param {string} playerId
 * @param {Date} now
 * @returns {Post}
 */
const leavePost = (post, playerId, now) => {
    if (post.status === 'closed') throw joinError('POST_NOT_OPEN');
    if (now.getTime() >= post.startsAt.getTime()) throw joinError('POST_STARTED');
    if (!post.participants.some((p) => p.playerId === playerId)) throw joinError('NOT_JOINED');

    return {
        ...post,
        participants: post.participants.filter((p) => p.playerId !== playerId),
        status: 'open'
    };
};

module.exports = {
    MAX_DURATION_HOURS,
    MAX_PRICE_PER_PERSON,
    MAX_TOTAL_SLOTS,
    JOIN_ERRORS,
    totalSlots,
    validatePostInput,
    assertValidPostInput,
    createPost,
    remainingSlots,
    joinPost,
    leavePost
};
