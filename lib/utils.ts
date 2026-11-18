// lib/utils.ts — Utility functions

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind class merge utility */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** สร้างชื่อ avatar แบบ anonymous "Adjective Noun" */
const ADJECTIVES = [
  'Warm', 'Quiet', 'Gentle', 'Soft', 'Calm', 'Kind', 'Sweet', 'Bright',
  'Still', 'Golden', 'Silver', 'Tender', 'Peaceful', 'Cozy', 'Serene',
]
const NOUNS = [
  'Maple', 'Star', 'Pebble', 'Clover', 'Cloud', 'River', 'Stone', 'Fern',
  'Willow', 'Brook', 'Ember', 'Ash', 'Cedar', 'Reed', 'Mist',
]

export function generateAvatarName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

/** สร้าง URL-friendly slug จากชื่อสัตว์ */
export function generateSlug(name: string, floorId: number, position: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${base}-${floorId}-${position}`
}

/** Format จำนวนแบบ compact (1,234 → 1.2k) */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** Format ปี เป็น "2010 – 2024" หรือ "2024" */
export function formatYears(birthYear?: number | null, deathYear?: number | null): string {
  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`
  if (deathYear) return `${deathYear}`
  if (birthYear) return `b. ${birthYear}`
  return ''
}

/** คำนวณอายุ */
export function calculateAge(birthYear?: number | null, deathYear?: number | null): number | null {
  if (!birthYear || !deathYear) return null
  return deathYear - birthYear
}

/** ชื่อ tribute type เป็น emoji + label */
export function tributeLabel(type: string): { emoji: string; label: string } {
  const map: Record<string, { emoji: string; label: string }> = {
    candle:         { emoji: '🕯️', label: 'Candle' },
    flower:         { emoji: '🌸', label: 'Flower' },
    treat_bone:     { emoji: '🦴', label: 'Treat' },
    treat_icecream: { emoji: '🍦', label: 'Treat' },
    treat_ball:     { emoji: '🎾', label: 'Treat' },
  }
  return map[type] ?? { emoji: '💝', label: 'Tribute' }
}

/** Time ago (simple) */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/** ชื่อ floor ที่กำหนดไว้ */
const FLOOR_NAMES: Record<number, string> = {
  1: 'Ground Floor', 2: 'Warm Hearth', 3: 'Candle Light', 4: 'Fern Valley',
  5: 'Snowy Pine', 6: 'Northern Lights', 7: 'Golden Leaf', 8: 'Starry Night',
  9: 'Apple Blossom', 10: 'Rose Evening', 11: 'Lilac Garden', 12: 'Ivy Cottage',
  13: 'Misty Hill', 14: 'Orange Grove', 15: 'Cotton Cloud', 16: 'Quiet Forest',
  17: 'Coral Reef', 18: 'Starlit Garden', 19: 'Twilight Path', 20: 'Silent Snow',
  21: 'Spring Orchard', 22: 'River Song', 23: 'Morning Star', 24: 'Blossom Lane',
  25: 'Hidden Garden', 26: 'Cherry Hill', 27: 'Sunflower Hill', 28: 'Lantern Bay',
  29: 'Willow Creek', 30: 'Autumn Path', 31: 'Moonlit Meadow', 32: 'Quiet Harbor',
  33: 'Rainbow Meadow',
}

export function getFloorName(floorId: number): string {
  return FLOOR_NAMES[floorId] ?? `Floor ${floorId}`
}

/** Country code → flag emoji ("TH" → 🇹🇭) */
export function flagEmoji(cc: string): string {
  if (!/^[A-Za-z]{2}$/.test(cc) || cc.toUpperCase() === 'XX') return '🌍' // country unknown
  return cc.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

/** Portrait emoji + gradient per species, for pets without a photo */
export const SPECIES_LOOK = {
  dog:   { emoji: '🐶', from: '#DCE8F5', to: '#B9CFEA', label: 'Dog' },
  cat:   { emoji: '🐱', from: '#FBEFD5', to: '#F1D9A6', label: 'Cat' },
  other: { emoji: '🐰', from: '#E1F1E8', to: '#BFE0CC', label: 'Other' },
} as const

/** Uploaded photos arrive as compressed data URLs; accept only real image types under ~1.5 MB. */
export function isPhotoDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.length < 2_000_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)
}
