import { formatDate } from './format-date'

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe('2024-01-05')
  })

  it('pads single-digit months and days', () => {
    expect(formatDate(new Date(2024, 2, 9))).toBe('2024-03-09')
  })

  it('formats the last day of the year correctly', () => {
    expect(formatDate(new Date(2024, 11, 31))).toBe('2024-12-31')
  })

  it('uses local time components, not UTC', () => {
    // 23:30 local time on Jan 1st — a UTC-based formatter could roll this
    // over to Jan 2nd if run in a timezone behind UTC.
    const date = new Date(2024, 0, 1, 23, 30)
    expect(formatDate(date)).toBe('2024-01-01')
  })
})
