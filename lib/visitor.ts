'use client'
// lib/visitor.ts — This browser's visitor identity, live "here now" count and the real activity feed

import { useEffect, useState } from 'react'
import { generateAvatarName } from '@/lib/utils'

export interface ActivityItem { who: string; act: string; pet: string; slug: string; cc: string; at: string }

/** A random id and friendly name, kept in this browser so the same visitor keeps the same name. */
export function getVisitor(): { id: string; name: string } {
  try {
    const saved = JSON.parse(localStorage.getItem('pm-visitor') ?? 'null')
    if (saved?.id && saved?.name) return saved
    const v = { id: crypto.randomUUID(), name: generateAvatarName() }
    localStorage.setItem('pm-visitor', JSON.stringify(v))
    return v
  } catch {
    return { id: crypto.randomUUID(), name: generateAvatarName() }
  }
}

/** Renames this browser's visitor (guests) and tells open pages, so the hall's name tag updates at once. */
export function setVisitorName(name: string) {
  const clean = name.trim().slice(0, 40)
  if (!clean) return
  try { localStorage.setItem('pm-visitor', JSON.stringify({ ...getVisitor(), name: clean })) } catch {}
  window.dispatchEvent(new CustomEvent('mepawry:name', { detail: clean }))
}

/** Checks in every 25s and returns how many people are on the site right now (null until known). */
export function useOnlineCount(): number | null {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    const { id } = getVisitor()
    const ping = () => fetch('/api/presence', { method: 'POST', body: JSON.stringify({ id }) }).then(r => r.json()).then(d => setN(d.online)).catch(() => {})
    ping()
    const t = setInterval(ping, 25_000)
    return () => clearInterval(t)
  }, [])
  return n
}

/** Latest real activity, refreshed every 20s. */
export function useActivity(): ActivityItem[] {
  const [items, setItems] = useState<ActivityItem[]>([])
  useEffect(() => {
    const load = () => fetch('/api/activity').then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => {})
    load()
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [])
  return items
}

/** One line of activity: its template ({who}, {pet}) in the visitor's language (pass the page's t()). */
export function describe(it: ActivityItem, t: (s: string, v?: Record<string, string>) => string = (s, v) => s.replace('{who}', v?.who ?? '').replace('{pet}', v?.pet ?? '')): string {
  const [lead, key] = splitIcon(it.act)
  return lead + t(key, { who: it.who, pet: it.pet })
}

/** A gift's emoji leads its line; the rest is the template to translate. */
export const splitIcon = (act: string): [string, string] => { const m = act.match(/^(\S+ )(\{who\}.*)$/u); return m && !/^\{/.test(m[1]) ? [m[1], m[2]] : ['', act] }
