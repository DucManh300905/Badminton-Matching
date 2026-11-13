const { vnDateString, vnDayRange, vnDateTime } = require('../../src/utils/vnTime');

describe('Giờ Việt Nam', () => {
    test('vnDateString: 23:30 giờ UTC đã là ngày hôm sau ở VN', () => {
        expect(vnDateString(new Date('2026-11-13T23:30:00Z'))).toBe('2026-11-14');
        expect(vnDateString(new Date('2026-11-13T16:59:59Z'))).toBe('2026-11-13');
    });

    test('vnDayRange: một ngày theo lịch VN bắt đầu lúc 17:00 UTC hôm trước', () => {
        const { start, end } = vnDayRange('2026-11-14');

        expect(start.toISOString()).toBe('2026-11-13T17:00:00.000Z');
        expect(end.toISOString()).toBe('2026-11-14T17:00:00.000Z');
    });

    test('vnDateTime: 19:00 tối mai theo giờ VN, kể cả khi sang tháng mới', () => {
        const now = new Date('2026-11-30T10:00:00+07:00');

        expect(vnDateTime(1, 19, 0, now).toISOString()).toBe('2026-12-01T12:00:00.000Z');
        expect(vnDateTime(0, 5, 30, now).toISOString()).toBe('2026-11-29T22:30:00.000Z');
    });
});
