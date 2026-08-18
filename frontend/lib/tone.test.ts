import { describe, it, expect } from 'vitest'
import { midiToFreq, scheduleMelody } from '@/lib/tone'

describe('midiToFreq', () => {
  it('puts A4 at 440', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5)
  })

  it('doubles every octave', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 5)
    expect(midiToFreq(57)).toBeCloseTo(220, 5)
  })

  it('matches the concert pitch of a written note on an alto', () => {
    // Written C#5 (73) sounds concert E4 (64), 329.63 Hz.
    expect(midiToFreq(64)).toBeCloseTo(329.63, 1)
  })
})

describe('scheduleMelody', () => {
  const notes = [72, 74, 76]

  it('plays the notes in order, each starting after the last', () => {
    const plan = scheduleMelody(notes, undefined, { bpm: 60 })
    expect(plan.map((p) => p.midi)).toEqual(notes)
    expect(plan[0].start).toBe(0)
    expect(plan[1].start).toBeGreaterThan(plan[0].start)
    expect(plan[2].start).toBeGreaterThan(plan[1].start)
  })

  it('gives every note one beat when no rhythm is provided', () => {
    const plan = scheduleMelody(notes, undefined, { bpm: 60 })
    expect(plan[1].start).toBeCloseTo(1, 5) // 60 bpm, one beat is one second
    expect(plan[2].start).toBeCloseTo(2, 5)
  })

  it('follows the given rhythm', () => {
    const plan = scheduleMelody(notes, [2, 0.5, 1], { bpm: 60 })
    expect(plan[1].start).toBeCloseTo(2, 5)
    expect(plan[2].start).toBeCloseTo(2.5, 5)
  })

  it('goes twice as fast at twice the tempo', () => {
    const slow = scheduleMelody(notes, undefined, { bpm: 60 })
    const fast = scheduleMelody(notes, undefined, { bpm: 120 })
    expect(fast[2].start).toBeCloseTo(slow[2].start / 2, 5)
  })

  it('leaves a gap between notes so a repeated note is heard twice', () => {
    const plan = scheduleMelody([72, 72], undefined, { bpm: 60 })
    expect(plan[0].duration).toBeLessThan(1)
    expect(plan[0].start + plan[0].duration).toBeLessThanOrEqual(plan[1].start)
  })

  it('transposes when asked, for hearing what the instrument will sound', () => {
    const plan = scheduleMelody([73], undefined, { bpm: 60, transpose: -9 })
    expect(plan[0].midi).toBe(64)
  })

  it('reports how long the whole thing lasts', () => {
    const plan = scheduleMelody(notes, [1, 1, 2], { bpm: 60 })
    const last = plan[plan.length - 1]
    expect(last.start + last.duration).toBeLessThanOrEqual(4)
    expect(last.start).toBeCloseTo(2, 5)
  })

  it('copes with an empty melody instead of throwing', () => {
    expect(scheduleMelody([], undefined, { bpm: 90 })).toEqual([])
  })

  it('ignores a rhythm of the wrong length rather than mis-timing the tune', () => {
    const plan = scheduleMelody(notes, [1, 2], { bpm: 60 })
    expect(plan[1].start).toBeCloseTo(1, 5)
  })
})
