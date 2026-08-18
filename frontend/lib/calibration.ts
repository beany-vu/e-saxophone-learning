// Matching what the app hears to what you actually played.
//
// Two things can put every note out by a fixed amount. A digital wind
// instrument may report the note that sounds rather than the note you finger,
// which on an alto is nine semitones apart. And a voice may carry an extra
// octave. Both are constant offsets, so one correction fixes every note at
// once rather than being argued with note by note.

/** Beyond this, it is a wrong note rather than a transposition. */
const MAX_OFFSET = 24

/**
 * The offset to use after you played `expected` and the app heard `heard`.
 * Returns the current offset unchanged when the gap is too big to be a
 * transposition, so a fluffed note cannot wreck the setting.
 */
export function nextOffset(current: number, expected: number, heard: number): number {
  const correction = expected - heard
  const proposed = current + correction
  if (Math.abs(proposed) > MAX_OFFSET) return current
  return proposed
}

/** Plain words for the setting, so it can be sanity checked at a glance. */
export function describeOffset(offset: number): string {
  if (offset === 0) return 'no correction'
  const direction = offset > 0 ? 'up' : 'down'
  const size = Math.abs(offset)
  if (size % 12 === 0) {
    const octaves = size / 12
    return `${direction} ${octaves} octave${octaves > 1 ? 's' : ''}`
  }
  return `${direction} ${size} semitones`
}
