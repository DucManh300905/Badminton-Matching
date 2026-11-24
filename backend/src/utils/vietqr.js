// Sinh nội dung mã QR chuyển khoản theo chuẩn VietQR (NAPAS, dựa trên EMVCo Merchant-Presented QR).
// Tự sinh ngay trên server, không gọi dịch vụ ngoài. Ứng dụng ngân hàng quét mã sẽ điền sẵn
// ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản.

/** Bỏ dấu tiếng Việt, đổi thành chữ in hoa, chỉ giữ A-Z 0-9 và khoảng trắng đơn */
const toBankText = (text) =>
    String(text ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[đĐ]/g, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/** Một trường dạng ID (2 số) + độ dài (2 số) + giá trị */
const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE (đa thức 0x1021, giá trị đầu 0xFFFF), 4 ký tự hex in hoa */
const crc16 = (text) => {
    let crc = 0xffff;
    for (const byte of Buffer.from(text, 'utf8')) {
        crc ^= byte << 8;
        for (let i = 0; i < 8; i++) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

// Mã định danh VietQR của NAPAS và dịch vụ "chuyển nhanh tới tài khoản"
const NAPAS_GUID = 'A000000727';
const SERVICE_TO_ACCOUNT = 'QRIBFTTA';
const MAX_CONTENT_LENGTH = 25;

/**
 * @param {{ bin: string, accountNumber: string, amount?: number, content?: string }} input
 * @returns {string} Chuỗi để vẽ thành mã QR
 */
const buildVietQr = ({ bin, accountNumber, amount, content }) => {
    const beneficiary = field('00', bin) + field('01', accountNumber);
    const merchant = field('00', NAPAS_GUID) + field('01', beneficiary) + field('02', SERVICE_TO_ACCOUNT);
    const note = toBankText(content).slice(0, MAX_CONTENT_LENGTH).trim();
    const hasAmount = Number.isInteger(amount) && amount > 0;

    const body =
        field('00', '01') +
        // 12 = mã dùng cho một giao dịch (có số tiền), 11 = mã dùng lại nhiều lần
        field('01', hasAmount ? '12' : '11') +
        field('38', merchant) +
        field('53', '704') +
        (hasAmount ? field('54', String(amount)) : '') +
        field('58', 'VN') +
        (note ? field('62', field('08', note)) : '') +
        '6304';

    return body + crc16(body);
};

/**
 * Nội dung chuyển khoản: "BM <6 ký tự cuối mã kèo> <tên người chơi>", tối đa 25 ký tự, không dấu.
 * Chủ kèo nhìn sao kê là biết ai trả cho kèo nào.
 * @param {string} postId
 * @param {string} playerName
 */
const transferContent = (postId, playerName) =>
    `BM ${String(postId).slice(-6).toUpperCase()} ${toBankText(playerName)}`.slice(0, MAX_CONTENT_LENGTH).trim();

module.exports = {
    MAX_CONTENT_LENGTH,
    toBankText,
    crc16,
    buildVietQr,
    transferContent
};
