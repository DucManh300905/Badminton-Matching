const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }

    // Tạo / cập nhật index theo schema hiện tại (vd: email unique).
    // Lỗi ở bước này không làm dừng server, chỉ in cảnh báo.
    try {
        await mongoose.syncIndexes();
    } catch (error) {
        console.warn('Sync indexes failed:', error.message);
    }

    // Tham gia / rời kèo dùng transaction → MongoDB phải chạy dạng replica set (Atlas có sẵn).
    // MongoDB cài trên máy mặc định là standalone: báo ngay thay vì để người dùng gặp lỗi 500 khi bấm "Tham gia".
    const hello = await mongoose.connection.db
        .admin()
        .command({ hello: 1 })
        .catch(() => ({}));
    if (!hello.setName && hello.msg !== 'isdbgrid') {
        console.warn(
            'Warning: MongoDB is standalone (not a replica set) -> joining posts will FAIL (transactions unsupported).\n' +
                '         Fix: add "replication: replSetName: rs0" to mongod.cfg, restart MongoDB, then run: npm run db:init-replset'
        );
    }
};

module.exports = connectDatabase;
