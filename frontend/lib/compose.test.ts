import { describe, it, expect } from 'vitest'
import {
  DURATIONS,
  dotted,
  toBars,
  totalBeats,
  toMelody,
  TIME_SIGNATURES,
  durationLabel,
} from '@/lib/compose'

const q = 1 // a quarter note is one beat in every time signature we offer

describe('durations', () => {
  it('offers the note lengths a beginner needs, longest first', () => {
    expect(DURATIONS.map((d) => d.beats)).toEqual([4, 2, 1, 0.5, 0.25])
  })

  it('a dot adds half the length again, which is what a dot means', () => {
    expect(dotted(2)).toBe(3)
    expect(dotted(1)).toBe(1.5)
    expect(dotted(0.5)).toBe(0.75)
  })

  it('names a length so it can be read back', () => {
    expect(durationLabel(1)).toBe('quarter')
    expect(durationLabel(1.5)).toBe('dotted quarter')
    expect(durationLabel(3)).toBe('dotted half')
    expect(durationLabel(0.25)).toBe('sixteenth')
  })
})

describe('time signatures', () => {
  it('offers 2/4, 3/4 and 4/4', () => {
    expect(TIME_SIGNATURES.map((t) => t.label)).toEqual(['2/4', '3/4', '4/4'])
  })

  it('says how many beats fit in a bar', () => {
    expect(TIME_SIGNATURES.map((t) => t.beatsPerBar)).toEqual([2, 3, 4])
  })
})

describe('toBars', () => {
  const notes = [
    { midi: 72, beats: q },
    { midi: 74, beats: q },
    { midi: 76, beats: q },
    { midi: 77, beats: q },
    { midi: 79, beats: q },
  ]

  it('fills bars to the beat count and starts a new one', () => {
    const { bars } = toBars(notes, 4)
    expect(bars).toHaveLength(2)
    expect(bars[0]).toHaveLength(4)
    expect(bars[1]).toHaveLength(1)
  })

  it('splits differently in three four', () => {
    const { bars } = toBars(notes, 3)
    expect(bars.map((b) => b.length)).toEqual([3, 2])
  })

  it('keeps a note that runs past the bar line in the bar it starts in', () => {
    // Three beats then two in a four beat bar: the second note starts inside
    // bar one, so that is where it stays, and the bar is flagged rather than
    // the note being moved or split.
    const { bars, overfull } = toBars([{ midi: 72, beats: 3 }, { midi: 74, beats: 2 }], 4)
    expect(bars.map((b) => b.length)).toEqual([2])
    expect(overfull).toEqual([1])
  })

  it('starts a new bar once the current one is exactly full', () => {
    const { bars, overfull } = toBars([{ midi: 72, beats: 4 }, { midi: 74, beats: 1 }], 4)
    expect(bars.map((b) => b.length)).toEqual([1, 1])
    expect(overfull).toEqual([])
  })

  it('reports the bars that hold more than they should', () => {
    // A dotted half plus a half is five beats in a four beat bar.
    const { overfull } = toBars([{ midi: 72, beats: 3 }, { midi: 74, beats: 2 }], 4)
    expect(overfull).toEqual([1])
  })

  it('is happy with an empty piece', () => {
    expect(toBars([], 4)).toEqual({ bars: [], overfull: [] })
  })

  it('reports no overfull bar when everything fits', () => {
    expect(toBars(notes, 4).overfull).toEqual([])
  })
})

describe('totalBeats', () => {
  it('adds the lengths up', () => {
    expect(totalBeats([{ midi: 72, beats: 1.5 }, { midi: 74, beats: 0.5 }])).toBe(2)
  })

  it('is zero for nothing', () => {
    expect(totalBeats([])).toBe(0)
  })
})

describe('toMelody', () => {
  const notes = [
    { midi: 72, beats: 2 },
    { midi: 74, beats: 2 },
    { midi: 76, beats: 4 },
  ]

  it('turns a composition into something the trainer can use', () => {
    const item = toMelody('My tune', notes, 4)
    expect(item.notes).toEqual([72, 74, 76])
    expect(item.beats).toEqual([2, 2, 4])
    expect(item.title).toBe('My tune')
  })

  it('makes one phrase per bar, so a bar can be drilled on its own', () => {
    const item = toMelody('My tune', notes, 4)
    expect(item.phrases).toEqual([
      { label: 'Bar 1', start: 0, end: 2 },
      { label: 'Bar 2', start: 2, end: 3 },
    ])
  })

  it('covers every note exactly once, like the built in material', () => {
    const item = toMelody('My tune', notes, 4)
    let expected = 0
    item.phrases!.forEach((p) => {
      expect(p.start).toBe(expected)
      expected = p.end
    })
    expect(expected).toBe(item.notes.length)
  })
})
