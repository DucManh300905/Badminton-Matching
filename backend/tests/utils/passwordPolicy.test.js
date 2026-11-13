const { passwordError } = require('../../src/utils/passwordPolicy');

describe('Chính sách mật khẩu', () => {
    test.each([
        ['Test@12345', null],
        ['caulongvui', null],
        ['1234567', 'Mật khẩu tối thiểu 8 ký tự'],
        [undefined, 'Mật khẩu tối thiểu 8 ký tự'],
        [12345678, 'Mật khẩu tối thiểu 8 ký tự'],
        ['MATKHAU123', 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác'],
        ['Badminton', 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác'],
        // 25 chữ "ộ" = 75 byte UTF-8 dù chỉ 25 ký tự → bcrypt sẽ cắt mất phần cuối
        ['ộ'.repeat(25), 'Mật khẩu tối đa 72 byte']
    ])('%p → %p', (password, expected) => {
        expect(passwordError(password)).toBe(expected);
    });
});
