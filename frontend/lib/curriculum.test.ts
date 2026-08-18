import { describe, it, expect } from 'vitest'
import {
  WARMUPS,
  SONGS,
  ALL_ITEMS,
  parseMelody,
  formatMelody,
  itemRange,
  phraseNotes,
  parseMelodyScript,
  fitToRange,
  parseNumbers,
} from '@/lib/curriculum'
import { fingeringFor, FINGERING_LOW, FINGERING_HIGH } from '@/lib/fingerings'
import { noteName } from '@/lib/notes'

describe('the built in material', () => {
  it('has warm-ups and songs, each with a unique id', () => {
    expect(WARMUPS.length).toBeGreaterThan(3)
    expect(SONGS.length).toBeGreaterThan(3)
    const ids = ALL_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only uses notes the player can actually finger', () => {
    ALL_ITEMS.forEach((item) => {
      item.notes.forEach((n) => {
        expect(n, `${item.title} uses ${noteName(n)}`).toBeGreaterThanOrEqual(FINGERING_LOW)
        expect(n, `${item.title} uses ${noteName(n)}`).toBeLessThanOrEqual(FINGERING_HIGH)
        expect(fingeringFor(n), `${item.title} uses ${noteName(n)}`).not.toBeNull()
      })
    })
  })

  it('gives every item something to play and something to read', () => {
    ALL_ITEMS.forEach((item) => {
      expect(item.notes.length, item.title).toBeGreaterThan(3)
      expect(item.about.length, item.title).toBeGreaterThan(10)
    })
  })

  it('keeps beat counts lined up with the notes when they are given', () => {
    ALL_ITEMS.forEach((item) => {
      if (item.beats) expect(item.beats.length, item.title).toBe(item.notes.length)
    })
  })

  it('orders the levels so the easiest material comes first', () => {
    const levels = WARMUPS.map((w) => w.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('reports the range an item spans', () => {
    expect(itemRange({ notes: [67, 72, 64] } as never)).toEqual({ low: 64, high: 72 })
  })
})

describe('parseMelody', () => {
  it('reads plain note names', () => {
    expect(parseMelody('C5 D5 E5').notes).toEqual([72, 74, 76])
  })

  it('accepts sharps and flats, and treats them as the same note', () => {
    expect(parseMelody('C#5 Db5').notes).toEqual([73, 73])
    expect(parseMelody('Bb4 A#4').notes).toEqual([70, 70])
  })

  it('is not fussy about separators or case', () => {
    expect(parseMelody('c5, d5 | e5\nf5').notes).toEqual([72, 74, 76, 77])
  })

  it('reports what it could not read instead of silently dropping it', () => {
    const out = parseMelody('C5 H5 D5')
    expect(out.notes).toEqual([72, 74])
    expect(out.errors).toEqual(['H5'])
  })

  it('rejects notes outside the range the instrument can play', () => {
    const out = parseMelody('C5 C1 C9')
    expect(out.notes).toEqual([72])
    expect(out.errors).toEqual(['C1', 'C9'])
  })

  it('round trips through formatMelody', () => {
    const text = 'G4 A4 B4 C5 D5'
    expect(formatMelody(parseMelody(text).notes)).toBe(text)
  })

  it('gives nothing back for an empty string', () => {
    expect(parseMelody('   ').notes).toEqual([])
    expect(parseMelody('   ').errors).toEqual([])
  })
})

describe('phrases and lyrics', () => {
  it('splits every item into phrases', () => {
    ALL_ITEMS.forEach((item) => {
      expect(item.phrases?.length, item.title).toBeGreaterThan(0)
    })
  })

  it('covers every note exactly once, in order, with no gaps', () => {
    ALL_ITEMS.forEach((item) => {
      let expected = 0
      item.phrases!.forEach((p) => {
        expect(p.start, `${item.title}: ${p.label}`).toBe(expected)
        expect(p.end).toBeGreaterThan(p.start)
        expected = p.end
      })
      expect(expected, `${item.title} phrases must reach the end`).toBe(item.notes.length)
    })
  })

  it('gives every phrase a name worth reading', () => {
    ALL_ITEMS.forEach((item) => {
      item.phrases!.forEach((p) => expect(p.label.length, item.title).toBeGreaterThan(2))
    })
  })

  it('lines lyrics up one syllable per note, wherever there are lyrics', () => {
    ALL_ITEMS.forEach((item) => {
      if (item.lyrics) expect(item.lyrics.length, item.title).toBe(item.notes.length)
    })
  })

  it('gives the songs everybody sings their words', () => {
    const withWords = SONGS.filter((s) => s.lyrics)
    expect(withWords.map((s) => s.id)).toContain('happy-birthday')
    expect(withWords.map((s) => s.id)).toContain('twinkle')
  })

  it('starts Happy Birthday on the right syllables', () => {
    const hb = SONGS.find((s) => s.id === 'happy-birthday')!
    expect(hb.lyrics!.slice(0, 6)).toEqual(['Hap', 'py', 'birth', 'day', 'to', 'you'])
  })
})

describe('phraseNotes', () => {
  it('returns just that phrase', () => {
    const twinkle = SONGS.find((s) => s.id === 'twinkle')!
    const second = phraseNotes(twinkle, 1)
    expect(second.notes).toEqual(twinkle.notes.slice(twinkle.phrases![1].start))
    expect(second.notes.length).toBeLessThan(twinkle.notes.length)
  })

  it('returns the whole item when no phrase is chosen', () => {
    const twinkle = SONGS.find((s) => s.id === 'twinkle')!
    expect(phraseNotes(twinkle, null).notes).toEqual(twinkle.notes)
  })

  it('slices the rhythm and the words to match', () => {
    const hb = SONGS.find((s) => s.id === 'happy-birthday')!
    const third = phraseNotes(hb, 2)
    expect(third.beats?.length).toBe(third.notes.length)
    expect(third.lyrics?.length).toBe(third.notes.length)
  })
})

describe('parseMelodyScript', () => {
  it('makes one phrase per line', () => {
    const out = parseMelodyScript('C5 D5\nE5 F5')
    expect(out.notes).toEqual([72, 74, 76, 77])
    expect(out.phrases).toEqual([
      { label: 'Line 1', start: 0, end: 2 },
      { label: 'Line 2', start: 2, end: 4 },
    ])
  })

  it('takes a label from the front of a line', () => {
    const out = parseMelodyScript('Chorus: C5 D5\nVerse: E5 F5')
    expect(out.phrases.map((p) => p.label)).toEqual(['Chorus', 'Verse'])
  })

  it('skips blank lines rather than making empty phrases', () => {
    const out = parseMelodyScript('C5 D5\n\n   \nE5')
    expect(out.phrases).toHaveLength(2)
  })

  it('converts concert pitch to what you finger, when asked', () => {
    // Concert C4 (60) is fingered A4 (69) on an alto.
    expect(parseMelodyScript('C4', 9).notes).toEqual([69])
  })

  it('range checks after converting, not before', () => {
    // Concert G3 (55) is below the range, but fingered E4 (64) is not.
    expect(parseMelodyScript('G3', 9).notes).toEqual([64])
    expect(parseMelodyScript('G3', 0).errors).toEqual(['G3'])
  })

  it('collects every unreadable token across all the lines', () => {
    const out = parseMelodyScript('C5 zz\nD5 qq')
    expect(out.errors).toEqual(['zz', 'qq'])
    expect(out.notes).toEqual([72, 74])
  })
})

describe('notes typed without octave numbers', () => {
  it('reads a bare letter as a note near the one before it', () => {
    // Reading off sheet music you get letters, not octave numbers.
    expect(parseMelody('C D E F G').notes).toEqual([72, 74, 76, 77, 79])
  })

  it('places each note at whichever octave is nearest the one before', () => {
    // From C5 (72), A is nearer below at A4 (69) than above at A5 (81).
    expect(parseMelody('C5 A').notes).toEqual([72, 69])
    // From G5 (79), C is nearer above at C6 (84) than below at C5 (72).
    expect(parseMelody('G5 C').notes).toEqual([79, 84])
  })

  it('accepts sharps and flats without octaves', () => {
    expect(parseMelody('C F# Bb').notes).toEqual([72, 78, 82])
  })

  it('lets an explicit octave reset where the line sits', () => {
    expect(parseMelody('C D G4 A').notes).toEqual([72, 74, 67, 69])
  })

  it('still reads fully written notes exactly as before', () => {
    expect(parseMelody('G4 A4 B4 C5 D5').notes).toEqual([67, 69, 71, 72, 74])
  })
})

describe('fitToRange', () => {
  it('leaves a melody that already fits alone', () => {
    expect(fitToRange([67, 72, 79])).toEqual({ notes: [67, 72, 79], octaves: 0 })
  })

  it('lifts a melody that sits below the instrument', () => {
    const out = fitToRange([48, 52, 55]) // an octave and a half too low
    expect(out.octaves).toBeGreaterThan(0)
    out.notes.forEach((n) => expect(n).toBeGreaterThanOrEqual(FINGERING_LOW))
  })

  it('drops a melody that sits above it', () => {
    const out = fitToRange([96, 100, 103])
    expect(out.octaves).toBeLessThan(0)
    out.notes.forEach((n) => expect(n).toBeLessThanOrEqual(FINGERING_HIGH))
  })

  it('keeps the tune intact, moving every note by the same amount', () => {
    const out = fitToRange([48, 52, 55])
    expect(out.notes.map((n) => n - out.octaves * 12)).toEqual([48, 52, 55])
  })

  it('gives up rather than mangling a melody too wide to fit', () => {
    const tooWide = [40, 110]
    expect(fitToRange(tooWide).octaves).toBe(0)
  })

  it('does nothing to an empty melody', () => {
    expect(fitToRange([])).toEqual({ notes: [], octaves: 0 })
  })
})

describe('number notation, as used on kalimba tabs', () => {
  const C5 = 72

  it('reads scale degrees against the chosen key', () => {
    expect(parseNumbers('1 2 3 4 5 6 7', C5).notes).toEqual([72, 74, 76, 77, 79, 81, 83])
  })

  it('follows the major scale, not equal steps', () => {
    // 3 to 4 is a semitone, 4 to 5 is a tone.
    const notes = parseNumbers('3 4 5', C5).notes
    expect(notes[1] - notes[0]).toBe(1)
    expect(notes[2] - notes[1]).toBe(2)
  })

  it("takes an apostrophe as the octave above, the tab's dot over the number", () => {
    // From C4, so the octave above stays inside what the instrument plays.
    expect(parseNumbers("1' 2'", 60).notes).toEqual([72, 74])
    expect(parseNumbers("1''", 60).notes).toEqual([84])
  })

  it('takes a comma as the octave below', () => {
    expect(parseNumbers('1, 5,', C5).notes).toEqual([60, 67])
  })

  it('reads sharps and flats written before the number', () => {
    expect(parseNumbers('#4 b7', C5).notes).toEqual([78, 82])
  })

  it('transposes with the key: the same tab in G', () => {
    expect(parseNumbers('1 2 3', 79).notes).toEqual([79, 81, 83])
  })

  it('reports what it could not read', () => {
    const out = parseNumbers('1 9 x 3', C5)
    expect(out.notes).toEqual([72, 76])
    expect(out.errors).toEqual(['9', 'x'])
  })

  it('rejects degrees that land outside the instrument', () => {
    expect(parseNumbers("1''''", C5).errors).toHaveLength(1)
  })

  it('works line by line, so a tab keeps its phrases', () => {
    const out = parseMelodyScript('Intro: 1 2 3\nMain: 5 6 5', 0, { numbers: true, tonic: C5 })
    expect(out.notes).toEqual([72, 74, 76, 79, 81, 79])
    expect(out.phrases.map((p) => p.label)).toEqual(['Intro', 'Main'])
  })
})
