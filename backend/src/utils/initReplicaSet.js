// Khởi tạo replica set một nút cho MongoDB cài trên máy (chỉ cần chạy MỘT lần).
// Điều kiện: mongod.cfg đã có "replication: replSetName: rs0" và đã khởi động lại MongoDB.
// Chạy: npm run db:init-replset
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Missing MONGODB_URI in .env');
    }

    // Chưa initiate thì chưa có replica set → kết nối thẳng, bỏ tham số replicaSet
    const directUri = uri.replace(/([?&])replicaSet=[^&]*&?/, '$1').replace(/[?&]$/, '');
    const host = new URL(directUri).host;
    const replSetName = new URL(uri).searchParams.get('replicaSet') || 'rs0';

    await mongoose.connect(directUri, { directConnection: true, serverSelectionTimeoutMS: 5000 });
    const admin = mongoose.connection.db.admin();

    try {
        const status = await admin.command({ replSetGetStatus: 1 });
        console.log(`Replica set "${status.set}" already initialized (${status.members.length} member)`);
    } catch (error) {
        // 94 NotYetInitialized: đã bật replication nhưng chưa initiate
        if (error.code !== 94) {
            throw error;
        }
        await admin.command({ replSetInitiate: { _id: replSetName, members: [{ _id: 0, host }] } });
        console.log(`Replica set "${replSetName}" initialized on ${host}`);
    }
};

run()
    .catch((error) => {
        console.error('Init replica set failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
