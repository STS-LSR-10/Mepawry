'use client'
// app/[slug]/ShrineClientSection.tsx — S04 Interactive Toolbar & Modals for Guestbook and Keepsakes

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { TributeToolbar } from '@/components/shrine/TributeToolbar'
import { GiftPicker, GiftShelf } from '@/components/shrine/GiftPicker'
import { VipUpgrade } from '@/components/shrine/VipUpgrade'
import type { LeftGift } from '@/lib/gifts'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getVisitor } from '@/lib/visitor'
import { useAccount } from '@/lib/account'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import { k } from '@/lib/tkey'
import { useT } from '@/lib/i18n'
import type { Pet, GuestbookEntry } from '@/types'
import { Translatable } from '@/components/ui/Translatable'

// shortcut: the keepsake shop has no real checkout yet, so its buttons stay hidden; set true once Stripe orders work.
const SHOP_OPEN = false

// WebGL only runs in the browser
const ShrineCabinet = dynamic(() => import('@/components/3d/ShrineCabinetArched'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[#FAF7F2]/50">Opening the shrine…</div>,
})

// Today's date where the visitor is (YYYY-MM-DD): candles reset at their midnight
const localDay = () => new Date().toLocaleDateString('en-CA')
const litKey = (petId: string) => `pm-candle:${petId}`

export function ShrineClientSection({ pet: initialPet, candlesToday: initialToday }: { pet: Pet; candlesToday: number }) {
  const [pet, setPet] = useState(initialPet)
  const { user, profile } = useAccount()
  const t = useT()
  const isOwner = !!user && user.id === pet.owner_id
  const [guestbookOpen, setGuestbookOpen] = useState(false)
  // Live counts, so a candle you light appears in the cabinet straight away
  const [candles, setCandles] = useState(pet.candle_count)
  const [flowers, setFlowers] = useState(pet.flower_count)
  // Candles in the last 24 hours (how tall the candle stands) and whether you've lit yours today
  const [candlesToday, setCandlesToday] = useState(initialToday)
  const [litToday, setLitToday] = useState(false)
  useEffect(() => {
    try { setLitToday(localStorage.getItem(litKey(pet.id)) === localDay()) } catch {}
  }, [pet.id])
  const markLit = () => {
    setLitToday(true)
    try { localStorage.setItem(litKey(pet.id), localDay()) } catch {}
  }
  const [keepsakeOpen, setKeepsakeOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  // the tribute bar can fold down to a small button, so it doesn't cover the shrine while zooming (remembered)
  const [barOpen, setBarOpen] = useState(true)
  useEffect(() => { try { if (localStorage.getItem('pm-bar') === 'closed') setBarOpen(false) } catch {} }, [])
  const foldBar = (open: boolean) => { setBarOpen(open); try { localStorage.setItem('pm-bar', open ? 'open' : 'closed') } catch {} }
  // a frame or backdrop being tried on from the gift picker
  const [tryDecor, setTryDecor] = useState<{ kind: 'frame' | 'backdrop'; id: string } | null>(null)
  const shown = tryDecor ? { ...pet, ...(tryDecor.kind === 'frame' ? { frame_style: tryDecor.id } : { backdrop: tryDecor.id }) } : pet
  const cabinetRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (tryDecor) cabinetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [tryDecor])
  const [gifts, setGifts] = useState<LeftGift[]>([])
  const [giftTotal, setGiftTotal] = useState(0)
  const [messages, setMessages] = useState<GuestbookEntry[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [shareSuccess, setShareSuccess] = useState(false)
  // back from Stripe (?paid=…): say thanks, then reload once the payment webhook has had a moment to apply it
  const [paid, setPaid] = useState(false)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).get('paid')) return
    setPaid(true)
    const id = setTimeout(() => window.location.replace(window.location.pathname), 4000)
    return () => clearTimeout(id)
  }, [])

  // Keepsake checkout state
  const [selectedProduct, setSelectedProduct] = useState<'acrylic_plaque' | 'keychain' | 'canvas_print'>('acrylic_plaque')
  const [inscription, setInscription] = useState(`In loving memory of ${pet.name}`)
  const [orderSubmitted, setOrderSubmitted] = useState(false)

  // Guestbook is saved on the server; load it once the shrine opens
  useEffect(() => {
    fetch(`/api/guestbook?petId=${encodeURIComponent(pet.id)}`).then(r => r.json()).then(d => setMessages(d.entries ?? [])).catch(() => {})
    fetch(`/api/gifts?petId=${encodeURIComponent(pet.id)}`).then(r => r.json()).then(d => { setGifts(d.gifts ?? []); setGiftTotal(d.total ?? d.gifts?.length ?? 0) }).catch(() => {})
    setVisitorName(n => n || getVisitor().name)
  }, [pet.id])
  useEffect(() => {
    if (profile) setVisitorName(profile.display_name)
  }, [profile])

  const handleSignGuestbook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMsg.trim()) return
    const res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId: pet.id, visitorName: visitorName.trim(), message: newMsg.trim() }),
    })
    if (!res.ok) return
    const { entry } = await res.json()
    setMessages(prev => [entry, ...prev])
    setNewMsg('')
  }

  /** Saves a candle or flower; the server's count is the one we show. */
  const leaveTribute = async (type: 'candle' | 'flower') => {
    if (type === 'candle') {
      if (litToday) return
      markLit()
      setCandles(n => n + 1) // show it straight away
      setCandlesToday(n => n + 1)
      const v = getVisitor()
      const res = await fetch('/api/tributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: pet.id, type, visitorId: v.id, visitorName: v.name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      }).catch(() => null)
      const d = await res?.json().catch(() => null)
      if (d && typeof d.candle_count === 'number') { // 200, or 429 = already lit today on this browser
        setCandles(d.candle_count)
        setFlowers(d.flower_count)
        setCandlesToday(d.candles_today)
      } else {
        // didn't save: take it back so they can try again
        setCandles(n => n - 1)
        setCandlesToday(n => n - 1)
        setLitToday(false)
        try { localStorage.removeItem(litKey(pet.id)) } catch {}
      }
      return
    }
    setFlowers(n => n + 1) // show it straight away
    const res = await fetch('/api/tributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId: pet.id, type, visitorName: getVisitor().name }),
    }).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setCandles(d.candle_count)
      setFlowers(d.flower_count)
    } else {
      setFlowers(n => n - 1) // didn't save: take it back
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${pet.name}'s Memorial — Mepawry`,
          text: `Light a candle in memory of ${pet.name}`,
          url: window.location.href,
        })
        return
      } catch (err) {
        // Fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2500)
    }
  }

  return (
    <>
      {/* 3D shrine cabinet */}
      {/* a VIP pet's cabinet is the big one, like its niche in the VIP pavilion: give it more room */}
      {/* full window width: the 3D view has no visible edge, so the open doors aren't cut off when you zoom in */}
      <div className={`relative -mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-screen [mask-image:linear-gradient(to_bottom,transparent,black_7%,black_93%,transparent)] ${pet.vip_position != null ? 'h-[460px] sm:h-[680px]' : 'h-[360px] sm:h-[540px]'}`}  ref={cabinetRef} data-cabinet aria-label={t("{name}'s shrine, {n} candles lit", { name: pet.name, n: candles })}>
        <ShrineCabinet pet={shown} candlesToday={candlesToday} flowers={flowers} gifts={gifts.map(g => g.item)} />
      </div>
      <p className="mt-1 rounded-full bg-black/30 px-4 py-1.5 text-sm text-[#FFE2C0]">
        {litToday ? <>🕯️ {t('You lit a candle for {name} today. Come back tomorrow to light another.', { name: pet.name })}</>
          : candles > 0 ? t('Tap 🕯️ to light a candle for {name}', { name: pet.name }) : t('Waiting for their first candle. Will you light it?')}
      </p>
      {isOwner && (
        <Link href={`/me?edit=${pet.id}`} className="mt-3 rounded-full border border-white/20 px-4 py-1.5 text-xs text-[#FFE2C0] hover:bg-white/10">
          ✏️ {t('Edit or delete this memorial')}
        </Link>
      )}
      <VipUpgrade pet={pet} isOwner={isOwner} onChange={setPet} />
      <GiftShelf gifts={gifts} petName={pet.name} />

      {/* Floating Action Toolbar */}
      <div className={`fixed bottom-6 z-20 flex flex-col gap-2 ${barOpen ? 'left-1/2 w-full max-w-lg -translate-x-1/2 items-center px-4' : 'right-4 items-end'}`}>
        {paid && (
          <div role="status" className="rounded-full bg-[#27AE60] px-4 py-1.5 text-xs text-white shadow-lg animate-fade-in">
            {t('Thank you. Payment received — it will appear on the shrine in a moment.')}
          </div>
        )}
        {shareSuccess && (
          <div className="bg-[#27AE60] text-white text-xs px-4 py-1.5 rounded-full shadow-lg animate-fade-in">
            {t('Link copied to clipboard! 📋')}
          </div>
        )}
        {!barOpen ? (
          <button onClick={() => foldBar(true)} aria-label={t('Show the buttons')} className="glass flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2.5 text-lg text-[#FAF7F2] shadow-2xl">
            <span aria-hidden>🕯️🌸🎁</span><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 15l6-6 6 6" /></svg>
          </button>
        ) : (
        <div className="glass relative rounded-3xl border border-white/20 p-2 shadow-2xl">
          <button onClick={() => foldBar(false)} aria-label={t('Hide the buttons')} className="absolute -top-3 right-3 grid h-6 w-10 place-items-center rounded-full border border-white/20 bg-[#2A1E17]/80 text-xs text-[#FAF7F2] backdrop-blur"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg></button>
          <TributeToolbar
            candleCount={candles}
            flowerCount={flowers}
            giftCount={giftTotal}
            guestbookCount={messages.length}
            litToday={litToday}
            onGuestbook={() => setGuestbookOpen(true)}
            onKeepsake={SHOP_OPEN ? () => setKeepsakeOpen(true) : undefined}
            onGift={() => setGiftOpen(true)}
            onShare={handleShare}
            onTribute={leaveTribute}
          />
        </div>
        )}
      </div>

      <GiftPicker open={giftOpen} onClose={() => setGiftOpen(false)} pet={pet} onLeft={g => { setGifts(prev => [g, ...prev]); setGiftTotal(n => n + 1) }} onDecor={setPet} onPreview={setTryDecor} />

      {/* S05: Guestbook & Tributes Modal */}
      <Modal
        open={guestbookOpen}
        onClose={() => setGuestbookOpen(false)}
        title={t('Guestbook for {name}', { name: pet.name })}
      >
        <div className="space-y-6">
          {/* Form */}
          <form onSubmit={handleSignGuestbook} className="space-y-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD6]">
            <div>
              <label htmlFor="visitor-name" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                {t('Your name')}
              </label>
              <input
                id="visitor-name"
                type="text"
                placeholder={t('e.g. Quiet Star')}
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#D4C9BF] bg-white text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
              />
            </div>
            <div>
              <label htmlFor="guestbook-msg" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                {t('A few kind words')}
              </label>
              <textarea
                id="guestbook-msg"
                rows={3}
                required
                maxLength={500}
                placeholder={t('Write a message of comfort or share a memory…')}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#D4C9BF] bg-white text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B] resize-none"
              />
            </div>
            <Button type="submit" size="sm" className="w-full">
              ✍️ {t('Sign the guestbook')}
            </Button>
          </form>

          {/* Upsell: Golden Lantern Banner */}
          {SHOP_OPEN && <div className="bg-gradient-to-r from-[#FAF7F2] to-[#FEF9E7] p-3.5 rounded-2xl border border-[#C9A227]/40 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-[#2A1E17] block">🏮 {t('Golden Lantern')}</span>
              <span className="text-[#8E8278]">{t('Keep their light glowing on the wall forever')}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setKeepsakeOpen(true)} className="whitespace-nowrap text-xs">
              {t('฿{n} one-time', { n: 149 })}
            </Button>
          </div>}

          {/* Messages Feed */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8278]">
              {t('Condolences')} ({messages.length})
            </h4>
            {messages.length === 0 ? (
              <p className="text-center text-xs text-[#8E8278] py-6">
                {t('Be the first to leave a gentle word for {name}.', { name: pet.name })}
              </p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="bg-white p-3.5 rounded-xl border border-[#E8DFD6] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#2A1E17] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#D9823B] text-white flex items-center justify-center text-[9px] font-bold">
                        {msg.visitor_name[0] || 'A'}
                      </span>
                      {msg.visitor_name}
                    </span>
                    <span className="text-[#8E8278]">{timeAgo(msg.created_at, t)}</span>
                  </div>
                  <Translatable text={msg.message} source={{ kind: 'guestbook', id: msg.id }} className="text-sm text-[#5C5046] leading-relaxed pt-1" />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* S06: Keepsakes Shop Modal */}
      <Modal
        open={keepsakeOpen}
        onClose={() => {
          setKeepsakeOpen(false)
          setOrderSubmitted(false)
        }}
        title={t('Custom keepsake for {name}', { name: pet.name })}
      >
        {orderSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">🎁</div>
            <h3 className="font-serif text-xl font-bold text-[#2A1E17]">{t('Order placed!')}</h3>
            <p className="text-sm text-[#5C5046]">
              {t('Thank you for ordering this memorial tribute for {name}. We will prepare your keepsake with care.', { name: pet.name })}
            </p>
            <Button onClick={() => setKeepsakeOpen(false)} size="md" className="w-full mt-4">
              {t('Close')}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-[#8E8278] -mt-2">
              {t('Physical keepsakes crafted from high-grade materials to honor your companion forever.')}
            </p>

            {/* Product Choices */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'acrylic_plaque', name: k('Acrylic Plaque'), price: '฿990 (~$28)', icon: '🖼️' },
                { id: 'keychain', name: k('Medallion Keychain'), price: '฿650 (~$18)', icon: '🔑' },
                { id: 'canvas_print', name: k('Canvas Frame'), price: '฿1,250 (~$35)', icon: '🎨' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p.id as any)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    selectedProduct === p.id
                      ? 'border-[#D9823B] bg-[#FDF0E5] shadow-sm'
                      : 'border-[#E8DFD6] bg-[#FAF7F2] hover:border-[#D9823B]/50'
                  }`}
                >
                  <span className="text-2xl mb-1">{p.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-[#2A1E17] block leading-tight">{t(p.name)}</span>
                    <span className="text-[10px] text-[#C67129] font-medium">{p.price}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Inscription text */}
            <div>
              <label htmlFor="keepsake-inscription" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                {t('Custom inscription')}
              </label>
              <input
                id="keepsake-inscription"
                type="text"
                maxLength={60}
                value={inscription}
                onChange={e => setInscription(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#D4C9BF] bg-white text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
              />
            </div>

            {/* Gift wrap option */}
            <label className="flex items-center gap-2 text-xs text-[#5C5046] cursor-pointer">
              <input type="checkbox" className="rounded text-[#D9823B] focus:ring-[#D9823B]" />
              <span>{t('Add a memorial gift box and condolence card (+฿{n})', { n: 120 })}</span>
            </label>

            {/* Mock Checkout CTA */}
            <Button
              onClick={() => setOrderSubmitted(true)}
              size="lg"
              className="w-full shadow-md"
            >
              🔒 {t('Checkout with Stripe')}
            </Button>
            <p className="text-[10px] text-center text-[#8E8278]">
              {t('Supports credit/debit cards, Apple Pay, Google Pay and PayPal')}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
