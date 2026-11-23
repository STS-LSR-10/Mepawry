// lib/adminStats.ts — The numbers on the admin page (/admin): visitors and their countries, purchases (from Stripe),
// and what the AI translation cost this month. Days are Bangkok days. Server only.

import { db, must } from '@/lib/data'
import { stripe } from '@/lib/payments'

export type Period = 'day' | 'week' | 'month' | 'year'
export const PERIODS: Period[] = ['day', 'week', 'month', 'year']

const BKK = 7 * 3_600_000
/** Today's date in Bangkok, YYYY-MM-DD (what daily_visits counts by). */
export const bangkokDay = (t = Date.now()) => new Date(t + BKK).toISOString().slice(0, 10)

/** First and last Bangkok day of a period ending today: today, the last 7 days, this month, this year. */
export function range(p: Period): { from: string; to: string; since: number } {
  const to = bangkokDay()
  const [y, m] = to.split('-')
  const from = p === 'day' ? to : p === 'week' ? bangkokDay(Date.now() - 6 * 86_400_000) : p === 'month' ? `${y}-${m}-01` : `${y}-01-01`
  return { from, to, since: Date.parse(`${from}T00:00:00+07:00`) } // since: the period's start as a timestamp (ms)
}

export interface VisitorStats { visitors: number; countries: { country: string; n: number }[]; days: { day: string; n: number }[] }

export async function visitorStats(p: Period): Promise<VisitorStats> {
  const { from, to } = range(p)
  return must(await db().rpc('visitor_stats', { p_from: from, p_to: to })) as VisitorStats
}

export interface PurchaseStats {
  count: number
  totalThb: number
  byKind: Record<string, number>
  byCountry: { country: string; n: number; thb: number }[]
  error?: string
}

/** Paid Stripe Checkouts in the period (what was bought, how much, and the buyer's billing country). */
export async function purchaseStats(p: Period): Promise<PurchaseStats> {
  const out: PurchaseStats = { count: 0, totalThb: 0, byKind: {}, byCountry: [] }
  if (!process.env.STRIPE_SECRET_KEY) return { ...out, error: 'Stripe isn’t set up on this server' }
  const countries = new Map<string, { n: number; thb: number }>()
  try {
    let seen = 0
    // shortcut: reads at most 1,000 sessions per period; plenty for now, move to a purchases table if sales grow
    for await (const s of stripe().checkout.sessions.list({ created: { gte: Math.floor(range(p).since / 1000) }, limit: 100 })) {
      if (++seen > 1000) break
      if (s.status !== 'complete' || s.payment_status !== 'paid') continue
      const thb = (s.amount_total ?? 0) / 100
      const kind = s.metadata?.kind ?? 'other'
      const country = s.customer_details?.address?.country ?? 'XX'
      out.count++; out.totalThb += thb
      out.byKind[kind] = (out.byKind[kind] ?? 0) + 1
      const c = countries.get(country) ?? { n: 0, thb: 0 }
      c.n++; c.thb += thb; countries.set(country, c)
    }
  } catch (e) {
    return { ...out, error: e instanceof Error ? e.message : String(e) }
  }
  out.byCountry = [...countries].map(([country, v]) => ({ country, ...v })).sort((a, b) => b.n - a.n)
  return out
}

// Prices, from the providers' pricing pages (Nov 2026). Workers AI: 10,000 free neurons a day, then $0.011 per 1,000;
// m2m100 counts 31,050 neurons per million tokens, in and out. Gemini 3.5 Flash-Lite (paid): $0.30 in / $2.50 out per M.
export const WORKERS_FREE_NEURONS = 10_000
const NEURONS_PER_TOKEN: Record<string, number> = { '@cf/meta/m2m100-1.2b': 31_050 / 1e6 }
const USD_PER_NEURON = 0.011 / 1000
const GEMINI_USD = { in: 0.30 / 1e6, out: 2.50 / 1e6 }

export interface AiCosts {
  month: string
  calls: number
  inputTokens: number
  outputTokens: number
  estimated: boolean // some token counts are estimates
  workers: { neurons: number; neuronsToday: number; billableNeurons: number; usd: number; calls: number }
  gemini: { inputTokens: number; outputTokens: number; usd: number; calls: number }
  usd: number
}

/** AI used this (Bangkok) month: tokens, Workers AI neurons against the free daily allowance, and the cost. */
export async function aiCosts(): Promise<AiCosts> {
  const { from, since } = range('month')
  const rows = (must(await db().from('ai_usage').select('created_at, provider, model, input_tokens, output_tokens, estimated')
    .gte('created_at', new Date(since).toISOString()).limit(50_000))) as
    { created_at: string; provider: string; model: string; input_tokens: number; output_tokens: number; estimated: boolean }[] ?? []
  const today = bangkokDay()
  const perDay = new Map<string, number>()
  const c: AiCosts = {
    month: from.slice(0, 7), calls: rows.length, inputTokens: 0, outputTokens: 0, estimated: false,
    workers: { neurons: 0, neuronsToday: 0, billableNeurons: 0, usd: 0, calls: 0 },
    gemini: { inputTokens: 0, outputTokens: 0, usd: 0, calls: 0 }, usd: 0,
  }
  for (const r of rows) {
    c.inputTokens += r.input_tokens; c.outputTokens += r.output_tokens; c.estimated ||= r.estimated
    if (r.provider === 'gemini') {
      c.gemini.calls++; c.gemini.inputTokens += r.input_tokens; c.gemini.outputTokens += r.output_tokens
      c.gemini.usd += r.input_tokens * GEMINI_USD.in + r.output_tokens * GEMINI_USD.out
    } else {
      const n = (r.input_tokens + r.output_tokens) * (NEURONS_PER_TOKEN[r.model] ?? NEURONS_PER_TOKEN['@cf/meta/m2m100-1.2b'])
      const day = bangkokDay(Date.parse(r.created_at))
      c.workers.calls++; c.workers.neurons += n
      perDay.set(day, (perDay.get(day) ?? 0) + n)
    }
  }
  // the free allowance is per day: only what goes over it on a day is billed
  for (const n of perDay.values()) c.workers.billableNeurons += Math.max(0, n - WORKERS_FREE_NEURONS)
  c.workers.neuronsToday = perDay.get(today) ?? 0
  c.workers.usd = c.workers.billableNeurons * USD_PER_NEURON
  c.usd = c.workers.usd + c.gemini.usd
  return c
}
