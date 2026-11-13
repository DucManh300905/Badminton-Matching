// Chính sách mật khẩu dùng chung cho đăng ký và đổi mật khẩu.

const MIN_LENGTH = 8;
// bcrypt chỉ dùng 72 byte đầu: dài hơn thì phần sau bị bỏ qua
const MAX_BYTES = 72;

// Mật khẩu hay bị dò nhất (rút gọn) — so sánh không phân biệt hoa thường
const COMMON_PASSWORDS = new Set([
    '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '88888888', '66666666',
    '12341234', '11223344', '12121212', '123123123', 'password', 'password1', 'password123', 'passw0rd',
    'qwertyui', 'qwerty123', 'qwertyuiop', '1q2w3e4r', '1qaz2wsx', 'abcd1234', 'abc12345', 'iloveyou',
    'admin123', 'admin@123', 'administrator', 'welcome1', 'letmein1', 'matkhau123', 'matkhau1', 'anhyeuem',
    'yeuem123', 'vietnam1', 'hanoi123', 'demo@123', 'test1234', 'changeme', 'caulong1', 'caulong123',
    'badminton', 'badminton1'
]);

/** Trả về thông báo lỗi hoặc null nếu hợp lệ. @param {unknown} password */
const passwordError = (password) => {
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
        return `Mật khẩu tối thiểu ${MIN_LENGTH} ký tự`;
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
        return `Mật khẩu tối đa ${MAX_BYTES} byte`;
    }

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        return 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác';
    }

    return null;
};

module.exports = {
    MIN_LENGTH,
    MAX_BYTES,
    passwordError
};
