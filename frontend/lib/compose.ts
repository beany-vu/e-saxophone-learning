// Writing a tune by clicking notes.
//
// A composition is a list of pitches with lengths. Bars are worked out from
// the time signature rather than being stored, so changing 4/4 to 3/4 rebars
// the piece instead of invalidating it.

import type { Phrase, PracticeItem } from '@/lib/curriculum'

/** A note as written: which pitch, and how long in beats. */
export type ComposedNote = { midi: number; beats: number }

export type Duration = { beats: number; label: string; symbol: string }

// A quarter note is one beat, which holds for every time signature offered
// here. Longest first, because that is the order they are read in.
export const DURATIONS: Duration[] = [
  { beats: 4, label: 'whole', symbol: '𝅝' },
  { beats: 2, label: 'half', symbol: '𝅗𝅥' },
  { beats: 1, label: 'quarter', symbol: '♩' },
  { beats: 0.5, label: 'eighth', symbol: '♪' },
  { beats: 0.25, label: 'sixteenth', symbol: '♬' },
]

export const TIME_SIGNATURES = [
  { label: '2/4', beatsPerBar: 2 },
  { label: '3/4', beatsPerBar: 3 },
  { label: '4/4', beatsPerBar: 4 },
]

/** A dot after a note adds half its length again. That is all a dot means. */
export function dotted(beats: number): number {
  return beats * 1.5
}

/** Reads a length back, so the composer can say what it just added. */
export function durationLabel(beats: number): string {
  const plain = DURATIONS.find((d) => d.beats === beats)
  if (plain) return plain.label
  const undotted = DURATIONS.find((d) => dotted(d.beats) === beats)
  return undotted ? `dotted ${undotted.label}` : `${beats} beats`
}

export function totalBeats(notes: ComposedNote[]): number {
  return notes.reduce((sum, note) => sum + note.beats, 0)
}

/**
 * Groups notes into bars.
 *
 * A note stays in the bar it starts in rather than being split across the
 * line, which is what a tie would do and is more machinery than a first
 * composer needs. Bars that end up holding more than they should are reported
 * instead of being silently rearranged, so the writer can decide.
 */
export function toBars(
  notes: ComposedNote[],
  beatsPerBar: number,
): { bars: ComposedNote[][]; overfull: number[] } {
  const bars: ComposedNote[][] = []
  const overfull: number[] = []
  let current: ComposedNote[] = []
  let filled = 0

  notes.forEach((note) => {
    if (filled >= beatsPerBar) {
      bars.push(current)
      current = []
      filled = 0
    }
    current.push(note)
    filled += note.beats
    if (filled > beatsPerBar && !overfull.includes(bars.length + 1)) {
      overfull.push(bars.length + 1)
    }
  })

  if (current.length) bars.push(current)
  return { bars, overfull }
}

/**
 * A composition as a practice item, so everything already built works on it:
 * the trainer, the staff, the demo and the phrase buttons. One phrase per bar,
 * because a bar is the unit people actually repeat.
 */
export function toMelody(
  title: string,
  notes: ComposedNote[],
  beatsPerBar: number,
): PracticeItem & { phrases: Phrase[] } {
  const { bars } = toBars(notes, beatsPerBar)
  const phrases: Phrase[] = []
  let index = 0
  bars.forEach((bar, i) => {
    phrases.push({ label: `Bar ${i + 1}`, start: index, end: index + bar.length })
    index += bar.length
  })

  return {
    id: `composed-${title}`,
    title,
    kind: 'song',
    level: 2,
    about: title,
    notes: notes.map((n) => n.midi),
    beats: notes.map((n) => n.beats),
    phrases,
  }
}
