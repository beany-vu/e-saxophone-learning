import { describe, it, expect } from 'vitest'
import {
  COURSE,
  COURSE_START,
  COURSE_END,
  weekFor,
  weekDates,
  weekStatus,
  PHASES,
} from '@/lib/course'
import { ALL_ITEMS } from '@/lib/curriculum'

describe('the course', () => {
  it('runs from the start date to the end of the year', () => {
    expect(COURSE_START).toBe('2026-08-19')
    expect(COURSE_END).toBe('2026-12-31')
  })

  it('numbers its weeks from one, with no gaps', () => {
    expect(COURSE.map((w) => w.week)).toEqual(COURSE.map((_, i) => i + 1))
  })

  it('covers the whole period', () => {
    const last = weekDates(COURSE.length)
    expect(new Date(last.end) >= new Date(COURSE_END)).toBe(true)
  })

  it('only points at practice material that exists', () => {
    const ids = new Set(ALL_ITEMS.map((i) => i.id))
    COURSE.forEach((w) => {
      w.items.forEach((id) => expect(ids.has(id), `week ${w.week} wants ${id}`).toBe(true))
    })
  })

  it('gives every week a focus and a goal you could check', () => {
    COURSE.forEach((w) => {
      expect(w.focus.length, `week ${w.week}`).toBeGreaterThan(10)
      expect(w.goal.length, `week ${w.week}`).toBeGreaterThan(10)
    })
  })

  it('assigns every week to a phase, and every phase has weeks', () => {
    const weeks = new Set(COURSE.map((w) => w.week))
    const covered = PHASES.flatMap((p) => p.weeks)
    expect(new Set(covered)).toEqual(weeks)
    PHASES.forEach((p) => expect(p.weeks.length, p.title).toBeGreaterThan(0))
  })
})

describe('weekDates', () => {
  it('starts week one on the start date', () => {
    expect(weekDates(1).start).toBe('2026-08-19')
  })

  it('runs seven days per week, back to back', () => {
    expect(weekDates(1).end).toBe('2026-08-25')
    expect(weekDates(2).start).toBe('2026-08-26')
  })
})

describe('weekFor', () => {
  it('finds the week a date falls in', () => {
    expect(weekFor(new Date('2026-08-19'))?.week).toBe(1)
    expect(weekFor(new Date('2026-08-25'))?.week).toBe(1)
    expect(weekFor(new Date('2026-08-26'))?.week).toBe(2)
  })

  it('returns nothing before the course starts or after it ends', () => {
    expect(weekFor(new Date('2026-08-01'))).toBeNull()
    expect(weekFor(new Date('2027-03-01'))).toBeNull()
  })

  it('does not restart the count at a month boundary', () => {
    expect(weekFor(new Date('2026-08-31'))!.week).toBe(2)
    expect(weekFor(new Date('2026-09-01'))!.week).toBe(2)
  })

  it('reaches the last week before the year ends', () => {
    expect(weekFor(new Date('2026-12-31'))!.week).toBe(COURSE.length)
  })
})

describe('local dates, not UTC', () => {
  // A learner east of UTC is a day ahead for part of every day. Deriving the
  // week from UTC meant the course "had not started yet" for those hours, and
  // the panel vanished entirely.
  it('uses the calendar date the learner sees', () => {
    // 19 August 01:00 in a UTC+7 timezone is still 18 August in UTC.
    const earlyMorning = new Date(2026, 7, 19, 1, 0, 0)
    expect(weekFor(earlyMorning)?.week).toBe(1)
  })

  it('is stable across the whole of a day', () => {
    const start = weekFor(new Date(2026, 7, 19, 0, 1))?.week
    const end = weekFor(new Date(2026, 7, 19, 23, 59))?.week
    expect(start).toBe(1)
    expect(end).toBe(1)
  })
})

describe('weekStatus', () => {
  it('says where you are against the calendar', () => {
    expect(weekStatus(3, 3)).toBe('on track')
    expect(weekStatus(2, 5)).toBe('behind')
    expect(weekStatus(6, 4)).toBe('ahead')
  })

  it('treats one week either way as on track, because days off happen', () => {
    expect(weekStatus(3, 4)).toBe('on track')
    expect(weekStatus(4, 3)).toBe('on track')
  })
})
