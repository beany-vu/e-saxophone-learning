import { describe, it, expect } from 'vitest'
import {
  toggleDone,
  isDone,
  parseDone,
  serialiseDone,
  nextUnfinished,
  completion,
} from '@/lib/course-progress'

describe('marking weeks done', () => {
  it('starts with nothing done', () => {
    expect(parseDone(null)).toEqual([])
  })

  it('marks a week done, and unmarks it again', () => {
    const once = toggleDone([], 3)
    expect(isDone(once, 3)).toBe(true)
    expect(isDone(toggleDone(once, 3), 3)).toBe(false)
  })

  it('keeps the list sorted and free of duplicates', () => {
    let done = toggleDone([], 5)
    done = toggleDone(done, 2)
    done = toggleDone(done, 5)
    done = toggleDone(done, 2)
    done = toggleDone(done, 2)
    expect(done).toEqual([2])
  })

  it('survives a round trip through storage', () => {
    const done = [1, 2, 7]
    expect(parseDone(serialiseDone(done))).toEqual(done)
  })

  it('treats a corrupt stored value as nothing done, rather than throwing', () => {
    expect(parseDone('not json')).toEqual([])
    expect(parseDone('{"a":1}')).toEqual([])
    expect(parseDone('[1,"two",3]')).toEqual([1, 3])
  })

  it('finds the first week still to do', () => {
    expect(nextUnfinished([1, 2], 20)).toBe(3)
    expect(nextUnfinished([], 20)).toBe(1)
    expect(nextUnfinished([2, 3], 20)).toBe(1)
  })

  it('stays on the last week once everything is done', () => {
    const all = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(nextUnfinished(all, 20)).toBe(20)
  })

  it('reports how far through the course you are', () => {
    expect(completion([], 20)).toEqual({ done: 0, total: 20, percent: 0 })
    expect(completion([1, 2, 3, 4, 5], 20)).toEqual({ done: 5, total: 20, percent: 25 })
  })

  it('ignores weeks that are not in the course when counting', () => {
    expect(completion([1, 99], 20).done).toBe(1)
  })
})
