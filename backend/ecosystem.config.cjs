// Cấu hình PM2 cho máy chủ chạy thật. Hướng dẫn: docs/DEPLOY.md
// deploy/deploy.sh truyền NODE_BIN = đường dẫn Node 24 (nvm) để PM2 không dùng nhầm bản Node khác trên máy.
module.exports = {
    apps: [
        {
            name: 'badminton-backend',
            cwd: __dirname,
            script: 'src/server.js',
            interpreter: process.env.NODE_BIN || 'node',
            env: {
                NODE_ENV: 'production'
            },
            // Tự khởi động lại nếu rò bộ nhớ; máy chủ có khoảng 4 GB RAM
            max_memory_restart: '300M',
            // Ghi thời gian vào từng dòng log
            time: true
        }
    ]
};
