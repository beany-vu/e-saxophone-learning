'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Piano from '@/components/Piano'
import { useInputContext } from '@/lib/input-context'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { formatDuration, toConcert, VOICES } from '@/lib/notes'
import { describeOffset } from '@/lib/calibration'
import { useI18n } from '@/lib/i18n-context'

export default function MonitorPage() {
  const input = useInputContext()
  const { t, n } = useI18n()
  const { user } = useAuth()
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Tick the practice clock once a second while a session is running.
  useEffect(() => {
    if (startedAt === null) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  // The first note you play starts the clock automatically.
  useEffect(() => {
    if (input.totalNotes > 0 && startedAt === null) setStartedAt(Date.now())
  }, [input.totalNotes, startedAt])

  const distinctNotes = useMemo(() => Object.keys(input.noteCounts).length, [input.noteCounts])
  const isMic = input.mode === 'mic'

  async function save() {
    setSaveState('saving')
    setSaveError(null)
    try {
      const counts: Record<string, number> = {}
      Object.entries(input.noteCounts).forEach(([note, n]) => (counts[note] = n))
      await api.saveSession({
        source: 'monitor',
        durationSeconds: elapsed,
        notesPlayed: input.totalNotes,
        noteCounts: counts,
      })
      setSaveState('saved')
      input.reset()
      setStartedAt(null)
      setElapsed(0)
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'save failed')
    }
  }

  return (
    <>
      <h1>{t('monitor.title')}</h1>
      <p className="muted">{t('monitor.intro')}</p>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h2 style={{ marginBottom: 6 }}>{t('monitor.input')}</h2>
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <button
                className={isMic ? 'ghost' : ''}
                onClick={() => input.setMode('midi')}
                aria-pressed={!isMic}
              >
                {t('monitor.usbMidi')}
              </button>
              <button
                className={isMic ? '' : 'ghost'}
                onClick={() => input.setMode('mic')}
                aria-pressed={isMic}
              >
                {t('monitor.microphone')}
              </button>
            </div>

            {input.status === 'unsupported' && (
              <p className="error" style={{ margin: 0 }}>
                {isMic ? t('monitor.noMicSupport') : t('monitor.noWebMidi')}
              </p>
            )}
            {input.status === 'denied' && (
              <p className="error" style={{ margin: 0 }}>
                {isMic ? t('monitor.micRefused') : t('monitor.midiRefused')} {input.error}
              </p>
            )}

            {!isMic && input.status === 'ready' && input.midi.devices.length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                <p style={{ margin: '0 0 6px' }}>
                  {t('monitor.noInputFound')}
                </p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>{t('monitor.step.ctl')}</li>
                  <li>{t('monitor.step.cable')}</li>
                  <li>{t('monitor.step.port')}</li>
                  <li>{t('monitor.step.closeApps')}</li>
                  <li>{t('monitor.step.rescan')}</li>
                </ol>
                <p style={{ margin: '6px 0 0' }}>{t('monitor.micTradeoff')}</p>
              </div>
            )}
            {!isMic &&
              input.midi.devices.map((d) => (
                <div key={d.id}>
                  <span className="badge on">{d.name}</span>{' '}
                  <span className="muted" style={{ fontSize: 13 }}>
                    {d.manufacturer}
                  </span>
                </div>
              ))}

            {isMic && input.status === 'ready' && (
              <div>
                <span className="badge on">{input.mic.deviceName}</span>{' '}
                <span className="muted" style={{ fontSize: 13 }}>
                  {t('monitor.listening')}
                </span>
              </div>
            )}
            {isMic && input.status !== 'ready' && (
              <div className="muted" style={{ fontSize: 13 }}>
                <p style={{ margin: '0 0 6px' }}>
                  {t('monitor.micIntro')}
                </p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>{t('monitor.mic.headphones')}</li>
                  <li>{t('monitor.mic.notCtl')}</li>
                  <li>{t('monitor.mic.volume')}</li>
                  <li>{t('monitor.mic.allow')}</li>
                </ol>
              </div>
            )}
          </div>

          <div style={{ minWidth: 200 }}>
            <label htmlFor="voice" className="label">
              {t('monitor.voice')}
            </label>
            <select
              id="voice"
              value={input.voice.id}
              onChange={(e) => input.setVoiceId(e.target.value)}
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {t('monitor.voiceHelp')}
            </div>
          </div>

          <div style={{ minWidth: 230 }}>
            <div className="label">{t('monitor.noteMatching')}</div>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
              {t('monitor.noteMatchingHelp')}
            </p>
            <div className="row">
              <button
                onClick={() => input.lastNote !== null && input.calibrate(73, input.lastNote)}
                disabled={input.status !== 'ready' || input.lastNote === null}
              >
                {t('monitor.matchButton')}
              </button>
              {input.offset !== 0 && (
                <button className="ghost" onClick={() => input.setOffset(0)}>
                  {t('common.clear')}
                </button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {t('monitor.currently', { amount: describeOffset(input.offset) })}
              {input.lastNote !== null &&
                t('monitor.lastNoteRead', { note: n(input.lastNote) })}
            </div>
          </div>

          <div>
            {input.status === 'idle' || input.status === 'denied' ? (
              <button onClick={input.connect}>
                {isMic ? t('learn.startListening') : t('learn.connectMidi')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${input.status === 'ready' ? 'on' : ''}`}>
                  {input.status}
                </span>
                {input.status === 'ready' &&
                  (isMic ? (
                    <button className="ghost" onClick={input.mic.stop}>
                      {t('common.stop')}
                    </button>
                  ) : (
                    <button className="ghost" onClick={input.midi.rescan}>
                      {t('monitor.rescan')}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {isMic && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 150 }}>
                <div className="label">{t('monitor.heardNow')}</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {input.mic.pitchHz ? `${Math.round(input.mic.pitchHz)} Hz` : '-'}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {input.mic.cents === null
                    ? t('monitor.noPitch')
                    : t('monitor.cents', {
                        cents: `${input.mic.cents > 0 ? '+' : ''}${input.mic.cents}`,
                      })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="label">{t('monitor.micLevel')}</div>
                <div className="meter">
                  <div style={{ width: `${Math.min(100, input.mic.level * 400)}%` }} />
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {t('monitor.micLevelHelp')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>{t('monitor.keyboard')}</h2>
        <Piano active={input.activeNotes} />
        <div className="row" style={{ marginTop: 14 }}>
          <div style={{ minWidth: 170 }}>
            <div className="label">{t('monitor.playingNow')}</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>
              {input.activeNotes.length ? input.activeNotes.map((midi) => n(midi)).join(' ') : '-'}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {input.lastNote !== null
                ? t('monitor.lastNote', {
                    note: n(input.lastNote),
                    concert: n(toConcert(input.lastNote, input.voice.semitones)),
                  })
                : t('monitor.waitingForNote')}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="label">
              {isMic
                ? t('monitor.loudness', { value: input.breath })
                : t('monitor.breath', { value: input.breath })}
            </div>
            <div className="meter">
              <div style={{ width: `${(input.breath / 127) * 100}%` }} />
            </div>
            <div className="label" style={{ marginTop: 12 }}>
              {t('monitor.velocity', { value: input.lastVelocity })}
            </div>
            <div className="meter">
              <div style={{ width: `${(input.lastVelocity / 127) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>{t('monitor.thisSession')}</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="value">{formatDuration(elapsed)}</div>
            <div className="label">{t('monitor.duration')}</div>
          </div>
          <div className="stat">
            <div className="value">{input.totalNotes}</div>
            <div className="label">{t('monitor.notesPlayed')}</div>
          </div>
          <div className="stat">
            <div className="value">{distinctNotes}</div>
            <div className="label">{t('monitor.distinctNotes')}</div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          {user ? (
            <button onClick={save} disabled={input.totalNotes === 0 || saveState === 'saving'}>
              {saveState === 'saving' ? t('common.saving') : t('monitor.saveSession')}
            </button>
          ) : (
            <Link href="/login">
              <button className="ghost">{t('monitor.logInToSave')}</button>
            </Link>
          )}
          <button className="ghost" onClick={input.reset}>
            {t('monitor.resetCounters')}
          </button>
          {saveState === 'saved' && <span className="badge on">{t('common.saved')}</span>}
        </div>
        {saveError && <p className="error">{saveError}</p>}
      </div>

      <div className="panel">
        <h2>{t('monitor.rawEvents')}</h2>
        {input.log.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {isMic ? t('monitor.nothingYetMic') : t('monitor.nothingYetMidi')}
          </p>
        ) : (
          <table className="mono">
            <thead>
              <tr>
                <th>{t('monitor.type')}</th>
                <th>{t('monitor.note')}</th>
                <th>{t('monitor.midiNumber')}</th>
                <th>{t('monitor.velocityCol')}</th>
              </tr>
            </thead>
            <tbody>
              {input.log.slice(0, 12).map((e, i) => (
                <tr key={i}>
                  <td style={{ color: e.kind === 'on' ? 'var(--good)' : 'var(--muted)' }}>
                    {e.kind === 'on' ? t('monitor.noteOn') : t('monitor.noteOff')}
                  </td>
                  <td>{n(e.note)}</td>
                  <td>{e.note}</td>
                  <td>{e.velocity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
