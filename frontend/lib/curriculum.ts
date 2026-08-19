// The practice material: warm-ups and melodies, written in the notes you
// finger. Everything here stays inside the range lib/fingerings.ts can show a
// fingering for, so the trainer can always answer "which key do I press".
//
// The songs are traditional or long out of copyright. Anything else you want
// to practise goes in through the custom melody box, which uses `parseMelody`.

import { INSTRUMENT_HIGH, INSTRUMENT_LOW } from '@/lib/fingerings'
import { NOTE_NAMES, noteName } from '@/lib/notes'

/** One line of a tune: where it starts and stops, and what to call it. */
export type Phrase = { label: string; start: number; end: number }

export type PracticeItem = {
  id: string
  title: string
  kind: 'warmup' | 'song'
  /** 1 easiest. Used for ordering, and shown as dots. */
  level: 1 | 2 | 3
  about: string
  tip?: string
  /** Written MIDI notes, in playing order. */
  notes: number[]
  /** Relative note lengths, when the rhythm is worth showing. */
  beats?: number[]
  /** One syllable per note, where the tune has words everyone knows. */
  lyrics?: string[]
  /** The lines it breaks into, so one can be drilled on its own. */
  phrases?: Phrase[]
}

// Note numbers are easier to check written out: G4 is 67, C5 is 72, C6 is 84.
export const WARMUPS: PracticeItem[] = [
  {
    id: 'first-five',
    title: 'First five notes',
    kind: 'warmup',
    level: 1,
    about:
      'G, A, B, C, D and back down. These five sit under your fingers with no little finger keys and no octave key, which makes them the place to start.',
    tip: 'Aim for the same volume on every note. Wobbling volume is a breath problem, not a finger problem.',
    notes: [67, 69, 71, 72, 74, 74, 72, 71, 69, 67],
    beats: [1, 1, 1, 1, 2, 2, 1, 1, 1, 2],
    phrases: [
      { label: 'Going up', start: 0, end: 5 },
      { label: 'Coming down', start: 5, end: 10 },
    ],
  },
  {
    id: 'long-tones',
    title: 'Long tones',
    kind: 'warmup',
    level: 1,
    about:
      'Hold each note as long as your breath allows, and keep the volume steady from start to finish. The least exciting exercise there is, and the one that changes your sound fastest.',
    tip: 'Watch the loudness meter on the monitor page. A straight line is the goal.',
    notes: [67, 69, 71, 72, 74],
    beats: [8, 8, 8, 8, 8],
    phrases: [{ label: 'All five', start: 0, end: 5 }],
  },
  {
    id: 'reading-five',
    title: 'Reading: the first five',
    kind: 'warmup',
    level: 1,
    about:
      'The same five notes, but out of order, so you have to read each one rather than remember the pattern. Turn on Show music and read the staff, not the letters.',
    tip: 'If you find yourself reciting G A B C D, the exercise has stopped working. Slow down and read.',
    notes: [67, 71, 69, 74, 72, 71, 67, 72, 69, 74],
    phrases: [
      { label: 'First line', start: 0, end: 5 },
      { label: 'Second line', start: 5, end: 10 },
    ],
  },
  {
    id: 'octave-jumps',
    title: 'Octave slurs',
    kind: 'warmup',
    level: 2,
    about:
      'The same fingering with and without the octave key. Your left thumb does all the work, and nothing else should move.',
    tip: 'If the upper note cracks, it is the thumb arriving late, not the breath.',
    notes: [67, 79, 69, 81, 71, 83, 72, 84],
    beats: [2, 2, 2, 2, 2, 2, 2, 2],
    phrases: [
      { label: 'G and A', start: 0, end: 4 },
      { label: 'B and C', start: 4, end: 8 },
    ],
  },
  {
    id: 'chromatic-crawl',
    title: 'Chromatic crawl',
    kind: 'warmup',
    level: 2,
    about:
      'Every semitone from G up to C and back. This is where the bis key, the side keys and the G# key stop being theory.',
    tip: 'Bb has three fingerings. The trainer accepts the note however you produce it.',
    notes: [67, 68, 69, 70, 71, 72, 71, 70, 69, 68, 67],
    phrases: [
      { label: 'Climbing', start: 0, end: 6 },
      { label: 'Descending', start: 6, end: 11 },
    ],
  },
  {
    id: 'f-major',
    title: 'F major, meeting Bb',
    kind: 'warmup',
    level: 2,
    about:
      'The scale that forces you to learn Bb, which is the accidental you will meet most often. Use the bis key inside the scale: it is what it is for.',
    tip: 'Bb has three fingerings. Bis when the scale runs through it, side Bb when you leap to it.',
    notes: [65, 67, 69, 70, 72, 74, 76, 77, 76, 74, 72, 70, 69, 67, 65],
    phrases: [
      { label: 'Going up', start: 0, end: 8 },
      { label: 'Coming down', start: 8, end: 15 },
    ],
  },
  {
    id: 'g-major',
    title: 'G major, meeting F#',
    kind: 'warmup',
    level: 2,
    about:
      'The other accidental you cannot avoid. One sharp, and it sits right where your right hand already is.',
    tip: 'F# is 1 2 3 with the right middle finger. The side F# key exists for awkward corners only.',
    notes: [67, 69, 71, 72, 74, 76, 78, 79, 78, 76, 74, 72, 71, 69, 67],
    phrases: [
      { label: 'Going up', start: 0, end: 8 },
      { label: 'Coming down', start: 8, end: 15 },
    ],
  },
  {
    id: 'rhythm-basics',
    title: 'Rhythm: long, short, shorter',
    kind: 'warmup',
    level: 2,
    about:
      'Three lines with deliberately different note lengths. Press Listen first, clap it, count out loud, then play. The app does not score timing, so this one is on your ears.',
    tip: 'Count out loud, actually out loud. Counting in your head drifts and you will not notice.',
    notes: [72, 74, 76, 77, 76, 74, 72, 72, 74, 76, 77, 79],
    beats: [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 0.5, 0.5, 2],
    phrases: [
      { label: 'Even notes', start: 0, end: 4 },
      { label: 'A held note', start: 4, end: 7 },
      { label: 'Twice as fast', start: 7, end: 12 },
    ],
  },
  {
    id: 'low-register',
    title: 'Down to the bottom',
    kind: 'warmup',
    level: 3,
    about:
      'D, C, B and low Bb, then back up. The low notes need a relaxed throat and a slower air stream, and they are the first thing to fall apart when you tense up.',
    tip: 'If a low note refuses to speak, blow warmer and slower rather than harder.',
    notes: [62, 61, 60, 59, 58, 59, 60, 61, 62],
    phrases: [
      { label: 'Down to low Bb', start: 0, end: 5 },
      { label: 'Back up', start: 5, end: 9 },
    ],
  },
  {
    id: 'c-major-two-octaves',
    title: 'C major, two octaves',
    kind: 'warmup',
    level: 3,
    about:
      'The full scale from C to C and back. Every finger, both hands, and the octave key in the middle of it.',
    tip: 'Slow enough that the notes are even. Speed is a result, not a target.',
    notes: [72, 74, 76, 77, 79, 81, 83, 84, 83, 81, 79, 77, 76, 74, 72],
    phrases: [
      { label: 'Up the scale', start: 0, end: 8 },
      { label: 'Down the scale', start: 8, end: 15 },
    ],
  },
  {
    id: 'd-major',
    title: 'D major, two sharps',
    kind: 'warmup',
    level: 3,
    about:
      'F# and C# in the same scale, low in the horn where the little finger keys live. This is the one that exposes a lazy right hand.',
    notes: [62, 64, 66, 67, 69, 71, 73, 74, 73, 71, 69, 67, 66, 64, 62],
    phrases: [
      { label: 'Going up', start: 0, end: 8 },
      { label: 'Coming down', start: 8, end: 15 },
    ],
  },
  {
    id: 'arpeggios',
    title: 'Arpeggios: C, F and G',
    kind: 'warmup',
    level: 3,
    about:
      'The bones of a chord, played one note at a time. Melodies leap along these shapes constantly, so knowing them under your fingers is what makes a new tune readable.',
    tip: 'Leaps go wrong when fingers move one at a time. Move them together, arriving as one.',
    notes: [72, 76, 79, 84, 79, 76, 72, 65, 69, 72, 77, 72, 69, 65, 67, 71, 74, 79, 74, 71, 67],
    phrases: [
      { label: 'C major', start: 0, end: 7 },
      { label: 'F major', start: 7, end: 14 },
      { label: 'G major', start: 14, end: 21 },
    ],
  },
  {
    id: 'tonguing',
    title: 'Tonguing: same note, separated',
    kind: 'warmup',
    level: 3,
    about:
      'Four of each note, separated by the tongue saying "tu" against the reed tip, not by stopping the air. Then play the whole thing slurred and hear the difference.',
    tip: 'The air runs continuously underneath. Your tongue interrupts the sound; your lungs never stop.',
    notes: [72, 72, 72, 72, 74, 74, 74, 74, 76, 76, 76, 76, 74, 72],
    beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    phrases: [
      { label: 'On C', start: 0, end: 4 },
      { label: 'On D', start: 4, end: 8 },
      { label: 'On E', start: 8, end: 12 },
      { label: 'Coming home', start: 12, end: 14 },
    ],
  },
  {
    id: 'long-phrase',
    title: 'One breath, eight notes',
    kind: 'warmup',
    level: 3,
    about:
      'A rising line, held notes, one breath from start to finish. Breath control is what decides where you can phrase in a real tune.',
    tip: 'Breathe in through the corners of your mouth without moving the mouthpiece. Practise the breath, not just the notes.',
    notes: [67, 69, 71, 72, 74, 76, 77, 79],
    beats: [2, 2, 2, 2, 2, 2, 2, 4],
    phrases: [{ label: 'All in one', start: 0, end: 8 }],
  },
  {
    id: 'awkward-corners',
    title: 'The awkward joins',
    kind: 'warmup',
    level: 3,
    about:
      'The three finger changes that trip everyone: C# to D, G# to A, and Bb to B. Each one moves several fingers at once, and each one is where a tune falls apart.',
    tip: 'Play them until they are boring. Boring is the goal.',
    notes: [73, 74, 73, 74, 68, 69, 68, 69, 70, 71, 70, 71],
    phrases: [
      { label: 'C# to D', start: 0, end: 4 },
      { label: 'G# to A', start: 4, end: 8 },
      { label: 'Bb to B', start: 8, end: 12 },
    ],
  },
  {
    id: 'dynamics',
    title: 'Loud and soft',
    kind: 'warmup',
    level: 3,
    about:
      'Each note held twice: once as loud as you can keep steady, once as soft. The pitch must not move between them, which is the hard part and the whole point.',
    tip: 'Soft playing goes flat and loud playing goes sharp. Watch a tuner while you do this.',
    notes: [72, 74, 76, 77, 79],
    beats: [8, 8, 8, 8, 8],
    phrases: [{ label: 'Five notes, twice each', start: 0, end: 5 }],
  },
]

