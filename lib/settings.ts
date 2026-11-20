'use client'
// lib/settings.ts — Display preferences saved in this browser (graphics quality, how many visitors to show,
// how fast you walk and the view turns).
// Changing one tells open pages at once, so the hall updates without a reload.

import { useEffect, useState } from 'react'

export type GraphicsPref = 'auto' | 'high' | 'low'
export type CrowdPref = 'auto' | 'few' | 'many'
export type SpeedPref = 'slow' | 'normal' | 'fast'

const DEFAULTS = { 'pm-graphics': 'auto', 'pm-crowd': 'auto', 'pm-walk': 'normal', 'pm-turn': 'normal' } as const
type Key = keyof typeof DEFAULTS
const EVENT = 'mepawry:prefs'

export function getPref<T extends string>(key: Key): T {
  try { return (localStorage.getItem(key) ?? DEFAULTS[key]) as T } catch { return DEFAULTS[key] as T }
}

export function setPref(key: Key, value: string) {
  try { localStorage.setItem(key, value) } catch { /* private mode: still applies until reload */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }))
}

export function usePref<T extends string>(key: Key): T {
  const [v, setV] = useState<T>(DEFAULTS[key] as T)
  useEffect(() => {
    setV(getPref<T>(key))
    const on = (e: Event) => { const d = (e as CustomEvent<{ key: Key; value: T }>).detail; if (d.key === key) setV(d.value) }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [key])
  return v
}

/** How many other visitors the hall draws at most. */
export function crowdLimit(pref: CrowdPref, low: boolean) {
  return pref === 'few' ? 8 : pref === 'many' ? (low ? 40 : 60) : low ? 20 : 40
}

/** Walking speed: slower is gentler for people who get dizzy. */
export const walkFactor = (p: SpeedPref) => (p === 'slow' ? 0.55 : p === 'fast' ? 1.5 : 1)
/** How fast dragging turns the view (and how quickly the camera swings round by itself). */
export const turnFactor = (p: SpeedPref) => (p === 'slow' ? 0.45 : p === 'fast' ? 1.6 : 1)
