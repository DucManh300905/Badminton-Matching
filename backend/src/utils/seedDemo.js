// Dữ liệu mẫu để phát triển và demo. Chạy: npm run seed:demo
// Chỉ XÓA và tạo lại các tài khoản @example.com cùng kèo của họ; tài khoản khác giữ nguyên.
// Mật khẩu mọi tài khoản mẫu: DEMO_PASSWORD trong .env (mặc định Demo@123).
require('dotenv').config();
const bcrypt = require('bcryptjs');

const mongoose = require('../config/mongoose');
const User = require('../modules/user/user.model');
const Post = require('../modules/post/post.model');
const { vnDateTime } = require('./vnTime');

const DEMO_DOMAIN = '@example.com';

const PEOPLE = [
    { email: 'minh@example.com', displayName: 'Minh', gender: 'male', level: 'TB' },
    { email: 'lan@example.com', displayName: 'Lan', gender: 'female', level: 'TB_MINUS' },
    { email: 'hung@example.com', displayName: 'Hùng', gender: 'male', level: 'KHA' },
    { email: 'thu@example.com', displayName: 'Thu', gender: 'female', level: 'TB_PLUS' }
];

const run = async () => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Không chạy seed demo trên production');
    }
    if (!process.env.MONGODB_URI) {
        throw new Error('Missing MONGODB_URI in .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const oldUsers = await User.find({ email: { $regex: `${DEMO_DOMAIN.replace('.', '\\.')}$` } }).select('_id');
    const oldIds = oldUsers.map((u) => u._id);
    await Post.deleteMany({ author: { $in: oldIds } });
    await User.deleteMany({ _id: { $in: oldIds } });

    const password = await bcrypt.hash(process.env.DEMO_PASSWORD || 'Demo@123', 10);
    const [minh, lan, hung, thu] = await User.insertMany(PEOPLE.map((p) => ({ ...p, password })));

    // Nếu đã quá 18h thì kèo "tối nay" chuyển sang tối mai để vẫn hiện trong danh sách
    const tonight = vnDateTime(0, 18) > new Date() ? 0 : 1;

    const posts = await Post.insertMany([
        {
            author: minh._id,
            courtName: 'Sân Cầu Giấy',
            district: 'Cầu Giấy',
            startsAt: vnDateTime(tonight, 19),
            endsAt: vnDateTime(tonight, 21),
            levelMin: 'TB_MINUS',
            levelMax: 'TB_PLUS',
            pricePerPerson: 50_000,
            slots: { male: 2, female: 1, any: 0 },
            participants: [{ user: lan._id, slot: 'female' }],
            rawText: 'Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng'
        },
        {
            author: hung._id,
            courtName: 'Sân Thành Công',
            district: 'Đống Đa',
            startsAt: vnDateTime(1, 5, 30),
            endsAt: vnDateTime(1, 7, 30),
            levelMin: 'TB_PLUS',
            levelMax: 'GIOI',
            pricePerPerson: 45_000,
            slots: { male: 0, female: 0, any: 2 },
            note: 'Đánh đôi nam nữ, cầu Thành Công'
        },
        {
            author: thu._id,
            courtName: 'Sân Hoàng Mai Sport',
            district: 'Hoàng Mai',
            startsAt: vnDateTime(1, 19),
            endsAt: vnDateTime(1, 21),
            levelMin: 'TB_YEU',
            levelMax: 'TB',
            pricePerPerson: 60_000,
            slots: { male: 1, female: 1, any: 1 },
            note: 'Giao lưu vui vẻ, mới chơi cũng được'
        },
        {
            author: lan._id,
            courtName: 'Sân Mỹ Đình',
            district: 'Nam Từ Liêm',
            startsAt: vnDateTime(2, 18),
            endsAt: vnDateTime(2, 20),
            levelMin: 'YEU',
            levelMax: 'TB_MINUS',
            pricePerPerson: 40_000,
            slots: { male: 0, female: 2, any: 0 }
        },
        {
            author: minh._id,
            courtName: 'Sân Long Biên',
            district: 'Long Biên',
            startsAt: vnDateTime(3, 20),
            endsAt: vnDateTime(3, 22),
            levelMin: 'TB',
            levelMax: 'KHA',
            pricePerPerson: 55_000,
            slots: { male: 1, female: 0, any: 1 }
        }
    ]);

    console.log(`Seeded ${PEOPLE.length} demo users (${PEOPLE.map((p) => p.email).join(', ')}) and ${posts.length} posts`);
    console.log(`Password: ${process.env.DEMO_PASSWORD ? '(DEMO_PASSWORD in .env)' : 'Demo@123'}`);
};

run()
    .catch((error) => {
        console.error('Seed failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
