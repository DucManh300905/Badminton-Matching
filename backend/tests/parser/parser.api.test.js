const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/parse', () => {
    test('trích thông tin kèo từ bài đăng, không cần đăng nhập', async () => {
        const res = await request(app)
            .post('/api/parse')
            .send({ text: 'Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            success: true,
            data: {
                dayOffset: 0,
                start: { hour: 19, minute: 0 },
                end: { hour: 21, minute: 0 },
                slots: { male: 2, female: 1, any: 0 },
                levelMin: 'TB_MINUS',
                levelMax: 'TB_PLUS',
                pricePerPerson: 50_000,
                confidence: 1
            }
        });
    });

    test.each([
        ['rỗng', { text: '   ' }],
        ['thiếu', {}],
        ['không phải chuỗi', { text: 123 }],
        ['quá 5000 ký tự', { text: 'a'.repeat(5001) }]
    ])('nội dung %s → 400 VALIDATION_ERROR', async (_name, body) => {
        const res = await request(app).post('/api/parse').send(body);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
    });
});
