'use client'
// components/ui/Translatable.tsx — Text people wrote (an epitaph, a guestbook note, a board post). When it isn't in the
// language the reader picked, a small "Translate to …" button appears under it. Chrome on computers translates it in
// place with its built-in, on-device translator; elsewhere (or if that fails) it's a link to Google Translate in a new tab.

import { useEffect, useState } from 'react'
import { LANGS, useLang, useT, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Which writing system a language uses. Different ones: surely another language. The same: ask the browser.
const SCRIPT: Record<Lang, string> = {
  th: 'thai', ko: 'hangul', ja: 'cjk', zh: 'cjk', 'zh-TW': 'cjk', ar: 'arabic', ur: 'arabic', he: 'hebrew',
  ru: 'cyrillic', uk: 'cyrillic', el: 'greek', hi: 'devanagari', bn: 'bengali',
  en: 'latin', ms: 'latin', cs: 'latin', da: 'latin', de: 'latin', es: 'latin', fil: 'latin', fr: 'latin', id: 'latin',
  it: 'latin', sw: 'latin', hu: 'latin', nl: 'latin', nb: 'latin', pl: 'latin', pt: 'latin', ro: 'latin', fi: 'latin',
  sv: 'latin', vi: 'latin', tr: 'latin',
}
// A script only one of our languages uses tells us the language itself
const ONLY: Record<string, string> = { thai: 'th', hangul: 'ko', hebrew: 'he', greek: 'el', devanagari: 'hi', bengali: 'bn' }

const RANGES: [string, RegExp][] = [
  ['thai', /[฀-๿]/g], ['hangul', /[가-힯ᄀ-ᇿ]/g], ['cjk', /[぀-ヿ一-鿿]/g],
  ['arabic', /[؀-ۿ]/g], ['hebrew', /[֐-׿]/g], ['cyrillic', /[Ѐ-ӿ]/g],
  ['greek', /[Ͱ-Ͽ]/g], ['devanagari', /[ऀ-ॿ]/g], ['bengali', /[ঀ-৿]/g], ['latin', /[A-Za-zÀ-ɏ]/g],
]

/** The writing system most of the letters are in. */
export function scriptOf(text: string): string | null {
  let best: string | null = null, most = 0
  for (const [name, re] of RANGES) { const n = text.match(re)?.length ?? 0; if (n > most) { most = n; best = name } }
  return best
}

// Fallback for Latin text when the browser can't detect languages: does it read as English?
const EN_WORDS = new Set('the and you your my our was were is are of to in for with love loved miss always forever best friend we he she his her it i'.split(' '))
const looksEnglish = (text: string) => {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? []
  return words.length >= 3 && words.filter(w => EN_WORDS.has(w)).length / words.length >= 0.2
}

/** A browser API call that may never answer (no model, or a hidden tab): give up after `ms`. */
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))])

/* eslint-disable @typescript-eslint/no-explicit-any */
const api = () => globalThis as any
let detector: Promise<any> | null = null
async function detect(text: string): Promise<string | null> {
  try {
    if (!('LanguageDetector' in api())) return null
    if ((await within(api().LanguageDetector.availability(), 1500)) !== 'available') return null
    detector ??= within(api().LanguageDetector.create(), 3000)
    const [top] = await within((await detector).detect(text), 2000) as { detectedLanguage: string; confidence: number }[]
    return top && top.confidence > 0.5 ? String(top.detectedLanguage) : null
  } catch { detector = null; return null }
}

