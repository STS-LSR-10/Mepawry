// lib/stars.ts — Memorials a visitor has starred, kept in this browser (no sign-in needed). Shown on My page.
// shortcut: per browser only; move to the account if people ask to see stars on another phone.

import { useEffect, useState } from 'react'

export interface Star { slug: string; name: string; species: string; photo: string | null }

const KEY = 'pm-stars'
const EVENT = 'mepawry:stars'

function read(): Star[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** The starred memorials, newest first; re-reads when any star changes on the page. */
export function useStars() {
  const [stars, setStars] = useState<Star[]>([])
  useEffect(() => {
    const update = () => setStars(read())
    update()
    window.addEventListener(EVENT, update); window.addEventListener('storage', update)
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update) }
  }, [])
  return stars
}

export function toggleStar(star: Star) {
  const list = read(), on = list.some(s => s.slug === star.slug)
  const next = on ? list.filter(s => s.slug !== star.slug) : [star, ...list]
  try { localStorage.setItem(KEY, JSON.stringify(next.slice(0, 200))) } catch {}
  window.dispatchEvent(new Event(EVENT))
  return !on
}
