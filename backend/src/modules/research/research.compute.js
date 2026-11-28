const crypto = require('crypto');
const costs = require('../post/post.costs');
const { vnDateString } = require('../../utils/vnTime');

// ── Số liệu nghiên cứu (US-22, WBS 6.3) — hàm thuần, không đụng tới CSDL ──
// Đầu vào là kèo (lean), nhật ký sự kiện và thông tin người chơi; đầu ra là các dòng CSV và chỉ số H1–H3.
// Không có tên, email, số điện thoại, số tài khoản, tên sân, địa chỉ, ghi chú, tên khoản "Khác", ảnh.

// ── Hằng số ──

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const LATE_LEAVE_MS = 2 * HOUR;
const PAY_WINDOW_MS = 24 * HOUR;
const MIN_SALT_LENGTH = 16;

// Ngưỡng trong Charter mục 4
const THRESHOLDS = {
    h1Share: 0.3,
    h1Diff: 20_000,
    h2Share: 0.8,
    h2MedianHours: 12,
    h3Share: 0.6
};

// ── Mã giả ──

/**
 * Tạo hàm đổi id thật sang mã giả cố định (HMAC-SHA256 với khóa bí mật).
 * Cùng khóa thì cùng mã giữa các lần xuất; không có khóa thì không đoán ngược được id.
 * @param {string} salt
 */
const makePseudonym = (salt) => {
    if (typeof salt !== 'string' || salt.length < MIN_SALT_LENGTH) {
        throw new Error(`RESEARCH_SALT phải có ít nhất ${MIN_SALT_LENGTH} ký tự`);
    }
    const code = (kind, id) => crypto.createHmac('sha256', salt).update(`${kind}:${id}`).digest('hex').slice(0, 10);
    return {
        post: (id) => `P-${code('post', id)}`,
        user: (id) => `U-${code('user', id)}`,
        guest: (postId, guestId) => `G-${code('guest', `${postId}:${guestId}`)}`
    };
};

// ── Tiện ích ──

const idOf = (v) => String(v?._id ?? v);
const minutesBetween = (from, to) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / MINUTE);
const flag = (b) => (b ? 1 : 0);
const roundUp = (v) => (v <= 0 ? 0 : Math.ceil(Math.round(v * 1000) / 1000 / 1000) * 1000);
const totalSlots = (post) => (post.slots?.male ?? 0) + (post.slots?.female ?? 0) + (post.slots?.any ?? 0);

