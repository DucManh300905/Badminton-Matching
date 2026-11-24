// Ngân hàng nhận chuyển khoản bằng mã VietQR (WBS 4.8.1).
// Mã BIN theo "List of Bank Identification Numbers by December 31, 2023" của Ngân hàng Nhà nước
// (Công văn 1589/NHNN-TT ngày 05/03/2024). Phải khớp với frontend/src/utils/banks.ts.

const BANKS = /** @type {const} */ ([
    { bin: '970436', shortName: 'Vietcombank' },
    { bin: '970415', shortName: 'VietinBank' },
    { bin: '970418', shortName: 'BIDV' },
    { bin: '970405', shortName: 'Agribank' },
    { bin: '970407', shortName: 'Techcombank' },
    { bin: '970422', shortName: 'MB' },
    { bin: '970416', shortName: 'ACB' },
    { bin: '970432', shortName: 'VPBank' },
    { bin: '970423', shortName: 'TPBank' },
    { bin: '970403', shortName: 'Sacombank' },
    { bin: '970441', shortName: 'VIB' },
    { bin: '970443', shortName: 'SHB' },
    { bin: '970437', shortName: 'HDBank' },
    { bin: '970448', shortName: 'OCB' },
    { bin: '970426', shortName: 'MSB' },
    { bin: '970440', shortName: 'SeABank' },
    { bin: '970431', shortName: 'Eximbank' },
    { bin: '970449', shortName: 'LPBank' },
    { bin: '970428', shortName: 'Nam A Bank' },
    { bin: '970409', shortName: 'Bac A Bank' },
    { bin: '970425', shortName: 'ABBANK' },
    { bin: '970452', shortName: 'Kienlongbank' },
    { bin: '970412', shortName: 'PVcomBank' },
    { bin: '970454', shortName: 'Viet Capital Bank' },
    { bin: '970419', shortName: 'NCB' },
    { bin: '970433', shortName: 'VietBank' }
]);

const BANK_BINS = BANKS.map((b) => b.bin);

/** @param {string} bin */
const bankByBin = (bin) => BANKS.find((b) => b.bin === bin) ?? null;

module.exports = {
    BANKS,
    BANK_BINS,
    bankByBin
};
