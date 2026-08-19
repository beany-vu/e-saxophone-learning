// Which weeks of the course you have finished.
//
// Kept explicit rather than derived from the date or from the week you happen
// to be looking at: the plan tells you to repeat a week when one goes badly,
// and to use the spare week when life gets in the way. Only you know when a
// week is actually done.

/** Reads the stored value, tolerating anything that is not a list of weeks. */
export function parseDone(raw: string | null): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b)
  } catch {
    return []
  }
}

export function serialiseDone(done: number[]): string {
  return JSON.stringify(done)
}

export function isDone(done: number[], week: number): boolean {
  return done.includes(week)
}

/** Ticks a week, or unticks it if it was already ticked. */
export function toggleDone(done: number[], week: number): number[] {
  const without = done.filter((n) => n !== week)
  if (without.length !== done.length) return without
  return [...without, week].sort((a, b) => a - b)
}

/** The first week still outstanding, which is where to carry on. */
export function nextUnfinished(done: number[], total: number): number {
  for (let week = 1; week <= total; week++) {
    if (!done.includes(week)) return week
  }
  return total
}

export function completion(
  done: number[],
  total: number,
): { done: number; total: number; percent: number } {
  const counted = done.filter((n) => n >= 1 && n <= total).length
  return { done: counted, total, percent: Math.round((counted / total) * 100) }
}
