'use client'
// components/site/Splash.tsx — The opening screen while the 3D hall loads: the Mepawry mark (a candle glowing in
// a paw), the name, how far along it is, and how many pets and countries are remembered. Fades out once ready.
// The percentage eases toward 90% while loading and jumps to 100% when the hall has drawn its first frame.

import { useEffect, useState } from 'react'
import { useLang, useT } from '@/lib/i18n'

export function Splash({ ready }: { ready: boolean }) {
  const t = useT()
  const { lang } = useLang()
  // English needs the singular for one; the other languages here don't change the noun
  const one = (n: number, key: string, singular: string, v: string) => (lang === 'en' && n === 1 ? singular : t(key, { [v]: n.toLocaleString() }))
  const [pct, setPct] = useState(0)
  const [gone, setGone] = useState(false)
  const [stats, setStats] = useState<{ pets: number; countries: number } | null>(null)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStats({ pets: Number(d.total_pets) || 0, countries: Number(d.total_countries) || 0 })).catch(() => {})
  }, [])

  useEffect(() => {
    if (ready) {
      setPct(100)
      const id = setTimeout(() => setGone(true), 700)
      return () => clearTimeout(id)
    }
    const id = setInterval(() => setPct(p => p + (90 - p) * 0.07), 120)
    return () => clearInterval(id)
  }, [ready])

  if (gone) return null
  const shown = Math.round(pct)
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_45%,#2A1E2E_0%,#140F17_70%)] px-6 text-center transition-opacity duration-500 ${ready && pct >= 100 ? 'pointer-events-none opacity-0 delay-200' : 'opacity-100'}`}
      role="status"
      aria-label={t('Loading the memorial hall…')}
    >
      <Mark />
      <h1 className="mt-6 font-serif text-4xl font-semibold tracking-wide text-[#FAF0E2]">Mepawry</h1>
      <p className="mt-1 text-sm text-[#FAF0E2]/55">{t('A place that never forgets')}</p>

      <div className="mt-8 w-48">
        <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#F6B4C6] via-[#FFD27A] to-[#E5954B] transition-[width] duration-300"
            style={{ width: `${shown}%` }} role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100} />
        </div>
        <p className="mt-2 text-xs font-semibold tabular-nums tracking-[0.2em] text-[#E8C9A0]">{shown}%</p>
      </div>

      <p className={`mt-6 text-sm text-[#FAF0E2]/80 transition-opacity duration-500 ${stats ? 'opacity-100' : 'opacity-0'}`}>
        {stats && <>🐾 {one(stats.pets, '{n} pets remembered', '1 pet remembered', 'n')} · 🌍 {one(stats.countries, '{c} countries', '1 country', 'c')}</>}
      </p>
    </div>
  )
}

/** A paw whose big pad holds a lit candle; the flame flickers and glows. */
function Mark() {
  return (
    <div className="relative h-36 w-36">
      <div className="absolute inset-0 rounded-full bg-[#FFB45A]/20 blur-2xl splash-glow" aria-hidden />
      <svg viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="splashPad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE3B0" />
            <stop offset="0.55" stopColor="#F2A65A" />
            <stop offset="1" stopColor="#C9703A" />
          </linearGradient>
          <linearGradient id="splashToe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F9C9D6" />
            <stop offset="1" stopColor="#D98BA3" />
          </linearGradient>
          <radialGradient id="splashFlame" cx=".5" cy=".7" r=".6">
            <stop offset="0" stopColor="#FFFBE8" />
            <stop offset=".5" stopColor="#FFD36A" />
            <stop offset="1" stopColor="#FF9A3C" />
          </radialGradient>
        </defs>
        {/* toes */}
        <ellipse cx="27" cy="50" rx="11" ry="13" fill="url(#splashToe)" opacity=".9" transform="rotate(-22 27 50)" />
        <ellipse cx="46" cy="30" rx="11" ry="14" fill="url(#splashToe)" opacity=".9" transform="rotate(-8 46 30)" />
        <ellipse cx="74" cy="30" rx="11" ry="14" fill="url(#splashToe)" opacity=".9" transform="rotate(8 74 30)" />
        <ellipse cx="93" cy="50" rx="11" ry="13" fill="url(#splashToe)" opacity=".9" transform="rotate(22 93 50)" />
        {/* main pad */}
        <path d="M60 52c17 0 34 14 34 33 0 15-12 23-34 23S26 100 26 85c0-19 17-33 34-33z" fill="url(#splashPad)" />
        {/* candle */}
        <rect x="53" y="76" width="14" height="22" rx="3" fill="#FFF6E6" />
        <rect x="53" y="76" width="14" height="4" rx="2" fill="#F3E2C6" />
        <line x1="60" y1="76" x2="60" y2="71" stroke="#3A2414" strokeWidth="1.4" strokeLinecap="round" />
        <path className="splash-flame" d="M60 56c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="url(#splashFlame)" />
      </svg>
    </div>
  )
}
