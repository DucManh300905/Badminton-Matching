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
