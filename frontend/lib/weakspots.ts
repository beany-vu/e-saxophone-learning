// Turning "you fluffed notes 4, 5 and 11" into something worth practising.
//
// Playing a whole song again to fix three bars is the most common way to waste
// a practice session, so the app builds a drill out of the places that went
// wrong and loops that instead.

/** A stretch of the line to drill, inclusive of both ends. */
export type Range = { start: number; end: number }

/**
 * The stretches worth looping, given the positions that went wrong.
 *
 * Each miss is widened by `context` notes either side, because a note is
 * usually missed for the way it is approached rather than in isolation: the
 * jump into it is the hard part. Overlapping stretches are merged, so three
 * consecutive fluffs become one drill rather than three that mostly repeat
 * each other.
 */
export function drillRanges(misses: number[], total: number, context = 1): Range[] {
  const valid = Array.from(new Set(misses))
    .filter((i) => Number.isInteger(i) && i >= 0 && i < total)
    .sort((a, b) => a - b)
  if (valid.length === 0 || total <= 0) return []

  const ranges: Range[] = []
  for (const at of valid) {
    const start = Math.max(0, at - context)
    const end = Math.min(total - 1, at + context)
    const last = ranges[ranges.length - 1]
    // Touching counts as overlapping: two drills that share an edge are one
    // drill with a seam in it.
    if (last && start <= last.end + 1) {
      last.end = Math.max(last.end, end)
    } else {
      ranges.push({ start, end })
    }
  }
  return ranges
}

/** How many notes the drill covers, which is what makes it worth doing. */
export function drillLength(ranges: Range[]): number {
  return ranges.reduce((n, r) => n + (r.end - r.start + 1), 0)
}

/**
 * The drill itself: the ranges laid end to end into one line to play through.
 *
 * Joining them rather than practising each separately keeps one run, one
 * score and one loop. The notes stay in the order they appear in the piece.
 */
export function drillFrom<T extends { notes: number[]; beats?: number[]; lyrics?: string[] }>(
  segment: T,
  ranges: Range[],
): { notes: number[]; beats?: number[]; lyrics?: string[]; positions: number[] } {
  const positions: number[] = []
  ranges.forEach((r) => {
    for (let i = r.start; i <= r.end; i++) positions.push(i)
  })
  return {
    notes: positions.map((i) => segment.notes[i]),
    beats: segment.beats ? positions.map((i) => segment.beats![i]) : undefined,
    lyrics: segment.lyrics ? positions.map((i) => segment.lyrics![i]) : undefined,
    positions,
  }
}

/**
 * How to describe the drill to a person: "notes 4 to 6, and note 11", counting
 * from one because nobody counts their own playing from zero.
 */
export function describeRanges(ranges: Range[]): string[] {
  return ranges.map((r) => (r.start === r.end ? `${r.start + 1}` : `${r.start + 1}-${r.end + 1}`))
}
