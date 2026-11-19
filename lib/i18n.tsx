'use client'
// lib/i18n.tsx — The visitor's language for the core UI. Saved in this browser; the first visit follows the
// browser's language when we have it. t('English text', { name }) looks the text up in lib/i18n-dict.ts and falls
// back to English, so untranslated text still reads fine.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DICT, LANG_ORDER } from './i18n-dict'

export type Lang = 'en' | (typeof LANG_ORDER)[number]

export const LANGS: { code: Lang; name: string; english: string }[] = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'th', name: 'ไทย', english: 'Thai' },
  { code: 'zh', name: '中文', english: 'Chinese' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'id', name: 'Indonesia', english: 'Indonesian' },
  { code: 'ms', name: 'Melayu', english: 'Malay' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
]

const KEY = 'pm-lang'
type Vars = Record<string, string | number>

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const i = lang === 'en' ? -1 : LANG_ORDER.indexOf(lang)
  let s = (i >= 0 && DICT[text]?.[i]) || text
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && LANGS.some(l => l.code === saved)) return saved
  } catch { /* private mode */ }
  for (const pref of navigator.languages ?? [navigator.language]) {
    const code = pref.toLowerCase().split('-')[0]
    if (LANGS.some(l => l.code === code)) return code as Lang
  }
  return 'en'
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en') // English on the server; the visitor's language once mounted
  useEffect(() => setLangState(detect()), [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch {}
  }, [])
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>
}

export function useLang() {
  return useContext(Ctx)
}

/** t('English text', { name: 'Mochi' }) in the visitor's language. */
export function useT() {
  const { lang } = useContext(Ctx)
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang])
}

/** For server components: <T text="Back to the hall" />. */
export function T({ text, vars }: { text: string; vars?: Vars }) {
  return <>{useT()(text, vars)}</>
}

/** Opens the settings sheet from anywhere. */
export const openSettings = () => window.dispatchEvent(new Event('mepawry:settings'))
