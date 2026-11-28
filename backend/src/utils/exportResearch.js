require('dotenv').config();
const mongoose = require('../config/mongoose');
const { parseArgs, runExport } = require('../modules/research/research.export');

// ── Xuất số liệu nghiên cứu đã ẩn danh (US-22, WBS 6.3) ──
// Chạy trên máy chủ:  npm run export:research -- --from 2026-12-01 --to 2026-12-14
// Cần RESEARCH_SALT trong .env (xem docs/DEPLOY.md mục 9). Kết quả ghi vào ~/research-exports/<ngày-giờ>/.

const run = async () => {
    const opts = parseArgs(process.argv.slice(2));
    const salt = process.env.RESEARCH_SALT;
    if (!salt) throw new Error('Thiếu RESEARCH_SALT trong backend/.env (tạo: openssl rand -hex 32)');
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI in .env');

    await mongoose.connect(process.env.MONGODB_URI);
    const { dir, posts, excludedPosts } = await runExport({ ...opts, salt });
    console.log(`Đã xuất ${posts} kèo (${opts.from} → ${opts.to}; loại ${excludedPosts} kèo demo / thử)`);
    console.log(`Thư mục: ${dir}`);
    console.log(require('fs').readFileSync(require('path').join(dir, 'summary.txt'), 'utf8'));
};

run()
    .catch((err) => {
        console.error(`Lỗi: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
