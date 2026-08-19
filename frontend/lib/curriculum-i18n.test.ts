import { describe, it, expect } from 'vitest'
import { ALL_ITEMS } from '@/lib/curriculum'
import { ITEMS_FR, localiseItem, CONTENT_LANGUAGES } from '@/lib/curriculum-i18n'

describe('the French practice material', () => {
  it('translates every exercise and song', () => {
    ALL_ITEMS.forEach((item) => {
      expect(ITEMS_FR[item.id], item.id).toBeDefined()
      expect(ITEMS_FR[item.id].about.length, item.id).toBeGreaterThan(20)
    })
  })

  it('translates a tip wherever English has one', () => {
    ALL_ITEMS.forEach((item) => {
      if (item.tip) expect(ITEMS_FR[item.id].tip, item.id).toBeTruthy()
    })
  })

  it('gives one phrase label per phrase', () => {
    ALL_ITEMS.forEach((item) => {
      const fr = ITEMS_FR[item.id]
      if (fr.phrases) expect(fr.phrases.length, item.id).toBe(item.phrases!.length)
    })
  })

  it('has no entry for an item that does not exist', () => {
    const ids = new Set(ALL_ITEMS.map((i) => i.id))
    Object.keys(ITEMS_FR).forEach((id) => expect(ids.has(id), id).toBe(true))
  })

  it('swaps the text but never the notes', () => {
    const item = ALL_ITEMS[0]
    const french = localiseItem(item, 'fr')
    expect(french.notes).toEqual(item.notes)
    expect(french.beats).toEqual(item.beats)
    expect(french.title).not.toBe(item.title)
  })

  it('returns English untouched', () => {
    expect(localiseItem(ALL_ITEMS[0], 'en')).toBe(ALL_ITEMS[0])
  })
})

describe('languages without translated material', () => {
  // The interface is translated into five languages; the exercises and the
  // course weeks are not, yet. Rather than showing blanks, they fall back to
  // English, and this test records exactly which languages that applies to so
  // the gap is visible in the test output instead of only on screen.
  it('falls back to English rather than leaving holes', () => {
    const item = ALL_ITEMS[0]
    ;(['vi', 'nl', 'es'] as const).forEach((lang) => {
      const out = localiseItem(item, lang)
      expect(out.title, lang).toBe(item.title)
      expect(out.notes, lang).toEqual(item.notes)
    })
  })

  it('says which languages the material is actually written in', () => {
    expect(CONTENT_LANGUAGES).toEqual(['en', 'fr'])
  })
})
