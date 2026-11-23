// lib/translate.ts — Translates text people wrote (an epitaph, a guestbook note, a board post or comment) on the
// server, once per text and language: the result is kept in the translations table for the next reader.
//
// Which translator: TRANSLATE_PROVIDER = 'workers-ai' (default: Cloudflare Workers AI, m2m100, in this account) or
// 'gemini' (Google Gemini; needs the GEMINI_API_KEY secret, model GEMINI_MODEL, default gemini-3.5-flash-lite).
// Only texts already saved on the site can be translated (looked up by kind and id), so nobody can use this to
// translate anything they like on our bill.

import { createHash } from 'node:crypto'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { db, must } from '@/lib/data'
import { guessLang, SCRIPT } from '@/lib/langDetect'

export const KINDS = { epitaph: ['pets', 'epitaph'], guestbook: ['guestbook', 'message'], post: ['posts', 'body'], comment: ['post_comments', 'body'] } as const
export type Kind = keyof typeof KINDS
const MAX = 2000 // characters: longer texts aren't translated here (the button falls back to Google Translate)

export const isLang = (v: unknown): v is string => typeof v === 'string' && v in SCRIPT

/** The translation of a saved text into `to`, or an error the button handles by falling back to Google Translate. */
export async function translateSaved(kind: Kind, id: string, to: string, fromHint?: string):
  Promise<{ text: string; cached: boolean } | { error: string; status: number }> {
  const [table, column] = KINDS[kind]
  const row = must(await db().from(table).select(column).eq('id', id).maybeSingle()) as Record<string, string | null> | null
  const source = row?.[column]?.trim()
  if (!source) return { error: 'Not found', status: 404 }
  if (source.length > MAX) return { error: 'Too long to translate here', status: 413 }

  const hash = createHash('sha256').update(source).digest('hex')
  const kept = must(await db().from('translations').select('text').eq('source_hash', hash).eq('lang', to).maybeSingle()) as { text: string } | null
  if (kept) return { text: kept.text, cached: true }

  const from = isLang(fromHint) ? fromHint : guessLang(source)
  const provider = process.env.TRANSLATE_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY ? 'gemini' : 'workers-ai'
  let text: string | null
  try {
    text = provider === 'gemini' ? await viaGemini(source, to) : await viaWorkersAi(source, from, to)
  } catch (e) {
    console.error(`[translate] ${provider} failed:`, e)
    return { error: 'Translation failed', status: 502 }
  }
  if (!text) return { error: 'Can’t tell what language this is', status: 422 }
  // a second reader at the same moment may have saved it first: that's fine, keep theirs
  await db().from('translations').upsert({ source_hash: hash, lang: to, text, provider }, { ignoreDuplicates: true })
  return { text, cached: false }
}

// m2m100's codes, where they differ from ours (it has no separate Traditional Chinese)
const M2M: Record<string, string> = { 'zh-TW': 'zh', fil: 'tl', nb: 'no' }

type Ai = { run: (model: string, input: Record<string, unknown>) => Promise<{ translated_text?: string }> }

async function viaWorkersAi(text: string, from: string | null, to: string): Promise<string | null> {
  if (!from) return null // m2m100 must be told the source language
  let ai: Ai | undefined
  try { ai = (getCloudflareContext().env as { AI?: Ai }).AI } catch { /* not on Cloudflare */ }
  if (!ai) throw new Error('No Workers AI binding (local `next dev` has none; the live site does)')
  const out = await ai.run('@cf/meta/m2m100-1.2b', { text, source_lang: M2M[from] ?? from, target_lang: M2M[to] ?? to })
  return out.translated_text?.trim() || null
}

async function viaGemini(text: string, to: string): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const language = new Intl.DisplayNames(['en'], { type: 'language' }).of(to === 'zh-TW' ? 'zh-Hant' : to) ?? to
  const prompt = `Translate this text, written in memory of a pet, into ${language}. Keep the warmth and tone. ` +
    `Keep names of pets and people as they are. Reply with the translation only.\n\n${text}`
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim() || null
}
