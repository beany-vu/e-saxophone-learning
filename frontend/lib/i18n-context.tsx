'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LANG, defaultNaming, translate, type Lang, type StringKey } from '@/lib/i18n'
import { nameNote, type NoteNaming } from '@/lib/notes'

const STORAGE_KEY = 'yds120.lang'
const NAMING_KEY = 'yds120.noteNaming'

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey, values?: Record<string, string | number>) => string
  /** C D E, or do re mi. */
  naming: NoteNaming
  setNaming: (naming: NoteNaming) => void
  /** A note in the reader's chosen naming. Use this, never noteName directly. */
  n: (midi: number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  // Starts at the default so the server and the first client render agree.
  // The stored choice is applied in an effect, which is one frame later and
  // avoids a hydration mismatch on every page.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [naming, setNamingState] = useState<NoteNaming>('letters')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const known = ['en', 'fr', 'vi', 'nl', 'es']
    const lang = saved && known.includes(saved) ? (saved as Lang) : DEFAULT_LANG
    setLangState(lang)

    // An explicit choice wins; otherwise follow whatever the language usually
    // does, since a French or Vietnamese reader expects do re mi.
    const savedNaming = localStorage.getItem(NAMING_KEY)
    setNamingState(
      savedNaming === 'letters' || savedNaming === 'solfege' ? savedNaming : defaultNaming(lang),
    )
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
    // Changing language moves the note naming with it, unless the reader has
    // already said what they want.
    if (!localStorage.getItem(NAMING_KEY)) setNamingState(defaultNaming(next))
  }, [])

  const setNaming = useCallback((next: NoteNaming) => {
    setNamingState(next)
    localStorage.setItem(NAMING_KEY, next)
  }, [])

  const t = useCallback(
    (key: StringKey, values?: Record<string, string | number>) => translate(lang, key, values),
    [lang],
  )

  const n = useCallback((midi: number) => nameNote(midi, naming), [naming])

  return (
    <I18nContext.Provider value={{ lang, setLang, t, naming, setNaming, n }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside an I18nProvider')
  return value
}
