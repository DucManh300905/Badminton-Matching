// Kênh WebSocket để đẩy tin nhắn tới người đang mở app (WBS 4.13).
// - Chỉ nhận kết nối ở /api/ws, từ đúng địa chỉ web (CLIENT_URL).
// - Đăng nhập bằng tin đầu tiên { type: 'auth', token } (không để token trên URL → không lọt vào log Nginx);
//   quá 5 giây chưa đăng nhập thì đóng.
// - Gửi tin vẫn qua REST (POST /api/chats/:key/messages); kênh này chỉ đẩy tin mới xuống.
// - PM2 chạy MỘT tiến trình nên danh sách người đang kết nối để trong bộ nhớ là đủ.
const { WebSocketServer } = require('ws');
const { verifyToken } = require('../../middlewares/auth.middleware');

const PATH = '/api/ws';
const AUTH_TIMEOUT_MS = 5000;
const PING_MS = 30_000;

/** userId → các kết nối đang mở (một người có thể mở nhiều tab / máy) */
const sockets = new Map();

const add = (userId, ws) => {
    if (!sockets.has(userId)) sockets.set(userId, new Set());
    sockets.get(userId).add(ws);
};

const remove = (userId, ws) => {
    const set = sockets.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) sockets.delete(userId);
};

/**
 * Đẩy một sự kiện tới các người dùng đang kết nối.
 * @param {string[]} userIds
 * @param {object} payload
 */
const notify = (userIds, payload) => {
    const data = JSON.stringify(payload);
    for (const id of new Set(userIds.map(String))) {
        for (const ws of sockets.get(id) ?? []) {
            if (ws.readyState === ws.OPEN) ws.send(data);
        }
    }
};

const allowedOrigin = (origin) => !origin || origin === (process.env.CLIENT_URL || 'http://localhost:5173');

/**
 * Gắn kênh WebSocket vào HTTP server (server.js, và trong test).
 * @param {import('http').Server} server
 */
const attach = (server) => {
    const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

    server.on('upgrade', (req, socket, head) => {
        const path = (req.url ?? '').split('?')[0];
        if (path !== PATH || !allowedOrigin(req.headers.origin)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
    });

    wss.on('connection', (ws) => {
        let userId = null;
        ws.isAlive = true;
        const timer = setTimeout(() => !userId && ws.close(4001, 'auth timeout'), AUTH_TIMEOUT_MS);

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', async (raw) => {
            if (userId) return; // sau khi đăng nhập không nhận gì thêm
            let msg;
            try {
                msg = JSON.parse(String(raw));
            } catch {
                return ws.close(4002, 'bad message');
            }
            if (msg?.type !== 'auth' || typeof msg.token !== 'string') return ws.close(4002, 'bad message');
            try {
                const user = await verifyToken(msg.token);
                userId = user.userId;
                clearTimeout(timer);
                add(userId, ws);
                ws.send(JSON.stringify({ type: 'ready' }));
            } catch {
                ws.close(4003, 'unauthorized');
            }
        });

        ws.on('close', () => {
            clearTimeout(timer);
            if (userId) remove(userId, ws);
        });
    });

    // Kết nối chết (mất mạng giữa chừng) → đóng để không gửi vào chỗ trống
    const ping = setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.isAlive) {
                ws.terminate();
                continue;
            }
            ws.isAlive = false;
            ws.ping();
        }
    }, PING_MS);
    ping.unref();
    server.on('close', () => {
        clearInterval(ping);
        wss.close();
    });

    return wss;
};

module.exports = { PATH, attach, notify };
