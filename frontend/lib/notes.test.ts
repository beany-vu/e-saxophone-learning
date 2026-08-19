import { describe, expect, it } from 'vitest'
import { parseMelody } from '@/lib/curriculum'
import {
  buildScale,
  formatDuration,
  fromConcert,
  isBlackKey,
  noteName,
  pitchClassName,
  SCALES,
  VOICES,
  toConcert,
  yamahaName,
  solfegeName,
  nameNote,
} from './notes'

describe('noteName', () => {
  it('names middle C', () => {
    expect(noteName(60)).toBe('C4')
  })

  it('names the sax range boundaries', () => {
    expect(noteName(58)).toBe('Bb3') // low Bb, written: the key on the horn says Bb
    expect(noteName(90)).toBe('F#6') // top of the range
  })

  it('rolls the octave at B to C', () => {
    expect(noteName(71)).toBe('B4')
    expect(noteName(72)).toBe('C5')
  })
})

describe('pitchClassName', () => {
  it('drops the octave', () => {
    expect(pitchClassName(60)).toBe('C')
    expect(pitchClassName(72)).toBe('C')
  })
})

describe('isBlackKey', () => {
  it('knows the five black keys of an octave', () => {
    const blacks = [61, 63, 66, 68, 70].map(isBlackKey)
    expect(blacks).toEqual([true, true, true, true, true])
  })

  it('knows the seven white keys', () => {
    const whites = [60, 62, 64, 65, 67, 69, 71].map(isBlackKey)
    expect(whites.every((b) => b === false)).toBe(true)
  })

  it('holds across octaves', () => {
    expect(isBlackKey(61)).toBe(isBlackKey(73))
  })
})

describe('toConcert', () => {
  it('drops an alto sax note by a major sixth', () => {
    // Written C4 on an alto sounds Eb3 concert.
    expect(noteName(toConcert(60))).toBe('Eb3')
  })
})

describe('buildScale', () => {
  it('builds an ascending C major from middle C', () => {
    expect(buildScale(60, SCALES.Major, false)).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })

  it('goes up then back down without repeating the top note', () => {
    const s = buildScale(60, SCALES.Major)
    expect(s[0]).toBe(60)
    expect(s[s.length - 1]).toBe(60)
    expect(s.length).toBe(15)
    expect(s.filter((n) => n === 72).length).toBe(1)
  })

  it('transposes with the root', () => {
    expect(buildScale(62, SCALES.Major, false)).toEqual([62, 64, 66, 67, 69, 71, 73, 74])
  })

  it('gives the blues scale its flat five', () => {
    expect(buildScale(60, SCALES.Blues, false)).toEqual([60, 63, 65, 66, 67, 70, 72])
  })
})

describe('formatDuration', () => {
  it('pads seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('handles zero and long sessions', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(3725)).toBe('62:05')
  })
})

describe('fromConcert', () => {
  it('is the exact inverse of toConcert', () => {
    for (const midi of [60, 69, 72, 81]) {
      expect(fromConcert(toConcert(midi))).toBe(midi)
    }
  })

  it('turns a sounding C into the D the player is fingering', () => {
    // Alto sax: finger a written A4 (69), a concert C4 (60) comes out.
    expect(fromConcert(60)).toBe(69)
  })
})

describe('voice transposition', () => {
  // Straight from the YDS-120 voice list, page 19 of the manual.
  it('matches the transposition the manual prints for each voice group', () => {
    expect(VOICES.map((v) => [v.id, v.semitones])).toEqual([
      ['alto', -9],
      ['soprano', -2],
      ['tenor', -14],
      ['baritone', -21],
      ['c', 0],
    ])
  })

  it('converts with the selected voice, not always the alto', () => {
    // Written C#5 (73) is the no-keys fingering on any saxophone.
    expect(toConcert(73, -9)).toBe(64) // alto: sounds E4
    expect(toConcert(73, -2)).toBe(71) // soprano: sounds B4
    expect(toConcert(73, -14)).toBe(59) // tenor: sounds B3
    expect(toConcert(73, -21)).toBe(52) // baritone: sounds E3
    expect(toConcert(73, 0)).toBe(73) // a C instrument sounds what is written
  })

  it('round trips for every voice', () => {
    VOICES.forEach((v) => {
      expect(fromConcert(toConcert(73, v.semitones), v.semitones)).toBe(73)
    })
  })

  it('still defaults to the alto, which is what the YDS-120 powers up as', () => {
    expect(toConcert(73)).toBe(64)
    expect(fromConcert(64)).toBe(73)
  })
})

