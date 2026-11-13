// Giờ Việt Nam (UTC+7, không có giờ mùa hè). Server có thể chạy ở múi giờ khác (CI: UTC),
// nên mọi phép tính "ngày" theo lịch VN phải đi qua các hàm ở đây.

const VN_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/**
 * Ngày theo lịch VN dạng "YYYY-MM-DD" của một thời điểm.
 * @param {Date} [date]
 */
const vnDateString = (date = new Date()) => new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Khoảng [đầu ngày, đầu ngày hôm sau) của một ngày theo lịch VN.
 * @param {string} dateStr  "YYYY-MM-DD"
 * @returns {{ start: Date, end: Date }}
 */
const vnDayRange = (dateStr) => {
    const start = new Date(`${dateStr}T00:00:00+07:00`);
    return { start, end: new Date(start.getTime() + DAY_MS) };
};

/**
 * Thời điểm `hour:minute` giờ VN, cách ngày của `now` một số ngày.
 * vd: vnDateTime(1, 19) = 19:00 tối mai (giờ VN)
 * @param {number} days
 * @param {number} hour
 * @param {number} [minute]
 * @param {Date} [now]
 */
const vnDateTime = (days, hour, minute = 0, now = new Date()) => {
    const { start } = vnDayRange(vnDateString(now));
    return new Date(start.getTime() + days * DAY_MS + (hour * 60 + minute) * 60_000);
};

module.exports = {
    vnDateString,
    vnDayRange,
    vnDateTime
};
