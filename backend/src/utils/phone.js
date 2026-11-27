const VN_MOBILE = /^0(3|5|7|8|9)\d{8}$/;

/**
 * Chuẩn hóa số di động Việt Nam (WBS 4.15): bỏ khoảng trắng / dấu chấm / gạch, "+84" hoặc "84" → "0".
 * Trả về "" nếu để trống (= xóa số), null nếu không hợp lệ.
 * @param {unknown} value
 */
const normalizePhone = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return null;
    let s = value.replace(/[\s.()-]/g, '');
    if (s === '') return '';
    if (s.startsWith('+84')) s = `0${s.slice(3)}`;
    else if (/^84\d{9}$/.test(s)) s = `0${s.slice(2)}`;
    return VN_MOBILE.test(s) ? s : null;
};

module.exports = { VN_MOBILE, normalizePhone };
