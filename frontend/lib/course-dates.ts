// Where a learner's course dates come from.
//
// Logged in, they live on the account so they follow you between machines.
// Logged out, the browser remembers them, because someone trying the app out
// should not have to make an account before the course means anything.

import { DEFAULT_START } from '@/lib/course'
import type { User } from '@/lib/api'

export const START_KEY = 'yds120.courseStart'
export const TARGET_KEY = 'yds120.courseTargetEnd'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** Today, as the yyyy-mm-dd the date inputs and the course both speak. */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The dates to use: the account first, then the browser, then the default.
 * A stored value that is not a date is ignored rather than trusted.
 */
export function resolveDates(
  user: Pick<User, 'courseStart' | 'courseTargetEnd'> | null,
  stored: { start: string | null; target: string | null },
): { start: string; target: string } {
  const start =
    (user?.courseStart && isValidDate(user.courseStart) && user.courseStart) ||
    (stored.start && isValidDate(stored.start) && stored.start) ||
    DEFAULT_START
  const target =
    (user?.courseTargetEnd && isValidDate(user.courseTargetEnd) && user.courseTargetEnd) ||
    (stored.target && isValidDate(stored.target) && stored.target) ||
    ''
  return { start, target }
}
