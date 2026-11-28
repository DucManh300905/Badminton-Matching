import { describe, expect, it } from 'vitest';
import { emptyPostForm, formToInput } from './postForm';

// Thứ năm, 12/11/2026, 10:00 (giờ máy)
const NOW = new Date(2026, 10, 12, 10, 0);

describe('formToInput', () => {
  it('chuyển giá trị form thành dữ liệu API', () => {
    const input = formToInput({
      ...emptyPostForm(NOW),
      courtName: '  Sân Cầu Giấy ',
      district: 'Cầu Giấy',
      slotsMale: '2',
      slotsAny: '',
    });
    expect(input).toMatchObject({
      courtName: 'Sân Cầu Giấy',
      district: 'Cầu Giấy',
      pricePerPerson: 50_000,
      slots: { male: 2, female: 0, any: 0 },
    });
    expect(input.address).toBeUndefined();
    expect(new Date(input.startsAt)).toEqual(new Date(2026, 10, 12, 19, 0));
    expect(new Date(input.endsAt)).toEqual(new Date(2026, 10, 12, 21, 0));
  });

  it('kèo qua nửa đêm → giờ kết thúc sang ngày hôm sau', () => {
    const input = formToInput({ ...emptyPostForm(NOW), startTime: '22:00', endTime: '00:30' });
    expect(new Date(input.endsAt)).toEqual(new Date(2026, 10, 13, 0, 30));
  });
});

describe('số liên hệ (WBS 4.16)', () => {
  it('hồ sơ có số: điền sẵn, không gửi savePhone', () => {
    const form = emptyPostForm(NOW, '0912345678');
    expect(form).toMatchObject({ contactPhone: '0912345678', savePhone: false });
    const input = formToInput(form);
    expect(input.contactPhone).toBe('0912345678');
    expect(input).not.toHaveProperty('savePhone');
  });

  it('hồ sơ chưa có số: ô trống, lưu vào hồ sơ bật sẵn; chỉ gửi savePhone khi có số', () => {
    const form = emptyPostForm(NOW);
    expect(form).toMatchObject({ contactPhone: '', savePhone: true });
    expect(formToInput(form)).toMatchObject({ contactPhone: '' });
    expect(formToInput(form)).not.toHaveProperty('savePhone');
    expect(formToInput({ ...form, contactPhone: ' 0987 654 321 ' })).toMatchObject({ contactPhone: '0987 654 321', savePhone: true });
    expect(formToInput({ ...form, contactPhone: '0987654321', savePhone: false })).not.toHaveProperty('savePhone');
  });
});
