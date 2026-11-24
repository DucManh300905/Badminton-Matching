const request = require('supertest');
const app = require('../../src/app');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');

setupDatabase();

const put = (token, body) => request(app).put('/api/users/me/bank-account').set(auth(token)).send(body);

describe('PUT /api/users/me/bank-account — tài khoản nhận tiền', () => {
    test('chưa đăng nhập → 401', async () => {
        await request(app).put('/api/users/me/bank-account').send({}).expect(401);
    });

    test('hợp lệ → lưu; số tài khoản bỏ khoảng trắng, tên đổi in hoa không dấu; GET /me trả về', async () => {
        const { token } = await createUserAndLogin();

        const res = await put(token, { bankBin: '970436', accountNumber: '0123 456.789', accountName: ' Nguyễn  Văn Đức ' });

        expect(res.status).toBe(200);
        expect(res.body.data.bankAccount).toEqual({
            bankBin: '970436',
            accountNumber: '0123456789',
            accountName: 'NGUYEN VAN DUC'
        });

        const me = await request(app).get('/api/users/me').set(auth(token)).expect(200);
        expect(me.body.data.bankAccount.accountNumber).toBe('0123456789');
    });

    test.each([
        ['ngân hàng không có trong danh sách', { bankBin: '999999' }, 'bankBin'],
        ['số tài khoản có chữ', { accountNumber: '01234abc' }, 'accountNumber'],
        ['số tài khoản quá ngắn', { accountNumber: '12345' }, 'accountNumber'],
        ['tên chủ tài khoản rỗng', { accountName: '  ' }, 'accountName']
    ])('%s → 400 VALIDATION_ERROR', async (_name, change, field) => {
        const { token } = await createUserAndLogin();
        const body = { bankBin: '970436', accountNumber: '0123456789', accountName: 'Nguyen Van A', ...change };

        const res = await put(token, body);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors.map((e) => e.field)).toContain(field);
    });

    test('DELETE → xóa tài khoản nhận tiền', async () => {
        const { token } = await createUserAndLogin();
        await put(token, { bankBin: '970436', accountNumber: '0123456789', accountName: 'Nguyen Van A' }).expect(200);

        const res = await request(app).delete('/api/users/me/bank-account').set(auth(token)).expect(200);

        expect(res.body.data).not.toHaveProperty('bankAccount');
    });
});
