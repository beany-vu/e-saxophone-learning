import { describe, it, expect } from 'vitest'
import { STRINGS, LANGUAGES, translate, type Lang } from '@/lib/i18n'

const langs = LANGUAGES.map((l) => l.code)

describe('the dictionaries', () => {
  it('offers English and French', () => {
    expect(langs).toContain('en')
    expect(langs).toContain('fr')
  })

  it('has exactly the same keys in every language', () => {
    const english = Object.keys(STRINGS.en).sort()
    langs.forEach((lang) => {
      expect(Object.keys(STRINGS[lang]).sort(), `${lang} differs from English`).toEqual(english)
    })
  })

  it('never leaves a translation empty', () => {
    langs.forEach((lang) => {
      Object.entries(STRINGS[lang]).forEach(([key, value]) => {
        expect(value.length, `${lang}.${key}`).toBeGreaterThan(0)
      })
    })
  })

  it('actually translates rather than copying English across', () => {
    const same = Object.keys(STRINGS.en).filter((k) => STRINGS.fr[k] === STRINGS.en[k])
    // A few words are the same in both languages, but not most of them.
    expect(same.length).toBeLessThan(Object.keys(STRINGS.en).length / 4)
  })
})

describe('translate', () => {
  it('returns the string for the language asked for', () => {
    expect(translate('en', 'nav.learn')).toBe('Learn')
    expect(translate('fr', 'nav.learn')).toBe('Apprendre')
  })

  it('falls back to English rather than showing a blank', () => {
    expect(translate('fr', 'missing.key' as never)).toBe('missing.key')
  })

  it('fills in values', () => {
    expect(translate('en', 'course.weekOf', { week: 3, total: 20 })).toContain('3')
    expect(translate('en', 'course.weekOf', { week: 3, total: 20 })).toContain('20')
  })

  it('leaves a placeholder alone when nothing is given for it', () => {
    expect(translate('en', 'course.weekOf')).toContain('{week}')
  })
})