describe('octave naming conventions', () => {
  // MIDI 60 is called C4 in scientific pitch notation, which is what the MIDI
  // standard and this app use. Yamaha instruments and most YDS tutorials call
  // the same note C3. Same note, label an octave apart.
  it('names middle C the scientific way by default', () => {
    expect(noteName(60)).toBe('C4')
  })

  it('names the same note the Yamaha way on request', () => {
    expect(yamahaName(60)).toBe('C3')
    expect(yamahaName(73)).toBe('C#4')
  })

  it('differs from the scientific name by exactly one octave, never more', () => {
    for (let n = 24; n <= 108; n++) {
      const scientific = Number(noteName(n).replace(/[^-\d]/g, ''))
      const yamaha = Number(yamahaName(n).replace(/[^-\d]/g, ''))
      expect(yamaha, `${n}`).toBe(scientific - 1)
    }
  })

  it('agrees on the letter, only the number moves', () => {
    for (let n = 55; n <= 91; n++) {
      expect(yamahaName(n).replace(/[-\d]/g, '')).toBe(noteName(n).replace(/[-\d]/g, ''))
    }
  })
})

describe('how black notes are spelled', () => {
  // The instrument labels its own keys Bb, Eb, G#, C# and F#, and so does the
  // manual's fingering chart. The app matches that rather than printing A# and
  // D# where the horn says Bb and Eb.
  it('uses the spelling written on the instrument', () => {
    expect(noteName(70)).toBe('Bb4')
    expect(noteName(63)).toBe('Eb4')
    expect(noteName(68)).toBe('G#4')
    expect(noteName(73)).toBe('C#5')
    expect(noteName(66)).toBe('F#4')
  })

  it('never prints A# or D#, which no key on the horn is called', () => {
    for (let n = 55; n <= 91; n++) {
      expect(noteName(n), `${n}`).not.toMatch(/^(A#|D#)/)
    }
  })

  it('still reads both spellings when a melody is typed in', () => {
    expect(parseMelody('Bb4 A#4 Eb5 D#5').notes).toEqual([70, 70, 75, 75])
  })
})

describe('solfege names', () => {
  it('names the natural notes the way solfege does', () => {
    expect(solfegeName(60)).toBe('do4')
    expect(solfegeName(62)).toBe('re4')
    expect(solfegeName(64)).toBe('mi4')
    expect(solfegeName(65)).toBe('fa4')
    expect(solfegeName(67)).toBe('sol4')
    expect(solfegeName(69)).toBe('la4')
    expect(solfegeName(71)).toBe('si4')
  })

  it('keeps the same flats and sharps the instrument uses', () => {
    expect(solfegeName(70)).toBe('sib4') // Bb, not la#
    expect(solfegeName(63)).toBe('mib4') // Eb
    expect(solfegeName(73)).toBe('do#5')
    expect(solfegeName(66)).toBe('fa#4')
  })

  it('keeps the octave number, so the two namings line up', () => {
    for (let midi = 55; midi <= 91; midi++) {
      const octave = (name: string) => name.replace(/[^-\d]/g, '')
      expect(octave(solfegeName(midi))).toBe(octave(noteName(midi)))
    }
  })

  it('is the same note under a different name, never a different note', () => {
    for (let midi = 55; midi <= 91; midi++) {
      expect(new Set([solfegeName(midi)]).size).toBe(1)
      expect(solfegeName(midi)).not.toBe(noteName(midi))
    }
  })
})

describe('nameNote', () => {
  it('picks the naming asked for', () => {
    expect(nameNote(67, 'letters')).toBe('G4')
    expect(nameNote(67, 'solfege')).toBe('sol4')
  })

  it('defaults to letters, which is what the fingering chart uses', () => {
    expect(nameNote(67)).toBe('G4')
  })
})
