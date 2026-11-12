import { SKILL_LEVELS, type SkillLevel } from './types';

export function levelIndex(level: SkillLevel): number {
  return SKILL_LEVELS.indexOf(level);
}

/** < 0 nếu a thấp hơn b, 0 nếu bằng, > 0 nếu a cao hơn b. */
export function compareLevel(a: SkillLevel, b: SkillLevel): number {
  return levelIndex(a) - levelIndex(b);
}

export function isLevelInRange(level: SkillLevel, min: SkillLevel, max: SkillLevel): boolean {
  return compareLevel(level, min) >= 0 && compareLevel(level, max) <= 0;
}
