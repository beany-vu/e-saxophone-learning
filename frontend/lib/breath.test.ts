import { describe, it, expect } from 'vitest'
import { analyseBreath, breathBaseline, type BreathFrame } from '@/lib/breath'

/** A note held at a constant level and in tune. */
const steady = (frames: number, level = 0.2, cents = 0): BreathFrame[] =>
  Array.from({ length: frames }, () => ({ level, cents }))

/** A note that slides from one level and tuning to another over its length. */
function ramp(
  frames: number,
  from: { level: number; cents: number },
  to: { level: number; cents: number },
): BreathFrame[] {
  return Array.from({ length: frames }, (_, i) => {
    const t = frames === 1 ? 1 : i / (frames - 1)
    return {
      level: from.level + (to.level - from.level) * t,
      cents: Math.round(from.cents + (to.cents - from.cents) * t),
    }
  })
}

describe('analyseBreath', () => {
  it('says nothing about a note too short to judge', () => {
    const report = analyseBreath(steady(3))
    expect(report.verdict).toBe('unknown')
    expect(report.frames).toBe(3)
  })

  it('passes a note held at one level and in tune', () => {
    const report = analyseBreath(steady(30))
    expect(report.verdict).toBe('steady')
    expect(report.sustain).toBeCloseTo(1, 2)
    expect(report.drift).toBe(0)
  })

  it('calls a note that quietens and goes flat under-supported', () => {
    const report = analyseBreath(ramp(30, { level: 0.25, cents: 0 }, { level: 0.08, cents: -30 }))
    expect(report.verdict).toBe('weak')
    expect(report.sustain).toBeLessThan(0.6)
    expect(report.drift).toBeLessThan(-12)
  })

  it('calls a note that quietens but stays in tune a fade, not weak air', () => {
    // A diminuendo is a musical choice. Telling someone off for it would be
    // wrong, so the pitch has to sag too before it counts as running out.
    const report = analyseBreath(ramp(30, { level: 0.25, cents: 0 }, { level: 0.08, cents: 0 }))
    expect(report.verdict).toBe('fading')
  })

  it('does not call a smooth fade unsteady', () => {
    const report = analyseBreath(ramp(30, { level: 0.25, cents: 0 }, { level: 0.08, cents: 0 }))
    expect(report.wobble).toBeLessThan(0.05)
  })

  it('catches an air stream that jitters even when it does not sag', () => {
    const frames = Array.from({ length: 30 }, (_, i) => ({
      level: i % 2 === 0 ? 0.26 : 0.14,
      cents: 0,
    }))
    const report = analyseBreath(frames)
    expect(report.verdict).toBe('unsteady')
    expect(report.sustain).toBeGreaterThan(0.6)
    expect(report.wobble).toBeGreaterThan(0.15)
  })

  it('calls a note weak when it never reaches the level you normally play at', () => {
    // Held perfectly, in tune, and far too quiet for this player.
    const report = analyseBreath(steady(30, 0.05), { reference: 0.2 })
    expect(report.verdict).toBe('weak')
  })

  it('leaves a quiet note alone when there is no baseline to compare it to', () => {
    // Without calibration, quiet may just mean sitting further from the
    // microphone. Guessing here would nag the wrong people.
    expect(analyseBreath(steady(30, 0.05)).verdict).toBe('steady')
  })

  it('measures how much of the opening level survives to the end', () => {
    const report = analyseBreath(ramp(30, { level: 0.2, cents: 0 }, { level: 0.1, cents: 0 }))
    expect(report.sustain).toBeGreaterThan(0.4)
    expect(report.sustain).toBeLessThan(0.75)
  })

  it('has no opinion on tuning when no pitch was ever found', () => {
    const report = analyseBreath(
      Array.from({ length: 30 }, () => ({ level: 0.2, cents: null })),
    )
    expect(report.drift).toBeNull()
    expect(report.verdict).toBe('steady')
  })

  it('reports average clarity when the detector supplied it', () => {
    const frames = steady(30).map((f) => ({ ...f, clarity: 0.9 }))
    expect(analyseBreath(frames).clarity).toBeCloseTo(0.9, 2)
    expect(analyseBreath(steady(30)).clarity).toBeNull()
  })

  it('survives an empty note without dividing by zero', () => {
    const report = analyseBreath([])
    expect(report.verdict).toBe('unknown')
    expect(report.level).toBe(0)
    expect(Number.isFinite(report.sustain)).toBe(true)
    expect(Number.isFinite(report.wobble)).toBe(true)
  })

  it('lets the thresholds be tightened', () => {
    const gentle = ramp(30, { level: 0.2, cents: 0 }, { level: 0.16, cents: 0 })
    expect(analyseBreath(gentle).verdict).toBe('steady')
    expect(analyseBreath(gentle, { sustainFloor: 0.95 }).verdict).toBe('fading')
  })
})

describe('breathBaseline', () => {
  it('takes the middle of your notes, not the average', () => {
    // One note blown twice as hard as usual should not move the baseline.
    expect(breathBaseline([0.2, 0.21, 0.19, 0.2, 0.8])).toBeCloseTo(0.2, 2)
  })

  it('has no baseline until there is something to measure', () => {
    expect(breathBaseline([])).toBeNull()
  })

  it('ignores silence, which is not a note you played', () => {
    expect(breathBaseline([0, 0, 0.2, 0.2, 0.2])).toBeCloseTo(0.2, 2)
  })
})
