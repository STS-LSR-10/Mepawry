'use client'
// components/shrine/FloatingHeader.tsx — Floating HUD overlay บน 3D World

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { formatCount } from '@/lib/utils'
import { AddPetModal } from './AddPetModal'
import { openSettings, useT } from '@/lib/i18n'

interface FloatingHeaderProps {
  visitorCount: number
  avatarName: string
  currentFloor: number
  activityFeed: string[]
  onOpenMyPage?: () => void
  /** Connection to the other visitors in the hall: green live, amber connecting, red offline. */
  liveStatus?: 'connecting' | 'live' | 'offline'
}

export function FloatingHeader({
  visitorCount,
  avatarName,
  currentFloor,
  activityFeed,
  onOpenMyPage,
  liveStatus = 'live',
}: FloatingHeaderProps) {
  const [addPetOpen, setAddPetOpen] = useState(false)
  const t = useT()
  const [tickerIndex, setTickerIndex] = useState(0)

  // Rotate activity ticker
  useEffect(() => {
    if (!activityFeed.length) return
    const id = setInterval(() => setTickerIndex(i => (i + 1) % activityFeed.length), 5000)
    return () => clearInterval(id)
  }, [activityFeed])

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
        style={{ height: 'var(--header-height, 64px)' }}
      >
        {/* Top bar */}
        <div className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3">
          {/* Logo */}
          <Link href="/" className="glass rounded-full px-4 py-2 flex items-center gap-2 shadow-sm border border-white/20">
            <span className="text-lg" aria-hidden>🐾</span>
            <span className="font-serif font-semibold text-[#FAF7F2] text-sm">Mepawry</span>
          </Link>

          {/* Center: quick pills */}
          <nav className="hidden sm:flex items-center gap-2" aria-label="Quick navigation">
            <QuickPill href="/memorials" icon="🐾" label={t('All pets')} />
            <QuickPill href="/memorials?waiting=true" icon="🕯️" label={t('Waiting')} badge />
            <button
              onClick={() => window.dispatchEvent(new Event('mepawry:board'))}
              className="glass rounded-full px-3 py-1.5 text-xs text-[#FAF7F2] border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-1.5"
            >
              <span aria-hidden>📖</span> {t('Board')}
            </button>
            <QuickPill href="#" icon="🏮" label={t('Lantern')} />
          </nav>

          {/* Right: CTA + audio + menu */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddPetOpen(true)} className="shadow-sm">
              {t('+ Add my pet')}
            </Button>
            <button
              onClick={openSettings}
              aria-label={t('Settings')}
              className="glass grid h-9 w-9 place-items-center rounded-full border border-white/20 text-[#FAF7F2] shadow-sm hover:bg-white/20"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>

          </div>
        </div>

        {/* Second row: presence + avatar + ticker */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 pb-2">
          {/* Live presence */}
          <div
            className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-sm text-[#FAF7F2] shadow-sm border border-white/10"
            title={liveStatus === 'live' ? 'Connected: you can see other visitors in this dome' : liveStatus === 'connecting' ? 'Connecting to other visitors…' : 'Can’t reach other visitors right now — retrying'}
          >
            <span className={`w-2 h-2 rounded-full ${liveStatus === 'live' ? 'bg-green-400 animate-pulse' : liveStatus === 'connecting' ? 'bg-amber-400' : 'bg-red-500'}`} aria-hidden />
            <span>{t('{n} here now', { n: formatCount(visitorCount) })}</span>
          </div>

          {/* Avatar */}
          <button
            onClick={onOpenMyPage}
            aria-label={`My page: ${avatarName}. Change name or sign in`}
            className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-sm text-[#FAF7F2] shadow-sm border border-white/10 hover:bg-white/20 transition-colors"
          >
            <span
              className="w-6 h-6 rounded-full bg-[#D9823B] flex items-center justify-center text-white text-xs font-bold"
              aria-hidden
            >
              {avatarName[0]?.toUpperCase()}
            </span>
            <span className="max-w-[9rem] truncate">{avatarName}</span>
            <span className="text-[#FAF7F2]/60" aria-hidden>›</span>
          </button>

          {/* Activity ticker */}
          {activityFeed.length > 0 && (
            <div
              className="glass rounded-full px-3 py-1.5 text-sm text-[#FAF7F2] shadow-sm border border-white/10 overflow-hidden max-w-xs hidden md:block"
              aria-live="polite"
              aria-label="Recent activity"
            >
              <span className="text-[#E5954B]">💡</span>{' '}
              {activityFeed[tickerIndex]}
            </div>
          )}
        </div>
      </header>

      <AddPetModal open={addPetOpen} onClose={() => setAddPetOpen(false)} />
    </>
  )
}

function QuickPill({
  href,
  icon,
  label,
  badge,
}: {
  href: string
  icon: string
  label: string
  badge?: boolean
}) {
  return (
    <Link
      href={href}
      className="relative glass rounded-full px-3 py-1.5 text-sm text-[#FAF7F2] hover:bg-white/20 transition-colors border border-white/10 flex items-center gap-1.5"
    >
      <span aria-hidden>{icon}</span>
      {label}
      {badge && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 bg-[#D9823B] rounded-full text-white text-[10px] flex items-center justify-center"
          aria-label="Has new items"
        />
      )}
    </Link>
  )
}
