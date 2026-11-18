'use client'
// components/shrine/FloatingHeader.tsx — Floating HUD overlay บน 3D World

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { formatCount } from '@/lib/utils'
import { AddPetModal } from './AddPetModal'

interface FloatingHeaderProps {
  visitorCount: number
  avatarName: string
  currentFloor: number
  activityFeed: string[]
}

export function FloatingHeader({
  visitorCount,
  avatarName,
  currentFloor,
  activityFeed,
}: FloatingHeaderProps) {
  const [addPetOpen, setAddPetOpen] = useState(false)
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
            <span className="font-serif font-semibold text-[#FAF7F2] text-sm">Paw Memorial</span>
          </Link>

          {/* Center: quick pills */}
          <nav className="hidden sm:flex items-center gap-2" aria-label="Quick navigation">
            <QuickPill href="/memorials" icon="🐾" label="All pets" />
            <QuickPill href="/memorials?waiting=true" icon="🕯️" label="Waiting" badge />
            <QuickPill href="#" icon="📖" label="Diaries" />
            <QuickPill href="#" icon="🏮" label="Lantern" />
          </nav>

          {/* Right: CTA + audio + menu */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddPetOpen(true)} className="shadow-sm">
              + Add my pet
            </Button>
          </div>
        </div>

        {/* Second row: presence + avatar + ticker */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 pb-2">
          {/* Live presence */}
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-sm text-[#FAF7F2] shadow-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
            <span>{formatCount(visitorCount)} here now</span>
          </div>

          {/* Avatar */}
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-sm text-[#FAF7F2] shadow-sm border border-white/10">
            <span
              className="w-6 h-6 rounded-full bg-[#D9823B] flex items-center justify-center text-white text-xs font-bold"
              aria-hidden
            >
              {avatarName[0]}
            </span>
            <span>{avatarName}</span>
            <span className="text-[#8E8278]">›</span>
          </div>

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
