'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { COURSE, PHASES, weekDates, weekFor } from '@/lib/course'
import { useI18n } from '@/lib/i18n-context'
import { localiseWeek, localisePhase } from '@/lib/course-i18n'
import { completion, isDone, nextUnfinished, parseDone } from '@/lib/course-progress'

/**
 * The course, summarised, on the front page.
 *
 * Week 1 is the initial state so the server and the first client render agree;
 * the effect then moves it to the week the calendar or your own progress says
 * you are on. Reading the clock during render would be a hydration mismatch.
 */
export default function ThisWeek() {
  const { lang, t } = useI18n()
  const [weekNumber, setWeekNumber] = useState(1)
  const [weeksDone, setWeeksDone] = useState<number[]>([])

  useEffect(() => {
    const finished = parseDone(localStorage.getItem('yds120.courseDone'))
    setWeeksDone(finished)
    const saved = Number(localStorage.getItem('yds120.courseWeek'))
    if (saved >= 1 && saved <= COURSE.length) setWeekNumber(saved)
    else if (finished.length) setWeekNumber(nextUnfinished(finished, COURSE.length))
    else setWeekNumber(weekFor(new Date())?.week ?? 1)
  }, [])

  const progress = completion(weeksDone, COURSE.length)

  const week = localiseWeek(COURSE.find((w) => w.week === weekNumber) ?? COURSE[0], lang)
  const phase = PHASES.find((p) => p.weeks.includes(week.week))
  const dates = weekDates(week.week)

  return (
    <div className="panel" style={{ borderColor: 'var(--accent)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>
          {isDone(weeksDone, week.week) && <span style={{ color: 'var(--good)' }}>✓ </span>}
          {t('course.weekOf', { week: week.week, total: COURSE.length })}: {week.title}
        </h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {dates.start} to {dates.end}
          {phase ? ` · ${localisePhase(phase, lang).title}` : ''} ·{' '}
          {t('course.completion', { done: progress.done, total: progress.total })}
        </span>
      </div>

      <div className="meter" style={{ margin: '10px 0 12px' }}>
        <div style={{ width: `${progress.percent}%` }} />
      </div>
      <p style={{ marginBottom: 6 }}>{week.focus}</p>
      <p style={{ margin: '0 0 12px' }}>
        <strong>{t('common.goal')}:</strong> {week.goal}
      </p>
      <Link href="/learn">
        <button>{t('course.practiseThisWeek')}</button>
      </Link>
    </div>
  )
}
