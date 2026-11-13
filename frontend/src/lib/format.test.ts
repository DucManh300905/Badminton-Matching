import { describe, expect, it } from 'vitest'
import { formatLevelRange, formatPrice, formatSlots, formatTimeRange } from './format'

describe('format', () => {
  it('formatPrice', () => {
    expect(formatPrice(50_000)).toBe('50.000đ')
    expect(formatPrice(0)).toBe('Miễn phí')
  })

  it('formatTimeRange hiển thị thứ, ngày và khung giờ', () => {
    const start = new Date(2026, 10, 13, 19, 0).toISOString() // T6 13/11
    const end = new Date(2026, 10, 13, 21, 30).toISOString()
    expect(formatTimeRange(start, end)).toBe('T6, 13/11 · 19:00–21:30')
  })

  it('formatLevelRange', () => {
    expect(formatLevelRange('TB', 'TB')).toBe('TB')
    expect(formatLevelRange('TB_MINUS', 'KHA')).toBe('TB- → Khá')
  })

  it('formatSlots bỏ qua loại chỗ bằng 0', () => {
    expect(formatSlots({ male: 2, female: 0, any: 1 })).toBe('2 nam · 1 bất kỳ')
    expect(formatSlots({ male: 0, female: 0, any: 0 })).toBe('')
  })
})
