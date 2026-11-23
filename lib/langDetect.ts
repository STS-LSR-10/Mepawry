// lib/langDetect.ts — Guessing what language a piece of text is in from its letters, for the translate button
// (browser) and the translate API (server). Shared, so no 'use client' here.

import type { Lang } from '@/lib/i18n'

// Which writing system a language uses. Different ones: surely another language. The same: ask the browser.
export const SCRIPT: Record<Lang, string> = {
  th: 'thai', ko: 'hangul', ja: 'cjk', zh: 'cjk', 'zh-TW': 'cjk', ar: 'arabic', ur: 'arabic', he: 'hebrew',
  ru: 'cyrillic', uk: 'cyrillic', el: 'greek', hi: 'devanagari', bn: 'bengali',
  en: 'latin', ms: 'latin', cs: 'latin', da: 'latin', de: 'latin', es: 'latin', fil: 'latin', fr: 'latin', id: 'latin',
  it: 'latin', sw: 'latin', hu: 'latin', nl: 'latin', nb: 'latin', pl: 'latin', pt: 'latin', ro: 'latin', fi: 'latin',
  sv: 'latin', vi: 'latin', tr: 'latin',
}
// A script only one of our languages uses tells us the language itself
export const ONLY: Record<string, string> = { thai: 'th', hangul: 'ko', hebrew: 'he', greek: 'el', devanagari: 'hi', bengali: 'bn' }

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
export const looksEnglish = (text: string) => {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? []
  return words.length >= 3 && words.filter(w => EN_WORDS.has(w)).length / words.length >= 0.2
}

/** Our language code for a text when its letters tell us, or null (e.g. Latin text that isn't English). */
export function guessLang(text: string): string | null {
  const script = scriptOf(text)
  if (!script) return null
  if (ONLY[script]) return ONLY[script]
  if (script === 'cjk') return /[\u3040-\u30FF]/.test(text) ? 'ja' : 'zh' // kana: Japanese
  if (script === 'cyrillic') return /[іїєґ]/i.test(text) ? 'uk' : 'ru'
  if (script === 'arabic') return /[ٹڈڑںےۓ]/.test(text) ? 'ur' : 'ar'
  if (script === 'latin' && looksEnglish(text)) return 'en'
  return null
}
