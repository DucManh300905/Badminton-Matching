// Thang trình độ phổ biến trong cộng đồng cầu lông phong trào Việt Nam (thấp → cao).

const SKILL_LEVELS = /** @type {const} */ (['YEU', 'TB_YEU', 'TB_MINUS', 'TB', 'TB_PLUS', 'KHA', 'GIOI']);

/** @typedef {typeof SKILL_LEVELS[number]} SkillLevel */

/** @type {Record<SkillLevel, string>} */
const SKILL_LEVEL_LABELS = {
    YEU: 'Yếu / mới chơi',
    TB_YEU: 'TB yếu',
    TB_MINUS: 'TB-',
    TB: 'TB',
    TB_PLUS: 'TB+ / TB khá',
    KHA: 'Khá',
    GIOI: 'Giỏi'
};

/** @param {SkillLevel} level */
const levelIndex = (level) => SKILL_LEVELS.indexOf(level);

/**
 * < 0 nếu a thấp hơn b, 0 nếu bằng, > 0 nếu a cao hơn b.
 * @param {SkillLevel} a
 * @param {SkillLevel} b
 */
const compareLevel = (a, b) => levelIndex(a) - levelIndex(b);

/**
 * Trình độ nằm trong khoảng [min, max] (bao gồm hai đầu).
 * @param {SkillLevel} level
 * @param {SkillLevel} min
 * @param {SkillLevel} max
 */
const isLevelInRange = (level, min, max) => compareLevel(level, min) >= 0 && compareLevel(level, max) <= 0;

module.exports = {
    SKILL_LEVELS,
    SKILL_LEVEL_LABELS,
    levelIndex,
    compareLevel,
    isLevelInRange
};
