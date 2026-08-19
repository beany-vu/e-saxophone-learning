import { describe, it, expect } from 'vitest'
import { isValidDate, resolveDates, today } from '@/lib/course-dates'
import { DEFAULT_START } from '@/lib/course'

describe('isValidDate', () => {
  it('accepts a real date', () => {
    expect(isValidDate('2026-08-19')).toBe(true)
  })

  it('rejects anything that is not one', () => {
    ;['', 'tomorrow', '19-08-2026', '2026-13-01', '2026-02-30', '2026-8-9'].forEach((bad) =>
      expect(isValidDate(bad), bad).toBe(false),
    )
  })
})

describe('today', () => {
  it('formats the local date the way the course and the inputs expect', () => {
    expect(today(new Date(2026, 7, 9))).toBe('2026-08-09')
  })
})

describe('resolveDates', () => {
  const stored = { start: null, target: null }

  it('prefers the account, so the dates follow you between machines', () => {
    const user = { courseStart: '2027-01-04', courseTargetEnd: '2027-05-24' }
    const out = resolveDates(user, { start: '2020-01-01', target: '2020-06-01' })
    expect(out).toEqual({ start: '2027-01-04', target: '2027-05-24' })
  })

  it('falls back to the browser when nobody is logged in', () => {
    expect(resolveDates(null, { start: '2027-03-01', target: '2027-07-19' })).toEqual({
      start: '2027-03-01',
      target: '2027-07-19',
    })
  })

  it('falls back to the default when there is nothing at all', () => {
    expect(resolveDates(null, stored)).toEqual({ start: DEFAULT_START, target: '' })
  })

  it('ignores stored rubbish rather than passing it on', () => {
    expect(resolveDates(null, { start: 'yesterday', target: '2026-99-99' })).toEqual({
      start: DEFAULT_START,
      target: '',
    })
  })

  it('uses the browser value when the account has none yet', () => {
    const user = { courseStart: '', courseTargetEnd: '' }
    expect(resolveDates(user, { start: '2027-03-01', target: null }).start).toBe('2027-03-01')
  })
})
