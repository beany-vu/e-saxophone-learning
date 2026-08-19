'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n-context'
import { LANGUAGES, type Lang } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { COURSE, DEFAULT_START, finishDate, pace, weekFor } from '@/lib/course'
import { START_KEY, TARGET_KEY, isValidDate, resolveDates, today } from '@/lib/course-dates'

// Everything that is a preference rather than practice, in one place, so the
// Learn page can be about learning.

export default function SettingsPage() {
  const { lang, setLang, naming, setNaming, t, n } = useI18n()
  const { user } = useAuth()

  const [startDate, setStartDate] = useState(DEFAULT_START)
  const [targetEnd, setTargetEnd] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const resolved = resolveDates(user, {
      start: localStorage.getItem(START_KEY),
      target: localStorage.getItem(TARGET_KEY),
    })
    setStartDate(resolved.start)
    setTargetEnd(resolved.target)
  }, [user])

  const saveDates = useCallback(
    async (nextStart: string, nextTarget: string) => {
      if (!isValidDate(nextStart)) return setMessage(t('course.badDate'))
      if (nextTarget && !isValidDate(nextTarget)) return setMessage(t('course.badDate'))
      if (nextTarget && nextTarget <= nextStart) return setMessage(t('course.targetBeforeStart'))

      setStartDate(nextStart)
      setTargetEnd(nextTarget)
      localStorage.setItem(START_KEY, nextStart)
      localStorage.setItem(TARGET_KEY, nextTarget)

      if (!user) return setMessage(t('course.datesLocal'))
      try {
        await api.setCourseDates(nextStart, nextTarget)
        setMessage(t('course.datesAccount'))
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'save failed')
      }
    },
    [t, user],
  )

  const currentWeek = weekFor(new Date(), startDate)?.week
  const rate = targetEnd && isValidDate(targetEnd) ? pace(startDate, targetEnd) : null

  return (
    <>
      <h1>{t('settings.title')}</h1>
      <p className="muted">{t('settings.intro')}</p>

      <div className="panel">
        <h2>{t('settings.language')}</h2>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          style={{ maxWidth: 260 }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        <h2>{t('settings.noteNaming')}</h2>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <button
            className={naming === 'letters' ? '' : 'ghost'}
            onClick={() => setNaming('letters')}
            aria-pressed={naming === 'letters'}
          >
            {t('settings.namingLetters')}
          </button>
          <button
            className={naming === 'solfege' ? '' : 'ghost'}
            onClick={() => setNaming('solfege')}
            aria-pressed={naming === 'solfege'}
          >
            {t('settings.namingSolfege')}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
          {t('settings.namingHelp')}
        </p>
        <p style={{ margin: 0 }}>
          {t('settings.example', { a: n(67), b: n(70), c: n(73) })}
        </p>
      </div>

      <div className="panel">
        <h2>{t('course.dates')}</h2>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div style={{ minWidth: 170 }}>
            <label htmlFor="start" className="label">
              {t('course.startDate')}
            </label>
            <input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => saveDates(e.target.value, targetEnd)}
            />
          </div>
          <div style={{ minWidth: 170 }}>
            <label htmlFor="target" className="label">
              {t('course.targetDate')}
            </label>
            <input
              id="target"
              type="date"
              value={targetEnd}
              onChange={(e) => saveDates(startDate, e.target.value)}
            />
          </div>
          <button className="ghost" onClick={() => saveDates(today(), targetEnd)}>
            {t('course.startToday')}
          </button>
        </div>

        <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          {t('course.finishes', { date: finishDate(startDate) })}
          {rate && (
            <>
              {' '}
              {rate.verdict === 'rushed'
                ? t('course.paceRushed', { rate: rate.weeksPerWeek.toFixed(1) })
                : rate.verdict === 'relaxed'
                  ? t('course.paceRelaxed', { rate: rate.weeksPerWeek.toFixed(1) })
                  : t('course.paceSteady')}
            </>
          )}
        </p>
        {currentWeek && (
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>
            {t('course.weekOf', { week: currentWeek, total: COURSE.length })}
          </p>
        )}
        {message && (
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>
            {message}
          </p>
        )}
      </div>

      <div className="panel">
        <h2>{t('settings.account')}</h2>
        {user ? (
          <p style={{ margin: 0 }}>{t('login.loggedInAs', { name: user.displayName, email: user.email })}</p>
        ) : (
          <div className="row" style={{ alignItems: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>
              {t('settings.notLoggedIn')}
            </p>
            <Link href="/login">
              <button className="ghost">{t('nav.login')}</button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