/** Can Chrome's own translator do this pair here, on this device? */
async function canTranslate(from: string, to: string): Promise<boolean> {
  try {
    if (!('Translator' in api())) return false
    const a = await within(api().Translator.availability({ sourceLanguage: from, targetLanguage: to }), 1500)
    return a === 'available' || a === 'downloadable' || a === 'downloading'
  } catch { return false }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const base = (code: string) => code.toLowerCase().split('-')[0]
/** zh and zh-TW share "zh"; everything else compares by its base code. */
const same = (a: string, b: string) => (base(a) === 'zh' && base(b) === 'zh' ? a.toLowerCase().includes('tw') === b.toLowerCase().includes('tw') || a === 'zh' || b === 'zh' : base(a) === base(b))

/** The text's language when we can tell, 'other' when it's surely not the reader's but we don't know which, null when it's theirs or unclear. */
async function foreignLang(text: string, lang: Lang): Promise<string | 'other' | null> {
  const script = scriptOf(text)
  if (!script || text.trim().length < 4) return null
  const detected = await detect(text)
  if (detected) return same(detected, lang) ? null : detected
  if (script !== SCRIPT[lang]) return ONLY[script] ?? (script === 'latin' && looksEnglish(text) ? 'en' : 'other')
  if (script === 'latin' && lang !== 'en' && looksEnglish(text)) return 'en'
  if (script === 'latin' && lang === 'en' && !looksEnglish(text) && text.split(/\s+/).length >= 4) return 'other'
  return null
}

// Codes the two translators use for our languages, where they differ from ours
const TRANSLATOR_CODE: Partial<Record<Lang, string>> = { 'zh-TW': 'zh-Hant' }
const GOOGLE_CODE: Partial<Record<Lang, string>> = { zh: 'zh-CN', 'zh-TW': 'zh-TW', fil: 'tl', nb: 'no', he: 'iw' }

export function Translatable({ text, className, quote = false, light = false }: {
  text: string
  className?: string
  /** wrap in “ ” (epitaphs) */
  quote?: boolean
  /** the button on a dark background */
  light?: boolean
}) {
  const { lang } = useLang()
  const t = useT()
  const [from, setFrom] = useState<string | null>(null)
  const [shown, setShown] = useState<string | null>(null) // the translation, while it's showing
  const [busy, setBusy] = useState(false)
  const [inPlace, setInPlace] = useState(false) // Chrome's translator can do it here; otherwise the button is a link to Google Translate

  useEffect(() => {
    let live = true
    setShown(null); setInPlace(false)
    foreignLang(text, lang).then(async f => {
      if (!live) return
      setFrom(f)
      if (f && f !== 'other' && await canTranslate(f, TRANSLATOR_CODE[lang] ?? lang) && live) setInPlace(true)
    })
    return () => { live = false }
  }, [text, lang])

  const translate = async () => {
    if (shown) return setShown(null)
    setBusy(true)
    try {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const g = globalThis as any
      const tr: { translate: (s: string) => Promise<string> } = await within(g.Translator.create({ sourceLanguage: from, targetLanguage: TRANSLATOR_CODE[lang] ?? lang }), 20000) // may download the language pack first
      setShown(await within(tr.translate(text), 10000) as string)
    } catch {
      setInPlace(false) // didn't work here: the button becomes the Google Translate link
    }
    setBusy(false)
  }

  const native = LANGS.find(l => l.code === lang)?.name ?? lang
  const body = shown ?? text
  return (
    <>
      <p className={className} lang={shown ? lang : undefined}>{quote ? <>&ldquo;{body}&rdquo;</> : body}</p>
      {from && (() => {
        const cls = cn('mt-1 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-60',
          light ? 'text-[#FFE2C0]/80' : 'text-[#C67129]')
        const label = t('Translate to {lang}', { lang: native })
        // a plain link, so no browser blocks it as a pop-up
        if (!inPlace && !shown) return (
          <a href={`https://translate.google.com/?sl=auto&tl=${encodeURIComponent(GOOGLE_CODE[lang] ?? lang)}&text=${encodeURIComponent(text)}&op=translate`}
            target="_blank" rel="noopener noreferrer" className={cls}>
            <span aria-hidden>🌐</span>{label}
          </a>
        )
        return (
          <button type="button" onClick={translate} disabled={busy} className={cls}>
            <span aria-hidden>🌐</span>{busy ? t('Translating…') : shown ? t('Show original') : label}
          </button>
        )
      })()}
    </>
  )
}
