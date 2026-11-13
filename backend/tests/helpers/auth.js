const request = require('supertest');
const app = require('../../src/app');

let counter = 0;

const PASSWORD = 'Test@12345';

/**
 * Đăng ký qua API thật (đăng ký xong là đăng nhập luôn), trả về { token, user, password }
 * @param {Partial<{ email: string, password: string, displayName: string, gender: string, level: string }>} [overrides]
 */
const createUserAndLogin = async (overrides = {}) => {
    counter += 1;
    const body = {
        email: `user${counter}@test.com`,
        password: PASSWORD,
        displayName: `Người chơi ${counter}`,
        gender: 'male',
        level: 'TB',
        ...overrides
    };

    const res = await request(app).post('/api/auth/register').send(body).expect(201);

    return { ...res.body.data, password: body.password };
};

/** Header Authorization cho supertest: .set(auth(token)) */
const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
    PASSWORD,
    createUserAndLogin,
    auth
};
