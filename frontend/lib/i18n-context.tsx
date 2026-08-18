'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LANG, translate, type Lang, type StringKey } from '@/lib/i18n'

const STORAGE_KEY = 'yds120.lang'

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  // Starts at the default so the server and the first client render agree.
  // The stored choice is applied in an effect, which is one frame later and
  // avoids a hydration mismatch on every page.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'fr') setLangState(saved)
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }, [])

  const t = useCallback(
    (key: StringKey, values?: Record<string, string | number>) => translate(lang, key, values),
    [lang],
  )

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside an I18nProvider')
  return value
}
