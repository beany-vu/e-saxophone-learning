// Where a note sits on the treble staff.
//
// The staff counts by letter, not by semitone: F and F# occupy the same line,
// and the sharp is what tells them apart. So the position comes from the note
// name, and the accidental comes along beside it.
//
// `step` counts half-spaces from the bottom line: 0 is the bottom line E4, 1
// is the space above it, 2 is the next line, and so on. Even numbers are
// lines, odd numbers are spaces.

import { noteName } from '@/lib/notes'

export const STAFF_BOTTOM = 0 // E4, the bottom line
export const STAFF_TOP = 8 // F5, the top line

export type StaffNote = {
  midi: number
  step: number
  accidental: '#' | 'b' | null
  /** Ledger line positions to draw, empty when the note is inside the staff. */
  ledgerLines: number[]
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

// The bottom line is E4: letter E in octave 4.
const BOTTOM_LINE_INDEX = 4 * 7 + LETTERS.indexOf('E')

export function staffNote(midi: number): StaffNote {
  // Take the spelling the rest of the app uses, so Bb sits on the B line
  // rather than being drawn as an A#.
  const name = noteName(midi)
  const letter = name[0]
  const accidental = name[1] === '#' ? '#' : name[1] === 'b' ? 'b' : null
  const octave = Number(name.slice(accidental ? 2 : 1))

  const step = octave * 7 + LETTERS.indexOf(letter) - BOTTOM_LINE_INDEX

  // Ledger lines are the continuation of the staff, so they only ever appear
  // on line positions, which are the even numbers.
  const ledgerLines: number[] = []
  for (let line = -2; line >= step; line -= 2) ledgerLines.push(line)
  for (let line = 10; line <= step; line += 2) ledgerLines.push(line)

  return { midi, step, accidental, ledgerLines }
}
