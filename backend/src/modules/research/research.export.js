const fs = require('fs');
const os = require('os');
const path = require('path');
const Post = require('../post/post.model');
const User = require('../user/user.model');
const { PostEvent } = require('../post/postEvent.model');
const { vnDayRange, vnDateString } = require('../../utils/vnTime');
const { buildExport, COLUMNS } = require('./research.compute');

// ── Xuất số liệu nghiên cứu ra thư mục (US-22, WBS 6.3) ──
// Chỉ chạy trên máy chủ bằng lệnh `npm run export:research`; không có API hay trang web nào.

// Tài khoản demo (seed:demo), smoke test và test tự động: loại cả kèo có họ
const TEST_DOMAINS = ['@example.com', '@test.com', '@smoke.local'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isTestEmail = (email) => TEST_DOMAINS.some((d) => String(email).toLowerCase().endsWith(d));

/**
 * Đọc tham số dòng lệnh: --from YYYY-MM-DD (bắt buộc), --to YYYY-MM-DD (mặc định hôm nay), --out <thư mục>.
 * @param {string[]} argv
 * @param {Date} now
 */
const parseArgs = (argv, now = new Date()) => {
    const opts = { from: null, to: vnDateString(now), out: path.join(os.homedir(), 'research-exports') };
    for (let i = 0; i < argv.length; i += 1) {
        const [key, inline] = argv[i].split('=');
        const value = inline ?? argv[i + 1];
        if (!['--from', '--to', '--out'].includes(key)) throw new Error(`Tham số không hợp lệ: ${argv[i]}`);
        if (value === undefined || value.startsWith('--')) throw new Error(`Thiếu giá trị cho ${key}`);
        opts[key.slice(2)] = value;
        if (inline === undefined) i += 1;
    }
    if (!opts.from) throw new Error('Thiếu --from YYYY-MM-DD (ngày đầu của thời gian thử nghiệm)');
    for (const k of ['from', 'to']) {
        if (!DATE_RE.test(opts[k]) || Number.isNaN(new Date(`${opts[k]}T00:00:00+07:00`).getTime())) {
            throw new Error(`--${k} phải có dạng YYYY-MM-DD`);
        }
    }
    if (opts.from > opts.to) throw new Error('--from phải trước hoặc bằng --to');
    return opts;
};

/**
 * Đọc kèo diễn ra trong khoảng ngày (giờ VN), bỏ kèo có tài khoản demo / thử, kèm nhật ký và người chơi.
 * @param {{ from: string, to: string }} range
 */
const loadData = async ({ from, to }) => {
    const all = await Post.find({ startsAt: { $gte: vnDayRange(from).start, $lt: vnDayRange(to).end } }).lean();
    const userIds = [...new Set(all.flatMap((p) => [String(p.author), ...p.participants.map((x) => String(x.user))]))];
    const people = await User.find({ _id: { $in: userIds } }).select('email gender level').lean();
    const testIds = new Set(people.filter((u) => isTestEmail(u.email)).map((u) => String(u._id)));
    const posts = all.filter(
        (p) => !testIds.has(String(p.author)) && !p.participants.some((x) => testIds.has(String(x.user)))
    );
    const events = await PostEvent.find({ post: { $in: posts.map((p) => p._id) } }).lean();
    // Chỉ giữ giới tính và trình độ; email chỉ dùng để lọc ở trên
    const users = new Map(people.map((u) => [String(u._id), { gender: u.gender, level: u.level }]));
    return { posts, events, users, excludedPosts: all.length - posts.length };
};

const README = `Badminton Matching — số liệu nghiên cứu (US-22)

Mọi file CSV là UTF-8 có BOM, phân cách bằng dấu phẩy. Ô trống = không áp dụng hoặc không có nhật ký.
Mã P-… (kèo), U-… (người dùng), G-… (bạn của chủ kèo không dùng app) là mã giả: cùng khóa RESEARCH_SALT
thì cùng mã giữa các lần xuất. Không có tên, email, số điện thoại, số tài khoản, tên sân, địa chỉ, ghi chú, ảnh.
Thời gian tính bằng phút so với mốc của kèo; chỉ giữ ngày diễn ra (giờ Việt Nam).
Nhật ký sự kiện có từ 28/11/2026: kèo cũ hơn có has_log = 0, các cột cần nhật ký để trống.

posts.csv — mỗi dòng một kèo
  district, date, start_hour_vn     khu vực, ngày và giờ bắt đầu (giờ VN)
  duration_min                      thời lượng
  posted_min_before_start           đăng trước giờ chơi bao nhiêu phút
  status                            open / full / closed (closed = bị hủy), tại lúc xuất
  started                           1 = đã tới giờ chơi lúc xuất
  has_log                           1 = có nhật ký sự kiện
  slots_total, participants_final   số chỗ cần thêm, số người tham gia cuối cùng (không tính chủ kèo)
  full_before_start                 1 = đủ người và không bị hủy (sau giờ bắt đầu không ai vào / rời được)
  min_to_first_full                 phút từ lúc đăng tới lần đầu đủ người
  leaves, late_leaves               số lượt rời; rời trong vòng 2 giờ trước giờ chơi
  has_costs, expenses, guests       có nhập chi phí; số khoản; số bạn không dùng app
  costs_total, costs_saves          tổng chi phí (đồng); số lần lưu chi phí

participants.csv — mỗi dòng một người tham gia trong một kèo
  slot, gender, level               loại chỗ (male / female / any), giới tính, trình độ
  joined_min_after_post             phút từ lúc đăng tới lúc tham gia
  joined_min_before_start           tham gia trước giờ chơi bao nhiêu phút
  attended                          1 có mặt / 0 vắng / trống chưa điểm danh

events.csv — mỗi dòng một sự kiện (created, join, leave, full, reopen, cancel, costs_saved, paid, unpaid, proof, attendance)
  min_after_post, min_before_start  so với lúc đăng và giờ chơi (âm = sau giờ bắt đầu)
  slot, amount, attended            loại chỗ (join / leave); số tiền (paid) hoặc tổng chi phí (costs_saved); điểm danh

expenses.csv — mỗi dòng một khoản chi
  kind                              court / shuttle / water / food / other
  amount                            số tiền (đồng)
  everyone                          1 = chia cho mọi người trong kèo
  sharers, members                  số người cùng chịu; số người trong kèo (chủ kèo + người tham gia + bạn không dùng app)
  quantity, unit_price              số quả và giá mỗi quả (khoản cầu theo số quả)

dues.csv — mỗi dòng một người trong phần chia tiền của một kèo có chi phí
  role                              host / participant / guest
  due_itemized                      số phải trả theo từng khoản (cách app tính, làm tròn lên 1.000đ)
  due_equal                         số phải trả nếu chia đều tổng chi phí cho mọi người
  diff                              due_itemized − due_equal
  pay_status                        unpaid / paid / owe (còn thiếu) / overpaid / none — chỉ người tham gia
  paid                              1 = đang được đánh dấu đã trả
  paid_min_after_end                lần đầu được đánh dấu đã trả, phút sau giờ kết thúc (âm = trước)
  unpaid_marks                      số lần bị bỏ đánh dấu đã trả
  sent_proof                        1 = có gửi ảnh chuyển khoản

summary.txt — H1, H2, H3 tính sẵn, so với ngưỡng trong Charter mục 4
`;

/** Thư mục mới trong `root`, tên theo giờ VN lúc xuất; thêm hậu tố nếu đã có */
const makeOutDir = (root, now) => {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const vn = new Date(now.getTime() + 7 * 3600 * 1000).toISOString();
    const base = `${vn.slice(0, 10)}-${vn.slice(11, 13)}${vn.slice(14, 16)}`;
    for (let n = 1; ; n += 1) {
        const dir = path.join(root, n === 1 ? base : `${base}-${n}`);
        try {
            fs.mkdirSync(dir, { mode: 0o700 });
            return dir;
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    }
};

/**
 * Chạy toàn bộ: đọc dữ liệu, tính, ghi file. Trả về thư mục đã ghi và số liệu.
 * @param {{ from: string, to: string, out: string, salt: string, now?: Date }} opts
 */
const runExport = async ({ from, to, out, salt, now = new Date() }) => {
    const { posts, events, users, excludedPosts } = await loadData({ from, to });
    const { files, metrics } = buildExport({ posts, events, users, salt, now, from, to, excludedPosts });
    const dir = makeOutDir(out, now);
    for (const [name, content] of Object.entries({ ...files, 'README.txt': README })) {
        fs.writeFileSync(path.join(dir, name), content, { mode: 0o600 });
    }
    return { dir, posts: posts.length, excludedPosts, metrics };
};

module.exports = { TEST_DOMAINS, COLUMNS, isTestEmail, parseArgs, loadData, runExport };
