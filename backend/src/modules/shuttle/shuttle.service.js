// Kho cầu (WBS 4.10): loại cầu, nhập thêm, kiểm kê, thống kê số quả đã dùng.
// Số quả bị trừ / hoàn tự động khi chủ kèo lưu khoản "Cầu" (post.service.js → applyStockChanges).
const mongoose = require('mongoose');

const Shuttle = require('./shuttle.model');
const Post = require('../post/post.model');
const AppError = require('../../utils/AppError');
const { vnDateString } = require('../../utils/vnTime');

const notFound = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy loại cầu');

/** Giá mỗi quả từ tổng tiền đã trả: 560.000đ / 24 quả = 23.333đ */
const unitPriceOf = (totalPrice, quantity) => Math.round(totalPrice / quantity);

/**
 * Giá bình quân sau khi nhập thêm: (giá cũ × số còn + tổng tiền mới) / tổng số quả.
 * Kho đang hết thì lấy luôn giá của lần nhập này.
 */
const averagePrice = (stock, addQuantity, totalPrice) => {
    if (stock.quantity <= 0) return unitPriceOf(totalPrice, addQuantity);
    return Math.round((stock.unitPrice * stock.quantity + totalPrice) / (stock.quantity + addQuantity));
};

const toShuttle = (s) => ({
    id: String(s._id),
    name: s.name,
    quantity: s.quantity,
    unitPrice: s.unitPrice,
    fullLevel: Math.max(s.fullLevel, s.quantity),
    updatedAt: s.updatedAt
});

const list = async (ownerId) => (await Shuttle.find({ owner: ownerId }).sort({ createdAt: 1 })).map(toShuttle);

const findOwn = async (ownerId, id) => {
    const s = await Shuttle.findOne({ _id: id, owner: ownerId });
    if (!s) throw notFound();
    return s;
};

/** Thêm loại cầu mới kèm lần nhập đầu tiên */
const create = async (ownerId, { name, quantity, totalPrice }) => {
    if ((await Shuttle.countDocuments({ owner: ownerId })) >= Shuttle.MAX_TYPES) {
        throw new AppError(409, 'SHUTTLE_LIMIT', `Tối đa ${Shuttle.MAX_TYPES} loại cầu`);
    }
    const s = await Shuttle.create({
        owner: ownerId,
        name,
        quantity,
        unitPrice: unitPriceOf(totalPrice, quantity),
        fullLevel: quantity
    });
    return toShuttle(s);
};

/** Nhập thêm cầu: cộng số quả, tính lại giá bình quân, thanh mức cầu về 100% */
const restock = async (ownerId, id, { quantity, totalPrice }) => {
    const s = await findOwn(ownerId, id);
    const next = Math.min(Shuttle.MAX_QUANTITY, s.quantity + quantity);
    s.unitPrice = averagePrice(s, quantity, totalPrice);
    s.quantity = next;
    s.fullLevel = next;
    await s.save();
    return toShuttle(s);
};

/** Đổi tên / kiểm kê lại số quả (đếm thực tế) */
const update = async (ownerId, id, { name, quantity }) => {
    const s = await findOwn(ownerId, id);
    if (name !== undefined) s.name = name;
    if (quantity !== undefined) {
        s.quantity = quantity;
        if (quantity > s.fullLevel) s.fullLevel = quantity;
    }
    await s.save();
    return toShuttle(s);
};

/** Xóa loại cầu. Khoản "Cầu" đã lưu trong kèo vẫn giữ tên và giá (đã chép lúc lưu) */
const remove = async (ownerId, id) => {
    const s = await findOwn(ownerId, id);
    await s.deleteOne();
};

/**
 * Trừ / hoàn số quả theo chênh lệch giữa khoản "Cầu" cũ và mới của một kèo (2a).
 * delta > 0: dùng thêm → trừ kho (dừng ở 0); delta < 0: bớt / xóa khoản → hoàn lại.
 * Chỉ đụng tới cầu của chính chủ kèo; loại cầu đã bị xóa thì bỏ qua.
 * @param {string} ownerId
 * @param {Map<string, number>} deltas  shuttleId → số quả dùng thêm
 * @param {mongoose.ClientSession} [session]
 */
const applyStockChanges = async (ownerId, deltas, session) => {
    for (const [id, delta] of deltas) {
        if (delta === 0 || !mongoose.isValidObjectId(id)) continue;
        await Shuttle.updateOne(
            { _id: id, owner: ownerId },
            [
                {
                    $set: {
                        quantity: { $min: [Shuttle.MAX_QUANTITY, { $max: [0, { $subtract: ['$quantity', delta] }] }] }
                    }
                }
            ],
            { session, updatePipeline: true }
        );
    }
};

/** Số quả mỗi khoản "Cầu" của kèo, gom theo loại cầu (khoản nhập giá tay không thuộc kho nào) */
const usageOf = (expenses) => {
    const m = new Map();
    for (const e of expenses ?? []) {
        if (e.kind !== 'shuttle' || !e.shuttle || !e.quantity) continue;
        const id = String(e.shuttle);
        m.set(id, (m.get(id) ?? 0) + e.quantity);
    }
    return m;
};

const DAY_MS = 24 * 3600 * 1000;
const WEEKS = 8;
const MONTHS = 6;

/** "YYYY-MM-DD" của thứ Hai đầu tuần (lịch VN) chứa ngày `dateStr` */
const mondayOf = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10);
};

const addDays = (dateStr, n) => new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);

const addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const t = y * 12 + (m - 1) + n;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/**
 * Số quả đã dùng theo tuần (8 tuần, thứ Hai → Chủ nhật) và theo tháng (6 tháng), lịch Việt Nam (3a).
 * Chỉ tính khoản "Cầu" có số quả trong các kèo mình làm chủ, chưa hủy, đã bắt đầu, theo ngày diễn ra.
 * @param {string} ownerId
 * @param {Date} now
 */
const stats = async (ownerId, now) => {
    const today = vnDateString(now);
    const thisWeek = mondayOf(today);
    const thisMonth = today.slice(0, 7);
    const firstWeek = addDays(thisWeek, -7 * (WEEKS - 1));
    const firstMonth = addMonths(thisMonth, -(MONTHS - 1));
    const from = new Date(`${[firstWeek, `${firstMonth}-01`].sort()[0]}T00:00:00+07:00`);

    const posts = await Post.find({
        author: ownerId,
        status: { $ne: 'closed' },
        startsAt: { $gte: from, $lte: now },
        'expenses.kind': 'shuttle'
    }).select('startsAt expenses');

    const weeks = Array.from({ length: WEEKS }, (_, i) => ({ start: addDays(firstWeek, 7 * i), quantity: 0 }));
    const months = Array.from({ length: MONTHS }, (_, i) => ({ month: addMonths(firstMonth, i), quantity: 0 }));

    for (const p of posts) {
        const used = (p.expenses ?? []).filter((e) => e.kind === 'shuttle').reduce((s, e) => s + (e.quantity ?? 0), 0);
        if (!used) continue;
        const day = vnDateString(p.startsAt);
        const w = weeks.find((x) => x.start === mondayOf(day));
        const m = months.find((x) => x.month === day.slice(0, 7));
        if (w) w.quantity += used;
        if (m) m.quantity += used;
    }

    return {
        thisWeek: weeks[WEEKS - 1].quantity,
        thisMonth: months[MONTHS - 1].quantity,
        weeks,
        months
    };
};

module.exports = {
    unitPriceOf,
    averagePrice,
    list,
    create,
    restock,
    update,
    remove,
    applyStockChanges,
    usageOf,
    stats,
    mondayOf
};
