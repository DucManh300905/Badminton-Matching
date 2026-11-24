// Kho cầu của mỗi người dùng (WBS 4.10). Mỗi document là một loại cầu.
const mongoose = require('mongoose');

const MAX_TYPES = 20;
const MAX_NAME = 40;
const MAX_QUANTITY = 10_000;
const MAX_UNIT_PRICE = 1_000_000;

const intField = (max, message) => ({
    type: Number,
    required: true,
    min: 0,
    max,
    validate: { validator: Number.isInteger, message }
});

const shuttleSchema = new mongoose.Schema(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true, minlength: 1, maxlength: MAX_NAME },
        // Số quả còn trong kho; không bao giờ âm (trừ quá số còn thì dừng ở 0)
        quantity: intField(MAX_QUANTITY, 'Số quả phải là số nguyên'),
        // Giá mỗi quả (đồng), bình quân theo số quả sau mỗi lần nhập
        unitPrice: intField(MAX_UNIT_PRICE, 'Giá phải là số nguyên'),
        // Số quả ngay sau lần nhập gần nhất = 100% của thanh mức cầu
        fullLevel: intField(MAX_QUANTITY, 'Số quả phải là số nguyên')
    },
    { timestamps: true }
);

module.exports = mongoose.model('Shuttle', shuttleSchema);
module.exports.MAX_TYPES = MAX_TYPES;
module.exports.MAX_NAME = MAX_NAME;
module.exports.MAX_QUANTITY = MAX_QUANTITY;
module.exports.MAX_UNIT_PRICE = MAX_UNIT_PRICE;
