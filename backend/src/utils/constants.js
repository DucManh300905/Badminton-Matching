// Danh mục dùng chung. Phải khớp với frontend/src/utils/constants.ts

const GENDERS = /** @type {const} */ (['male', 'female']);

/** Loại chỗ trống: dành riêng cho nam, cho nữ, hoặc ai cũng được. */
const SLOT_KINDS = /** @type {const} */ (['male', 'female', 'any']);

const POST_STATUSES = /** @type {const} */ (['open', 'full', 'closed']);

/**
 * Khu vực dùng để lọc kèo trong giai đoạn pilot tại Hà Nội.
 * Từ 01/07/2025 Hà Nội không còn cấp quận, nhưng người chơi vẫn quen gọi sân
 * theo tên quận cũ, nên dùng các tên này làm "khu vực".
 */
const HANOI_AREAS = /** @type {const} */ ([
    'Ba Đình',
    'Hoàn Kiếm',
    'Tây Hồ',
    'Long Biên',
    'Cầu Giấy',
    'Đống Đa',
    'Hai Bà Trưng',
    'Hoàng Mai',
    'Thanh Xuân',
    'Nam Từ Liêm',
    'Bắc Từ Liêm',
    'Hà Đông',
    'Khác'
]);

// Tiện ích chọn được cho 3 ô của thanh dưới trên điện thoại (WBS 4.12).
// "Đăng kèo" (giữa) và "Tổng quan" (cuối) luôn cố định nên không nằm trong danh sách.
// "Hôm nay" đã chuyển thành bộ lọc của Tìm kèo (WBS 4.15)
const TAB_BAR_ITEMS = ['search', 'mine', 'shuttles'];
const TAB_BAR_SIZE = 3;

module.exports = {
    TAB_BAR_ITEMS,
    TAB_BAR_SIZE,
    GENDERS,
    SLOT_KINDS,
    POST_STATUSES,
    HANOI_AREAS
};
