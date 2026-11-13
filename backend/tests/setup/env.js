// Biến môi trường cho test, không đọc từ .env thật
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
// Test đăng nhập rất nhiều lần từ cùng IP → nới giới hạn (tests/auth/rate-limit.test.js tự dựng limiter số nhỏ)
process.env.AUTH_RATE_LIMIT = '100000';

// Plugin toJSON (id thay _id) phải đăng ký trước khi nạp bất kỳ model nào —
// app.js làm việc này, nhưng file test có thể require model trước app.
require('../../src/config/mongoose');
