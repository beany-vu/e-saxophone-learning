import { describe, it, expect } from 'vitest'
import {
  ON_TIME_BEATS,
  barFraction,
  classifyTiming,
  msPerBeat,
  onsets,
  overdue,
  totalBeats,
} from '@/lib/playhead'

describe('where each note falls in the bar', () => {
  it('starts the first note at zero and stacks the rest by length', () => {
    expect(onsets([1, 1, 2, 1])).toEqual([0, 1, 2, 4])
  })

  it('adds up to the length of the whole line', () => {
    expect(totalBeats([1, 1, 2, 1])).toBe(5)
  })

  it('treats a missing or zero length as one beat, rather than stacking notes on top of each other', () => {
    expect(onsets([1, 0, 1])).toEqual([0, 1, 2])
    expect(onsets(undefined)).toEqual([])
  })
})

describe('how early or late a note was', () => {
  it('counts anything within half a beat as on time', () => {
    expect(classifyTiming(0)).toBe('onTime')
    expect(classifyTiming(0.49)).toBe('onTime')
    expect(classifyTiming(-0.49)).toBe('onTime')
  })

  it('calls the rest early or late', () => {
    expect(classifyTiming(-0.8)).toBe('early')
    expect(classifyTiming(0.8)).toBe('late')
  })

  it('takes a stricter window when asked', () => {
    expect(classifyTiming(0.4, 0.25)).toBe('late')
  })

  it('has a window generous enough for a note that takes a moment to speak', () => {
    // Half a beat at 60bpm is 500ms. Low notes on a wind instrument need it.
    expect(ON_TIME_BEATS).toBeGreaterThanOrEqual(0.5)
  })
})

describe('when the bar has waited long enough', () => {
  it('is not overdue while the note is still due', () => {
    expect(overdue(1.2, 1)).toBe(false)
    expect(overdue(1.49, 1)).toBe(false)
  })

  it('is overdue once the window has closed', () => {
    expect(overdue(1.6, 1)).toBe(true)
  })
})

describe('where to draw the bar', () => {
  const beats = [1, 1, 2, 1]
  const starts = onsets(beats)

  it('sits at the left edge before anything has been played', () => {
    expect(barFraction(0, starts, beats)).toBe(0)
  })

  // The cards are all the same width whatever a note is worth, so the bar
  // crosses each one in the time that note lasts rather than at a constant
  // speed. A half note takes twice as long to cross as a quarter.
  it('crosses each card in that note’s own time', () => {
    expect(barFraction(0.5, starts, beats)).toBeCloseTo(0.125) // half of card 1 of 4
    expect(barFraction(1, starts, beats)).toBeCloseTo(0.25)
    expect(barFraction(3, starts, beats)).toBeCloseTo(0.625) // halfway through the 2 beat note
  })

  it('stops at the right edge instead of running off the end', () => {
    expect(barFraction(99, starts, beats)).toBe(1)
  })

  it('never goes backwards from a negative clock', () => {
    expect(barFraction(-5, starts, beats)).toBe(0)
  })
})

describe('the tempo', () => {
  it('turns beats per minute into milliseconds per beat', () => {
    expect(msPerBeat(60)).toBe(1000)
    expect(msPerBeat(120)).toBe(500)
  })

  it('refuses a tempo of zero rather than dividing by it', () => {
    expect(Number.isFinite(msPerBeat(0))).toBe(true)
  })
})
