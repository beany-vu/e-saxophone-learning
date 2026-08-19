// Translations: one dictionary per language, each in its own file.
//
// No i18n library. This app needs string lookup and a language switch, and a
// routing-based library would put a locale segment in every URL for nothing.
// Tests do what a library would enforce: every language carries exactly the
// English keys, nothing is empty, and nothing is left as untranslated English.

import { en, type StringKey } from '@/lib/i18n.en'
import { fr } from '@/lib/i18n.fr'
import { vi } from '@/lib/i18n.vi'
import { nl } from '@/lib/i18n.nl'
import { es } from '@/lib/i18n.es'
import type { NoteNaming } from '@/lib/notes'

export type { StringKey }

export type Lang = 'en' | 'fr' | 'vi' | 'nl' | 'es'

export const LANGUAGES: { code: Lang; label: string; defaultNaming: NoteNaming }[] = [
  // `label` is each language's own name for itself, because a reader looking
  // for their language will not be reading the current one.
  //
  // `defaultNaming` is how that language usually names notes. English and
  // Dutch say C D E; French, Spanish and Vietnamese say do re mi. It is only
  // a starting point: the setting can be changed either way.
  { code: 'en', label: 'English', defaultNaming: 'letters' },
  { code: 'fr', label: 'Francais', defaultNaming: 'solfege' },
  { code: 'vi', label: 'Tiếng Việt', defaultNaming: 'solfege' },
  { code: 'nl', label: 'Nederlands', defaultNaming: 'letters' },
  { code: 'es', label: 'Español', defaultNaming: 'solfege' },
]

export const DEFAULT_LANG: Lang = 'en'

export const STRINGS: Record<Lang, Record<string, string>> = { en, fr, vi, nl, es }

/**
 * One string in one language. Unknown keys come back as the key itself, which
 * is ugly on screen and therefore gets noticed and fixed, rather than
 * disappearing silently.
 */
export function translate(
  lang: Lang,
  key: StringKey,
  values?: Record<string, string | number>,
): string {
  const table = STRINGS[lang] ?? STRINGS[DEFAULT_LANG]
  let text = table[key] ?? STRINGS[DEFAULT_LANG][key] ?? key
  if (values) {
    Object.entries(values).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value))
    })
  }
  return text
}

/** How a language names notes by default, before the reader says otherwise. */
export function defaultNaming(lang: Lang): NoteNaming {
  return LANGUAGES.find((l) => l.code === lang)?.defaultNaming ?? 'letters'
}
