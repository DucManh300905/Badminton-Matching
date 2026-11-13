const request = require('supertest');
const app = require('../src/app');

describe('App', () => {
    test('GET /api/health trả về 200', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('route không tồn tại trả 404 NOT_FOUND', async () => {
        const res = await request(app).get('/api/khong-co');

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    });

    test('body JSON hỏng trả 400 VALIDATION_ERROR', async () => {
        const res = await request(app)
            .post('/api/health')
            .set('Content-Type', 'application/json')
            .send('{bad');

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    test('body lớn hơn 100kb trả 413 PAYLOAD_TOO_LARGE', async () => {
        const res = await request(app)
            .post('/api/health')
            .send({ text: 'x'.repeat(110 * 1024) });

        expect(res.status).toBe(413);
        expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
    });

    test('có header bảo mật của helmet, không lộ "X-Powered-By: Express"', async () => {
        const res = await request(app).get('/api/health');

        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('CORS chỉ cho phép frontend trong CLIENT_URL', async () => {
        const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
});
