import { describe, it, expect, afterAll } from 'vitest'
import { finishDate, weekDates, weekFor, pace } from '@/lib/course'

// Adding 133 days as milliseconds is not the same as adding 133 calendar days.
// In a timezone that puts its clocks back, the sum lands an hour earlier and
// can fall on the previous date, so the server (UTC, no daylight saving) and
// the browser disagree by a day. That is a hydration error, and it is what
// these tests reproduce.

const original = process.env.TZ

function inTimezone<T>(tz: string, run: () => T): T {
  process.env.TZ = tz
  try {
    return run()
  } finally {
    process.env.TZ = original
  }
}

afterAll(() => {
  process.env.TZ = original
})

describe('dates across a daylight saving change', () => {
  it('finishes on the same day whatever timezone is reading', () => {
    const utc = inTimezone('UTC', () => finishDate('2026-08-19'))
    const paris = inTimezone('Europe/Paris', () => finishDate('2026-08-19'))
    const hanoi = inTimezone('Asia/Ho_Chi_Minh', () => finishDate('2026-08-19'))
    const auckland = inTimezone('Pacific/Auckland', () => finishDate('2026-08-19'))
    expect(paris).toBe(utc)
    expect(hanoi).toBe(utc)
    expect(auckland).toBe(utc)
    expect(utc).toBe('2027-01-05')
  })

  it('keeps every week boundary on the same day in every timezone', () => {
    const weeks = [1, 5, 10, 15, 20]
    const utc = inTimezone('UTC', () => weeks.map((w) => weekDates(w, '2026-08-19')))
    const paris = inTimezone('Europe/Paris', () => weeks.map((w) => weekDates(w, '2026-08-19')))
    expect(paris).toEqual(utc)
  })

  it('keeps weeks exactly seven days apart across the change', () => {
    inTimezone('Europe/Paris', () => {
      // The clocks go back in Europe on 25 October 2026.
      expect(weekDates(10, '2026-08-19').start).toBe('2026-10-21')
      expect(weekDates(11, '2026-08-19').start).toBe('2026-10-28')
      expect(weekDates(12, '2026-08-19').start).toBe('2026-11-04')
    })
  })

  it('puts a date in the same course week wherever it is read', () => {
    const day = new Date(2026, 10, 4, 12, 0, 0) // 4 November, after the change
    const utc = inTimezone('UTC', () => weekFor(day, '2026-08-19')?.week)
    const paris = inTimezone('Europe/Paris', () => weekFor(day, '2026-08-19')?.week)
    expect(paris).toBe(utc)
    expect(utc).toBe(12)
  })

  it('works out the same pace in every timezone', () => {
    const utc = inTimezone('UTC', () => pace('2026-08-19', '2027-01-05'))
    const paris = inTimezone('Europe/Paris', () => pace('2026-08-19', '2027-01-05'))
    expect(paris.weeksPerWeek).toBeCloseTo(utc.weeksPerWeek, 6)
  })
})
