import { describe, it, expect } from 'vitest'
import { COURSE, PHASES } from '@/lib/course'
import { COURSE_FR, PHASES_FR, localiseWeek, localisePhase } from '@/lib/course-i18n'

describe('the French course', () => {
  it('translates every week, with nothing missed', () => {
    COURSE.forEach((w) => {
      expect(COURSE_FR[w.week], `week ${w.week}`).toBeDefined()
      expect(COURSE_FR[w.week].title.length).toBeGreaterThan(3)
      expect(COURSE_FR[w.week].focus.length).toBeGreaterThan(20)
      expect(COURSE_FR[w.week].goal.length).toBeGreaterThan(10)
    })
  })

  it('translates a warning wherever English has one', () => {
    COURSE.forEach((w) => {
      if (w.watch) expect(COURSE_FR[w.week].watch, `week ${w.week}`).toBeTruthy()
    })
  })

  it('translates every phase', () => {
    PHASES.forEach((p) => expect(PHASES_FR[p.id], p.id).toBeDefined())
  })

  it('has no week the English course does not have', () => {
    const weeks = new Set(COURSE.map((w) => w.week))
    Object.keys(COURSE_FR).forEach((n) => expect(weeks.has(Number(n)), n).toBe(true))
  })

  it('leaves English alone and swaps French in', () => {
    const week = COURSE[0]
    expect(localiseWeek(week, 'en')).toBe(week)
    expect(localiseWeek(week, 'fr').title).toBe(COURSE_FR[1].title)
    expect(localiseWeek(week, 'fr').items).toEqual(week.items)
  })

  it('keeps the phase weeks when translating a phase', () => {
    const phase = PHASES[0]
    expect(localisePhase(phase, 'fr').weeks).toEqual(phase.weeks)
    expect(localisePhase(phase, 'fr').title).not.toBe(phase.title)
  })
})
