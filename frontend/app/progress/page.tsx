'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, ApiError, type Summary } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDuration, noteName, PIANO_HIGH, PIANO_LOW } from '@/lib/notes'
import { itemById } from '@/lib/curriculum'

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth()
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

  if (authLoading || loading) return <p className="muted">Loading...</p>

  if (!user) {
    return (
      <div className="panel" style={{ maxWidth: 420 }}>
        <h2>Log in to see your progress</h2>
        <p className="muted">Practice history is stored per account.</p>
        <Link href="/login">
          <button>Go to login</button>
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
      <h1>Progress</h1>
      <p className="muted">Everything you have recorded, across every session.</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="value">{summary.totalSessions}</div>
          <div className="label">Sessions</div>
        </div>
        <div className="stat">
          <div className="value">{summary.totalNotes}</div>
          <div className="label">Notes played</div>
        </div>
        <div className="stat">
          <div className="value">{formatDuration(summary.totalSeconds)}</div>
          <div className="label">Time practised</div>
        </div>
        <div className="stat">
          <div className="value">{neverPlayed}</div>
          <div className="label">Notes never played</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>Note coverage</h2>
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
                title={`${noteName(c.note)}: ${c.count}`}
                style={{
                  background:
                    c.count === 0 ? 'var(--panel-2)' : `rgba(255, 180, 84, ${0.15 + ratio * 0.85})`,
                  color: ratio > 0.45 ? '#1a1205' : 'var(--muted)',
                }}
              >
                {noteName(c.note)}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <h2>Warm-ups and songs</h2>
        {(summary.itemStats || []).length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing tracked yet. Pick something in <Link href="/learn">Learn</Link> and save an
            attempt.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>What</th>
                <th>Kind</th>
                <th>Attempts</th>
                <th>Best accuracy</th>
                <th>Time spent</th>
                <th>Last played</th>
              </tr>
            </thead>
            <tbody>
              {summary.itemStats.map((st) => (
                <tr key={st.item}>
                  <td>{itemById(st.item)?.title || st.item}</td>
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
        <h2>Recent sessions</h2>
        {summary.recentSessions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing saved yet. Play something in the <Link href="/monitor">Monitor</Link> or
            <Link href="/learn"> Learn</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Duration</th>
                <th>Notes</th>
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
