import { describe, it, expect } from 'vitest'
import {
  fingeringFor,
  noteForKeys,
  FINGERING_LOW,
  FINGERING_HIGH,
  SAX_KEYS,
} from '@/lib/fingerings'
import { noteName } from '@/lib/notes'

describe('fingeringFor', () => {
  it('knows nothing outside the range it covers', () => {
    expect(fingeringFor(FINGERING_LOW - 1)).toBeNull()
    expect(fingeringFor(FINGERING_HIGH + 1)).toBeNull()
  })

  it('covers every note in its range', () => {
    for (let n = FINGERING_LOW; n <= FINGERING_HIGH; n++) {
      expect(fingeringFor(n), noteName(n)).not.toBeNull()
    }
  })

  it('open C#5 is the no-keys fingering, which is what you get blowing cold', () => {
    expect(fingeringFor(73)?.keys).toEqual([])
  })

  it('D4 is the six finger note', () => {
    expect(fingeringFor(62)?.keys.sort()).toEqual(['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3'].sort())
  })

  it('C5 is one finger, the left middle', () => {
    expect(fingeringFor(72)?.keys).toEqual(['lh2'])
  })

  it('B4 is the left index alone, and A4 adds the middle', () => {
    expect(fingeringFor(71)?.keys).toEqual(['lh1'])
    expect(fingeringFor(69)?.keys).toEqual(['lh1', 'lh2'])
  })

  it('G4 is the whole left hand', () => {
    expect(fingeringFor(67)?.keys).toEqual(['lh1', 'lh2', 'lh3'])
  })

  it('adds the octave key for the second register, keeping the same fingers', () => {
    for (let low = 62; low <= 73; low++) {
      const lower = fingeringFor(low)!
      const upper = fingeringFor(low + 12)!
      expect(upper.keys, noteName(low + 12)).toEqual([...lower.keys, 'oct'])
    }
  })

  it('uses the little finger keys for the notes below D4', () => {
    expect(fingeringFor(61)?.keys).toContain('lowCsharp') // C#4
    expect(fingeringFor(60)?.keys).toContain('lowC') // C4
    expect(fingeringFor(59)?.keys).toContain('lowB') // B3
    expect(fingeringFor(58)?.keys).toContain('lowBb') // Bb3
    expect(fingeringFor(63)?.keys).toContain('lowEb') // Eb4
  })

  it('offers an alternate for the notes that have a well known one', () => {
    expect(fingeringFor(70)?.alternates?.length).toBeGreaterThan(0) // Bb4, bis or side
    expect(fingeringFor(72)?.alternates?.length).toBeGreaterThan(0) // C5, side C
  })

  it('only ever names keys the diagram can draw', () => {
    for (let n = FINGERING_LOW; n <= FINGERING_HIGH; n++) {
      const f = fingeringFor(n)!
      const all = [...f.keys, ...(f.alternates || []).flatMap((a) => a.keys)]
      all.forEach((k) => expect(SAX_KEYS.map((s) => s.id), `${noteName(n)} uses ${k}`).toContain(k))
    }
  })

  it('never presses more keys than there are fingers to press them', () => {
    for (let n = FINGERING_LOW; n <= FINGERING_HIGH; n++) {
      expect(new Set(fingeringFor(n)!.keys).size, noteName(n)).toBe(fingeringFor(n)!.keys.length)
    }
  })
})

describe('noteForKeys, the other direction', () => {
  it('names the note for a set of keys, whatever order they came in', () => {
    expect(noteForKeys(['lh1', 'lh2', 'lh3'])?.written).toBe(67) // G4
    expect(noteForKeys(['lh3', 'lh1', 'lh2'])?.written).toBe(67)
  })

  it('knows that no keys at all is open C#5', () => {
    expect(noteForKeys([])?.written).toBe(73)
  })

  it('knows the octave key raises the same fingering by twelve', () => {
    expect(noteForKeys(['lh1', 'lh2', 'lh3', 'oct'])?.written).toBe(79) // G5
    expect(noteForKeys(['oct'])?.written).toBe(85) // C#6
  })

  it('recognises the alternate fingerings too, and says which one it was', () => {
    const side = noteForKeys(['lh1', 'sideBb'])
    expect(side?.written).toBe(70) // Bb4
    expect(side?.via).toBe('Side Bb')
    expect(noteForKeys(['lh1', 'bis'])?.via).toBeUndefined() // the main one
  })

  it('returns null for a combination that is not a note', () => {
    expect(noteForKeys(['lh1', 'lh3'])).toBeNull() // skipping the middle finger
    expect(noteForKeys(['lowB', 'lowBb', 'gsharp'])).toBeNull()
  })

  it('ignores a duplicated key rather than failing on it', () => {
    expect(noteForKeys(['lh1', 'lh1', 'lh2', 'lh3'])?.written).toBe(67)
  })

  it('round trips every note in the range', () => {
    for (let n = FINGERING_LOW; n <= FINGERING_HIGH; n++) {
      expect(noteForKeys(fingeringFor(n)!.keys)?.written, noteName(n)).toBe(n)
    }
  })
})
