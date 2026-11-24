const { crc16, toBankText, buildVietQr, transferContent, MAX_CONTENT_LENGTH } = require('../../src/utils/vietqr');

/** Tách chuỗi dạng ID(2) + độ dài(2) + giá trị thành object; kiểm tra luôn độ dài khai báo */
const parseFields = (text) => {
    const out = {};
    let i = 0;
    while (i < text.length) {
        const id = text.slice(i, i + 2);
        const len = Number(text.slice(i + 2, i + 4));
        const value = text.slice(i + 4, i + 4 + len);
        if (value.length !== len) throw new Error(`Trường ${id} khai báo ${len} ký tự nhưng chỉ có ${value.length}`);
        out[id] = value;
        i += 4 + len;
    }
    return out;
};

describe('crc16 (CRC-16/CCITT-FALSE)', () => {
    test('giá trị kiểm tra chuẩn của thuật toán: "123456789" → 29B1', () => {
        expect(crc16('123456789')).toBe('29B1');
    });

    test('luôn 4 ký tự hex in hoa', () => {
        expect(crc16('')).toBe('FFFF');
        expect(crc16('A')).toMatch(/^[0-9A-F]{4}$/);
    });
});

describe('toBankText', () => {
    test('bỏ dấu tiếng Việt, đ → D, in hoa, gộp khoảng trắng, bỏ ký tự đặc biệt', () => {
        expect(toBankText('  Nguyễn   Văn Đức ')).toBe('NGUYEN VAN DUC');
        expect(toBankText('Trần Thị Ánh-Dương!')).toBe('TRAN THI ANH DUONG');
        expect(toBankText(undefined)).toBe('');
    });
});

describe('buildVietQr', () => {
    const qr = buildVietQr({ bin: '970436', accountNumber: '0123456789', amount: 50_000, content: 'BM 7A3F2C Minh' });
    const fields = parseFields(qr);

    test('đủ các trường theo chuẩn VietQR, mã một lần dùng khi có số tiền', () => {
        expect(fields['00']).toBe('01');
        expect(fields['01']).toBe('12');
        expect(fields['53']).toBe('704');
        expect(fields['54']).toBe('50000');
        expect(fields['58']).toBe('VN');
    });

    test('thông tin người nhận: mã NAPAS, BIN, số tài khoản, dịch vụ chuyển tới tài khoản', () => {
        const merchant = parseFields(fields['38']);
        expect(merchant['00']).toBe('A000000727');
        expect(merchant['02']).toBe('QRIBFTTA');
        expect(parseFields(merchant['01'])).toEqual({ '00': '970436', '01': '0123456789' });
    });

    test('nội dung chuyển khoản không dấu, in hoa', () => {
        expect(parseFields(fields['62'])['08']).toBe('BM 7A3F2C MINH');
    });

    test('kết thúc bằng mã CRC đúng của toàn bộ phần trước', () => {
        expect(qr.slice(-8, -4)).toBe('6304');
        expect(qr.slice(-4)).toBe(crc16(qr.slice(0, -4)));
    });

    test('không có số tiền → mã dùng nhiều lần, không có trường 54', () => {
        const f = parseFields(buildVietQr({ bin: '970418', accountNumber: '123456', amount: 0 }));
        expect(f['01']).toBe('11');
        expect(f).not.toHaveProperty('54');
        expect(f).not.toHaveProperty('62');
    });
});

describe('transferContent', () => {
    test('BM + 6 ký tự cuối mã kèo + tên không dấu', () => {
        expect(transferContent('6b03ac71dd6dd4f6e07207c1', 'Đức Mạnh')).toBe('BM 7207C1 DUC MANH');
    });

    test(`cắt còn tối đa ${MAX_CONTENT_LENGTH} ký tự`, () => {
        const text = transferContent('6b03ac71dd6dd4f6e07207c1', 'Nguyễn Hoàng Phương Thảo Nguyên');
        expect(text.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);
        expect(text.startsWith('BM 7207C1 NGUYEN')).toBe(true);
    });
});
