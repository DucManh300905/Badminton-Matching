const mongoose = require('mongoose');

// Áp dụng cho mọi schema (phải require trước khi khai báo model):
// JSON trả về có `id` thay cho `_id`, bỏ `__v` và không bao giờ lộ `password` / `tokenVersion`.
mongoose.plugin((schema) => {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: (doc, ret) => {
            if (ret._id !== undefined) {
                ret.id = ret._id;
            }
            delete ret._id;
            delete ret.password;
            delete ret.tokenVersion;
            return ret;
        }
    });
});

module.exports = mongoose;
