import { describe, it, expect } from 'vitest'
import {
  COURSE,
  DEFAULT_START,
  weekFor,
  weekDates,
  weekStatus,
  finishDate,
  pace,
  PHASES,
} from '@/lib/course'
import { ALL_ITEMS } from '@/lib/curriculum'

describe('the course', () => {
  it('has a default start for someone who has not chosen one', () => {
    expect(DEFAULT_START).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('numbers its weeks from one, with no gaps', () => {
    expect(COURSE.map((w) => w.week)).toEqual(COURSE.map((_, i) => i + 1))
  })

  it('finishes twenty weeks after whenever you start', () => {
    expect(finishDate('2026-08-19')).toBe('2027-01-05')
    expect(finishDate('2026-01-01')).toBe('2026-05-20')
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
  it('starts week one on whichever date you began', () => {
    expect(weekDates(1, '2026-08-19').start).toBe('2026-08-19')
    expect(weekDates(1, '2027-03-04').start).toBe('2027-03-04')
  })

  it('runs seven days per week, back to back', () => {
    expect(weekDates(1, '2026-08-19').end).toBe('2026-08-25')
    expect(weekDates(2, '2026-08-19').start).toBe('2026-08-26')
  })

  it('crosses a year boundary without losing a day', () => {
    expect(weekDates(3, '2026-12-24').start).toBe('2027-01-07')
  })
})

describe('weekFor', () => {
  it('finds the week a date falls in, counted from that learner’s start', () => {
    expect(weekFor(new Date(2026, 7, 19), '2026-08-19')?.week).toBe(1)
    expect(weekFor(new Date(2026, 7, 25), '2026-08-19')?.week).toBe(1)
    expect(weekFor(new Date(2026, 7, 26), '2026-08-19')?.week).toBe(2)
  })

  it('gives two learners who started on different days different weeks', () => {
    const day = new Date(2026, 8, 30)
    expect(weekFor(day, '2026-08-19')?.week).toBe(7)
    expect(weekFor(day, '2026-09-23')?.week).toBe(2)
  })

  it('returns nothing before the course starts or after it ends', () => {
    expect(weekFor(new Date(2026, 7, 1), '2026-08-19')).toBeNull()
    expect(weekFor(new Date(2027, 2, 1), '2026-08-19')).toBeNull()
  })

  it('does not restart the count at a month boundary', () => {
    expect(weekFor(new Date(2026, 7, 31), '2026-08-19')!.week).toBe(2)
    expect(weekFor(new Date(2026, 8, 1), '2026-08-19')!.week).toBe(2)
  })

  it('reaches the last week before the finish date', () => {
    expect(weekFor(new Date(2026, 11, 31), '2026-08-19')!.week).toBe(COURSE.length)
  })
})

describe('local dates, not UTC', () => {
  // A learner east of UTC is a day ahead for part of every day. Deriving the
  // week from UTC meant the course "had not started yet" for those hours, and
  // the panel vanished entirely.
  it('uses the calendar date the learner sees', () => {
    // 19 August 01:00 in a UTC+7 timezone is still 18 August in UTC.
    const earlyMorning = new Date(2026, 7, 19, 1, 0, 0)
    expect(weekFor(earlyMorning, '2026-08-19')?.week).toBe(1)
  })

  it('is stable across the whole of a day', () => {
    expect(weekFor(new Date(2026, 7, 19, 0, 1), '2026-08-19')?.week).toBe(1)
    expect(weekFor(new Date(2026, 7, 19, 23, 59), '2026-08-19')?.week).toBe(1)
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

describe('pace against a target date', () => {
  it('is comfortable when the target matches the twenty weeks', () => {
    expect(pace('2026-08-19', '2027-01-05').weeksPerWeek).toBeCloseTo(1, 1)
    expect(pace('2026-08-19', '2027-01-05').verdict).toBe('steady')
  })

  it('warns when the target leaves less time than the material needs', () => {
    const p = pace('2026-08-19', '2026-10-14')
    expect(p.weeksPerWeek).toBeGreaterThan(1.5)
    expect(p.verdict).toBe('rushed')
  })

  it('is relaxed when there is plenty of time', () => {
    expect(pace('2026-08-19', '2027-08-19').verdict).toBe('relaxed')
  })

  it('treats a target before the start as no target at all', () => {
    expect(pace('2026-08-19', '2026-08-01').verdict).toBe('steady')
  })
})
