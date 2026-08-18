'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { COURSE, PHASES, weekDates, weekFor } from '@/lib/course'

/**
 * The course, summarised, on the front page.
 *
 * Week 1 is the initial state so the server and the first client render agree;
 * the effect then moves it to the week the calendar or your own progress says
 * you are on. Reading the clock during render would be a hydration mismatch.
 */
export default function ThisWeek() {
  const [weekNumber, setWeekNumber] = useState(1)

  useEffect(() => {
    const saved = Number(localStorage.getItem('yds120.courseWeek'))
    if (saved >= 1 && saved <= COURSE.length) setWeekNumber(saved)
    else setWeekNumber(weekFor(new Date())?.week ?? 1)
  }, [])

  const week = COURSE.find((w) => w.week === weekNumber) ?? COURSE[0]
  const phase = PHASES.find((p) => p.weeks.includes(week.week))
  const dates = weekDates(week.week)

  return (
    <div className="panel" style={{ borderColor: 'var(--accent)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ marginBottom: 0 }}>
          Week {week.week} of {COURSE.length}: {week.title}
        </h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {dates.start} to {dates.end}
          {phase ? ` · ${phase.title}` : ''}
        </span>
      </div>
      <p style={{ marginBottom: 6 }}>{week.focus}</p>
      <p style={{ margin: '0 0 12px' }}>
        <strong>Goal:</strong> {week.goal}
      </p>
      <Link href="/learn">
        <button>Practise this week</button>
      </Link>
    </div>
  )
}
