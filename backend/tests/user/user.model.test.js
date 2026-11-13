const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');

setupDatabase();

const base = {
    email: '  Minh@Example.COM ',
    password: '$2b$10$hashgia',
    displayName: 'Minh',
    gender: 'male',
    level: 'TB'
};

describe('User model', () => {
    test('email được chuẩn hóa: bỏ khoảng trắng, chữ thường', async () => {
        const user = await User.create(base);

        expect(user.email).toBe('minh@example.com');
    });

    test('email trùng (khác hoa thường) → lỗi unique 11000', async () => {
        await User.create(base);

        await expect(User.create({ ...base, email: 'MINH@example.com' })).rejects.toMatchObject({ code: 11000 });
    });

    test('mật khẩu không được đọc ra mặc định, và không bao giờ có trong JSON', async () => {
        const created = await User.create(base);

        const found = await User.findById(created._id);
        expect(found.password).toBeUndefined();

        const withPassword = await User.findById(created._id).select('+password');
        expect(withPassword.password).toBe(base.password);
        expect(withPassword.toJSON()).not.toHaveProperty('password');
    });

    test('JSON có `id`, không có `_id` và `__v`', async () => {
        const json = (await User.create(base)).toJSON();

        expect(json.id).toBeDefined();
        expect(json).not.toHaveProperty('_id');
        expect(json).not.toHaveProperty('__v');
    });

    test('giới tính và trình độ phải nằm trong danh mục', async () => {
        const err = await new User({ ...base, gender: 'other', level: 'PRO' }).validate().catch((e) => e);

        expect(Object.keys(err.errors).sort()).toEqual(['gender', 'level']);
    });
});
