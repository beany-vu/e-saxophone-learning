// Saxophone fingerings, in written pitch.
//
// The YDS-120 uses the standard saxophone key layout, so these are the same
// fingerings a teacher would show you on an acoustic alto. The instrument's
// own chart is on pages 20 and 21 of the manual, and it is the authority; this
// table is the common fingering for each note so the app can show you one.
//
// Range covered: written Bb3 (the lowest note) up to C#6. Above that come the
// palm key notes, which are deliberately absent rather than guessed at.

export type SaxKeyId =
  | 'oct'
  | 'lh1'
  | 'lh2'
  | 'lh3'
  | 'bis'
  | 'gsharp'
  | 'lowCsharp'
  | 'lowB'
  | 'lowBb'
  | 'rh1'
  | 'rh2'
  | 'rh3'
  | 'lowEb'
  | 'lowC'
  | 'sideBb'
  | 'sideC'
  | 'sideE'
  | 'fsharp'

export type SaxKeyInfo = {
  id: SaxKeyId
  label: string
  /** Which finger operates it, in words a beginner can act on. */
  finger: string
}

export const SAX_KEYS: SaxKeyInfo[] = [
  { id: 'oct', label: 'Octave', finger: 'left thumb' },
  { id: 'lh1', label: '1', finger: 'left index' },
  { id: 'bis', label: 'Bis', finger: 'left index, rolls down' },
  { id: 'lh2', label: '2', finger: 'left middle' },
  { id: 'lh3', label: '3', finger: 'left ring' },
  { id: 'gsharp', label: 'G#', finger: 'left little' },
  { id: 'lowCsharp', label: 'C#', finger: 'left little' },
  { id: 'lowB', label: 'B', finger: 'left little' },
  { id: 'lowBb', label: 'Bb', finger: 'left little' },
  { id: 'rh1', label: '4', finger: 'right index' },
  { id: 'rh2', label: '5', finger: 'right middle' },
  { id: 'rh3', label: '6', finger: 'right ring' },
  { id: 'lowEb', label: 'Eb', finger: 'right little' },
  { id: 'lowC', label: 'C', finger: 'right little' },
  { id: 'sideBb', label: 'Side Bb', finger: 'right index, side' },
  { id: 'sideC', label: 'Side C', finger: 'right index, side' },
  { id: 'sideE', label: 'Side E', finger: 'right index, side' },
  { id: 'fsharp', label: 'F#', finger: 'right ring, side' },
]

export type Alternate = { label: string; keys: SaxKeyId[] }
export type Fingering = { keys: SaxKeyId[]; alternates?: Alternate[] }

/**
 * What the instrument can play, written pitch: low A3 up to high F#6.
 *
 * Wider than an acoustic alto at both ends. Yamaha's specification lists low
 * A, front F and high F#, and the manual's chart prints the low A first,
 * labelled. That is 33 semitones, a shade under three octaves.
 */
export const INSTRUMENT_LOW = 57
export const INSTRUMENT_HIGH = 90

/**
 * What this fingering table covers, Bb3 to C#6.
 *
 * Narrower than the instrument on purpose. The six notes outside it, low A
 * and the palm key notes from D6 up, are printed in the manual as diagrams
 * that I could not read with certainty, and a wrong fingering in a chart a
 * beginner trusts is worse than an honest gap. The app says so rather than
 * guessing.
 */
export const FINGERING_LOW = 58
export const FINGERING_HIGH = 85

const LEFT_HAND: SaxKeyId[] = ['lh1', 'lh2', 'lh3']
const BOTH_HANDS: SaxKeyId[] = ['lh1', 'lh2', 'lh3', 'rh1', 'rh2', 'rh3']

// The first register, written Bb3 to C#5. Everything an octave above is the
// same fingering with the octave key added, which is the whole trick of the
// saxophone and why this table is short.
const FIRST_REGISTER: Record<number, Fingering> = {
  58: { keys: [...BOTH_HANDS, 'lowBb'] }, // Bb3
  59: { keys: [...BOTH_HANDS, 'lowB'] }, // B3
  60: { keys: [...BOTH_HANDS, 'lowC'] }, // C4
  61: { keys: [...BOTH_HANDS, 'lowCsharp'] }, // C#4
  62: { keys: [...BOTH_HANDS] }, // D4
  63: { keys: [...BOTH_HANDS, 'lowEb'] }, // Eb4
  64: { keys: ['lh1', 'lh2', 'lh3', 'rh1', 'rh2'] }, // E4
  65: { keys: ['lh1', 'lh2', 'lh3', 'rh1'] }, // F4
  66: {
    keys: ['lh1', 'lh2', 'lh3', 'rh2'], // F#4, the "1 2 3 | 2" fingering
    alternates: [{ label: 'Side F#', keys: ['lh1', 'lh2', 'lh3', 'rh1', 'fsharp'] }],
  },
  67: { keys: [...LEFT_HAND] }, // G4
  68: { keys: [...LEFT_HAND, 'gsharp'] }, // G#4
  69: { keys: ['lh1', 'lh2'] }, // A4
  70: {
    keys: ['lh1', 'bis'], // Bb4, the bis fingering, easiest inside a scale
    alternates: [
      { label: 'Side Bb', keys: ['lh1', 'sideBb'] },
      { label: 'One and one', keys: ['lh1', 'rh1'] },
    ],
  },
  71: { keys: ['lh1'] }, // B4
  72: {
    keys: ['lh2'], // C5
    alternates: [{ label: 'Side C', keys: ['lh1', 'sideC'] }],
  },
  73: { keys: [] }, // C#5, everything open
}

/**
 * How to finger a written note, or null if it is outside the covered range.
 *
 * Ask with the note you finger, not the note that sounds. On an alto those
 * differ by nine semitones, and `fromConcert` in lib/notes.ts converts.
 */
export function fingeringFor(written: number): Fingering | null {
  if (written < FINGERING_LOW || written > FINGERING_HIGH) return null

  const base = FIRST_REGISTER[written]
  if (base) return base

  // Second register: same fingers, plus the octave key.
  const lower = FIRST_REGISTER[written - 12]
  if (!lower) return null
  return {
    keys: [...lower.keys, 'oct'],
    alternates: lower.alternates?.map((a) => ({ label: a.label, keys: [...a.keys, 'oct'] })),
  }
}

export type KeyMatch = {
  /** The written note this combination produces. */
  written: number
  /** Set when the match was an alternate fingering, naming which. */
  via?: string
}

// The reverse index, built once from the table above so the two directions can
// never drift apart. A fingering is identified by its sorted key list.
const signature = (keys: SaxKeyId[]) => [...new Set(keys)].sort().join('+')

const BY_KEYS: Map<string, KeyMatch> = (() => {
  const map = new Map<string, KeyMatch>()
  for (let written = FINGERING_LOW; written <= FINGERING_HIGH; written++) {
    const f = fingeringFor(written)
    if (!f) continue
    map.set(signature(f.keys), { written })
    f.alternates?.forEach((alt) => {
      // First one wins: the main fingering is registered before its
      // alternates, so a shared combination keeps the primary answer.
      if (!map.has(signature(alt.keys))) map.set(signature(alt.keys), { written, via: alt.label })
    })
  }
  return map
})()

/**
 * Which note a set of pressed keys produces, or null when the combination is
 * not a note at all. The other direction from `fingeringFor`: press the keys
 * and find out what would come out.
 */
export function noteForKeys(keys: SaxKeyId[]): KeyMatch | null {
  return BY_KEYS.get(signature(keys)) ?? null
}