export const SONGS: PracticeItem[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    kind: 'song',
    level: 1,
    about:
      'Traditional. Two notes at a time, no accidentals, and the shape is already in your head, which is what makes it a good first tune.',
    notes: [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    // prettier-ignore
    lyrics: [
      'Twin', 'kle', 'twin', 'kle', 'lit', 'tle', 'star',
      'How', 'I', 'won', 'der', 'what', 'you', 'are',
    ],
    phrases: [
      { label: 'Twinkle twinkle little star', start: 0, end: 7 },
      { label: 'How I wonder what you are', start: 7, end: 14 },
    ],
  },
  {
    id: 'happy-birthday',
    title: 'Happy Birthday',
    kind: 'song',
    level: 1,
    about:
      'Traditional, and in the public domain since 2016. Worth having by memory, because it is the one tune you will actually be asked to play.',
    tip: 'The third line jumps a full octave. Get the thumb ready before you need it.',
    notes: [
      67, 67, 69, 67, 72, 71, 67, 67, 69, 67, 74, 72, 67, 67, 79, 76, 72, 71, 69, 77, 77, 76, 72,
      74, 72,
    ],
    beats: [
      0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 1, 2, 0.75, 0.25, 1, 1,
      1, 2,
    ],
    // prettier-ignore
    lyrics: [
      'Hap', 'py', 'birth', 'day', 'to', 'you',
      'Hap', 'py', 'birth', 'day', 'to', 'you',
      'Hap', 'py', 'birth', 'day', 'dear', 'na', 'me',
      'Hap', 'py', 'birth', 'day', 'to', 'you',
    ],
    phrases: [
      { label: 'Happy birthday to you', start: 0, end: 6 },
      { label: 'Happy birthday to you (again)', start: 6, end: 12 },
      { label: 'Happy birthday dear ...', start: 12, end: 19 },
      { label: 'Happy birthday to you (last)', start: 19, end: 25 },
    ],
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    kind: 'song',
    level: 1,
    about:
      'Beethoven, 1824. Steps only, no leaps at all, so it is really a scale exercise wearing a disguise.',
    notes: [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74],
    beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2],
    phrases: [
      { label: 'First line, rising', start: 0, end: 8 },
      { label: 'Second line, the answer', start: 8, end: 15 },
    ],
  },
  {
    id: 'frere-jacques',
    title: 'Frere Jacques',
    kind: 'song',
    level: 2,
    about:
      'Traditional. Four short phrases, each repeated, so you get a second attempt at every one immediately.',
    notes: [
      72, 74, 76, 72, 72, 74, 76, 72, 76, 77, 79, 76, 77, 79, 79, 81, 79, 77, 76, 72, 79, 81, 79,
      77, 76, 72, 72, 67, 72, 72, 67, 72,
    ],
    beats: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1,
      1, 1, 2, 1, 1, 2,
    ],
    // prettier-ignore
    lyrics: [
      'Fre', 're', 'Jac', 'ques', 'Fre', 're', 'Jac', 'ques',
      'Dor', 'mez', 'vous', 'Dor', 'mez', 'vous',
      'Son', 'nez', 'les', 'ma', 'ti', 'nes', 'Son', 'nez', 'les', 'ma', 'ti', 'nes',
      'Din', 'dan', 'don', 'Din', 'dan', 'don',
    ],
    phrases: [
      { label: 'Frere Jacques', start: 0, end: 4 },
      { label: 'Frere Jacques (repeat)', start: 4, end: 8 },
      { label: 'Dormez vous', start: 8, end: 11 },
      { label: 'Dormez vous (repeat)', start: 11, end: 14 },
      { label: 'Sonnez les matines', start: 14, end: 20 },
      { label: 'Sonnez les matines (repeat)', start: 20, end: 26 },
      { label: 'Din dan don', start: 26, end: 29 },
      { label: 'Din dan don (repeat)', start: 29, end: 32 },
    ],
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    kind: 'song',
    level: 2,
    about:
      'Traditional. The tune every sax player learns, and the first one that sounds like a saxophone rather than an exercise.',
    tip: 'Play it too slowly first. It is a march, and rushing is the usual mistake.',
    notes: [
      72, 76, 77, 79, 72, 76, 77, 79, 72, 76, 77, 79, 76, 72, 76, 74, 76, 76, 74, 72, 72, 74, 79,
      79, 77, 76, 77, 79, 76, 72, 74, 72,
    ],
    // prettier-ignore
    lyrics: [
      'Oh', 'when', 'the', 'saints',
      'oh', 'when', 'the', 'saints',
      'oh', 'when', 'the', 'saints', 'go', 'march', 'ing', 'in',
      'oh', 'I', 'want', 'to', 'be', 'in', 'that', 'num', 'ber',
      'when', 'the', 'saints', 'go', 'march', 'ing', 'in',
    ],
    phrases: [
      { label: 'Oh when the saints', start: 0, end: 4 },
      { label: 'Oh when the saints (again)', start: 4, end: 8 },
      { label: 'Oh when the saints go marching in', start: 8, end: 16 },
      { label: 'Oh I want to be in that number', start: 16, end: 32 },
    ],
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    kind: 'song',
    level: 3,
    about:
      'Traditional. Long notes and wide leaps, which makes it a test of breath control rather than of fingers.',
    tip: 'The leap from G up to E is the hard part. Keep the air moving through it.',
    notes: [67, 72, 76, 72, 76, 74, 72, 69, 67, 67, 72, 76, 72, 76, 74, 72],
    // Deliberately no lyrics: this arrangement does not line up syllable for
    // note the way the others do, and a wrong alignment teaches a wrong tune.
    phrases: [
      { label: 'First line', start: 0, end: 9 },
      { label: 'Second line', start: 9, end: 16 },
    ],
  },
]

