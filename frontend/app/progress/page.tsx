'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, ApiError, type Summary } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDuration, PIANO_HIGH, PIANO_LOW } from '@/lib/notes'
import { itemById } from '@/lib/curriculum'
import { useI18n } from '@/lib/i18n-context'
import { localiseItem } from '@/lib/curriculum-i18n'

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth()
  const { lang, t, n } = useI18n()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    api
      .summary()
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'could not load progress'))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  if (authLoading || loading) return <p className="muted">{t('progress.loading')}</p>

  if (!user) {
    return (
      <div className="panel" style={{ maxWidth: 420 }}>
        <h2>{t('progress.logInPrompt')}</h2>
        <p className="muted">{t('progress.perAccount')}</p>
        <Link href="/login">
          <button>{t('progress.goToLogin')}</button>
        </Link>
      </div>
    )
  }

  if (error) return <p className="error">{error}</p>
  if (!summary) return null

  const counts = summary.noteCounts
  const max = Math.max(1, ...Object.values(counts))

  const cells: { note: number; count: number }[] = []
  for (let n = PIANO_LOW; n <= PIANO_HIGH; n++) cells.push({ note: n, count: counts[String(n)] || 0 })

  const neverPlayed = cells.filter((c) => c.count === 0).length

  return (
    <>
      <h1>{t('progress.title')}</h1>
      <p className="muted">{t('progress.intro')}</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="value">{summary.totalSessions}</div>
          <div className="label">{t('progress.sessions')}</div>
        </div>
        <div className="stat">
          <div className="value">{summary.totalNotes}</div>
          <div className="label">{t('progress.notesPlayed')}</div>
        </div>
        <div className="stat">
          <div className="value">{formatDuration(summary.totalSeconds)}</div>
          <div className="label">{t('progress.timePractised')}</div>
        </div>
        <div className="stat">
          <div className="value">{neverPlayed}</div>
          <div className="label">{t('progress.notesNeverPlayed')}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>{t('progress.noteCoverage')}</h2>
        <p className="muted">
          Brighter means you play it more. The dark ones are the notes you are avoiding.
        </p>
        <div className="heat">
          {cells.map((c) => {
            const ratio = c.count / max
            return (
              <div
                key={c.note}
                className="cell"
                title={`${n(c.note)}: ${c.count}`}
                style={{
                  background:
                    c.count === 0 ? 'var(--panel-2)' : `rgba(255, 180, 84, ${0.15 + ratio * 0.85})`,
                  color: ratio > 0.45 ? '#1a1205' : 'var(--muted)',
                }}
              >
                {n(c.note)}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <h2>{t('progress.warmupsAndSongs')}</h2>
        {(summary.itemStats || []).length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('progress.nothingTracked')}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('progress.what')}</th>
                <th>{t('progress.kind')}</th>
                <th>{t('progress.attempts')}</th>
                <th>{t('progress.bestAccuracy')}</th>
                <th>{t('progress.timeSpent')}</th>
                <th>{t('progress.lastPlayed')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.itemStats.map((st) => (
                <tr key={st.item}>
                  <td>
                    {(() => {
                      const item = itemById(st.item)
                      return item ? localiseItem(item, lang).title : st.item
                    })()}
                  </td>
                  <td>{st.source}</td>
                  <td>{st.timesPlayed}</td>
                  <td
                    style={{
                      color:
                        st.bestAccuracy >= 90
                          ? 'var(--good)'
                          : st.bestAccuracy >= 70
                            ? 'var(--warn)'
                            : 'var(--muted)',
                    }}
                  >
                    {st.bestAccuracy}%
                  </td>
                  <td>{formatDuration(st.totalSeconds)}</td>
                  <td>{new Date(st.lastPlayedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>{t('progress.recentSessions')}</h2>
        {summary.recentSessions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('progress.nothingSaved')}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('progress.when')}</th>
                <th>{t('progress.source')}</th>
                <th>{t('progress.duration')}</th>
                <th>{t('progress.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentSessions.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.startedAt).toLocaleString()}</td>
                  <td>{s.source}</td>
                  <td>{formatDuration(s.durationSeconds)}</td>
                  <td>{s.notesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
