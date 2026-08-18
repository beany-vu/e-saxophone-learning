import { describe, it, expect } from 'vitest'
import { detectPitch, freqToMidi, levelToVelocity, rms } from '@/lib/pitch'
import { initialGate, stepGate, type GateEvent, type GateState } from '@/lib/noteGate'
import { fromConcert, noteName } from '@/lib/notes'

// The exact chain hooks/useMic.ts runs every animation frame, minus Web Audio.
// If this passes, the only thing left that can be wrong is the plumbing.

const SAMPLE_RATE = 44100
const WINDOW = 2048

function saxWindow(freq: number | null, amp = 0.4) {
  const buf = new Float32Array(WINDOW)
  if (freq === null) return buf // silence
  for (let i = 0; i < WINDOW; i++) {
    // A reed instrument is fundamental plus a strong harmonic series.
    buf[i] =
      amp *
      (Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) +
        0.7 * Math.sin((4 * Math.PI * freq * i) / SAMPLE_RATE) +
        0.5 * Math.sin((6 * Math.PI * freq * i) / SAMPLE_RATE))
  }
  return buf
}

/** Push windows through the same steps useMic does, collecting note events. */
function play(windows: Float32Array[], transpose = true) {
  let state: GateState = initialGate()
  const events: (GateEvent & { velocity?: number })[] = []
  windows.forEach((buf) => {
    const level = rms(buf)
    const freq = detectPitch(buf, SAMPLE_RATE)
    const heard = freq === null ? null : freqToMidi(freq)
    const played = heard === null ? null : transpose ? fromConcert(heard) : heard
    const out = stepGate(state, { note: played, level })
    state = out.state
    out.events.forEach((e) =>
      events.push(e.kind === 'on' ? { ...e, velocity: levelToVelocity(e.level) } : e),
    )
  })
  return events
}

const hold = (freq: number | null, frames: number, amp = 0.4) =>
  Array.from({ length: frames }, () => saxWindow(freq, amp))

describe('microphone chain', () => {
  it('turns a held concert A into one note on for the A the player fingers', () => {
    const events = play(hold(440, 8))
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('on')
    // Sounding A4 (69) on an alto is fingered as F#5 (78).
    expect(events[0].note).toBe(78)
    expect(noteName(events[0].note)).toBe('F#5')
  })

  it('reports the sounding note itself when transposition is off', () => {
    const events = play(hold(440, 8), false)
    expect(events[0].note).toBe(69)
  })

  it('gives a played note a usable velocity', () => {
    const loud = play(hold(440, 8, 0.6))[0]
    const soft = play(hold(440, 8, 0.05))[0]
    expect(loud.velocity).toBeGreaterThan(soft.velocity as number)
    expect(loud.velocity).toBeLessThanOrEqual(127)
    expect(soft.velocity).toBeGreaterThan(0)
  })

  it('counts a three note phrase as three notes, in order', () => {
    const events = play([
      ...hold(440, 6), // A4 sounding
      ...hold(null, 6),
      ...hold(493.88, 6), // B4
      ...hold(null, 6),
      ...hold(523.25, 6), // C5
      ...hold(null, 6),
    ])
    const ons = events.filter((e) => e.kind === 'on')
    expect(ons.map((e) => noteName(e.note))).toEqual(['F#5', 'G#5', 'A5'])
    expect(events.filter((e) => e.kind === 'off')).toHaveLength(3)
  })

  it('does not invent notes from silence or from room noise', () => {
    expect(play(hold(null, 30))).toEqual([])
    const hiss = Array.from({ length: 30 }, (_, k) => {
      const buf = new Float32Array(WINDOW)
      let seed = k + 1
      for (let i = 0; i < WINDOW; i++) {
        seed = (seed * 1103515245 + 12345) % 2147483648
        buf[i] = ((seed / 2147483648) * 2 - 1) * 0.2
      }
      return buf
    })
    expect(play(hiss)).toEqual([])
  })

  it('tracks a slur, where one note becomes another with no gap', () => {
    const events = play([...hold(440, 6), ...hold(523.25, 6)])
    expect(events.map((e) => e.kind)).toEqual(['on', 'off', 'on'])
    expect(events[0].note).toBe(events[1].note)
  })

  it('covers the alto range, low written Bb up to high F#', () => {
    // Sounding pitches for written Bb3 and F#6 on an alto.
    const cases: [number, string][] = [
      [138.59, 'Bb3'],
      [220, 'F#4'],
      [440, 'F#5'],
      [880, 'F#6'], // top of the written alto range
    ]
    cases.forEach(([freq, expected]) => {
      const events = play(hold(freq, 8))
      expect(events[0]?.note, `${freq} Hz`).toBe(fromConcert(freqToMidi(freq)))
      expect(noteName(events[0].note)).toBe(expected)
    })
  })
})
