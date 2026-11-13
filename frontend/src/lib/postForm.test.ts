import { describe, expect, it } from 'vitest'
import { emptyPostForm, formToInput, parsedToForm } from './postForm'

// Thứ năm, 12/11/2026, 10:00 (giờ máy)
const NOW = new Date(2026, 10, 12, 10, 0)

describe('parsedToForm', () => {
  it('chuyển đủ các trường trích được', () => {
    const patch = parsedToForm(
      {
        dayOffset: 0,
        start: { hour: 19, minute: 0 },
        end: { hour: 21, minute: 30 },
        pricePerPerson: 50_000,
        slots: { male: 2, female: 1, any: 0 },
        levelMin: 'TB_MINUS',
        levelMax: 'TB_PLUS',
        confidence: 1,
      },
      NOW,
    )
    expect(patch).toEqual({
      date: '2026-11-12',
      startTime: '19:00',
      endTime: '21:30',
      pricePerPerson: '50000',
      slotsMale: '2',
      slotsFemale: '1',
      slotsAny: '0',
      levelMin: 'TB_MINUS',
      levelMax: 'TB_PLUS',
    })
  })

  it('chỉ trả về trường trích được, không đụng tới trường khác', () => {
    expect(parsedToForm({ confidence: 0 }, NOW)).toEqual({})
    expect(Object.keys(parsedToForm({ pricePerPerson: 40_000, confidence: 0.25 }, NOW))).toEqual(['pricePerPerson'])
  })

  it('"mai" → ngày hôm sau, kể cả khi sang tháng mới', () => {
    expect(parsedToForm({ dayOffset: 1, confidence: 0 }, new Date(2026, 10, 30)).date).toBe('2026-12-01')
  })

  it('thứ trong tuần → ngày gần nhất có thứ đó (tính cả hôm nay)', () => {
    expect(parsedToForm({ weekday: 4, confidence: 0 }, NOW).date).toBe('2026-11-12') // hôm nay là T5
    expect(parsedToForm({ weekday: 6, confidence: 0 }, NOW).date).toBe('2026-11-14') // T7
    expect(parsedToForm({ weekday: 0, confidence: 0 }, NOW).date).toBe('2026-11-15') // CN
    expect(parsedToForm({ weekday: 1, confidence: 0 }, NOW).date).toBe('2026-11-16') // T2 tuần sau
  })

  it('chỉ có giờ bắt đầu → mặc định chơi 2 tiếng', () => {
    const patch = parsedToForm({ start: { hour: 20, minute: 30 }, confidence: 0.25 }, NOW)
    expect(patch).toMatchObject({ startTime: '20:30', endTime: '22:30' })
  })
})

describe('formToInput', () => {
  it('chuyển giá trị form thành dữ liệu API', () => {
    const input = formToInput(
      { ...emptyPostForm(NOW), courtName: '  Sân Cầu Giấy ', district: 'Cầu Giấy', slotsMale: '2', slotsAny: '' },
      '  bài gốc ',
    )
    expect(input).toMatchObject({
      courtName: 'Sân Cầu Giấy',
      district: 'Cầu Giấy',
      pricePerPerson: 50_000,
      slots: { male: 2, female: 0, any: 0 },
      rawText: 'bài gốc',
    })
    expect(input.address).toBeUndefined()
    expect(new Date(input.startsAt)).toEqual(new Date(2026, 10, 12, 19, 0))
    expect(new Date(input.endsAt)).toEqual(new Date(2026, 10, 12, 21, 0))
  })

  it('kèo qua nửa đêm → giờ kết thúc sang ngày hôm sau', () => {
    const input = formToInput({ ...emptyPostForm(NOW), startTime: '22:00', endTime: '00:30' })
    expect(new Date(input.endsAt)).toEqual(new Date(2026, 10, 13, 0, 30))
  })
})
