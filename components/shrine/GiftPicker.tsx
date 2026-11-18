'use client'
// components/shrine/GiftPicker.tsx — Choose a little gift to leave at a shrine.
// Free gifts: one every few days per visitor. Special gifts show a price; payment isn't connected yet.

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { getVisitor } from '@/lib/visitor'
import { CATEGORIES, FREE_GIFT_COOLDOWN_DAYS, SPECIAL_GIFT_SHOWS_DAYS, giftsFor, type Gift, type GiftCategory, type LeftGift } from '@/lib/gifts'

const waitKey = (petId: string) => `pm-gift-wait-${petId}`

function waitText(nextAt: string) {
  const ms = Date.parse(nextAt) - Date.now()
  const h = Math.ceil(ms / 3_600_000)
  return h > 24 ? `${Math.ceil(h / 24)} days` : h > 1 ? `${h} hours` : 'less than an hour'
}

export function GiftPicker({ open, onClose, petId, petName, onLeft }: {
  open: boolean
  onClose: () => void
  petId: string
  petName: string
  onLeft: (gift: LeftGift) => void
}) {
  const [tab, setTab] = useState<GiftCategory>('food')
  const [picked, setPicked] = useState<Gift | null>(null)
  const [nextAt, setNextAt] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Gift | null>(null)
  const [error, setError] = useState('')

  // Remember the wait from last time so the button says so before anyone taps it
  useEffect(() => {
    if (!open) return
    setSent(null); setError('')
    try {
      const saved = localStorage.getItem(waitKey(petId))
      setNextAt(saved && Date.parse(saved) > Date.now() ? saved : null)
    } catch { /* private mode: the server still enforces it */ }
  }, [open, petId])

  const cat = CATEGORIES.find(c => c.id === tab)!
  const items = giftsFor(tab)
  const seasonal = items.filter(i => i.months)
  const yearRound = items.filter(i => !i.months)
  const waiting = nextAt !== null && Date.parse(nextAt) > Date.now()

  const send = async () => {
    if (!picked || picked.price || waiting || sending) return
    setSending(true); setError('')
    const v = getVisitor()
    const res = await fetch('/api/gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId, item: picked.id, visitorId: v.id, visitorName: v.name }),
    }).catch(() => null)
    setSending(false)
    const d = await res?.json().catch(() => null)
    if (res?.status === 201) {
      const next = new Date(Date.now() + FREE_GIFT_COOLDOWN_DAYS * 86_400_000).toISOString()
      try { localStorage.setItem(waitKey(petId), next) } catch {}
      setNextAt(next); setSent(picked); setPicked(null)
      onLeft(d.gift)
    } else if (res?.status === 429 && d?.nextAt) {
      try { localStorage.setItem(waitKey(petId), d.nextAt) } catch {}
      setNextAt(d.nextAt)
    } else {
      setError('That didn’t go through. Please try again.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-[520px] bg-[#FFFBF5]">
      {sent ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-[#FFE9CF] to-[#FFF6EA] text-6xl shadow-[0_0_40px_rgba(217,130,59,0.35)] float-anim" aria-hidden>
            {sent.emoji}
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2A1E17]">{sent.name} for {petName}</h2>
          <p className="mt-2 text-sm text-[#8E8278]">It’s waiting by their shrine now. Visitors will see it’s from you.</p>
          <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-[#2A1E17] py-3 text-sm font-semibold text-[#FFF6EA] hover:bg-[#3B2B21]">
            Back to {petName}
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9823B]">A little gift</p>
              <h2 id="modal-title" className="font-serif text-2xl font-bold leading-tight text-[#2A1E17]">for {petName}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-full bg-[#F4EBDD] p-2.5 text-[#8E8278] hover:text-[#2A1E17]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Categories: one segmented control, not a row of pills */}
          <div role="tablist" aria-label="Gift types" className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#F4EBDD] p-1">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                role="tab"
                aria-selected={tab === c.id}
                onClick={() => { setTab(c.id); setPicked(null) }}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition-all',
                  tab === c.id ? 'bg-white text-[#2A1E17] shadow-sm' : 'text-[#8E8278] hover:text-[#2A1E17]',
                )}
              >
                <span className="text-lg leading-none" aria-hidden>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8E8278]">{cat.hint}</p>

          {/* Items */}
          <div className="mt-3 max-h-[46dvh] overflow-y-auto pr-1 -mr-1">
            {tab === 'special' && seasonal.length > 0 && <Section title="❄️ This season" items={seasonal} picked={picked} onPick={setPicked} />}
            <Section title={tab === 'special' && seasonal.length ? '🌈 All year' : ''} items={yearRound} picked={picked} onPick={setPicked} />
          </div>

          {/* Footer: what you're about to leave */}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 border-t border-[#EFE4D4] bg-[#FFFBF5]/95 px-6 pb-6 pt-4 backdrop-blur">
            {error && <p className="mb-2 text-center text-xs text-[#C0392B]">{error}</p>}
            {picked?.price ? (
              <FooterRow emoji={picked.emoji} title={picked.name} sub={`฿${picked.price} · stays ${SPECIAL_GIFT_SHOWS_DAYS} days with your name`}>
                <button disabled className="rounded-2xl bg-[#E8DFD6] px-4 py-3 text-xs font-semibold text-[#8E8278]">Opening soon</button>
              </FooterRow>
            ) : waiting ? (
              <p className="rounded-2xl bg-[#F4EBDD] px-4 py-3 text-center text-sm text-[#5C5046]">
                🎁 You’ve left a gift for {petName}. Your next free gift is ready in {waitText(nextAt!)}.
              </p>
            ) : picked ? (
              <FooterRow emoji={picked.emoji} title={picked.name} sub={`Free · one every ${FREE_GIFT_COOLDOWN_DAYS} days`}>
                <button onClick={send} disabled={sending} className="rounded-2xl bg-[#D9823B] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
                  {sending ? 'Leaving…' : 'Leave it'}
                </button>
              </FooterRow>
            ) : (
              <p className="py-3 text-center text-sm text-[#8E8278]">Tap something {petName} would love</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Section({ title, items, picked, onPick }: { title: string; items: Gift[]; picked: Gift | null; onPick: (g: Gift) => void }) {
  return (
    <div className="mb-3">
      {title && <h3 className="mb-2 text-xs font-semibold text-[#5C5046]">{title}</h3>}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {items.map(item => {
          const on = picked?.id === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              aria-pressed={on}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-2xl px-1 pb-2 pt-3 text-center transition-all active:scale-95',
                item.price ? 'bg-gradient-to-b from-[#FFF3D6] to-[#FFFBF0]' : 'bg-white',
                on ? 'ring-2 ring-[#D9823B] shadow-md' : 'ring-1 ring-[#EFE4D4] hover:ring-[#D9823B]/50',
              )}
            >
              <span className={cn('grid h-11 w-11 place-items-center rounded-full text-[26px] transition-transform', on ? 'scale-110 bg-[#FFE9CF]' : 'bg-[#FAF3E8]')} aria-hidden>
                {item.emoji}
              </span>
              <span className="text-[11px] font-medium leading-tight text-[#2A1E17]">{item.name}</span>
              {item.price && <span className="text-[10px] font-semibold text-[#B8860B]">฿{item.price}</span>}
              {on && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#D9823B] text-[9px] text-white" aria-hidden>✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FooterRow({ emoji, title, sub, children }: { emoji: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFE9CF] text-3xl" aria-hidden>{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#2A1E17]">{title}</p>
        <p className="text-[11px] text-[#8E8278]">{sub}</p>
      </div>
      {children}
    </div>
  )
}

/** The gifts left recently, shown under the shrine. */
export function GiftShelf({ gifts, emojiOf, petName }: { gifts: LeftGift[]; emojiOf: (id: string) => string | undefined; petName: string }) {
  if (!gifts.length) return null
  const shown = gifts.slice(0, 14)
  return (
    <div className="mt-3 flex max-w-full items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-[#FFE2C0]" aria-label={`${gifts.length} gifts left for ${petName}`}>
      <span className="text-xs">Gifts</span>
      <div className="flex -space-x-1 overflow-hidden">
        {shown.map(g => (
          <span key={g.id} title={`From ${g.visitor_name}`} className="grid h-7 w-7 place-items-center rounded-full bg-[#FFF6EA]/15 text-base">
            {emojiOf(g.item) ?? '🎁'}
          </span>
        ))}
      </div>
      {gifts.length > shown.length && <span className="text-xs">+{gifts.length - shown.length}</span>}
    </div>
  )
}
