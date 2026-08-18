// MIDI note helpers. A MIDI note is just a number 0-127 where 60 is middle C
// and every step of 1 is one semitone.

// Used for parsing and for the letter positions. Sharps, because that is the
// order semitones come in.
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Used for display. A saxophone labels its own keys Bb, Eb, G#, C# and F#, the
// manual's fingering chart uses the same spellings, and so does saxophone
// music. Printing A# where the key under your finger says Bb is a small thing
// that costs a beginner real time, so the app follows the instrument.
const DISPLAY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']

/** 60 -> "C4". The -1 is because MIDI octaves start at -1. */
export function noteName(midi: number): string {
  return DISPLAY_NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

// Two conventions exist for the octave number, and they differ by one:
//
//   MIDI 60   scientific pitch notation: C4   (the MIDI standard, and this app)
//   MIDI 60   Yamaha's convention:       C3   (their instruments, and most
//                                              YDS-120 tutorials on video)
//
// Same note, label an octave apart. Showing both stops a tutorial disagreeing
// with the screen for no reason.
export function yamahaName(midi: number): string {
  return DISPLAY_NAMES[midi % 12] + (Math.floor(midi / 12) - 2)
}

/** Name without the octave number, e.g. 61 -> "C#". */
export function pitchClassName(midi: number): string {
  return DISPLAY_NAMES[midi % 12]
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12)
}

// Transposition. A saxophone is not a C instrument: the note you finger and
// the note that comes out are different, and by how much depends on the horn.
//
// These numbers are the YDS-120 voice list, page 19 of the manual, which
// prints the transposition next to every voice. The instrument powers up on
// A.01 Alto Sax 1, so the alto is the default here too.
//
// (A handful of the C voices carry an extra octave, for example Di Zi at
// C +12 and Sawtooth Bass at C -24. Those are listed in the manual and are
// not covered by this table. Neither are the U.01-U.20 user voices, whose
// transposition is whatever the Yamaha app was told to give them.)
export type Voice = { id: string; label: string; display: string; semitones: number }

// `display` is what the instrument's own LED shows for that group, so the
// dropdown and the screen in your hands can be matched without translating.
export const VOICES: Voice[] = [
  { id: 'alto', label: 'A.01-A.17  Alto sax (Eb)', display: 'A', semitones: -9 },
  { id: 'soprano', label: 'S.01-S.13  Soprano sax (Bb)', display: 'S', semitones: -2 },
  { id: 'tenor', label: 'T.01-T.15  Tenor sax (Bb)', display: 'T', semitones: -14 },
  { id: 'baritone', label: 'b.01-b.11  Baritone sax (Eb)', display: 'b', semitones: -21 },
  { id: 'c', label: 'C.01-C.17  Other instruments (C)', display: 'C', semitones: 0 },
]

export const ALTO_TRANSPOSE = -9

/** Fingered note to the note that actually sounds. */
export function toConcert(midi: number, semitones: number = ALTO_TRANSPOSE): number {
  return midi + semitones
}

// The other direction, needed by microphone mode. MIDI reports the note you
// finger; a microphone hears the note that actually comes out of the bell.
// Converting back means both input sources report the same thing, so the
// piano and the scale trainer do not care which one is feeding them.
export function fromConcert(midi: number, semitones: number = ALTO_TRANSPOSE): number {
  return midi - semitones
}

// Keyboard range we draw: G3 to G6, which comfortably covers the alto sax
// written range of Bb3 to F#6.
export const PIANO_LOW = 55
export const PIANO_HIGH = 91

export const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11, 12],
  'Natural minor': [0, 2, 3, 5, 7, 8, 10, 12],
  'Major pentatonic': [0, 2, 4, 7, 9, 12],
  'Blues': [0, 3, 5, 6, 7, 10, 12],
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

/** Build the actual MIDI notes of a scale, ascending then back down. */
export function buildScale(root: number, intervals: number[], updown = true): number[] {
  const up = intervals.map((i) => root + i)
  if (!updown) return up
  return [...up, ...up.slice(0, -1).reverse()]
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
