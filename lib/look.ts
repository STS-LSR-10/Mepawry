'use client'
// lib/look.ts — How your character looks: gender, skin tone, hair colour, top and bottom (style + colour).
// Saved in this browser, and on your account (Supabase user metadata) when you have one, so it follows you.
// Looks received from other visitors are cleaned with sanitizeLook before use.

import { useEffect, useState } from 'react'
import { useAccount } from '@/lib/account'

export type Gender = 'male' | 'female'
export type Top = 'hoodie' | 'tee' | 'sweater'
export type Bottom = 'pants' | 'shorts' | 'skirt'

export interface AvatarLook {
  gender: Gender
  skin: string
  hair: string
  top: Top
  topColor: string
  bottom: Bottom
  bottomColor: string
}

export const SKINS = ['#FCE4D4', '#F3CFB3', '#E0AC86', '#C68863', '#8D5A3B']
export const HAIRS = ['#6B4430', '#2B1D17', '#A0672F', '#E2B866', '#B5B0AC']
export const CLOTHES = ['#F8B98F', '#F6B4C6', '#C7B3EA', '#A9D3F2', '#B9DFB2', '#FFE08A', '#F2F0EA', '#4A5A7A', '#D9654F', '#2F3A36']
export const TOPS: { id: Top; label: string; emoji: string }[] = [
  { id: 'hoodie', label: 'Hoodie', emoji: '🧥' }, { id: 'tee', label: 'T-shirt', emoji: '👕' }, { id: 'sweater', label: 'Sweater', emoji: '🧶' },
]
export const BOTTOMS: { id: Bottom; label: string; emoji: string }[] = [
  { id: 'pants', label: 'Trousers', emoji: '👖' }, { id: 'shorts', label: 'Shorts', emoji: '🩳' }, { id: 'skirt', label: 'Skirt', emoji: '👗' },
]

export const defaultLook = (gender: Gender = 'male'): AvatarLook => gender === 'female'
  ? { gender, skin: SKINS[0], hair: HAIRS[0], top: 'hoodie', topColor: '#F6B4C6', bottom: 'skirt', bottomColor: '#C7B3EA' }
  : { gender, skin: SKINS[0], hair: HAIRS[0], top: 'hoodie', topColor: '#F8B98F', bottom: 'pants', bottomColor: '#C7B3EA' }

/** Accepts only known values, so a look from someone else can't inject anything odd. */
export function sanitizeLook(v: unknown, fallbackGender: Gender = 'male'): AvatarLook {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<AvatarLook>
  const gender: Gender = o.gender === 'female' ? 'female' : o.gender === 'male' ? 'male' : fallbackGender
  const d = defaultLook(gender)
  const pick = <T,>(val: unknown, list: readonly T[], def: T) => (list.includes(val as T) ? (val as T) : def)
  return {
    gender,
    skin: pick(o.skin, SKINS, d.skin),
    hair: pick(o.hair, HAIRS, d.hair),
    top: pick(o.top, TOPS.map(t => t.id), d.top),
    topColor: pick(o.topColor, CLOTHES, d.topColor),
    bottom: pick(o.bottom, BOTTOMS.map(b => b.id), d.bottom),
    bottomColor: pick(o.bottomColor, CLOTHES, d.bottomColor),
  }
}

export const lookKey = (l: AvatarLook) => [l.gender, l.skin, l.hair, l.top, l.topColor, l.bottom, l.bottomColor].join('|')

const KEY = 'pm-look'
const EVENT = 'mepawry:look'

function readLocal(): AvatarLook | null {
  try { const raw = localStorage.getItem(KEY); return raw ? sanitizeLook(JSON.parse(raw)) : null } catch { return null }
}

/** Shows a look on open pages without saving it (live preview while choosing). */
export const previewLook = (look: AvatarLook) => window.dispatchEvent(new CustomEvent(EVENT, { detail: look }))

/** Saves the look here and (if there's a session) on the account, and tells open pages to update. */
export async function saveLook(look: AvatarLook, account: ReturnType<typeof useAccount>) {
  try { localStorage.setItem(KEY, JSON.stringify(look)) } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: look }))
  if (account.user) await account.supabase()?.auth.updateUser({ data: { look } }).catch(() => null)
}

/** Your current look: account → this browser → a default from your profile's gender. */
export function useMyLook(): AvatarLook {
  const account = useAccount()
  const [look, setLook] = useState<AvatarLook>(() => defaultLook())
  useEffect(() => {
    const fromAccount = (account.user as { look?: unknown } | null)?.look
    setLook(fromAccount ? sanitizeLook(fromAccount) : readLocal() ?? defaultLook(account.profile?.gender))
  }, [account.user, account.profile])
  useEffect(() => {
    const on = (e: Event) => setLook((e as CustomEvent<AvatarLook>).detail)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return look
}