export const ALL_ITEMS: PracticeItem[] = [...WARMUPS, ...SONGS]

export function itemById(id: string): PracticeItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id)
}

/**
 * One phrase of an item, or the whole thing when `index` is null. The rhythm
 * and the words are sliced to match, so a phrase behaves exactly like a short
 * item.
 */
export function phraseNotes(
  item: PracticeItem,
  index: number | null,
): { label: string; notes: number[]; beats?: number[]; lyrics?: string[]; offset: number } {
  const phrase = index === null ? null : item.phrases?.[index]
  const start = phrase ? phrase.start : 0
  const end = phrase ? phrase.end : item.notes.length
  return {
    label: phrase ? phrase.label : 'Whole thing',
    notes: item.notes.slice(start, end),
    beats: item.beats?.slice(start, end),
    lyrics: item.lyrics?.slice(start, end),
    offset: start,
  }
}

/** Lowest and highest note an item asks for. */
export function itemRange(item: Pick<PracticeItem, 'notes'>): { low: number; high: number } {
  return { low: Math.min(...item.notes), high: Math.max(...item.notes) }
}

// The octave is optional. Sheet music gives you letters, and typing an octave
// number on every one of two hundred notes is where people stop.
const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d{1,2})?$/i

// Where a melody starts when the first note has no octave. C5 sits in the
// middle of the saxophone's range.
const DEFAULT_OCTAVE_ANCHOR = 72

