'use client'
// components/site/SiteNav.tsx — Shared top navigation + footer for content pages

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AddPetModal } from '@/components/shrine/AddPetModal'
import { AccountButton } from '@/components/account/AccountButton'
import { openSettings, useT } from '@/lib/i18n'

const LINKS = [
  { href: '/memorials', label: 'Memorials' },
  { href: '/hall', label: '3D Hall' },
  { href: '/board', label: 'Board' },
  { href: '/guides', label: 'Guides' },
  { href: '/report', label: 'Report' },
  { href: '/about', label: 'About' },
]

/** `solid` keeps the dark bar on pages without a dark hero behind it. */
export function SiteNav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const t = useT()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-[background,box-shadow] duration-300',
          (solid || scrolled) && 'bg-[#17131B]/85 shadow-[0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl'
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-5">
          <Logo className="text-[#FAF7F2]" />
          <div className="flex items-center gap-3 md:gap-6">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className="hidden text-sm text-[#FAF7F2]/75 transition hover:text-white md:block">
                {t(l.label)}
              </Link>
            ))}
            <button onClick={openSettings} aria-label={t('Settings')} className="grid h-9 w-9 place-items-center rounded-full text-[#FAF7F2]/80 transition hover:bg-white/10 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
            <AccountButton />
            <button className="btn btn-amber btn-sm" onClick={() => setAddOpen(true)}>{t('+ Add my pet')}</button>
          </div>
        </div>
      </nav>
      <AddPetModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 font-serif text-xl', className)} aria-label="Mepawry home">
      <svg viewBox="0 0 32 32" className="h-[30px] w-[30px]" aria-hidden="true">
        <defs>
          <radialGradient id="pawGlow" cx=".5" cy=".6">
            <stop offset="0" stopColor="#FFD27A" />
            <stop offset="1" stopColor="#C67129" />
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="20" rx="7" ry="6" fill="url(#pawGlow)" />
        <circle cx="8" cy="12" r="3" fill="url(#pawGlow)" />
        <circle cx="13" cy="7.5" r="3" fill="url(#pawGlow)" />
        <circle cx="19" cy="7.5" r="3" fill="url(#pawGlow)" />
        <circle cx="24" cy="12" r="3" fill="url(#pawGlow)" />
      </svg>
      Mepawry
    </Link>
  )
}

export function SiteFooter() {
  const t = useT()
  return (
    <footer className="py-14 text-sm text-[#8E8278]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5">
        <Logo className="text-[#2A1E17]" />
        <div className="flex flex-wrap gap-5">
          {LINKS.map(l => <Link key={l.href} href={l.href} className="hover:text-[#2A1E17]">{t(l.label)}</Link>)}
        </div>
        <span>{t('Made with care for everyone who has loved an animal.')}</span>
      </div>
    </footer>
  )
}
