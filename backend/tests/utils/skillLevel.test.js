const { compareLevel, isLevelInRange } = require('../../src/utils/skillLevel');

describe('level', () => {
    test('so sánh đúng thứ tự trình độ', () => {
        expect(compareLevel('YEU', 'GIOI')).toBeLessThan(0);
        expect(compareLevel('TB_PLUS', 'TB')).toBeGreaterThan(0);
        expect(compareLevel('TB', 'TB')).toBe(0);
    });

    test('kiểm tra trình độ trong khoảng (bao gồm hai đầu)', () => {
        expect(isLevelInRange('TB', 'TB_MINUS', 'TB_PLUS')).toBe(true);
        expect(isLevelInRange('TB_MINUS', 'TB_MINUS', 'TB_PLUS')).toBe(true);
        expect(isLevelInRange('TB_PLUS', 'TB_MINUS', 'TB_PLUS')).toBe(true);
        expect(isLevelInRange('KHA', 'TB_MINUS', 'TB_PLUS')).toBe(false);
    });
});
