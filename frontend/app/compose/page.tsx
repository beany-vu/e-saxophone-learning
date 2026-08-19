'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import Piano from '@/components/Piano'
import Staff from '@/components/Staff'
import { useI18n } from '@/lib/i18n-context'
import { useInputContext } from '@/lib/input-context'
import { useMelodyPlayer } from '@/hooks/useMelodyPlayer'
import {
  DURATIONS,
  TIME_SIGNATURES,
  dotted,
  durationLabel,
  toBars,
  toMelody,
  totalBeats,
  type ComposedNote,
} from '@/lib/compose'
import { FINGERING_HIGH, FINGERING_LOW } from '@/lib/fingerings'
import { toConcert } from '@/lib/notes'
import type { StringKey } from '@/lib/i18n'

const CUSTOM_STORAGE_KEY = 'yds120.customMelodies'

// The duration buttons are labelled in words rather than only symbols, since
// half the point is learning what a dotted quarter is.
const DURATION_KEYS: Record<string, StringKey> = {
  whole: 'compose.whole',
  half: 'compose.half',
  quarter: 'compose.quarter',
  eighth: 'compose.eighth',
  sixteenth: 'compose.sixteenth',
}

export default function ComposePage() {
  const { t, n } = useI18n()
  const input = useInputContext()
  const player = useMelodyPlayer()

  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [length, setLength] = useState(1)
  const [dot, setDot] = useState(false)
  const [notes, setNotes] = useState<ComposedNote[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [playAsYouGo, setPlayAsYouGo] = useState(true)

  const beats = dot ? dotted(length) : length
  const { bars, overfull } = useMemo(() => toBars(notes, beatsPerBar), [notes, beatsPerBar])

  // A bar line falls before the first note of every bar after the first.
  const barlines = useMemo(() => {
    const lines: number[] = []
    let index = 0
    bars.forEach((bar, i) => {
      if (i > 0) lines.push(index)
      index += bar.length
    })
    return lines
  }, [bars])

  const press = useCallback(
    (midi: number) => {
      setNotes((prev) => [...prev, { midi, beats }])
      setMessage(null)
      if (playAsYouGo) {
        // Heard at the pitch the instrument would sound, so writing and
        // playing agree.
        player.play([midi], [beats], { bpm: 100, transpose: input.voice.semitones })
      }
    },
    [beats, playAsYouGo, player, input.voice.semitones],
  )

  function save() {
    const name = title.trim()
    if (!name) return setMessage(t('learn.nameFirst'))
    if (notes.length < 2) return setMessage(t('learn.notEnoughNotes'))

    const melody = toMelody(name, notes, beatsPerBar)
    try {
      const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
      const existing = raw ? JSON.parse(raw) : []
      localStorage.setItem(
        CUSTOM_STORAGE_KEY,
        JSON.stringify([
          ...existing,
          {
            id: `custom-${Date.now()}`,
            title: name,
            notes: melody.notes,
            beats: melody.beats,
            phrases: melody.phrases,
          },
        ]),
      )
      setMessage(t('compose.saved'))
    } catch {
      setMessage('save failed')
    }
  }

  return (
    <>
      <h1>{t('compose.title')}</h1>
      <p className="muted">{t('compose.intro')}</p>

      <div className="panel">
        <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 130 }}>
            <label htmlFor="time" className="label">
              {t('compose.timeSignature')}
            </label>
            <select
              id="time"
              value={beatsPerBar}
              onChange={(e) => setBeatsPerBar(Number(e.target.value))}
            >
              {TIME_SIGNATURES.map((sig) => (
                <option key={sig.label} value={sig.beatsPerBar}>
                  {sig.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="label">{t('compose.noteLength')}</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  className={length === d.beats ? '' : 'ghost'}
                  onClick={() => setLength(d.beats)}
                  aria-pressed={length === d.beats}
                >
                  {d.symbol} {t(DURATION_KEYS[d.label])}
                </button>
              ))}
            </div>
            <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={dot}
                onChange={(e) => setDot(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span style={{ fontSize: 14 }}>{t('compose.dotted')}</span>
            </label>
          </div>

          <div style={{ minWidth: 150 }}>
            <div className="label">{t('compose.noteLength')}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {beats} {beats === 1 ? 'beat' : 'beats'}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {durationLabel(beats)}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        {notes.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('compose.empty')}
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <Staff notes={notes.map((x) => x.midi)} current={player.index} barlines={barlines} />
            </div>

            <div className="seq" style={{ marginTop: 10 }}>
              {notes.map((note, i) => (
                <div key={i} className={`step${player.index === i ? ' current' : ''}`}>
                  <div>{n(note.midi)}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{note.beats}</div>
                </div>
              ))}
            </div>

            <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
              {t('compose.bars', { count: bars.length, beats: totalBeats(notes) })}
            </p>
            {overfull.length > 0 && (
              <p style={{ color: 'var(--warn)', fontSize: 13, margin: '6px 0 0' }}>
                {t('compose.overfull', { bars: overfull.join(', '), beatsPerBar })}
              </p>
            )}
          </>
        )}

        <div className="row" style={{ marginTop: 14, alignItems: 'center' }}>
          <button
            onClick={() =>
              player.play(
                notes.map((x) => x.midi),
                notes.map((x) => x.beats),
                { bpm: 90, transpose: input.voice.semitones },
              )
            }
            disabled={notes.length === 0}
          >
            {t('common.listen')}
          </button>
          <button
            className="ghost"
            onClick={() => setNotes((prev) => prev.slice(0, -1))}
            disabled={notes.length === 0}
          >
            {t('compose.undo')}
          </button>
          <button className="ghost" onClick={() => setNotes([])} disabled={notes.length === 0}>
            {t('compose.clearAll')}
          </button>
          <label className="row" style={{ gap: 6, alignItems: 'center', margin: 0 }}>
            <input
              type="checkbox"
              checked={playAsYouGo}
              onChange={(e) => setPlayAsYouGo(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span style={{ fontSize: 13 }}>{t('compose.playAsYouGo')}</span>
          </label>
        </div>
      </div>

      <div className="panel">
        <Piano
          active={[]}
          low={FINGERING_LOW}
          high={FINGERING_HIGH}
          onPress={press}
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          {t('compose.keyboardRange')} {n(FINGERING_LOW)} to {n(FINGERING_HIGH)}, sounding{' '}
          {n(toConcert(FINGERING_LOW, input.voice.semitones))} to{' '}
          {n(toConcert(FINGERING_HIGH, input.voice.semitones))}.
        </p>
      </div>

      <div className="panel">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="tune-name" className="label">
              {t('compose.nameIt')}
            </label>
            <input id="tune-name" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button onClick={save} disabled={notes.length < 2}>
            {t('compose.save')}
          </button>
          <Link href="/learn">
            <button className="ghost">{t('nav.learn')}</button>
          </Link>
        </div>
        {message && (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
            {message}
          </p>
        )}
      </div>
    </>
  )
}