/**
 * Reads a melody typed as note names: "C5 D5 E5" or "c5, d5 | e5".
 *
 * Anything it cannot read comes back in `errors` rather than being dropped,
 * so a typo is visible instead of silently shortening your song.
 */
export function parseMelody(
  text: string,
  transpose = 0,
): { notes: number[]; errors: string[] } {
  const notes: number[] = []
  const errors: string[] = []
  // The last note read, so a bare letter can be placed near it.
  let previous: number | null = null

  text
    .split(/[\s,|]+/)
    .filter(Boolean)
    .forEach((token) => {
      const m = token.match(NOTE_PATTERN)
      if (!m) {
        errors.push(token)
        return
      }
      const [, letter, accidental, octaveStr] = m
      let index = NOTE_NAMES.indexOf(letter.toUpperCase())
      if (accidental === '#') index += 1
      if (accidental.toLowerCase() === 'b') index -= 1

      // With no octave given, pick the octave that puts this note closest to
      // the one before it. That is what a melody does: it steps, it does not
      // leap an octave every other note.
      let midi: number
      if (octaveStr === undefined) {
        const anchor = previous ?? DEFAULT_OCTAVE_ANCHOR
        const pitchClass = ((index % 12) + 12) % 12
        const below = pitchClass + Math.floor(anchor / 12) * 12
        const candidates = [below - 12, below, below + 12]
        midi =
          candidates.reduce((best, c) =>
            Math.abs(c - anchor) <= Math.abs(best - anchor) ? c : best,
          ) + transpose
      } else {
        midi = (Number(octaveStr) + 1) * 12 + index + transpose
      }

      // Transpose first, then range check: a note can be outside the
      // instrument's range as written on a piano part and inside it once
      // converted, which is the whole point of converting.
      if (midi < INSTRUMENT_LOW || midi > INSTRUMENT_HIGH) {
        errors.push(token)
        return
      }
      notes.push(midi)
      previous = midi - transpose
    })

  return { notes, errors }
}

