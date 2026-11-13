require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');

const PORT = Number(process.env.PORT) || 8080;

const startServer = async () => {
    if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
        console.error('Missing JWT_SECRET or MONGODB_URI in .env (copy backend/.env.example to backend/.env)');
        process.exit(1);
    }

    // Secret ngắn / mặc định → đoán được → giả mạo được token của bất kỳ ai. Tạo: openssl rand -hex 48
    if (process.env.JWT_SECRET.length < 32 || /change-me/i.test(process.env.JWT_SECRET)) {
        console.error('JWT_SECRET is too weak (need >= 32 random characters). Generate one: openssl rand -hex 48');
        process.exit(1);
    }

    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
};

startServer();
