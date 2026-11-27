const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');
const app = require('../../src/app');
const { outbox } = require('../../src/utils/mailer');
const { uploadDir } = require('../../src/utils/images');
const { setupDatabase } = require('../helpers/db');
const { createUserAndLogin, auth } = require('../helpers/auth');
const { vnDateTime } = require('../../src/utils/vnTime');

// ── WBS 4.14 — ảnh chuyển khoản người chơi gửi, email báo chủ kèo, QR trên hóa đơn ──

setupDatabase();

beforeEach(() => {
    outbox.length = 0;
});

const png = () => sharp({ create: { width: 500, height: 900, channels: 3, background: '#eee' } }).png().toBuffer();

const setup = async () => {
    const host = await createUserAndLogin({ displayName: 'Minh Chủ' });
    const player = await createUserAndLogin({ displayName: 'Lan Chơi' });
    const other = await createUserAndLogin({ displayName: 'Hùng' });
    const post = (
        await request(app)
            .post('/api/posts')
            .set(auth(host.token))
            .send({
                courtName: 'Sân Chuyển Khoản',
                district: 'Tây Hồ',
                startsAt: vnDateTime(1, 19).toISOString(),
                endsAt: vnDateTime(1, 21).toISOString(),
                levelMin: 'YEU',
                levelMax: 'GIOI',
                pricePerPerson: 50_000,
                slots: { any: 3 }
            })
    ).body.data;
    for (const u of [player, other]) await request(app).post(`/api/posts/${post.id}/join`).set(auth(u.token)).expect(200);
    return { host, player, other, post };
};

const sendProof = async (token, postId) =>
    request(app).post(`/api/posts/${postId}/proofs`).set(auth(token)).attach('image', await png(), 'ck.png');

describe('Ảnh chuyển khoản', () => {
    test('người chơi gửi → chủ kèo thấy "chờ xác nhận" + ảnh, nhận email; người chơi khác không thấy ảnh', async () => {
        const { host, player, other, post } = await setup();
        const res = await sendProof(player.token, post.id);
        expect(res.status).toBe(200);
        const mine = res.body.data.payment.myProofs;
        expect(mine).toHaveLength(1);
        expect(mine[0].url).toMatch(/^\/uploads\/proofs\/[a-f0-9]{32}\.webp$/);
        expect(fs.existsSync(path.join(uploadDir(), 'proofs', mine[0].file))).toBe(true);

        const hostView = (await request(app).get(`/api/posts/${post.id}`).set(auth(host.token))).body.data;
        const lan = hostView.participants.find((p) => p.id === player.user.id);
        expect(lan).toMatchObject({ pendingProof: true, paid: false });
        expect(lan.proofs).toHaveLength(1);

        const otherView = (await request(app).get(`/api/posts/${post.id}`).set(auth(other.token))).body.data;
        expect(otherView.participants.find((p) => p.id === player.user.id).proofs).toBeUndefined();

        expect(outbox).toHaveLength(1);
        expect(outbox[0]).toMatchObject({ to: host.user.email, subject: 'Lan Chơi đã gửi ảnh chuyển khoản' });
        expect(outbox[0].text).toContain(`/keo/${post.id}`);

        // Chủ kèo đánh dấu đã trả → hết "chờ xác nhận", ảnh vẫn còn
        await request(app).patch(`/api/posts/${post.id}/participants/${player.user.id}/payment`).set(auth(host.token)).send({ paid: true }).expect(200);
        const after = (await request(app).get(`/api/posts/${post.id}`).set(auth(host.token))).body.data;
        expect(after.participants.find((p) => p.id === player.user.id)).toMatchObject({ pendingProof: false, paid: true });
    });

    test('tối đa 3 ảnh; xóa ảnh của mình; chủ kèo / người ngoài không gửi được; kèo hủy → 409', async () => {
        const { host, player, other, post } = await setup();
        for (let i = 0; i < 3; i += 1) expect((await sendProof(player.token, post.id)).status).toBe(200);
        const fourth = await sendProof(player.token, post.id);
        expect(fourth.status).toBe(409);
        expect(fourth.body.code).toBe('PROOF_LIMIT');

        const file = (await request(app).get(`/api/posts/${post.id}`).set(auth(player.token))).body.data.payment.myProofs[0].file;
        await request(app).delete(`/api/posts/${post.id}/proofs/${file}`).set(auth(other.token)).expect(404);
        const del = await request(app).delete(`/api/posts/${post.id}/proofs/${file}`).set(auth(player.token));
        expect(del.status).toBe(200);
        expect(del.body.data.payment.myProofs).toHaveLength(2);
        expect(fs.existsSync(path.join(uploadDir(), 'proofs', file))).toBe(false);

        expect((await sendProof(host.token, post.id)).body.code).toBe('NOT_JOINED');
        const outsider = await createUserAndLogin();
        expect((await sendProof(outsider.token, post.id)).status).toBe(403);

        await request(app).post(`/api/posts/${post.id}/cancel`).set(auth(host.token)).expect(200);
        expect((await sendProof(other.token, post.id)).body.code).toBe('POST_NOT_OPEN');
    });
});

describe('QR trên hóa đơn', () => {
    test('có số tài khoản → qrOpen (không ghi số tiền) cho người trong kèo; chưa có → null', async () => {
        const { host, player, post } = await setup();
        expect((await request(app).get(`/api/posts/${post.id}`).set(auth(host.token))).body.data.payment.qrOpen).toBeNull();

        await request(app)
            .put('/api/users/me/bank-account')
            .set(auth(host.token))
            .send({ bankBin: '970436', accountNumber: '0123456789', accountName: 'Minh Chu' })
            .expect(200);
        const qr = (await request(app).get(`/api/posts/${post.id}`).set(auth(player.token))).body.data.payment.qrOpen;
        expect(qr).toMatch(/^000201/);
        expect(qr).toContain('0123456789');
        // Không có trường số tiền (tag 54)
        expect(qr).not.toMatch(/5303704540/);
    });
});
