import { describe, it, expect } from 'vitest'

// The test environment itself, stated as rules.
//
// Eight tests broke when the Node base image went from 22 to 26, because Node
// 26 defines its own storage globals and vitest will not overwrite a global
// Node already has. Nothing in the app was wrong and nothing in those tests was
// wrong, so nothing pointed at the cause. These do.

describe('browser storage', () => {
  it('exists at all, which is what Node 26 took away', () => {
    expect(typeof localStorage).toBe('object')
    expect(typeof sessionStorage).toBe('object')
  })

  it('is reached the same way bare or through window', () => {
    localStorage.setItem('probe', 'a')
    expect(window.localStorage.getItem('probe')).toBe('a')
    localStorage.clear()
  })

  it('stores, reads, removes and counts', () => {
    localStorage.clear()
    expect(localStorage.length).toBe(0)
    localStorage.setItem('a', '1')
    localStorage.setItem('b', '2')
    expect(localStorage.length).toBe(2)
    expect(localStorage.getItem('a')).toBe('1')
    expect(localStorage.getItem('missing')).toBeNull()
    localStorage.removeItem('a')
    expect(localStorage.getItem('a')).toBeNull()
    localStorage.clear()
    expect(localStorage.length).toBe(0)
  })

  it('coerces values to strings the way the real thing does', () => {
    // The app stores numbers and JSON. A hand written stand-in usually gets
    // this wrong, which is why the storage is borrowed rather than written.
    localStorage.setItem('n', 12 as unknown as string)
    expect(localStorage.getItem('n')).toBe('12')
    localStorage.clear()
  })

  it('keeps the two storages apart', () => {
    // Node's sessionStorage is process wide. If that one were still in place,
    // it would survive here and leak into whatever ran next in this worker.
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('where', 'local')
    expect(sessionStorage.getItem('where')).toBeNull()
    localStorage.clear()
  })
})
