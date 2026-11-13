const mongoose = require('mongoose');
const Post = require('../../src/modules/post/post.model');
const { joinPost } = require('../../src/modules/post/post.rules');
const { setupDatabase } = require('../helpers/db');

setupDatabase();

const authorId = new mongoose.Types.ObjectId();

const base = () => ({
    author: authorId,
    courtName: '  Sân Cầu Giấy ',
    district: 'Cầu Giấy',
    startsAt: new Date('2027-01-05T19:00:00+07:00'),
    endsAt: new Date('2027-01-05T21:00:00+07:00'),
    levelMin: 'TB_MINUS',
    levelMax: 'TB_PLUS',
    pricePerPerson: 50_000,
    slots: { male: 1, female: 1 }
});

describe('Post model', () => {
    test('giá trị mặc định: status open, chưa có người tham gia, loại chỗ không khai báo = 0', async () => {
        const post = await Post.create(base());

        expect(post.status).toBe('open');
        expect(post.participants).toHaveLength(0);
        expect(post.slots.any).toBe(0);
        expect(post.courtName).toBe('Sân Cầu Giấy');
    });

    test.each([
        ['khu vực ngoài danh sách', { district: 'Sao Hỏa' }, 'district'],
        ['trình độ không tồn tại', { levelMin: 'PRO' }, 'levelMin'],
        ['chi phí không nguyên', { pricePerPerson: 50_000.5 }, 'pricePerPerson'],
        ['chi phí âm', { pricePerPerson: -1 }, 'pricePerPerson'],
        ['số chỗ không nguyên', { slots: { male: 1.5 } }, 'slots.male'],
        ['thiếu tên sân', { courtName: '' }, 'courtName']
    ])('từ chối %s', async (_name, overrides, field) => {
        const err = await new Post({ ...base(), ...overrides }).validate().catch((e) => e);

        expect(Object.keys(err.errors)).toContain(field);
    });

    test('người tham gia nằm trong document kèo và không có _id riêng', async () => {
        const userId = new mongoose.Types.ObjectId();
        const post = await Post.create({ ...base(), participants: [{ user: userId, slot: 'female' }] });

        const json = (await Post.findById(post._id)).toJSON();
        expect(json.participants).toHaveLength(1);
        expect(json.participants[0]).toMatchObject({ slot: 'female' });
        expect(json.participants[0]).not.toHaveProperty('_id');
        expect(json.participants[0].joinedAt).toBeInstanceOf(Date);
    });

    test('toRules() chuyển sang dạng post.rules hiểu được và dùng được ngay với joinPost', async () => {
        const userId = new mongoose.Types.ObjectId();
        const post = await Post.create({ ...base(), participants: [{ user: userId, slot: 'female' }] });

        const rules = post.toRules();
        expect(rules).toEqual({
            id: String(post._id),
            authorId: String(authorId),
            courtName: 'Sân Cầu Giấy',
            startsAt: base().startsAt,
            endsAt: base().endsAt,
            levelMin: 'TB_MINUS',
            levelMax: 'TB_PLUS',
            pricePerPerson: 50_000,
            slots: { male: 1, female: 1, any: 0 },
            participants: [{ playerId: String(userId), slot: 'female' }],
            status: 'open'
        });

        const next = joinPost(rules, { id: 'nguoi-moi', gender: 'male', level: 'TB' }, new Date('2027-01-05T10:00:00+07:00'));
        expect(next.status).toBe('full');
    });

    test('toRules() vẫn đúng khi author / participants.user đã được populate', async () => {
        const post = await Post.create({ ...base(), participants: [{ user: new mongoose.Types.ObjectId(), slot: 'male' }] });
        const fake = Object.assign(post, {
            author: { _id: authorId, displayName: 'Chủ kèo' }
        });
        fake.participants[0].user = { _id: fake.participants[0].user, displayName: 'An' };

        const rules = fake.toRules();
        expect(rules.authorId).toBe(String(authorId));
        expect(rules.participants[0].playerId).toMatch(/^[a-f0-9]{24}$/);
    });
});
