import { describe, it, expect } from 'vitest'
import { STRINGS, LANGUAGES, translate, defaultNaming, type Lang } from '@/lib/i18n'

const langs = LANGUAGES.map((l) => l.code)

describe('the dictionaries', () => {
  it('offers the five languages', () => {
    expect(langs).toEqual(['en', 'fr', 'vi', 'nl', 'es'])
  })

  it('labels each language in its own words', () => {
    // Someone looking for their language is not reading the current one.
    expect(LANGUAGES.find((l) => l.code === 'vi')?.label).toBe('Tiếng Việt')
    expect(LANGUAGES.find((l) => l.code === 'nl')?.label).toBe('Nederlands')
    expect(LANGUAGES.find((l) => l.code === 'es')?.label).toBe('Español')
  })

  it('starts each language on the note naming it actually uses', () => {
    expect(defaultNaming('en')).toBe('letters')
    expect(defaultNaming('nl')).toBe('letters')
    expect(defaultNaming('fr')).toBe('solfege')
    expect(defaultNaming('es')).toBe('solfege')
    expect(defaultNaming('vi')).toBe('solfege')
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
    langs
      .filter((l) => l !== 'en')
      .forEach((lang) => {
        const same = Object.keys(STRINGS.en).filter((k) => STRINGS[lang][k] === STRINGS.en[k])
        // A few words are the same in any two languages, but not most of them.
        expect(same.length, `${lang} looks untranslated`).toBeLessThan(
          Object.keys(STRINGS.en).length / 4,
        )
      })
  })
})

describe('translate', () => {
  it('returns the string for the language asked for', () => {
    expect(translate('en', 'nav.learn')).toBe('Learn')
    expect(translate('fr', 'nav.learn')).toBe('Apprendre')
    expect(translate('vi', 'nav.learn')).toBe('Học')
    expect(translate('nl', 'nav.learn')).toBe('Leren')
    expect(translate('es', 'nav.learn')).toBe('Aprender')
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
