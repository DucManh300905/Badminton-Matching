// Chạy 1 lần sau toàn bộ test: tắt MongoDB trong RAM
module.exports = async () => {
    await globalThis.__MONGO_REPLSET__?.stop();
};
