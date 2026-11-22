'use client'
import { useT } from '@/lib/i18n'
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
  /** Leave out to hide the keepsake button. */
  onKeepsake?: () => void
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
  const t = useT()
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
      aria-label={t('Shrine actions')}
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
        aria-label={litToday ? t("You lit today's candle. {n} candles lit. Come back tomorrow to light another", { n: candles }) : t('Light a candle. {n} candles lit', { n: candles })}
      />

      {/* Flower */}
      <TributeButton
        emoji="🌸"
        label="Flower"
        count={flowers}
        active={justFlowered}
        onClick={leaveFlower}
        aria-label={t('Leave a flower. {n} flowers left', { n: flowers })}
      />

      {/* Treat */}
      <TributeButton
        emoji="🎁"
        label="Gift"
        count={giftCount}
        onClick={onGift}
        aria-label={t('Leave a gift. {n} gifts left', { n: giftCount })}
      />

      {/* Guestbook */}
      <TributeButton
        emoji="📖"
        label="Guestbook"
        count={guestbookCount}
        onClick={onGuestbook}
        aria-label={t('Open guestbook. {n} messages', { n: guestbookCount })}
      />

      {/* Share */}
      <TributeButton
        emoji="💌"
        label="Share"
        onClick={onShare}
        aria-label={t('Share this memorial')}
      />

      {/* Keepsake */}
      {onKeepsake && <TributeButton
        emoji="🖼️"
        label="Keepsake"
        onClick={onKeepsake}
        aria-label={t('Order a keepsake')}
        highlight
      />}
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
        'flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl border transition-all duration-150',
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
