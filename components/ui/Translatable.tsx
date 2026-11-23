'use client'
// components/ui/Translatable.tsx — Text people wrote (an epitaph, a guestbook note, a board post). When it isn't in the
// language the reader picked, a small "Translate to …" button appears under it, translating it in place: with Chrome's
// built-in on-device translator where there is one, otherwise on our server (/api/translate, kept for the next
// reader). Only if both fail, or for text that isn't saved yet, it's a link to Google Translate in a new tab.

import { useEffect, useState } from 'react'
import { LANGS, useLang, useT, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { looksEnglish, ONLY, SCRIPT, scriptOf } from '@/lib/langDetect'

export { scriptOf }

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

export function Translatable({ text, className, quote = false, light = false, source }: {
  text: string
  className?: string
  /** wrap in “ ” (epitaphs) */
  quote?: boolean
  /** the button on a dark background */
  light?: boolean
  /** where the text is saved, so the server can translate it (without it: Chrome's translator or Google Translate) */
  source?: { kind: 'epitaph' | 'guestbook' | 'post' | 'comment'; id: string }
}) {
  const { lang } = useLang()
  const t = useT()
  const [from, setFrom] = useState<string | null>(null)
  const [shown, setShown] = useState<string | null>(null) // the translation, while it's showing
  const [busy, setBusy] = useState(false)
  const [onDevice, setOnDevice] = useState(false) // Chrome's own translator can do this pair here
  const [failed, setFailed] = useState(false)     // in-place translation didn't work: offer Google Translate instead

  useEffect(() => {
    let live = true
    setShown(null); setOnDevice(false); setFailed(false)
    foreignLang(text, lang).then(async f => {
      if (!live) return
      setFrom(f)
      if (f && f !== 'other' && await canTranslate(f, TRANSLATOR_CODE[lang] ?? lang) && live) setOnDevice(true)
    })
    return () => { live = false }
  }, [text, lang])

  const translate = async () => {
    if (shown) return setShown(null)
    setBusy(true)
    let out: string | null = null
    if (onDevice) try {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const g = globalThis as any
      const tr: { translate: (s: string) => Promise<string> } = await within(g.Translator.create({ sourceLanguage: from, targetLanguage: TRANSLATOR_CODE[lang] ?? lang }), 20000) // may download the language pack first
      out = await within(tr.translate(text), 10000) as string
    } catch { setOnDevice(false) }
    if (!out && source) {
      const r = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...source, to: lang, from: from !== 'other' ? from : undefined }),
      }).catch(() => null)
      out = r?.ok ? ((await r.json().catch(() => null))?.text ?? null) : null
    }
    if (out) setShown(out)
    else setFailed(true) // the button becomes the Google Translate link
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
        if ((failed || (!onDevice && !source)) && !shown) return (
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

/** A pet's name in English letters (the owner's spelling), under the name, for readers whose language uses another alphabet. */
export function NameInLatin({ name, latin, className }: { name: string; latin?: string | null; className?: string }) {
  const { lang } = useLang()
  const script = scriptOf(name)
  if (!latin || !script || script === 'latin' || SCRIPT[lang] === script) return null
  return <p className={className} lang="en">{latin}</p>
}