/**
 * A melody typed as lines, where each line becomes a phrase you can drill on
 * its own. An optional label goes before a colon:
 *
 *     Chorus: C5 D5 E5
 *     Verse: G4 A4 B4
 *
 * `transpose` converts concert pitch sheet music to what you finger: 9 for an
 * alto, since that is where its written part sits.
 */
export function parseMelodyScript(
  text: string,
  transpose = 0,
  numberMode?: { numbers: boolean; tonic: number },
): { notes: number[]; phrases: Phrase[]; errors: string[] } {
  const notes: number[] = []
  const phrases: Phrase[] = []
  const errors: string[] = []

  text.split('\n').forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) return

    const colon = line.indexOf(':')
    const label = colon > 0 ? line.slice(0, colon).trim() : ''
    const body = colon > 0 ? line.slice(colon + 1) : line

    const parsed =
      numberMode?.numbers
        ? parseNumbers(body, numberMode.tonic + transpose)
        : parseMelody(body, transpose)
    errors.push(...parsed.errors)
    if (parsed.notes.length === 0) return

    const start = notes.length
    notes.push(...parsed.notes)
    phrases.push({ label: label || `Line ${phrases.length + 1}`, start, end: notes.length })
  })

  return { notes, phrases, errors }
}

// Number notation, called jianpu, and what almost every kalimba tab uses.
// 1 to 7 are the degrees of the major scale of whatever key you are in, so the
// same tab plays in any key by moving the tonic.
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]

