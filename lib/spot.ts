// lib/spot.ts — Where you were in the hall (floor and position), so a refresh puts you back there.
// Forgotten after an hour away: then you start again at the park entrance.

const KEY = 'pm-spot'
const TTL = 60 * 60 * 1000

export interface Spot { floor: number; x: number; z: number; at: number }

export function loadSpot(): Spot | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Spot | null
    if (!s || Date.now() - s.at > TTL) return null
    if (![s.floor, s.x, s.z].every(Number.isFinite) || s.floor < 1) return null
    return s
  } catch { return null }
}

export function saveSpot(floor: number, x: number, z: number) {
  try { localStorage.setItem(KEY, JSON.stringify({ floor, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, at: Date.now() })) } catch {}
}
