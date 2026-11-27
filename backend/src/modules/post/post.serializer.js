// Chuyển document Post (đã populate) thành JSON trả cho client.
// Chỉ lộ tên hiển thị của chủ kèo / người tham gia — không bao giờ có email.
// Tài khoản nhận tiền, chi phí, trạng thái đã trả, điểm danh chỉ đưa cho người trong kèo (BR-15).
const { remainingSlots } = require('./post.rules');
const costs = require('./post.costs');
const { bankByBin } = require('../../utils/banks');
const { buildVietQr, transferContent } = require('../../utils/vietqr');
const { publicUrl } = require('../../utils/images');

/** @param {any} user  User đã populate (hoặc ObjectId nếu tài khoản đã bị xóa) */
const toPublicUser = (user) => ({
    id: String(user?._id ?? user),
    displayName: user?.displayName ?? 'Người dùng đã xóa',
    avatarUrl: publicUrl('avatars', user?.avatar)
});

const userIdOf = (participant) => String(participant.user?._id ?? participant.user);

/** Dạng rút gọn cho danh sách kèo */
const toPostSummary = (post) => ({
    id: String(post._id),
    courtName: post.courtName,
    district: post.district,
    address: post.address ?? null,
    startsAt: post.startsAt,
    endsAt: post.endsAt,
    levelMin: post.levelMin,
    levelMax: post.levelMax,
    // Chi phí DỰ KIẾN mỗi người do chủ kèo nhập khi đăng (để tham khảo); số tiền thật theo các khoản chi
    pricePerPerson: post.pricePerPerson,
    slots: { male: post.slots.male, female: post.slots.female, any: post.slots.any },
    remaining: remainingSlots(post.toRules()),
    participantCount: post.participants.length,
    status: post.status,
    note: post.note ?? null,
    coverUrl: publicUrl('covers', post.cover),
    author: toPublicUser(post.author)
});

/**
 * Tính toàn bộ phần tiền của kèo một lần: số phải trả và trạng thái của từng người.
 * @returns {{ dues: Map<string, number> | null, byUser: Map<string, { due: number, status: string, toPay: number, diff: number }> }}
 */
const moneyOf = (post) => {
    const dues = costs.computeDues(costs.toCostPost(post));
    const byUser = new Map(
        post.participants.map((p) => {
            const due = dues?.get(costs.userRef(userIdOf(p))) ?? 0;
            return [userIdOf(p), { due, ...costs.paymentStatus(due, p) }];
        })
    );
    return { dues, byUser };
};

/** Phần chi phí (WBS 4.8.2): các khoản, ai chịu, mỗi người phải trả bao nhiêu */
const toCosts = (post, money) => {
    const cp = costs.toCostPost(post);
    const refs = costs.memberRefs(cp);
    const nameOf = new Map([
        [costs.HOST, post.author?.displayName ?? 'Chủ kèo'],
        ...post.participants.map((p) => [costs.userRef(userIdOf(p)), p.user?.displayName ?? 'Người dùng đã xóa']),
        ...cp.guests.map((g) => [costs.guestRef(g.id), g.name])
    ]);
    const dueOf = (ref) => (money.dues ? money.dues.get(ref) ?? 0 : null);

    return {
        updatedAt: post.costsUpdatedAt ?? null,
        total: costs.totalOf(cp.expenses),
        guests: cp.guests,
        expenses: cp.expenses.map((e) => {
            const sharers = costs.sharersOf(e, refs);
            return {
                kind: e.kind,
                label: e.label ?? null,
                amount: e.amount,
                everyone: e.everyone,
                sharedBy: e.everyone ? [] : e.sharedBy,
                // Khoản "Cầu" theo số quả (WBS 4.10)
                quantity: e.quantity ?? null,
                unitPrice: e.unitPrice ?? null,
                shuttleId: e.shuttle ?? null,
                shuttleName: e.shuttleName ?? null,
                // Người đang cùng chịu (đã bỏ người rời kèo) và phần mỗi người, chưa làm tròn
                sharers,
                share: sharers.length ? Math.round(e.amount / sharers.length) : 0
            };
        }),
        members: [
            { ref: costs.HOST, type: 'host', name: nameOf.get(costs.HOST), due: dueOf(costs.HOST) },
            ...post.participants.map((p) => {
                const ref = costs.userRef(userIdOf(p));
                const m = money.byUser.get(userIdOf(p));
                return {
                    ref,
                    type: 'user',
                    userId: userIdOf(p),
                    name: nameOf.get(ref),
                    due: dueOf(ref),
                    status: money.dues ? m.status : 'none',
                    diff: m.diff,
                    attended: p.attended ?? null
                };
            }),
            ...cp.guests.map((g) => ({ ref: costs.guestRef(g.id), type: 'guest', name: g.name, due: dueOf(costs.guestRef(g.id)) }))
        ]
    };
};

