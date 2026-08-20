// Give the tests the page's storage rather than Node's.
//
// Node 26 defines `localStorage` and `sessionStorage` on globalThis, gated
// behind --localstorage-file. Without that flag the `localStorage` getter
// returns undefined, and `sessionStorage` returns a store belonging to the
// process rather than to the page.
//
// Vitest copies the jsdom window onto globalThis, but it will not overwrite a
// global Node has already defined unless that key is on its own list, and
// neither storage key is:
//
//   if (k in global) return keysArray.includes(k)   // vitest getWindowKeys
//
// On Node 22 `'localStorage' in globalThis` was false, so jsdom's storage was
// copied across and everything worked. On Node 26 it is true, so Node's wins.
// The base image moved 22 -> 26 and eight tests began failing without a line
// of their own code changing.
//
// Nothing about the app is wrong. A real browser has real storage, and this
// file is never shipped.
//
// The storage is borrowed from an iframe rather than built by hand, because a
// hand written Storage gets `length`, `key()` or the string coercion subtly
// wrong and then the tests are checking the stand-in instead of the code. The
// iframe is a genuine jsdom Storage. It cannot be taken from the current
// window instead: vitest makes `window` and `globalThis` the same object, so
// the jsdom original is no longer reachable and deleting Node's property
// reveals nothing underneath.
//
// One consequence worth knowing: an iframe is its own realm, so this storage
// is not an `instanceof` the parent window's `Storage`. Nothing here compares
// it that way, and every method behaves normally.

const STORAGE_KEYS = ['localStorage', 'sessionStorage'] as const

/** Storage that belongs to the document, as opposed to whatever Node supplies. */
function isPageStorage(value: unknown): boolean {
  return typeof Storage !== 'undefined' && value instanceof Storage
}

if (typeof document !== 'undefined' && STORAGE_KEYS.some((k) => !isPageStorage(globalThis[k]))) {
  const frame = document.createElement('iframe')
  // It has to stay in the document. A detached frame has no browsing context
  // and its storage stops working.
  document.body.appendChild(frame)
  const donor = frame.contentWindow

  if (donor) {
    for (const key of STORAGE_KEYS) {
      // Only what Node has spoiled, so this undoes itself the day vitest or
      // Node stops needing it rather than quietly staying in the way.
      if (isPageStorage(globalThis[key])) continue
      Object.defineProperty(globalThis, key, {
        value: donor[key],
        configurable: true,
        writable: true,
      })
    }
  }
}
