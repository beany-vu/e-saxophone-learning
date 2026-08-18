'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Piano from '@/components/Piano'
import { useInputContext } from '@/lib/input-context'
import { useI18n } from '@/lib/i18n-context'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { buildScale, formatDuration, noteName, NOTE_NAMES, SCALES } from '@/lib/notes'

export default function ExercisesPage() {
  const input = useInputContext()
  const { t } = useI18n()
  const { user } = useAuth()

  const [rootPc, setRootPc] = useState(0) // pitch class, 0 = C
  const [octave, setOctave] = useState(5) // MIDI octave, 5 -> C5 = 72
  const [scaleName, setScaleName] = useState<keyof typeof SCALES | string>('Major')
  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const root = octave * 12 + rootPc
  const sequence = useMemo(() => buildScale(root, SCALES[scaleName] || SCALES.Major), [root, scaleName])

  // Refs so the MIDI callback always sees current values without resubscribing.
  const stateRef = useRef({ running: false, index: 0, sequence })
  stateRef.current = { running, index, sequence }

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (startedAt || Date.now())) / 1000)), 1000)
    return () => clearInterval(t)
  }, [running, startedAt])

  const handleNote = useCallback((note: number) => {
    const s = stateRef.current
    if (!s.running) return
    const target = s.sequence[s.index]
    // Compare pitch class so an octave slip still counts as the right note.
    if (note % 12 === target % 12) {
      setCorrect((c) => c + 1)
      setIndex((i) => {
        const next = i + 1
        if (next >= s.sequence.length) {
          setRunning(false)
          setDone(true)
          return i
        }
        return next
      })
    } else {
      setWrong((w) => w + 1)
    }
  }, [])

  useEffect(() => input.onNoteOn(handleNote), [input, handleNote])

  function start() {
    setIndex(0)
    setCorrect(0)
    setWrong(0)
    setDone(false)
    setSaveMsg(null)
    setElapsed(0)
    setStartedAt(Date.now())
    setRunning(true)
  }

  async function save() {
    try {
      const counts: Record<string, number> = {}
      Object.entries(input.noteCounts).forEach(([n, c]) => (counts[n] = c))
      await api.saveSession({
        source: 'exercise',
        durationSeconds: elapsed,
        notesPlayed: input.totalNotes,
        noteCounts: counts,
      })
      setSaveMsg('Saved to your progress.')
      input.reset()
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'save failed')
    }
  }

  const attempts = correct + wrong
  const accuracy = attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
  const target = running ? sequence[index] : null

  return (
    <>
      <h1>{t('exercises.title')}</h1>
      <p className="muted">
{t('exercises.intro')}
      </p>

      <div className="panel">
        <div className="row">
          <div style={{ minWidth: 110 }}>
            <label htmlFor="root">{t('exercises.root')}</label>
            <select id="root" value={rootPc} onChange={(e) => setRootPc(Number(e.target.value))}>
              {NOTE_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 110 }}>
            <label htmlFor="oct">{t('exercises.octave')}</label>
            <select id="oct" value={octave} onChange={(e) => setOctave(Number(e.target.value))}>
              {[4, 5, 6].map((o) => (
                <option key={o} value={o}>
                  {o - 1}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 190 }}>
            <label htmlFor="scale">{t('exercises.scale')}</label>
            <select id="scale" value={scaleName} onChange={(e) => setScaleName(e.target.value)}>
              {Object.keys(SCALES).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            {input.status !== 'ready' ? (
              <button onClick={input.connect}>
                {input.mode === 'mic' ? t('learn.startListening') : t('learn.connectMidi')}
              </button>
            ) : (
              <button onClick={start} disabled={running}>
                {running ? t('common.playing') : t('common.start')}
              </button>
            )}
          </div>
        </div>
        <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
          <span className="label" style={{ margin: 0 }}>
            {t('exercises.input')}
          </span>
          <button
            className={input.mode === 'midi' ? '' : 'ghost'}
            onClick={() => input.setMode('midi')}
            aria-pressed={input.mode === 'midi'}
          >
            {t('monitor.usbMidi')}
          </button>
          <button
            className={input.mode === 'mic' ? '' : 'ghost'}
            onClick={() => input.setMode('mic')}
            aria-pressed={input.mode === 'mic'}
          >
            {t('monitor.microphone')}
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            {t('exercises.micHint')}
          </span>
        </div>
        {input.status === 'unsupported' && (
          <p className="error">
            {input.mode === 'mic' ? t('monitor.noMicSupport') : t('monitor.noWebMidi')}
          </p>
        )}
      </div>

      <div className="panel">
        <h2>
          {noteName(root)} {scaleName}
        </h2>
        <div className="seq">
          {sequence.map((n, i) => (
            <div
              key={i}
              className={`step${i < index ? ' done' : ''}${running && i === index ? ' current' : ''}`}
            >
              {noteName(n)}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <Piano active={input.activeNotes} target={target} />
      </div>

      <div className="panel">
        <h2>{t('exercises.score')}</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="value">
              {index}
              <span style={{ fontSize: 16, color: 'var(--muted)' }}>/{sequence.length}</span>
            </div>
            <div className="label">{t('learn.progress')}</div>
          </div>
          <div className="stat">
            <div className="value">{accuracy}%</div>
            <div className="label">{t('learn.accuracy')}</div>
          </div>
          <div className="stat">
            <div className="value">{wrong}</div>
            <div className="label">{t('learn.wrongNotes')}</div>
          </div>
          <div className="stat">
            <div className="value">{formatDuration(elapsed)}</div>
            <div className="label">{t('learn.time')}</div>
          </div>
        </div>

        {done && (
          <p style={{ color: 'var(--good)', marginTop: 12 }}>
            {t('exercises.complete', { correct, wrong, accuracy })}
          </p>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          {user ? (
            <button onClick={save} disabled={input.totalNotes === 0}>
              {t('monitor.saveSession')}
            </button>
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>
              {t('exercises.logInToSave')}
            </span>
          )}
          <button className="ghost" onClick={start} disabled={input.status !== 'ready'}>
            {t('common.restart')}
          </button>
        </div>
        {saveMsg && <p className="muted" style={{ marginTop: 8 }}>{saveMsg}</p>}
      </div>
    </>
  )
}