/**
 * Phần thanh toán (WBS 4.8.1), chỉ cho chủ kèo và người đã tham gia.
 * Chưa có khoản chi nào → chưa có mã QR (Charter 2.0, lựa chọn 1b).
 */
const toPayment = (post, viewerId, isAuthor, money, now) => {
    const account = post.author?.bankAccount;
    const bank = account ? bankByBin(account.bankBin) : null;
    const hasCosts = money.dues !== null;
    const payers = [...money.byUser.values()].filter((m) => m.due > 0);
    const marked = post.participants.filter((p) => p.paidAt && (money.byUser.get(userIdOf(p))?.due ?? 0) > 0);

    // QR không ghi số tiền (người quét tự nhập): in lên hóa đơn của chủ kèo (WBS 4.14)
    const openContent = transferContent(post._id, '');
    const common = {
        hasCosts,
        qrOpen: bank && post.status !== 'closed' ? buildVietQr({ bin: bank.bin, accountNumber: account.accountNumber, content: openContent }) : null,
        estimate: post.pricePerPerson,
        bank: bank && { bin: bank.bin, shortName: bank.shortName },
        accountNumber: bank ? account.accountNumber : null,
        accountName: bank ? account.accountName : null,
        summary: {
            paidCount: payers.filter((m) => m.status === 'paid' || m.status === 'overpaid').length,
            participantCount: payers.length,
            collected: marked.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0),
            expected: payers.reduce((sum, m) => sum + m.due, 0)
        }
    };

    if (isAuthor) {
        return {
            ...common,
            canEditCosts: post.status !== 'closed',
            canMarkAttendance: post.status !== 'closed' && now.getTime() >= post.startsAt.getTime()
        };
    }

    const me = post.participants.find((p) => userIdOf(p) === viewerId);
    const mine = money.byUser.get(viewerId);
    const toPay = hasCosts ? mine.toPay : 0;
    const available = toPay > 0 && post.status !== 'closed' && !!bank;
    const content = transferContent(post._id, me.user?.displayName ?? '');
    return {
        ...common,
        myProofs: (me.proofs ?? []).map((f) => ({ file: f, url: publicUrl('proofs', f) })),
        amount: hasCosts ? mine.due : 0,
        status: hasCosts ? mine.status : 'none',
        toPay,
        diff: mine.diff,
        paid: !!me.paidAt,
        paidAmount: me.paidAmount ?? null,
        attended: me.attended ?? null,
        available,
        content,
        qr: available ? buildVietQr({ bin: bank.bin, accountNumber: account.accountNumber, amount: toPay, content }) : null
    };
};

/**
 * Dạng đầy đủ cho trang chi tiết: thêm danh sách người tham gia.
 * Người xem là chủ kèo hoặc người đã tham gia → thêm chi phí, trạng thái đã trả, điểm danh và phần `payment`.
 * @param {any} post
 * @param {string} [viewerId]  Người đang xem (không có = khách)
 * @param {Date} [now]
 */
const toPostDetail = (post, viewerId, now = new Date()) => {
    const authorId = String(post.author?._id ?? post.author);
    const isAuthor = !!viewerId && viewerId === authorId;
    const isParticipant = !!viewerId && post.participants.some((p) => userIdOf(p) === viewerId);
    const insider = isAuthor || isParticipant;
    const money = insider ? moneyOf(post) : null;

    const summary = toPostSummary(post);
    return {
        ...summary,
        // Số điện thoại chỉ cho người trong kèo (WBS 4.15)
        ...(insider && { author: { ...summary.author, phone: post.author?.phone ?? null } }),
        participants: post.participants.map((p) => ({
            ...toPublicUser(p.user),
            ...(insider && { phone: p.user?.phone ?? null }),
            gender: p.user?.gender ?? null,
            level: p.user?.level ?? null,
            slot: p.slot,
            joinedAt: p.joinedAt,
            ...(insider && {
                paid: !!p.paidAt,
                attended: p.attended ?? null,
                amountDue: money.dues ? money.byUser.get(userIdOf(p)).due : null,
                paymentStatus: money.dues ? money.byUser.get(userIdOf(p)).status : 'none'
            }),
            // Ảnh chuyển khoản: chủ kèo thấy của mọi người, người chơi chỉ thấy của mình
            ...((isAuthor || userIdOf(p) === viewerId) && {
                proofs: (p.proofs ?? []).map((f) => ({ file: f, url: publicUrl('proofs', f) })),
                pendingProof: (p.proofs ?? []).length > 0 && !p.paidAt
            })
        })),
        ...(insider && {
            bills: (post.bills ?? []).map((f) => ({ file: f, url: publicUrl('bills', f) })),
            costs: toCosts(post, money),
            payment: toPayment(post, viewerId, isAuthor, money, now)
        })
    };
};

module.exports = {
    toPostSummary,
    toPostDetail
};
