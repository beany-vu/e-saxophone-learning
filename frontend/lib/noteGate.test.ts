import { describe, it, expect } from 'vitest'
import { initialGate, stepGate, type GateState, type GateEvent } from '@/lib/noteGate'

const OPTS = { attackFrames: 3, releaseFrames: 4 }

/**
 * Feed a list of frames through the gate and collect everything it emitted.
 * `events` drops the level, so the timing tests below read as pure sequence.
 * Velocity gets its own test at the bottom.
 */
function run(frames: (number | null)[], state: GateState = initialGate()) {
  const raw: GateEvent[] = []
  frames.forEach((note) => {
    const out = stepGate(state, { note, level: note === null ? 0 : 0.3 }, OPTS)
    state = out.state
    raw.push(...out.events)
  })
  const events = raw.map((e) => ({ kind: e.kind, note: e.note }))
  return { state, events, raw }
}

describe('stepGate', () => {
  it('starts with nothing sounding', () => {
    expect(initialGate().note).toBeNull()
  })

  it('stays silent while no pitch is detected', () => {
    const { events } = run([null, null, null, null, null, null])
    expect(events).toEqual([])
  })

  it('does not fire on a single stray frame, which is what noise looks like', () => {
    const { events } = run([null, 69, null, null, null, null])
    expect(events).toEqual([])
  })

  it('fires note on once the pitch has held for attackFrames', () => {
    const { events } = run([69, 69, 69])
    expect(events).toEqual([{ kind: 'on', note: 69 }])
  })

  it('does not fire again while the same note is held', () => {
    const { events } = run([69, 69, 69, 69, 69, 69, 69])
    expect(events.filter((e) => e.kind === 'on')).toHaveLength(1)
  })

  it('releases the note after releaseFrames of silence', () => {
    const { events } = run([69, 69, 69, null, null, null, null])
    expect(events).toEqual([
      { kind: 'on', note: 69 },
      { kind: 'off', note: 69 },
    ])
  })

  it('holds through a short dropout, the way a real note flickers', () => {
    const { events } = run([69, 69, 69, null, null, 69, 69, 69, 69])
    expect(events).toEqual([{ kind: 'on', note: 69 }])
  })

  it('changes note without a gap, ending the old one first', () => {
    const { events } = run([69, 69, 69, 71, 71, 71])
    expect(events).toEqual([
      { kind: 'on', note: 69 },
      { kind: 'off', note: 69 },
      { kind: 'on', note: 71 },
    ])
  })

  it('ignores a one-frame octave glitch mid-note', () => {
    const { events } = run([69, 69, 69, 81, 69, 69, 69])
    expect(events).toEqual([{ kind: 'on', note: 69 }])
  })

  it('counts a repeated note as two notes when separated by silence', () => {
    const { events } = run([69, 69, 69, null, null, null, null, 69, 69, 69])
    expect(events).toEqual([
      { kind: 'on', note: 69 },
      { kind: 'off', note: 69 },
      { kind: 'on', note: 69 },
    ])
  })

  it('reports the loudest level seen while the note was building, as velocity', () => {
    let state = initialGate()
    let events: GateEvent[] = []
    ;[0.2, 0.6, 0.4].forEach((level) => {
      const out = stepGate(state, { note: 69, level }, OPTS)
      state = out.state
      events = events.concat(out.events)
    })
    expect(events[0]).toMatchObject({ kind: 'on', note: 69, level: 0.6 })
  })
})
