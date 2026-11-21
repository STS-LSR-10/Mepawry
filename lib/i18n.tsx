'use client'
// lib/i18n.tsx — The visitor's language for the core UI. Saved in this browser; the first visit follows the
// browser's language when we have it. Each language lives in lib/locales/<code>.ts (an array in the order of
// lib/locales/keys.ts) and only the chosen one is downloaded. t('English text', { name }) falls back to English,
// so untranslated text still reads fine. Arabic, Hebrew and Urdu switch the page to right-to-left.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { KEYS } from './locales/keys'

export const LANGS = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'th', name: 'ไทย', english: 'Thai' },
  { code: 'ms', name: 'Bahasa Melayu', english: 'Malay' },
  { code: 'cs', name: 'Čeština', english: 'Czech' },
  { code: 'da', name: 'Dansk', english: 'Danish' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fil', name: 'Filipino', english: 'Filipino' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'id', name: 'Indonesia', english: 'Indonesian' },
  { code: 'it', name: 'Italiano', english: 'Italian' },
  { code: 'sw', name: 'Kiswahili', english: 'Swahili' },
  { code: 'hu', name: 'Magyar', english: 'Hungarian' },
  { code: 'nl', name: 'Nederlands', english: 'Dutch' },
  { code: 'nb', name: 'Norsk bokmål', english: 'Norwegian' },
  { code: 'pl', name: 'Polski', english: 'Polish' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
  { code: 'ro', name: 'Română', english: 'Romanian' },
  { code: 'fi', name: 'Suomi', english: 'Finnish' },
  { code: 'sv', name: 'Svenska', english: 'Swedish' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish' },
  { code: 'el', name: 'Ελληνικά', english: 'Greek' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
  { code: 'uk', name: 'Українська', english: 'Ukrainian' },
  { code: 'he', name: 'עברית', english: 'Hebrew', rtl: true },
  { code: 'ur', name: 'اردو', english: 'Urdu', rtl: true },
  { code: 'ar', name: 'العربية', english: 'Arabic', rtl: true },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'zh', name: '中文', english: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: '中文（台灣）', english: 'Chinese (Traditional)' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
] as const

export type Lang = (typeof LANGS)[number]['code']

// One loader per language, so the bundler splits each into its own small file
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<{ default: string[] }>> = {
  th: () => import('./locales/th'), ms: () => import('./locales/ms'), cs: () => import('./locales/cs'),
  da: () => import('./locales/da'), de: () => import('./locales/de'), es: () => import('./locales/es'),
  fil: () => import('./locales/fil'), fr: () => import('./locales/fr'), id: () => import('./locales/id'),
  it: () => import('./locales/it'), sw: () => import('./locales/sw'), hu: () => import('./locales/hu'),
  nl: () => import('./locales/nl'), nb: () => import('./locales/nb'), pl: () => import('./locales/pl'),
  pt: () => import('./locales/pt'), ro: () => import('./locales/ro'), fi: () => import('./locales/fi'),
  sv: () => import('./locales/sv'), vi: () => import('./locales/vi'), tr: () => import('./locales/tr'),
  el: () => import('./locales/el'), ru: () => import('./locales/ru'), uk: () => import('./locales/uk'),
  he: () => import('./locales/he'), ur: () => import('./locales/ur'), ar: () => import('./locales/ar'),
  hi: () => import('./locales/hi'), bn: () => import('./locales/bn'), ko: () => import('./locales/ko'),
  zh: () => import('./locales/zh'), 'zh-TW': () => import('./locales/zh-TW'), ja: () => import('./locales/ja'),
}

const KEY = 'pm-lang'
type Vars = Record<string, string | number>
type Table = Map<string, string>

export function translate(table: Table | null, text: string, vars?: Vars): string {
  let s = table?.get(text) || text
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

const isLang = (c: string | null): c is Lang => !!c && LANGS.some(l => l.code === c)

/** Browser codes that differ from ours (old or regional ones). */
function fromBrowser(tag: string): Lang | null {
  const t = tag.toLowerCase()
  if (/^zh-(tw|hk|mo|hant)/.test(t)) return 'zh-TW'
  const base = t.split('-')[0]
  const alias: Record<string, Lang> = { no: 'nb', nn: 'nb', tl: 'fil', iw: 'he', in: 'id' }
  return alias[base] ?? (isLang(base) ? base : null)
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLang(saved)) return saved
  } catch { /* private mode */ }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const l = fromBrowser(tag)
    if (l) return l
  }
  return 'en'
}

const Ctx = createContext<{ lang: Lang; table: Table | null; setLang: (l: Lang) => void }>({ lang: 'en', table: null, setLang: () => {} })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en') // English on the server; the visitor's language once mounted
  const [table, setTable] = useState<Table | null>(null)
  useEffect(() => setLangState(detect()), [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = LANGS.some(l => l.code === lang && 'rtl' in l) ? 'rtl' : 'ltr'
    if (lang === 'en') { setTable(null); return }
    let live = true
    LOADERS[lang]().then(m => { if (live) setTable(new Map(KEYS.map((k, i) => [k, m.default[i]]))) }).catch(() => {})
    return () => { live = false }
  }, [lang])
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch {}
  }, [])
  return <Ctx.Provider value={{ lang, table, setLang }}>{children}</Ctx.Provider>
}

export function useLang() {
  const { lang, setLang } = useContext(Ctx)
  return { lang, setLang }
}

/** t('English text', { name: 'Mochi' }) in the visitor's language. */
export function useT() {
  const { table } = useContext(Ctx)
  return useCallback((text: string, vars?: Vars) => translate(table, text, vars), [table])
}

export { k } from './tkey'

/** For server components: <T text="Back to the hall" />. */
export function T({ text, vars }: { text: string; vars?: Vars }) {
  return <>{useT()(text, vars)}</>
}

/** Opens the settings sheet from anywhere. */
export const openSettings = () => window.dispatchEvent(new Event('mepawry:settings'))
