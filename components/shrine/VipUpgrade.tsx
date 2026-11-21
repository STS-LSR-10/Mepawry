'use client'
// components/shrine/VipUpgrade.tsx — On a shrine page: shows the VIP badge, lets the owner see the VIP pavilion
// upgrade (payment opens soon), and lets an admin place or remove the pet right now.

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useAccount } from '@/lib/account'
import type { Pet } from '@/types'

export const VIP_PRICE_THB = 299 // shortcut: placeholder price until payments are connected; set the real one then

export function VipUpgrade({ pet, isOwner, onChange }: { pet: Pet; isOwner: boolean; onChange: (p: Pet) => void }) {
  const { user } = useAccount()
  const admin = !!user?.isAdmin
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inVip = pet.vip_position != null

  const act = async (action: 'place' | 'remove') => {
    setBusy(true); setError('')
    const r = await fetch(`/api/pets/${pet.id}/vip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null)
    const d = await r?.json().catch(() => null)
    setBusy(false)
    if (!r?.ok) return setError(d?.error ?? 'Couldn’t update. Please try again.')
    onChange(d.pet); setOpen(false)
  }

  if (inVip) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-gradient-to-r from-[#F3D99B] to-[#D9B26A] px-4 py-1.5 text-xs font-bold text-[#3A2612] shadow">
          ✿ In the VIP pavilion · Dome {pet.floor_id}, niche {pet.vip_position! + 1}
        </span>
        {admin && <button disabled={busy} onClick={() => act('remove')} className="text-xs text-[#FFE2C0]/80 underline">Remove from VIP</button>}
      </div>
    )
  }
  if (!isOwner && !admin) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-3 rounded-full border border-[#E8C365]/60 bg-[#E8C365]/15 px-4 py-1.5 text-xs font-semibold text-[#FFE2A8] hover:bg-[#E8C365]/25">
        ✿ Move {pet.name} to the VIP pavilion
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="The VIP pavilion">
        <div className="space-y-4">
          <p className="text-sm text-[#5C5046]">
            A big arched niche of {pet.name}’s own in the domed glass pavilion on the terrace of Dome {pet.floor_id}, softly lit under a crystal chandelier.
          </p>
          <ul className="space-y-1.5 text-sm text-[#2A1E17]">
            <li>🌸 A large gold-framed portrait, easy to find</li>
            <li>✨ A warm glow lighting the niche</li>
            <li>📍 In the VIP pavilion at the far end of the garden</li>
            <li>🕯️ Candles, flowers and the guestbook stay the same</li>
          </ul>
          {error && <p role="alert" className="text-sm text-[#C0392B]">{error}</p>}
          {admin ? (
            <button disabled={busy} onClick={() => act('place')} className="w-full rounded-2xl bg-[#D9823B] py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Placing…' : 'Admin: place in the VIP pavilion now'}
            </button>
          ) : (
            <button disabled className="w-full rounded-2xl bg-[#E8DFD6] py-3 text-sm font-semibold text-[#8E8278]">
              ฿{VIP_PRICE_THB} one-time · Payments opening soon
            </button>
          )}
        </div>
      </Modal>
    </>
  )
}
