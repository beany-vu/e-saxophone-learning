'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Piano from '@/components/Piano'
import { useInputContext } from '@/lib/input-context'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { formatDuration, noteName, toConcert, VOICES } from '@/lib/notes'
import { describeOffset } from '@/lib/calibration'

export default function MonitorPage() {
  const input = useInputContext()
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
      <h1>Monitor</h1>
      <p className="muted">
        Live view of what you are playing, over the USB cable or through the microphone.
      </p>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h2 style={{ marginBottom: 6 }}>Input</h2>
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <button
                className={isMic ? 'ghost' : ''}
                onClick={() => input.setMode('midi')}
                aria-pressed={!isMic}
              >
                USB MIDI
              </button>
              <button
                className={isMic ? '' : 'ghost'}
                onClick={() => input.setMode('mic')}
                aria-pressed={isMic}
              >
                Microphone
              </button>
            </div>

            {input.status === 'unsupported' && (
              <p className="error" style={{ margin: 0 }}>
                {isMic
                  ? 'This browser will not give a page microphone access.'
                  : 'This browser has no Web MIDI support. Use Chrome or Edge.'}
              </p>
            )}
            {input.status === 'denied' && (
              <p className="error" style={{ margin: 0 }}>
                {isMic ? 'Microphone access was refused.' : 'MIDI access was refused.'} {input.error}
              </p>
            )}

            {!isMic && input.status === 'ready' && input.midi.devices.length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                <p style={{ margin: '0 0 6px' }}>
                  Permission granted, but the browser sees no MIDI input. That means Chrome is
                  working and the device is not reaching it. In order:
                </p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    <strong>Put the instrument in MIDI controller mode.</strong> Press VOICE
                    up/down until the display reads <strong>CtL</strong>, past A, S, T, b, C and
                    U. Hold [Fn] with VOICE to jump a whole group at a time. The YDS-120 only
                    sends MIDI on <strong>CtL</strong>, and its speaker is silent there
                  </li>
                  <li>
                    A <strong>USB-A to micro-B data</strong> cable, under 3 m. The manual says not
                    to use a USB 3.0 cable, and a charge-only cable will never work
                  </li>
                  <li>Cable in the USB TO HOST port, instrument switched on</li>
                  <li>Close anything else using the device (the Yamaha app, any DAW)</li>
                  <li>Then press Rescan. No reload needed</li>
                </ol>
                <p style={{ margin: '6px 0 0' }}>
                  Microphone mode is the opposite trade: no cable, but it needs the speaker
                  sounding, so the two cannot run at once.
                </p>
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
                  listening
                </span>
              </div>
            )}
            {isMic && input.status !== 'ready' && (
              <div className="muted" style={{ fontSize: 13 }}>
                <p style={{ margin: '0 0 6px' }}>
                  No cable needed. The YDS-120 is heard through the computer microphone, so:
                </p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Unplug the headphones, the built-in speaker has to be sounding</li>
                  <li>
                    Not on <strong>CtL</strong>. The speaker is silent in MIDI controller mode, so
                    pick a normal voice such as <strong>A.01</strong>
                  </li>
                  <li>Turn the instrument volume up and sit near the microphone</li>
                  <li>Press Start listening and allow the microphone when Chrome asks</li>
                </ol>
              </div>
            )}
          </div>

          <div style={{ minWidth: 200 }}>
            <label htmlFor="voice" className="label">
              Voice on the instrument
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
              Match the instrument's own display. It powers up showing <strong>A.01</strong>,
              Alto Sax 1, which is this setting. Each group transposes differently, and
              microphone mode needs to know which, since it hears the sounding pitch.
            </div>
          </div>

          <div style={{ minWidth: 230 }}>
            <div className="label">Note matching</div>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
              Blow with <strong>no keys pressed</strong> and press this. That note is open C#5 on
              any saxophone, so it tells the app how your instrument reports notes.
            </p>
            <div className="row">
              <button
                onClick={() => input.lastNote !== null && input.calibrate(73, input.lastNote)}
                disabled={input.status !== 'ready' || input.lastNote === null}
              >
                Match to open C#
              </button>
              {input.offset !== 0 && (
                <button className="ghost" onClick={() => input.setOffset(0)}>
                  Clear
                </button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Currently: <strong>{describeOffset(input.offset)}</strong>
              {input.lastNote !== null && (
                <>
                  {' '}
                  · last note read as {noteName(input.lastNote)}
                </>
              )}
            </div>
          </div>

          <div>
            {input.status === 'idle' || input.status === 'denied' ? (
              <button onClick={input.connect}>{isMic ? 'Start listening' : 'Connect MIDI'}</button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${input.status === 'ready' ? 'on' : ''}`}>
                  {input.status}
                </span>
                {input.status === 'ready' &&
                  (isMic ? (
                    <button className="ghost" onClick={input.mic.stop}>
                      Stop
                    </button>
                  ) : (
                    <button className="ghost" onClick={input.midi.rescan}>
                      Rescan
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
                <div className="label">Heard now</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {input.mic.pitchHz ? `${Math.round(input.mic.pitchHz)} Hz` : '-'}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {input.mic.cents === null
                    ? 'no pitch'
                    : `${input.mic.cents > 0 ? '+' : ''}${input.mic.cents} cents`}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="label">Microphone level</div>
                <div className="meter">
                  <div style={{ width: `${Math.min(100, input.mic.level * 400)}%` }} />
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Notes register above roughly a quarter of this bar. If it barely moves while you
                  play, move closer or raise the instrument volume.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Keyboard</h2>
        <Piano active={input.activeNotes} />
        <div className="row" style={{ marginTop: 14 }}>
          <div style={{ minWidth: 170 }}>
            <div className="label">Playing now</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>
              {input.activeNotes.length ? input.activeNotes.map((n) => noteName(n)).join(' ') : '-'}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {input.lastNote !== null
                ? `last: ${noteName(input.lastNote)} fingered, sounds ${noteName(
                    toConcert(input.lastNote, input.voice.semitones),
                  )} concert, which is what a tuner shows`
                : 'waiting for a note'}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="label">
              {isMic ? `Loudness ${input.breath}` : `Breath (CC11 expression) ${input.breath}`}
            </div>
            <div className="meter">
              <div style={{ width: `${(input.breath / 127) * 100}%` }} />
            </div>
            <div className="label" style={{ marginTop: 12 }}>
              Velocity {input.lastVelocity}
            </div>
            <div className="meter">
              <div style={{ width: `${(input.lastVelocity / 127) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>This session</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="value">{formatDuration(elapsed)}</div>
            <div className="label">Duration</div>
          </div>
          <div className="stat">
            <div className="value">{input.totalNotes}</div>
            <div className="label">Notes played</div>
          </div>
          <div className="stat">
            <div className="value">{distinctNotes}</div>
            <div className="label">Distinct notes</div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          {user ? (
            <button onClick={save} disabled={input.totalNotes === 0 || saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving...' : 'Save session'}
            </button>
          ) : (
            <Link href="/login">
              <button className="ghost">Log in to save</button>
            </Link>
          )}
          <button className="ghost" onClick={input.reset}>
            Reset counters
          </button>
          {saveState === 'saved' && <span className="badge on">saved</span>}
        </div>
        {saveError && <p className="error">{saveError}</p>}
      </div>

      <div className="panel">
        <h2>Raw events</h2>
        {input.log.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing yet. {isMic ? 'Start listening and blow a note.' : 'Connect and blow a note.'}
          </p>
        ) : (
          <table className="mono">
            <thead>
              <tr>
                <th>Type</th>
                <th>Note</th>
                <th>MIDI</th>
                <th>Velocity</th>
              </tr>
            </thead>
            <tbody>
              {input.log.slice(0, 12).map((e, i) => (
                <tr key={i}>
                  <td style={{ color: e.kind === 'on' ? 'var(--good)' : 'var(--muted)' }}>
                    note {e.kind}
                  </td>
                  <td>{noteName(e.note)}</td>
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