/** Trung vị của dãy số (null nếu rỗng) */
const median = (values) => {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// ── Tính cho một kèo ──

// Cột thanh toán để trống với chủ kèo và bạn không dùng app (không trả qua app)
const noPayment = { pay_status: '', paid: '', paid_min_after_end: '', unpaid_marks: '', sent_proof: '' };

/**
 * Mọi số liệu của một kèo.
 * @param {any} post   Kèo dạng lean (participants.user là ObjectId)
 * @param {any[]} events  Nhật ký của kèo này, sắp theo thời gian
 * @param {Map<string, { gender?: string, level?: string }>} users
 * @param {ReturnType<typeof makePseudonym>} ps
 * @param {Date} now
 */
const analyzePost = (post, events, users, ps, now) => {
    const postId = idOf(post._id);
    const pid = ps.post(postId);
    const hostId = idOf(post.author);
    const startsAt = new Date(post.startsAt);
    const endsAt = new Date(post.endsAt);
    const createdAt = new Date(post.createdAt);
    const hasLog = events.some((e) => e.type === 'created');
    const cancelled = post.status === 'closed';
    const started = startsAt.getTime() <= now.getTime();
    const slots = totalSlots(post);
    const fullBeforeStart = !cancelled && slots > 0 && post.participants.length >= slots;

    const leaves = events.filter((e) => e.type === 'leave');
    const lateLeaves = leaves.filter((e) => startsAt.getTime() - new Date(e.at).getTime() < LATE_LEAVE_MS);
    const firstFull = events.find((e) => e.type === 'full');

    // Chi phí: theo khoản (cách app đang tính) và nếu chia đều cho mọi người trong kèo
    const cp = costs.toCostPost(post);
    const refs = costs.memberRefs(cp);
    const dues = costs.computeDues(cp);
    const total = costs.totalOf(cp.expenses);
    const hasCosts = cp.expenses.length > 0;
    const equal = hasCosts ? roundUp(total / refs.length) : null;
    const uneven = cp.expenses.some((e) => costs.sharersOf(e, refs).length < refs.length);

    const postRow = {
        post: pid,
        host: ps.user(hostId),
        district: post.district,
        date: vnDateString(startsAt),
        start_hour_vn: (startsAt.getUTCHours() + 7) % 24,
        duration_min: minutesBetween(startsAt, endsAt),
        posted_min_before_start: minutesBetween(createdAt, startsAt),
        status: post.status,
        started: flag(started),
        has_log: flag(hasLog),
        slots_total: slots,
        participants_final: post.participants.length,
        full_before_start: flag(fullBeforeStart),
        min_to_first_full: hasLog && firstFull ? minutesBetween(createdAt, firstFull.at) : '',
        leaves: hasLog ? leaves.length : '',
        late_leaves: hasLog ? lateLeaves.length : '',
        has_costs: flag(hasCosts),
        expenses: cp.expenses.length,
        guests: cp.guests.length,
        costs_total: hasCosts ? total : '',
        costs_saves: hasLog ? events.filter((e) => e.type === 'costs_saved').length : ''
    };

    const participantRows = post.participants.map((p) => {
        const uid = idOf(p.user);
        const u = users.get(uid) ?? {};
        return {
            post: pid,
            user: ps.user(uid),
            slot: p.slot,
            gender: u.gender ?? '',
            level: u.level ?? '',
            joined_min_after_post: minutesBetween(createdAt, p.joinedAt),
            joined_min_before_start: minutesBetween(p.joinedAt, startsAt),
            attended: p.attended === true ? 1 : p.attended === false ? 0 : ''
        };
    });

    const eventRows = events.map((e) => ({
        post: pid,
        user: e.user ? ps.user(idOf(e.user)) : '',
        type: e.type,
        min_after_post: minutesBetween(createdAt, e.at),
        min_before_start: minutesBetween(e.at, startsAt),
        slot: e.meta?.slot ?? '',
        amount: e.meta?.amount ?? e.meta?.total ?? '',
        attended: e.meta?.attended === undefined ? '' : flag(e.meta.attended)
    }));

    const expenseRows = cp.expenses.map((e, i) => ({
        post: pid,
        item: i + 1,
        kind: e.kind,
        amount: e.amount,
        everyone: flag(costs.sharersOf(e, refs).length === refs.length),
        sharers: costs.sharersOf(e, refs).length,
        members: refs.length,
        quantity: e.quantity ?? '',
        unit_price: e.unitPrice ?? ''
    }));

    // Một dòng cho mỗi người trong phần chia tiền: chủ kèo, người tham gia, bạn không dùng app
    const byUser = new Map(post.participants.map((p) => [idOf(p.user), p]));
    const dueRows = hasCosts
        ? refs.map((ref) => {
              const due = dues.get(ref) ?? 0;
              const base = { post: pid, due_itemized: due, due_equal: equal, diff: due - equal };
              if (ref === costs.HOST) return { person: ps.user(hostId), role: 'host', ...base, ...noPayment };
              if (ref.startsWith('g:')) return { person: ps.guest(postId, ref.slice(2)), role: 'guest', ...base, ...noPayment };
              const uid = ref.slice(2);
              const p = byUser.get(uid);
              const mine = events.filter((e) => e.user && idOf(e.user) === uid);
              const firstPaid = mine.find((e) => e.type === 'paid');
              // Lần đầu được đánh dấu đã trả: theo nhật ký nếu có, không thì theo trạng thái hiện tại
              const paidAt = p.paidAt ? (hasLog && firstPaid ? firstPaid.at : p.paidAt) : null;
              return {
                  person: ps.user(uid),
                  role: 'participant',
                  ...base,
                  pay_status: costs.paymentStatus(due, p).status,
                  paid: flag(Boolean(p.paidAt)),
                  paid_min_after_end: paidAt ? minutesBetween(endsAt, paidAt) : '',
                  unpaid_marks: hasLog ? mine.filter((e) => e.type === 'unpaid').length : '',
                  sent_proof: flag((p.proofs?.length ?? 0) > 0 || Boolean(p.proofAt))
              };
          })
        : [];

    return {
        postRow,
        participantRows,
        eventRows,
        expenseRows,
        dueRows,
        facts: { started, cancelled, fullBeforeStart, hasCosts, uneven, endsAt }
    };
};

// ── Chỉ số H1–H3 ──

/**
 * @param {ReturnType<typeof analyzePost>[]} analyzed
 * @param {Date} now
 */
const computeMetrics = (analyzed, now) => {
    // H1: kèo có chi phí, không bị hủy
    const withCosts = analyzed.filter((a) => a.facts.hasCosts && !a.facts.cancelled);
    const unevenPosts = withCosts.filter((a) => a.facts.uneven);
    const unevenPeople = unevenPosts.flatMap((a) => a.dueRows);
    const h1 = {
        posts: withCosts.length,
        unevenPosts: unevenPosts.length,
        share: withCosts.length ? unevenPosts.length / withCosts.length : null,
        people: unevenPeople.length,
        meanAbsDiff: unevenPeople.length ? unevenPeople.reduce((s, r) => s + Math.abs(r.diff), 0) / unevenPeople.length : null
    };

    // H2: người tham gia phải trả (> 0đ) trong kèo đã kết thúc ít nhất 24 giờ
    const settled = withCosts.filter((a) => now.getTime() - a.facts.endsAt.getTime() >= PAY_WINDOW_MS);
    const payers = settled.flatMap((a) => a.dueRows.filter((r) => r.role === 'participant' && r.due_itemized > 0));
    const onTime = payers.filter((r) => r.paid === 1 && r.paid_min_after_end * MINUTE <= PAY_WINDOW_MS);
    const postPayers = settled
        .map((a) => a.dueRows.filter((r) => r.role === 'participant' && r.due_itemized > 0))
        .filter((rows) => rows.length > 0);
    const fullyPaid = postPayers.filter((rows) => rows.every((r) => r.paid === 1));
    // Thời gian thu đủ một kèo = lần đánh dấu đã trả cuối cùng so với giờ kết thúc (trả trước giờ kết thúc tính là 0)
    const collectHours = fullyPaid.map((rows) => Math.max(0, ...rows.map((r) => r.paid_min_after_end)) / 60);
    const h2 = {
        payers: payers.length,
        onTime: onTime.length,
        share: payers.length ? onTime.length / payers.length : null,
        posts: postPayers.length,
        fullyPaid: fullyPaid.length,
        medianHours: median(collectHours)
    };

    // H3: kèo đã tới giờ chơi; kèo bị hủy tính là không đủ người
    const started = analyzed.filter((a) => a.facts.started);
    const notCancelled = started.filter((a) => !a.facts.cancelled);
    const h3 = {
        posts: started.length,
        full: started.filter((a) => a.facts.fullBeforeStart).length,
        share: started.length ? started.filter((a) => a.facts.fullBeforeStart).length / started.length : null,
        postsNotCancelled: notCancelled.length,
        shareNotCancelled: notCancelled.length
            ? notCancelled.filter((a) => a.facts.fullBeforeStart).length / notCancelled.length
            : null
    };

    return { h1, h2, h3 };
};

// ── Văn bản ──

const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const vnd = (v) => `${Math.round(v).toLocaleString('vi-VN')}đ`;
const hours = (v) => `${v.toFixed(1).replace('.', ',')} giờ`;
const vnClock = (d) => new Date(d.getTime() + 7 * HOUR).toISOString().slice(0, 16).replace('T', ' ');
const verdict = (ok) => (ok ? 'ĐẠT' : 'CHƯA ĐẠT');
const NO_DATA = 'CHƯA ĐỦ DỮ LIỆU';

/**
 * Nội dung summary.txt.
 * @param {ReturnType<typeof computeMetrics>} m
 * @param {{ from: string, to: string, generatedAt: Date, posts: number, excludedPosts: number }} info
 */
const summaryText = (m, info) => {
    const { h1, h2, h3 } = m;
    const t = THRESHOLDS;
    const lines = [
        'Badminton Matching — số liệu nghiên cứu (US-22)',
        `Kèo diễn ra từ ${info.from} đến ${info.to} (giờ Việt Nam); xuất lúc ${vnClock(info.generatedAt)} (giờ Việt Nam)`,
        `Số kèo: ${info.posts} (đã loại ${info.excludedPosts} kèo của tài khoản demo / thử)`,
        'Ngưỡng theo Charter mục 4.',
        '',
        'H1 — Chia theo khoản khác chia đều',
        `  Kèo có chi phí (không tính kèo hủy): n = ${h1.posts}`
    ];
    if (h1.share === null) {
        lines.push(`  ${NO_DATA}`);
    } else {
        lines.push(
            `  Kèo có ít nhất một khoản không chia cho tất cả: ${h1.unevenPosts}/${h1.posts} = ${pct(h1.share)} (ngưỡng ≥ ${pct(t.h1Share)}) → ${verdict(h1.share >= t.h1Share)}`
        );
        lines.push(
            h1.meanAbsDiff === null
                ? `  Chênh lệch so với chia đều: ${NO_DATA}`
                : `  Trong các kèo đó, chênh lệch trung bình mỗi người so với chia đều: ${vnd(h1.meanAbsDiff)} (n = ${h1.people} người; ngưỡng ≥ ${vnd(t.h1Diff)}) → ${verdict(h1.meanAbsDiff >= t.h1Diff)}`
        );
    }
    lines.push('  Mức công bằng (Likert ≥ 4/5): lấy từ khảo sát, không tính ở đây.');
    lines.push('', 'H2 — Thu tiền bằng mã QR', `  Người phải trả trong kèo đã kết thúc ≥ 24 giờ: n = ${h2.payers}`);
    if (h2.share === null) {
        lines.push(`  ${NO_DATA}`);
    } else {
        lines.push(
            `  Được đánh dấu đã trả trong 24 giờ sau giờ kết thúc: ${h2.onTime}/${h2.payers} = ${pct(h2.share)} (ngưỡng ≥ ${pct(t.h2Share)}) → ${verdict(h2.share >= t.h2Share)}`
        );
        lines.push(
            h2.medianHours === null
                ? `  Trung vị thời gian thu đủ một kèo: ${NO_DATA} (chưa kèo nào thu đủ; ${h2.posts} kèo có người phải trả)`
                : `  Trung vị thời gian thu đủ một kèo: ${hours(h2.medianHours)} (${h2.fullyPaid}/${h2.posts} kèo đã thu đủ; ngưỡng ≤ ${hours(t.h2MedianHours)}) → ${verdict(h2.medianHours <= t.h2MedianHours)}`
        );
    }
    lines.push('', 'H3 — Kèo đủ người trước giờ chơi', `  Kèo đã tới giờ chơi: n = ${h3.posts}`);
    if (h3.share === null) {
        lines.push(`  ${NO_DATA}`);
    } else {
        lines.push(
            `  Đủ người trước giờ chơi (kèo hủy tính là không đủ): ${h3.full}/${h3.posts} = ${pct(h3.share)} (ngưỡng ≥ ${pct(t.h3Share)}) → ${verdict(h3.share >= t.h3Share)}`
        );
        if (h3.shareNotCancelled !== null) {
            lines.push(`  Không tính kèo hủy: ${pct(h3.shareNotCancelled)} (n = ${h3.postsNotCancelled})`);
        }
    }
    return `${lines.join('\n')}\n`;
};

// ── CSV ──

const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV có BOM UTF-8 (Excel mở đúng dấu), xuống dòng CRLF.
 * @param {string[]} columns
 * @param {Record<string, unknown>[]} rows
 */
const toCsv = (columns, rows) =>
    `﻿${[columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n')}\r\n`;

const COLUMNS = {
    posts: [
        'post', 'host', 'district', 'date', 'start_hour_vn', 'duration_min', 'posted_min_before_start', 'status',
        'started', 'has_log', 'slots_total', 'participants_final', 'full_before_start', 'min_to_first_full',
        'leaves', 'late_leaves', 'has_costs', 'expenses', 'guests', 'costs_total', 'costs_saves'
    ],
    participants: ['post', 'user', 'slot', 'gender', 'level', 'joined_min_after_post', 'joined_min_before_start', 'attended'],
    events: ['post', 'user', 'type', 'min_after_post', 'min_before_start', 'slot', 'amount', 'attended'],
    expenses: ['post', 'item', 'kind', 'amount', 'everyone', 'sharers', 'members', 'quantity', 'unit_price'],
    dues: [
        'post', 'person', 'role', 'due_itemized', 'due_equal', 'diff', 'pay_status', 'paid', 'paid_min_after_end',
        'unpaid_marks', 'sent_proof'
    ]
};

// ── Toàn bộ ──

/**
 * Tính mọi file xuất từ dữ liệu đã lọc.
 * @param {{ posts: any[], events: any[], users: Map<string, { gender?: string, level?: string }>, salt: string,
 *   now: Date, from: string, to: string, excludedPosts: number }} input
 * @returns {{ files: Record<string, string>, metrics: ReturnType<typeof computeMetrics> }}
 */
const buildExport = ({ posts, events, users, salt, now, from, to, excludedPosts }) => {
    const ps = makePseudonym(salt);
    const byPost = new Map();
    for (const e of events) {
        const k = idOf(e.post);
        if (!byPost.has(k)) byPost.set(k, []);
        byPost.get(k).push(e);
    }
    const sorted = [...posts].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    const analyzed = sorted.map((p) =>
        analyzePost(
            p,
            (byPost.get(idOf(p._id)) ?? []).sort((a, b) => new Date(a.at) - new Date(b.at)),
            users,
            ps,
            now
        )
    );
    const metrics = computeMetrics(analyzed, now);
    const files = {
        'posts.csv': toCsv(COLUMNS.posts, analyzed.map((a) => a.postRow)),
        'participants.csv': toCsv(COLUMNS.participants, analyzed.flatMap((a) => a.participantRows)),
        'events.csv': toCsv(COLUMNS.events, analyzed.flatMap((a) => a.eventRows)),
        'expenses.csv': toCsv(COLUMNS.expenses, analyzed.flatMap((a) => a.expenseRows)),
        'dues.csv': toCsv(COLUMNS.dues, analyzed.flatMap((a) => a.dueRows)),
        'summary.txt': summaryText(metrics, { from, to, generatedAt: now, posts: posts.length, excludedPosts })
    };
    return { files, metrics };
};

module.exports = {
    THRESHOLDS,
    COLUMNS,
    makePseudonym,
    median,
    analyzePost,
    computeMetrics,
    summaryText,
    toCsv,
    buildExport
};
