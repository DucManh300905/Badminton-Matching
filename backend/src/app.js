// Phải nạp trước các route (route require model) để plugin toJSON áp dụng cho mọi schema
require('./config/mongoose');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { notFound, errorHandler } = require('./middlewares/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');

const app = express();

// Chạy sau proxy (nginx, Render…): TRUST_PROXY=1 để lấy đúng IP người dùng (giới hạn số lần đăng nhập theo IP)
app.set('trust proxy', Number(process.env.TRUST_PROXY) || false);

// Header bảo mật: nosniff, chống nhúng iframe, HSTS…
app.use(helmet());

// Chỉ cho frontend của mình gọi API từ trình duyệt
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173'
    })
);

// Giới hạn body JSON để chặn request khổng lồ
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Badminton Matching API is running'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// TODO: /api/posts, /api/parse

app.use(notFound);
app.use(errorHandler);

module.exports = app;
