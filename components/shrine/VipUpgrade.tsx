'use client'
// components/shrine/VipUpgrade.tsx — On a shrine page: shows the VIP badge, lets the owner see the VIP pavilion
// upgrade (payment opens soon), and lets an admin place or remove the pet right now.

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useAccount } from '@/lib/account'
import type { Pet } from '@/types'
import { useT } from '@/lib/i18n'
import { k } from '@/lib/tkey'
import { startCheckout } from '@/lib/checkout'

export { VIP_PRICE_THB } from '@/lib/decor'
import { VIP_PRICE_THB } from '@/lib/decor'

export function VipUpgrade({ pet, isOwner, onChange }: { pet: Pet; isOwner: boolean; onChange: (p: Pet) => void }) {
  const { user } = useAccount()
  const admin = !!user?.isAdmin
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inVip = pet.vip_position != null

  const act = async (action: 'place' | 'remove') => {
    setBusy(true); setError('')
    const r = await fetch(`/api/pets/${pet.id}/vip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null)
    const d = await r?.json().catch(() => null)
    setBusy(false)
    if (!r?.ok) return setError(d?.error ?? k('Couldn’t update. Please try again.'))
    onChange(d.pet); setOpen(false)
  }

  if (inVip) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-gradient-to-r from-[#F3D99B] to-[#D9B26A] px-4 py-1.5 text-xs font-bold text-[#3A2612] shadow">
          ✿ {t('In the VIP pavilion')} · {t('Dome {n}', { n: pet.floor_id })}, {t('VIP niche {n}', { n: pet.vip_position! + 1 })}
        </span>
        {admin && <button disabled={busy} onClick={() => act('remove')} className="text-xs text-[#FFE2C0]/80 underline">{t('Remove from VIP')}</button>}
      </div>
    )
  }
  if (!isOwner && !admin) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-3 rounded-full border border-[#E8C365]/60 bg-[#E8C365]/15 px-4 py-1.5 text-xs font-semibold text-[#FFE2A8] hover:bg-[#E8C365]/25">
        ✿ {t('Move {name} to the VIP pavilion', { name: pet.name })}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="The VIP pavilion">
        <div className="space-y-4">
          <p className="text-sm text-[#5C5046]">
            {t('A big arched niche of {name}’s own in the domed glass pavilion on the terrace of Dome {n}, softly lit under a crystal chandelier.', { name: pet.name, n: pet.floor_id })}
          </p>
          <ul className="space-y-1.5 text-sm text-[#2A1E17]">
            <li>🌸 {t('A large gold-framed portrait, easy to find')}</li>
            <li>✨ {t('A warm glow lighting the niche')}</li>
            <li>📍 {t('In the VIP pavilion at the far end of the garden')}</li>
            <li>🕯️ {t('Candles, flowers and the guestbook stay the same')}</li>
          </ul>
          {error && <p role="alert" className="text-sm text-[#C0392B]">{t(error)}</p>}
          {admin || !VIP_PRICE_THB ? (
            <button disabled={busy} onClick={() => act('place')} className="w-full rounded-2xl bg-[#D9823B] py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? t('Placing…') : admin ? t('Admin: place in the VIP pavilion now') : `✿ ${t('Move here')} · ${t('Free for now')}`}
            </button>
          ) : (
            <button disabled={busy} onClick={async () => { setBusy(true); setError(await startCheckout({ kind: 'vip', petId: pet.id })); setBusy(false) }}
              className="w-full rounded-2xl bg-[#D9823B] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
              {busy ? t('Opening payment…') : t('Pay ฿{n}', { n: VIP_PRICE_THB })}
            </button>
          )}
        </div>
      </Modal>
    </>
  )
}
