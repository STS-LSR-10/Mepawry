'use client'
// components/shrine/GiftPicker.tsx — Choose a little gift to leave at a shrine.
// Free gifts: one every few days per visitor. Special gifts are bought once (signed in) and kept: after that they show
// "Owned" and can be given at any shrine for free. Frames and backdrops are bought by the owner for their shrine.

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { getVisitor } from '@/lib/visitor'
import { useT } from '@/lib/i18n'
import { useAccount } from '@/lib/account'
import { startCheckout } from '@/lib/checkout'
import { LoginPanel } from '@/components/account/AuthGate'
import { DEFAULT_BACKDROP, DEFAULT_FRAME, FRAMES, backdropsFor, type FrameStyle } from '@/lib/decor'
import { backdropThumb } from '@/components/3d/backdrops'
import type { Pet } from '@/types'
import { CATEGORIES, SEASONS, FREE_GIFT_COOLDOWN_DAYS, SPECIAL_GIFT_SHOWS_DAYS, giftById, giftsFor, type Gift, type GiftCategory, type LeftGift } from '@/lib/gifts'

const waitKey = (petId: string) => `pm-gift-wait-${petId}`

function waitText(nextAt: string, t: ReturnType<typeof useT>) {
  const ms = Date.parse(nextAt) - Date.now()
  const h = Math.ceil(ms / 3_600_000)
  return h > 24 ? t('{n} days', { n: Math.ceil(h / 24) }) : h > 1 ? t('{n} hours', { n: h }) : t('less than an hour')
}

type Tab = GiftCategory | 'frames' | 'backdrops'
type Decor = { kind: 'frame' | 'backdrop'; id: string; name: string; price: number }

const TABS: { id: Tab; emoji: string; label: string; hint: string }[] = [
  ...CATEGORIES,
  { id: 'frames', emoji: '🖼️', label: 'Frames', hint: 'A new frame for their portrait. It stays for good.' },
  { id: 'backdrops', emoji: '🌄', label: 'Backdrops', hint: 'A new scene behind their portrait. It stays for good.' },
]

