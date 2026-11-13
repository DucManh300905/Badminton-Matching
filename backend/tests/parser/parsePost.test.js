const { parsePost } = require('../../src/modules/parser/parsePost');

describe('parsePost – bài đăng điển hình', () => {
    test('trích đủ 4 nhóm trường từ một bài đầy đủ', () => {
        const r = parsePost('Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng');
        expect(r).toEqual({
            dayOffset: 0,
            start: { hour: 19, minute: 0 },
            end: { hour: 21, minute: 0 },
            slots: { male: 2, female: 1, any: 0 },
            levelMin: 'TB_MINUS',
            levelMax: 'TB_PLUS',
            pricePerPerson: 50_000,
            confidence: 1,
        });
    });

    test('hiểu "7h-9h tối mai", "TB khá", giá dạng 60.000đ', () => {
        const r = parsePost('7h-9h tối mai, cần 1 bạn trình TB khá, phí 60.000đ');
        expect(r.dayOffset).toBe(1);
        expect(r.start).toEqual({ hour: 19, minute: 0 });
        expect(r.end).toEqual({ hour: 21, minute: 0 });
        expect(r.slots).toEqual({ male: 0, female: 0, any: 1 });
        expect(r.levelMin).toBe('TB_PLUS');
        expect(r.levelMax).toBe('TB_PLUS');
        expect(r.pricePerPerson).toBe(60_000);
    });

    test('hiểu "Sáng CN 5h30-7h30", "TB+ trở lên"', () => {
        const r = parsePost('Sáng CN 5h30-7h30 sân Thành Công tuyển 2 slot TB+ trở lên 45k');
        expect(r.weekday).toBe(0);
        expect(r.start).toEqual({ hour: 5, minute: 30 });
        expect(r.end).toEqual({ hour: 7, minute: 30 });
        expect(r.slots).toEqual({ male: 0, female: 0, any: 2 });
        expect(r.levelMin).toBe('TB_PLUS');
        expect(r.levelMax).toBe('GIOI');
        expect(r.pricePerPerson).toBe(45_000);
    });
});

describe('parsePost – thời gian', () => {
    test.each([
        ['3h-5h chiều thứ 7', { hour: 15, minute: 0 }, { hour: 17, minute: 0 }],
        ['19:00 - 21:00', { hour: 19, minute: 0 }, { hour: 21, minute: 0 }],
        ['2h-4h', { hour: 14, minute: 0 }, { hour: 16, minute: 0 }], // không ngữ cảnh → chiều
        ['6h đến 8h sáng', { hour: 6, minute: 0 }, { hour: 8, minute: 0 }],
    ])('"%s"', (text, start, end) => {
        const r = parsePost(text);
        expect(r.start).toEqual(start);
        expect(r.end).toEqual(end);
    });

    test('hiểu giờ đơn lẻ có "rưỡi"', () => {
        const r = parsePost('tối nay 8h rưỡi');
        expect(r.start).toEqual({ hour: 20, minute: 30 });
        expect(r.end).toBeUndefined();
    });

    test('nhận diện thứ trong tuần', () => {
        expect(parsePost('chiều thứ 7').weekday).toBe(6);
        expect(parsePost('t3 tuần này').weekday).toBe(2);
        expect(parsePost('chủ nhật').weekday).toBe(0);
    });

    test('"ngày kia" là dayOffset 2', () => {
        expect(parsePost('ngày kia đánh không').dayOffset).toBe(2);
    });

    test('không hiểu nhầm số điện thoại hay "1 gậy" thành giờ', () => {
        expect(parsePost('LH 0912345678, 19h-21h').start).toEqual({ hour: 19, minute: 0 });
        expect(parsePost('bán 1 gậy').start).toBeUndefined();
    });
});

describe('parsePost – giá', () => {
    test('ưu tiên giá có "/người" hơn giá thuê sân', () => {
        expect(parsePost('sân 300k/2h, 60k/người').pricePerPerson).toBe(60_000);
    });

    test('không nhầm "2 đôi" hay "50 đến" thành tiền', () => {
        expect(parsePost('tối nay 2 đôi đánh').pricePerPerson).toBeUndefined();
        expect(parsePost('từ 50 đến 60 người').pricePerPerson).toBeUndefined();
    });

    test('bỏ qua giá trị bất hợp lý', () => {
        expect(parsePost('phí 1k').pricePerPerson).toBeUndefined();
    });
});

describe('parsePost – số chỗ', () => {
    test('không đếm "Việt Nam" là slot nam', () => {
        const r = parsePost('Giải giao lưu cầu lông Việt Nam, thiếu 2 nữ');
        expect(r.slots).toEqual({ male: 0, female: 2, any: 0 });
    });

    test('hiểu số đếm bằng chữ', () => {
        expect(parsePost('cần hai nam').slots).toEqual({ male: 2, female: 0, any: 0 });
    });

    test('không có động từ "thiếu/cần/tuyển…" thì không suy ra số chỗ', () => {
        expect(parsePost('nhóm mình có 2 nam 1 nữ').slots).toBeUndefined();
    });
});

describe('parsePost – trình độ', () => {
    test.each([
        ['TB-TB+', 'TB', 'TB_PLUS'],
        ['trình TB yếu', 'TB_YEU', 'TB_YEU'],
        ['khá trở xuống', 'YEU', 'KHA'],
        ['mới chơi đến TB', 'YEU', 'TB'],
    ])('"%s" → %s..%s', (text, min, max) => {
        const r = parsePost(text);
        expect(r.levelMin).toBe(min);
        expect(r.levelMax).toBe(max);
    });
});

describe('parsePost – độ bền', () => {
    test('trả confidence 0 khi bài không có thông tin kèo', () => {
        expect(parsePost('Có ai đánh cầu không ạ')).toEqual({ confidence: 0 });
    });

    test('chuẩn hóa Unicode tổ hợp (NFD) từ Facebook', () => {
        const nfd = 'thiếu 2 nữ'.normalize('NFD');
        expect(parsePost(nfd).slots).toEqual({ male: 0, female: 2, any: 0 });
    });
});