// A degree, optional accidental before it, and octave marks after: an
// apostrophe for each octave up, a comma for each octave down. Tabs print
// those as dots above and below the number.
const NUMBER_PATTERN = /^([#b]?)([1-7])('*|,*)$/

/**
 * Reads a melody written as scale degrees against `tonic`, the MIDI note that
 * degree 1 means. Written pitch, like everything else here.
 */
export function parseNumbers(text: string, tonic: number): { notes: number[]; errors: string[] } {
  const notes: number[] = []
  const errors: string[] = []

  // Whitespace and bar lines separate; commas do NOT, because here a comma is
  // an octave mark rather than punctuation.
  text
    .split(/[\s|]+/)
    .filter(Boolean)
    .forEach((token) => {
      const m = token.match(NUMBER_PATTERN)
      if (!m) {
        errors.push(token)
        return
      }
      const [, accidental, degree, marks] = m
      let midi = tonic + MAJOR_STEPS[Number(degree) - 1]
      if (accidental === '#') midi += 1
      if (accidental === 'b') midi -= 1
      if (marks.startsWith("'")) midi += 12 * marks.length
      else if (marks.startsWith(',')) midi -= 12 * marks.length

      if (midi < INSTRUMENT_LOW || midi > INSTRUMENT_HIGH) {
        errors.push(token)
        return
      }
      notes.push(midi)
    })

  return { notes, errors }
}

/**
 * Shifts a melody by whole octaves until it sits inside the range the
 * instrument can play, leaving the tune itself untouched. Piano parts often
 * sit an octave or two below a saxophone, which would otherwise make them
 * unusable rather than merely low.
 *
 * Returns the melody unchanged when it is too wide to fit at any octave.
 */
export function fitToRange(notes: number[]): { notes: number[]; octaves: number } {
  if (notes.length === 0) return { notes, octaves: 0 }

  const low = Math.min(...notes)
  const high = Math.max(...notes)
  if (high - low > INSTRUMENT_HIGH - INSTRUMENT_LOW) return { notes, octaves: 0 }

  let octaves = 0
  while (low + octaves * 12 < INSTRUMENT_LOW) octaves += 1
  while (high + octaves * 12 > INSTRUMENT_HIGH) octaves -= 1

  // If shifting to fit the top pushed the bottom out, it cannot be fitted.
  if (low + octaves * 12 < INSTRUMENT_LOW) return { notes, octaves: 0 }

  return { notes: notes.map((n) => n + octaves * 12), octaves }
}

/** The inverse, for showing a saved melody back in the box. */
export function formatMelody(notes: number[]): string {
  return notes.map((n) => noteName(n)).join(' ')
}
