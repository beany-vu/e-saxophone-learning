import { describe, it, expect } from 'vitest'
import { describeRanges, drillFrom, drillLength, drillRanges } from '@/lib/weakspots'

describe('what to drill', () => {
  it('takes a note with the note either side, because the approach is the hard part', () => {
    expect(drillRanges([5], 20)).toEqual([{ start: 4, end: 6 }])
  })

  it('merges misses that would otherwise be three drills of the same bar', () => {
    expect(drillRanges([5, 6, 7], 20)).toEqual([{ start: 4, end: 8 }])
  })

  it('joins two stretches that only just touch', () => {
    // 3 widens to 2-4 and 6 widens to 5-7: adjacent, so one drill with a seam.
    expect(drillRanges([3, 6], 20)).toEqual([{ start: 2, end: 7 }])
  })

  it('keeps stretches apart when there is real music between them', () => {
    expect(drillRanges([2, 12], 20)).toEqual([
      { start: 1, end: 3 },
      { start: 11, end: 13 },
    ])
  })

  it('does not run off either end of the line', () => {
    expect(drillRanges([0], 4)).toEqual([{ start: 0, end: 1 }])
    expect(drillRanges([3], 4)).toEqual([{ start: 2, end: 3 }])
  })

  it('ignores a position that is not in the line at all', () => {
    expect(drillRanges([-2, 99], 8)).toEqual([])
  })

  it('counts the same miss once, however often it was fluffed', () => {
    expect(drillRanges([5, 5, 5], 20)).toEqual([{ start: 4, end: 6 }])
  })

  it('has nothing to drill when nothing went wrong', () => {
    expect(drillRanges([], 20)).toEqual([])
    expect(drillLength([])).toBe(0)
  })

  it('takes a wider run when asked, for a passage rather than a note', () => {
    expect(drillRanges([5], 20, 3)).toEqual([{ start: 2, end: 8 }])
  })
})

describe('the drill itself', () => {
  const segment = {
    notes: [60, 62, 64, 65, 67, 69, 71, 72],
    beats: [1, 1, 2, 1, 1, 1, 1, 2],
    lyrics: ['do', 're', 'mi', 'fa', 'so', 'la', 'ti', 'do'],
  }

  it('lays the stretches end to end, keeping the order of the piece', () => {
    const drill = drillFrom(segment, [
      { start: 1, end: 2 },
      { start: 5, end: 6 },
    ])
    expect(drill.notes).toEqual([62, 64, 69, 71])
    expect(drill.positions).toEqual([1, 2, 5, 6])
  })

  it('carries each note’s own length and word with it', () => {
    const drill = drillFrom(segment, [{ start: 1, end: 2 }])
    expect(drill.beats).toEqual([1, 2])
    expect(drill.lyrics).toEqual(['re', 'mi'])
  })

  it('leaves lengths undefined when the piece has none, rather than inventing them', () => {
    const drill = drillFrom({ notes: [60, 62, 64] }, [{ start: 0, end: 1 }])
    expect(drill.beats).toBeUndefined()
  })

  it('counts how much there is to play', () => {
    expect(drillLength([{ start: 4, end: 8 }])).toBe(5)
  })
})

describe('telling someone what went wrong', () => {
  it('counts from one, because nobody counts their own playing from zero', () => {
    expect(describeRanges([{ start: 0, end: 0 }])).toEqual(['1'])
  })

  it('writes a stretch as a range', () => {
    expect(
      describeRanges([
        { start: 3, end: 5 },
        { start: 10, end: 10 },
      ]),
    ).toEqual(['4-6', '11'])
  })
})
