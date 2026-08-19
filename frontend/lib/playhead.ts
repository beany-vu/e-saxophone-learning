// The timing side of playing along: where the bar is, and whether a note
// arrived when it was asked for.
//
// All of it is plain arithmetic on beats, deliberately kept away from React so
// the rules can be read and tested without a clock, a render or an instrument.
// The page owns the clock and calls in here to ask what it means.

/**
 * How far either side of the beat still counts as on time. Half a beat is 500ms
 * at 60bpm, which sounds slack written down but is not: a low D on a wind
 * instrument takes a moment to speak, and a window tighter than that punishes
 * the instrument rather than the player.
 */
export const ON_TIME_BEATS = 0.5

/** A note with no length written down is a quarter note. */
const beatOf = (b: number | undefined) => (b && b > 0 ? b : 1)

/** The beat each note begins on, counting the line from zero. */
export function onsets(beats: number[] | undefined): number[] {
  if (!beats) return []
  let at = 0
  return beats.map((b) => {
    const start = at
    at += beatOf(b)
    return start
  })
}

/** How long the whole line lasts, in beats. */
export function totalBeats(beats: number[] | undefined): number {
  return (beats ?? []).reduce((sum, b) => sum + beatOf(b), 0)
}

export type Timing = 'early' | 'onTime' | 'late'

/** Where a note landed, given how far it was from its beat. */
export function classifyTiming(offsetBeats: number, window = ON_TIME_BEATS): Timing {
  if (offsetBeats < -window) return 'early'
  if (offsetBeats > window) return 'late'
  return 'onTime'
}

/** True once the bar has waited out the window and the note still has not come. */
export function overdue(clockBeats: number, onset: number, window = ON_TIME_BEATS): boolean {
  return clockBeats > onset + window
}

/**
 * Where to draw the bar across the strip, 0 at the left edge and 1 at the
 * right. The cards are equal width whatever a note is worth, so the bar
 * crosses each one in that note's own time: a half note takes twice as long to
 * cross as a quarter.
 */
export function barFraction(
  clockBeats: number,
  starts: number[],
  beats: number[] | undefined,
): number {
  if (starts.length === 0) return 0
  if (clockBeats <= 0) return 0

  const lengths = starts.map((_, i) => beatOf(beats?.[i]))
  const end = starts[starts.length - 1] + lengths[lengths.length - 1]
  if (clockBeats >= end) return 1

  let i = starts.length - 1
  while (i > 0 && starts[i] > clockBeats) i--
  const within = (clockBeats - starts[i]) / lengths[i]
  return (i + within) / starts.length
}

/** Milliseconds per beat, refusing a tempo that would divide by zero. */
export function msPerBeat(bpm: number): number {
  return 60000 / Math.max(1, bpm)
}
