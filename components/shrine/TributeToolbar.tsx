'use client'
// components/shrine/TributeToolbar.tsx — S04 Shrine action bar

import { useState } from 'react'
import { cn, formatCount } from '@/lib/utils'

interface TributeToolbarProps {
  candleCount: number
  flowerCount: number
  giftCount: number
  guestbookCount: number
  /** This visitor already lit today's candle (one a day, new one after midnight). */
  litToday: boolean
  onGuestbook: () => void
  onKeepsake: () => void
  onGift: () => void
  onShare: () => void
  onTribute?: (type: 'candle' | 'flower') => void
}

export function TributeToolbar({
  candleCount: candles,
  flowerCount: flowers,
  giftCount,
  guestbookCount,
  litToday,
  onGuestbook,
  onKeepsake,
  onGift,
  onShare,
  onTribute,
}: TributeToolbarProps) {
  const [justFlowered, setJustFlowered] = useState(false)

  const lightCandle = () => {
    if (!litToday) onTribute?.('candle')
  }

  const leaveFlower = async () => {
    if (justFlowered) return
    onTribute?.('flower')
    setJustFlowered(true)
    setTimeout(() => setJustFlowered(false), 3000)
  }

  return (
    <div
      role="toolbar"
      aria-label="Shrine actions"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {/* Candle */}
      <TributeButton
        emoji="🕯️"
        label="Candle"
        count={candles}
        active={litToday}
        glow={litToday}
        onClick={lightCandle}
        aria-label={litToday ? `You lit today's candle. ${candles} candles lit. Come back tomorrow to light another` : `Light a candle. ${candles} candles lit`}
      />

      {/* Flower */}
      <TributeButton
        emoji="🌸"
        label="Flower"
        count={flowers}
        active={justFlowered}
        onClick={leaveFlower}
        aria-label={`Leave a flower. ${flowers} flowers left`}
      />

      {/* Treat */}
      <TributeButton
        emoji="🎁"
        label="Gift"
        count={giftCount}
        onClick={onGift}
        aria-label={`Leave a gift. ${giftCount} gifts left`}
      />

      {/* Guestbook */}
      <TributeButton
        emoji="📖"
        label="Guestbook"
        count={guestbookCount}
        onClick={onGuestbook}
        aria-label={`Open guestbook. ${guestbookCount} messages`}
      />

      {/* Share */}
      <TributeButton
        emoji="💌"
        label="Share"
        onClick={onShare}
        aria-label="Share this memorial"
      />

      {/* Keepsake */}
      <TributeButton
        emoji="🖼️"
        label="Keepsake"
        onClick={onKeepsake}
        aria-label="Order a keepsake"
        highlight
      />
    </div>
  )
}

interface TributeButtonProps {
  emoji: string
  label: string
  count?: number
  active?: boolean
  glow?: boolean
  highlight?: boolean
  onClick: () => void
  'aria-label'?: string
}

function TributeButton({ emoji, label, count, active, glow, highlight, onClick, 'aria-label': ariaLabel }: TributeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl border transition-all duration-150',
        'hover:scale-105 active:scale-95',
        highlight
          ? 'bg-[#FDF0E5] border-[#D9823B] text-[#C67129]'
          : 'glass border-white/20 text-[#FAF7F2]',
        active && 'bg-[#D9823B]/20 border-[#D9823B]',
        glow && 'shadow-[0_0_20px_rgba(217,130,59,0.4)]',
      )}
      aria-label={ariaLabel ?? label}
      aria-pressed={active}
    >
      <span
        className={cn('text-xl leading-none', glow && 'candle-flame')}
        aria-hidden
      >
        {emoji}
      </span>
      {count !== undefined && (
        <span className={cn('text-xs font-medium tabular-nums', active ? 'text-[#D9823B]' : '')}>
          {formatCount(count)}
        </span>
      )}
    </button>
  )
}
