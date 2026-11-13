const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/user/user.model');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth, PASSWORD } = require('../helpers/auth');

setupDatabase();

const body = {
    email: '  Minh@Example.com ',
    password: PASSWORD,
    displayName: 'Minh',
    gender: 'male',
    level: 'TB'
};

describe('POST /api/auth/register', () => {
    test('đăng ký → 201, trả token + user (email chữ thường, không có password / tokenVersion)', async () => {
        const res = await request(app).post('/api/auth/register').send(body);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toEqual(expect.any(String));
        expect(res.body.data.user).toMatchObject({ email: 'minh@example.com', displayName: 'Minh', gender: 'male', level: 'TB' });
        expect(res.body.data.user.id).toBeDefined();
        expect(res.body.data.user).not.toHaveProperty('password');
        expect(res.body.data.user).not.toHaveProperty('tokenVersion');
    });

    test('mật khẩu được lưu dạng hash bcrypt, không lưu bản gốc', async () => {
        await request(app).post('/api/auth/register').send(body).expect(201);

        const user = await User.findOne({ email: 'minh@example.com' }).select('+password');
        expect(user.password).not.toBe(PASSWORD);
        expect(user.password).toMatch(/^\$2[aby]\$10\$/);
    });

    test('email trùng (khác hoa thường) → 409 DUPLICATE, chỉ rõ trường email', async () => {
        await request(app).post('/api/auth/register').send(body).expect(201);

        const res = await request(app).post('/api/auth/register').send({ ...body, email: 'MINH@example.com' });

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ code: 'DUPLICATE', errors: [{ field: 'email' }] });
    });

    test('dữ liệu sai → 400 VALIDATION_ERROR, liệt kê đủ các trường sai', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'khong-phai-email', password: '123', displayName: 'A', gender: 'other', level: 'PRO' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors.map((e) => e.field).sort()).toEqual(['displayName', 'email', 'gender', 'level', 'password']);
    });

    test.each([
        ['quá phổ biến', 'matkhau123', 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác'],
        ['quá phổ biến (khác hoa thường)', 'PassWord123', 'Mật khẩu quá phổ biến, hãy chọn mật khẩu khác'],
        ['dài quá 72 byte', 'Đ'.repeat(40), 'Mật khẩu tối đa 72 byte']
    ])('mật khẩu %s → 400', async (_name, password, msg) => {
        const res = await request(app).post('/api/auth/register').send({ ...body, password });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([{ field: 'password', msg }]);
    });

    test('không cho client tự đặt tokenVersion khi đăng ký', async () => {
        await request(app).post('/api/auth/register').send({ ...body, tokenVersion: 99 }).expect(201);

        const user = await User.findOne({ email: 'minh@example.com' }).select('+tokenVersion');
        expect(user.tokenVersion).toBe(0);
    });
});

describe('POST /api/auth/login', () => {
    test('đăng nhập đúng (email khác hoa thường) → token dùng được ngay', async () => {
        await createUserAndLogin({ email: 'lan@test.com' });

        const res = await request(app).post('/api/auth/login').send({ email: ' LAN@test.com', password: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('lan@test.com');
        await request(app).get('/api/users/me').set(auth(res.body.data.token)).expect(200);
    });

    test('sai mật khẩu và sai email → CÙNG 401 INVALID_CREDENTIALS (không lộ email nào đã đăng ký)', async () => {
        await createUserAndLogin({ email: 'lan@test.com' });

        const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'lan@test.com', password: 'SaiMatKhau1' });
        const wrongEmail = await request(app).post('/api/auth/login').send({ email: 'ai@test.com', password: PASSWORD });

        for (const res of [wrongPassword, wrongEmail]) {
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ success: false, message: 'Email hoặc mật khẩu không đúng', code: 'INVALID_CREDENTIALS' });
        }
    });

    test('thiếu mật khẩu → 400 VALIDATION_ERROR', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'lan@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([{ field: 'password', msg: 'Vui lòng nhập mật khẩu' }]);
    });
});
