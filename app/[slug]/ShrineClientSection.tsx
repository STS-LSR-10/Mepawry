'use client'
// app/[slug]/ShrineClientSection.tsx — S04 Interactive Toolbar & Modals for Guestbook and Keepsakes

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { TributeToolbar } from '@/components/shrine/TributeToolbar'
import { GiftPicker, GiftShelf } from '@/components/shrine/GiftPicker'
import { VipUpgrade } from '@/components/shrine/VipUpgrade'
import { giftById, type LeftGift } from '@/lib/gifts'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getVisitor } from '@/lib/visitor'
import { useAccount } from '@/lib/account'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Pet, GuestbookEntry } from '@/types'

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
  const [gifts, setGifts] = useState<LeftGift[]>([])
  const [giftTotal, setGiftTotal] = useState(0)
  const [messages, setMessages] = useState<GuestbookEntry[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [shareSuccess, setShareSuccess] = useState(false)

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
      <div className="relative -mx-4 h-[360px] w-[calc(100%+2rem)] max-w-[760px] sm:h-[460px]" aria-label={`${pet.name}'s shrine, ${candles} candles lit`}>
        <ShrineCabinet pet={pet} candlesToday={candlesToday} flowers={flowers} gifts={gifts.map(g => g.item)} />
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
      <GiftShelf gifts={gifts} emojiOf={id => giftById(id)?.emoji} petName={pet.name} />

      {/* Floating Action Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4 flex flex-col items-center gap-2">
        {shareSuccess && (
          <div className="bg-[#27AE60] text-white text-xs px-4 py-1.5 rounded-full shadow-lg animate-fade-in">
            {t('Link copied to clipboard! 📋')}
          </div>
        )}
        <div className="glass rounded-3xl p-2.5 shadow-2xl border border-white/20">
          <TributeToolbar
            candleCount={candles}
            flowerCount={flowers}
            giftCount={giftTotal}
            guestbookCount={messages.length}
            litToday={litToday}
            onGuestbook={() => setGuestbookOpen(true)}
            onKeepsake={() => setKeepsakeOpen(true)}
            onGift={() => setGiftOpen(true)}
            onShare={handleShare}
            onTribute={leaveTribute}
          />
        </div>
      </div>

      <GiftPicker open={giftOpen} onClose={() => setGiftOpen(false)} pet={pet} onLeft={g => { setGifts(prev => [g, ...prev]); setGiftTotal(n => n + 1) }} onDecor={setPet} />

      {/* S05: Guestbook & Tributes Modal */}
      <Modal
        open={guestbookOpen}
        onClose={() => setGuestbookOpen(false)}
        title={`Guestbook for ${pet.name}`}
      >
        <div className="space-y-6">
          {/* Form */}
          <form onSubmit={handleSignGuestbook} className="space-y-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD6]">
            <div>
              <label htmlFor="visitor-name" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                Your Name
              </label>
              <input
                id="visitor-name"
                type="text"
                placeholder="e.g. Quiet Star"
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#D4C9BF] bg-white text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]"
              />
            </div>
            <div>
              <label htmlFor="guestbook-msg" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                A few kind words
              </label>
              <textarea
                id="guestbook-msg"
                rows={3}
                required
                maxLength={500}
                placeholder="Write a message of comfort or share a memory…"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#D4C9BF] bg-white text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B] resize-none"
              />
            </div>
            <Button type="submit" size="sm" className="w-full">
              ✍️ Sign Guestbook
            </Button>
          </form>

          {/* Upsell: Golden Lantern Banner */}
          <div className="bg-gradient-to-r from-[#FAF7F2] to-[#FEF9E7] p-3.5 rounded-2xl border border-[#C9A227]/40 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-[#2A1E17] block">🏮 Golden Lantern</span>
              <span className="text-[#8E8278]">Keep their light glowing on the wall forever</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setKeepsakeOpen(true)} className="whitespace-nowrap text-xs">
              ฿149 one-time
            </Button>
          </div>

          {/* Messages Feed */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8278]">
              Condolences ({messages.length})
            </h4>
            {messages.length === 0 ? (
              <p className="text-center text-xs text-[#8E8278] py-6">
                Be the first to leave a gentle word for {pet.name}.
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
                    <span className="text-[#8E8278]">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-[#5C5046] leading-relaxed pt-1">
                    {msg.message}
                  </p>
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
        title={`Custom Keepsake for ${pet.name}`}
      >
        {orderSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">🎁</div>
            <h3 className="font-serif text-xl font-bold text-[#2A1E17]">Order Placed!</h3>
            <p className="text-sm text-[#5C5046]">
              Thank you for ordering this memorial tribute for {pet.name}. We will prepare your keepsake with care.
            </p>
            <Button onClick={() => setKeepsakeOpen(false)} size="md" className="w-full mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-[#8E8278] -mt-2">
              Physical keepsakes crafted from high-grade materials to honor your companion forever.
            </p>

            {/* Product Choices */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'acrylic_plaque', name: 'Acrylic Plaque', price: '฿990 (~$28)', icon: '🖼️' },
                { id: 'keychain', name: 'Medallion Keychain', price: '฿650 (~$18)', icon: '🔑' },
                { id: 'canvas_print', name: 'Canvas Frame', price: '฿1,250 (~$35)', icon: '🎨' },
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
                    <span className="text-xs font-bold text-[#2A1E17] block leading-tight">{p.name}</span>
                    <span className="text-[10px] text-[#C67129] font-medium">{p.price}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Inscription text */}
            <div>
              <label htmlFor="keepsake-inscription" className="block text-xs font-semibold text-[#2A1E17] mb-1">
                Custom Inscription
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
              <span>Add luxury memorial gift box & condolence card (+฿120)</span>
            </label>

            {/* Mock Checkout CTA */}
            <Button
              onClick={() => setOrderSubmitted(true)}
              size="lg"
              className="w-full shadow-md"
            >
              🔒 Checkout with Stripe
            </Button>
            <p className="text-[10px] text-center text-[#8E8278]">
              Supports Credit/Debit Card, Apple Pay, Google Pay and PayPal
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