export function GiftPicker({ open, onClose, pet, onLeft, onDecor, onPreview }: {
  open: boolean
  onClose: () => void
  pet: Pet
  onLeft: (gift: LeftGift) => void
  /** A frame or backdrop was applied: the updated memorial */
  onDecor: (pet: Pet) => void
  /** Try a frame or backdrop on the cabinet before giving it (null: back to what it has) */
  onPreview?: (decor: { kind: 'frame' | 'backdrop'; id: string } | null) => void
}) {
  const petId = pet.id, petName = pet.name
  const t = useT()
  const { user } = useAccount()
  const admin = !!user?.isAdmin, owner = !!user && user.id === pet.owner_id
  const signedIn = !!user && !user.isAnonymous
  const [owned, setOwned] = useState<string[]>([])
  const [needLogin, setNeedLogin] = useState(false)
  useEffect(() => {
    if (!open || !signedIn) { setOwned([]); return }
    fetch('/api/gifts?owned', { cache: 'no-store' }).then(r => r.json()).then(d => setOwned(d.owned ?? [])).catch(() => {})
  }, [open, signedIn, user?.id])
  useEffect(() => { if (signedIn) setNeedLogin(false) }, [signedIn])
  const pay = async (body: Parameters<typeof startCheckout>[0]) => { setSending(true); setError(''); const e = await startCheckout(body); if (e) { setError(t(e)); setSending(false) } }
  const [tab, setTab] = useState<Tab>('food')
  const [picked, setPicked] = useState<Gift | null>(null)
  const [decor, setDecor] = useState<Decor | null>(null)
  // a frame or backdrop was tapped: the picker steps aside so it shows on the cabinet, with a small bar to decide
  const [previewing, setPreviewing] = useState(false)
  const pick = (d: Decor) => { setDecor(d); setPreviewing(true) }
  const showing = open && previewing && decor ? decor : null
  useEffect(() => { onPreview?.(showing && { kind: showing.kind, id: showing.id }) }, [showing?.kind, showing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) setPreviewing(false) }, [open])
  const currentFrame = pet.frame_style ?? DEFAULT_FRAME
  const currentBackdrop = pet.backdrop ?? DEFAULT_BACKDROP
  const [nextAt, setNextAt] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Gift | null>(null)
  const [error, setError] = useState('')

  // Remember the wait from last time so the button says so before anyone taps it
  useEffect(() => {
    if (!open) return
    setSent(null); setError(''); setNeedLogin(false)
    try {
      const saved = localStorage.getItem(waitKey(petId))
      setNextAt(saved && Date.parse(saved) > Date.now() ? saved : null)
    } catch { /* private mode: the server still enforces it */ }
  }, [open, petId])

  const cat = TABS.find(c => c.id === tab)!
  const isDecor = tab === 'frames' || tab === 'backdrops'
  const items = isDecor ? [] : giftsFor(tab)
  const seasonal = SEASONS.map(s => ({ ...s, items: items.filter(i => i.season === s.id) })).filter(s => s.items.length)
  const yearRound = items.filter(i => !i.season)
  const waiting = nextAt !== null && Date.parse(nextAt) > Date.now()

  const applyDecor = async () => {
    if (!decor || !admin || sending) return
    setSending(true); setError('')
    const res = await fetch(`/api/pets/${petId}/decor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decor.kind === 'frame' ? { frame: decor.id } : { backdrop: decor.id }),
    }).catch(() => null)
    setSending(false)
    const d = await res?.json().catch(() => null)
    if (res?.ok && d?.pet) { onDecor(d.pet); setDecor(null); setPreviewing(false) } else setError(d?.error ?? t('That didn’t go through. Please try again.'))
  }

  const send = async () => {
    const mine = !!picked?.price && owned.includes(picked.id)
    if (!picked || (picked.price && !mine) || (!mine && waiting) || sending) return
    setSending(true); setError('')
    const v = getVisitor()
    const res = await fetch('/api/gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId, item: picked.id, visitorId: v.id, visitorName: v.name }),
    }).catch(() => null)
    setSending(false)
    const d = await res?.json().catch(() => null)
    if (res?.status === 201 && mine) {
      setSent(picked); setPicked(null); onLeft(d.gift)
    } else if (res?.status === 201) {
      const next = new Date(Date.now() + FREE_GIFT_COOLDOWN_DAYS * 86_400_000).toISOString()
      try { localStorage.setItem(waitKey(petId), next) } catch {}
      setNextAt(next); setSent(picked); setPicked(null)
      onLeft(d.gift)
    } else if (res?.status === 429 && d?.nextAt) {
      try { localStorage.setItem(waitKey(petId), d.nextAt) } catch {}
      setNextAt(d.nextAt)
    } else {
      setError(t(d?.error ?? 'That didn’t go through. Please try again.'))
    }
  }

  const decorIcon = decor && (decor.kind === 'backdrop'
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={backdropThumb(decor.id)} alt="" className="h-full w-full object-cover" />
    : <span className="block h-full w-full rounded-xl p-1.5" style={{ background: FRAMES.find(f => f.id === decor.id)?.swatch }}><span className="block h-full w-full rounded-md bg-[#FBF6EC]" /></span>)
  const decorAction = owner && decor ? (
    <button onClick={() => pay({ kind: decor.kind, petId, item: decor.id })} disabled={sending} className="rounded-2xl bg-[#D9823B] px-4 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
      {sending ? t('Opening payment…') : t('Pay ฿{n}', { n: decor.price })}
    </button>
  ) : admin ? (
    <button onClick={applyDecor} disabled={sending} className="rounded-2xl bg-[#D9823B] px-4 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
      {sending ? t('Applying…') : t('Apply (admin)')}
    </button>
  ) : (
    <button disabled className="rounded-2xl bg-[#E8DFD6] px-4 py-3 text-xs font-semibold text-[#8E8278]">{t('Only the owner can change this')}</button>
  )

  // Trying one on: a small bar at the bottom, the cabinet above shows it
  if (showing) return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]" role="dialog" aria-label={t(showing.kind === 'frame' ? 'A new frame for {name}' : 'A new backdrop for {name}', { name: petName })}>
      <div className="w-full max-w-[520px] rounded-3xl bg-[#FFFBF5] p-4 shadow-2xl ring-1 ring-[#EFE4D4]">
        <p className="mb-3 font-serif text-lg font-bold text-[#2A1E17]">{t(showing.kind === 'frame' ? 'A new frame for {name}' : 'A new backdrop for {name}', { name: petName })}</p>
        {error && <p className="mb-2 text-center text-xs text-[#C0392B]">{error}</p>}
        <FooterRow icon={decorIcon} title={t(showing.name)} sub={`฿${showing.price} · ${t('stays for good')}`}>
          <button onClick={() => setPreviewing(false)} className="shrink-0 text-xs font-semibold text-[#C67129]">
            {t(showing.kind === 'frame' ? 'Other frames' : 'Other backdrops')} ▴
          </button>
        </FooterRow>
        <div className="mt-3 grid grid-cols-2 gap-2 [&>button]:w-full">
          <button onClick={onClose} className="rounded-2xl border border-[#E8DFD6] bg-white px-4 py-3 text-xs font-semibold text-[#2A1E17]">{t('Close')}</button>
          {decorAction}
        </div>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-[520px] bg-[#FFFBF5]">
      {needLogin ? (
        <div className="space-y-3">
          <LoginPanel title="Sign in to buy special gifts" />
          <button onClick={() => setNeedLogin(false)} className="w-full text-xs text-[#C67129] underline">{t('Back to the gifts')}</button>
        </div>
      ) : sent ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-[#FFE9CF] to-[#FFF6EA] text-6xl shadow-[0_0_40px_rgba(217,130,59,0.35)] float-anim" aria-hidden>
            <GiftIcon gift={sent} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2A1E17]">{t(sent.name)} · {t('for {name}', { name: petName })}</h2>
          <p className="mt-2 text-sm text-[#8E8278]">{t('It’s waiting by their shrine now. Visitors will see it’s from you.')}</p>
          <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-[#2A1E17] py-3 text-sm font-semibold text-[#FFF6EA] hover:bg-[#3B2B21]">
            {t('Back to {name}', { name: petName })}
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D9823B]">{t('A little gift')}</p>
              <h2 id="modal-title" className="font-serif text-2xl font-bold leading-tight text-[#2A1E17]">{t('for {name}', { name: petName })}</h2>
            </div>
            <button onClick={onClose} aria-label={t('Close')} className="rounded-full bg-[#F4EBDD] p-2.5 text-[#8E8278] hover:text-[#2A1E17]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Categories: one segmented control, two rows of three */}
          <div role="tablist" aria-label={t('Gift types')} className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-[#F4EBDD] p-1">
            {TABS.map(c => (
              <button
                key={c.id}
                role="tab"
                aria-selected={tab === c.id}
                onClick={() => { setTab(c.id); setPicked(null); setDecor(null); setError('') }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition-all',
                  tab === c.id ? 'bg-white text-[#2A1E17] shadow-sm' : 'text-[#8E8278] hover:text-[#2A1E17]',
                )}
              >
                <span className="text-base leading-none" aria-hidden>{c.emoji}</span>
                {t(c.label)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8E8278]">{tab === 'special' ? t('Stay by their shrine for {n} days with your name', { n: SPECIAL_GIFT_SHOWS_DAYS }) : t(cat.hint)}</p>

          {/* Items (padded so the scroll box doesn't clip the cards' rings at its edges) */}
          <div className="-mx-1 mt-2 max-h-[46dvh] overflow-y-auto overscroll-contain px-1 py-1">
            {tab === 'frames' && (
              <FrameGrid frames={FRAMES.filter(f => f.id !== DEFAULT_FRAME)} current={currentFrame} picked={decor?.id}
                onPick={f => pick({ kind: 'frame', id: f.id, name: f.name, price: f.price })} />
            )}
            {tab === 'backdrops' && (
              <BackdropGrid current={currentBackdrop} picked={decor?.id}
                onPick={b => pick({ kind: 'backdrop', id: b.id, name: b.name, price: b.price })} />
            )}
            {tab === 'special' && seasonal.map(s => <Section key={s.id} title={`${s.emoji} ${t(s.label)}`} items={s.items} owned={owned} picked={picked} onPick={setPicked} />)}
            {!isDecor && <Section title={tab === 'special' && seasonal.length ? `🌈 ${t('All year')}` : ''} items={yearRound} owned={owned} picked={picked} onPick={setPicked} />}
          </div>

          {/* Footer: what you're about to leave */}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 border-t border-[#EFE4D4] bg-[#FFFBF5]/95 px-6 pb-6 pt-4 backdrop-blur">
            {error && <p className="mb-2 text-center text-xs text-[#C0392B]">{error}</p>}
            {isDecor ? (
              decor ? (
                <FooterRow icon={decorIcon} title={t(decor.name)} sub={`฿${decor.price} · ${t('stays for good')}`}>
                  <button onClick={() => setPreviewing(true)} className="rounded-2xl border border-[#E8DFD6] bg-white px-3 py-3 text-xs font-semibold text-[#2A1E17]">{t('Preview')}</button>
                  {decorAction}
                </FooterRow>
              ) : (
                <p className="py-3 text-center text-sm text-[#8E8278]">{t('Tap one to see it up close')}</p>
              )
            ) : picked?.price && owned.includes(picked.id) ? (
              <FooterRow icon={<GiftIcon gift={picked} />} title={t(picked.name)} sub={`${t('Owned')} · ${t('stays {n} days with your name', { n: SPECIAL_GIFT_SHOWS_DAYS })}`}>
                <button onClick={send} disabled={sending} className="rounded-2xl bg-[#D9823B] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
                  {sending ? t('Leaving…') : t('Give it')}
                </button>
              </FooterRow>
            ) : picked?.price ? (
              <FooterRow icon={<GiftIcon gift={picked} />} title={t(picked.name)} sub={`฿${picked.price} · ${t('yours to keep, give it at any shrine')}`}>
                {signedIn ? (
                  <button onClick={() => pay({ kind: 'gift', petId, item: picked.id, name: getVisitor().name })} disabled={sending} className="rounded-2xl bg-[#D9823B] px-4 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
                    {sending ? t('Opening payment…') : t('Pay ฿{n}', { n: picked.price })}
                  </button>
                ) : (
                  <button onClick={() => setNeedLogin(true)} className="rounded-2xl bg-[#D9823B] px-4 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#C67129]">
                    {t('Sign in to buy')}
                  </button>
                )}
              </FooterRow>
            ) : waiting ? (
              <p className="rounded-2xl bg-[#F4EBDD] px-4 py-3 text-center text-sm text-[#5C5046]">
                🎁 {t('You’ve left a gift for {name}. Your next free gift is ready in {t}.', { name: petName, t: waitText(nextAt!, t) })}
              </p>
            ) : picked ? (
              <FooterRow icon={<GiftIcon gift={picked} />} title={t(picked.name)} sub={t('Free · one every {n} days', { n: FREE_GIFT_COOLDOWN_DAYS })}>
                <button onClick={send} disabled={sending} className="rounded-2xl bg-[#D9823B] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C67129] disabled:opacity-60">
                  {sending ? t('Leaving…') : t('Leave it')}
                </button>
              </FooterRow>
            ) : (
              <p className="py-3 text-center text-sm text-[#8E8278]">{t('Tap something {name} would love', { name: petName })}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Section({ title, items, owned, picked, onPick }: { title: string; items: Gift[]; owned: string[]; picked: Gift | null; onPick: (g: Gift) => void }) {
  const t = useT()
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
                <GiftIcon gift={item} />
              </span>
              <span className="text-[11px] font-medium leading-tight text-[#2A1E17]">{t(item.name)}</span>
              {item.price && <span className="text-[10px] font-semibold text-[#B8860B]">{owned.includes(item.id) ? `✓ ${t('Owned')}` : `฿${item.price}`}</span>}
              {on && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#D9823B] text-[9px] text-white" aria-hidden>✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FooterRow({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#FFE9CF] text-3xl" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#2A1E17]">{title}</p>
        <p className="text-[11px] text-[#8E8278]">{sub}</p>
      </div>
      {children}
    </div>
  )
}

const FRAME_GROUPS = [['classic', 'Metal and wood'], ['plain', 'Plain colours'], ['pattern', 'Patterned']] as const

/** Frames as little framed cards: the swatch is the frame, cream inside, a paw where the portrait goes. */
function FrameGrid({ frames, current, picked, onPick }: { frames: FrameStyle[]; current: string; picked?: string; onPick: (f: FrameStyle) => void }) {
  const t = useT()
  return FRAME_GROUPS.map(([group, title]) => {
    const list = frames.filter(f => f.group === group)
    return list.length > 0 && (
    <div key={group} className="mb-3">
    <h3 className="mb-2 text-xs font-semibold text-[#5C5046]">{t(title)}</h3>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {list.map(f => {
        const on = picked === f.id
        return (
          <button key={f.id} onClick={() => onPick(f)} aria-pressed={on}
            className={cn('relative flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2 text-center transition-all active:scale-95',
              on ? 'ring-2 ring-[#D9823B] shadow-md' : 'ring-1 ring-[#EFE4D4] hover:ring-[#D9823B]/50')}>
            <span className="block aspect-[5/6] w-full rounded-lg p-[9%] shadow-inner" style={{ background: f.swatch }} aria-hidden>
              <span className="grid h-full w-full place-items-center rounded-[4px] bg-[#FBF6EC] text-xl shadow-[inset_0_1px_3px_rgba(0,0,0,.25)]">🐾</span>
            </span>
            <span className="text-[11px] font-medium leading-tight text-[#2A1E17]">{t(f.name)}</span>
            <span className="text-[10px] font-semibold text-[#B8860B]">{current === f.id ? t('In use') : `฿${f.price}`}</span>
          </button>
        )
      })}
    </div>
    </div>
    )
  })
}

const BACKDROP_GROUPS = [['festival', '🎉 ', 'Festivals'], ['season', '🍃 ', 'Seasons'], ['always', '🌈 ', 'All year']] as const

/** Backdrops as painted thumbnails, the same paintings the cabinet uses, festivals and seasons first. */
function BackdropGrid({ current, picked, onPick }: { current: string; picked?: string; onPick: (b: { id: string; name: string; price: number }) => void }) {
  const t = useT()
  const all = backdropsFor()
  return BACKDROP_GROUPS.map(([group, icon, title]) => {
    const list = all.filter(b => b.group === group)
    return list.length > 0 && (
    <div key={group} className="mb-3">
    <h3 className="mb-2 text-xs font-semibold text-[#5C5046]">{icon}{t(title)}</h3>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {list.map(b => {
        const on = picked === b.id
        return (
          <button key={b.id} onClick={() => onPick(b)} aria-pressed={on}
            className={cn('relative overflow-hidden rounded-2xl bg-white text-left transition-all active:scale-95',
              on ? 'ring-2 ring-[#D9823B] shadow-md' : 'ring-1 ring-[#EFE4D4] hover:ring-[#D9823B]/50')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backdropThumb(b.id)} alt="" className="aspect-[5/4] w-full object-cover" />
            <span className="flex items-baseline justify-between gap-1 px-2.5 py-2">
              <span className="truncate text-[12px] font-medium text-[#2A1E17]">{t(b.name)}</span>
              <span className="shrink-0 text-[10px] font-semibold text-[#B8860B]">{current === b.id ? t('In use') : `฿${b.price}`}</span>
            </span>
          </button>
        )
      })}
    </div>
    </div>
    )
  })
}

/** A gift's picture, or its emoji; sized by the surrounding font size like an emoji would be. */
export function GiftIcon({ gift }: { gift: Gift | undefined }) {
  // eslint-disable-next-line @next/next/no-img-element
  return gift?.img ? <img src={gift.img} alt="" className="h-[1.1em] w-[1.1em] object-contain" /> : <>{gift?.emoji ?? '🎁'}</>
}

/** The gifts left recently, shown under the shrine. */
export function GiftShelf({ gifts, petName }: { gifts: LeftGift[]; petName: string }) {
  const t = useT()
  if (!gifts.length) return null
  const shown = gifts.slice(0, 14)
  return (
    <div className="mt-3 flex max-w-full items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-[#FFE2C0]" aria-label={t('{n} gifts left for {name}', { n: gifts.length, name: petName })}>
      <span className="text-xs">{t('Gifts')}</span>
      <div className="flex -space-x-1 overflow-hidden">
        {shown.map(g => (
          <span key={g.id} title={t('From {name}', { name: g.visitor_name })} className="grid h-7 w-7 place-items-center rounded-full bg-[#FFF6EA]/15 text-base">
            <GiftIcon gift={giftById(g.item)} />
          </span>
        ))}
      </div>
      {gifts.length > shown.length && <span className="text-xs">+{gifts.length - shown.length}</span>}
    </div>
  )
}
