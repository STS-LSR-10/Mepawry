'use client'
// components/site/Splash.tsx — The opening screen while the 3D hall loads: the Mepawry logo (a clay paw in a
// greenhouse window, with a candle), coming up from faint to full as it loads, how far along it is, and how many pets
// and countries are remembered. Fades out once ready.
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
  const k = shown / 100 // the logo comes up from faint to full as the hall loads
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_42%,#FBF6EC_0%,#F5EDDF_55%,#EDE2CF_100%)] px-6 text-center transition-opacity duration-500 ${ready && pct >= 100 ? 'pointer-events-none opacity-0 delay-200' : 'opacity-100'}`}
      role="status"
      aria-label={t('Loading the memorial hall…')}
    >
      <div className="relative w-[min(19rem,72vw)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.webp" alt="Mepawry" width={1024} height={1024} fetchPriority="high" decoding="async"
          className="block h-auto w-full transition-[opacity,filter] duration-500 ease-out [mask-image:radial-gradient(circle_at_50%_50%,#000_58%,transparent_72%)]"
          style={{ opacity: 0.12 + 0.88 * k, filter: `saturate(${0.2 + 0.8 * k}) blur(${(1 - k) * 2}px)` }}
        />
        {/* The candle's warm glow, once the logo is mostly in */}
        <div className="pointer-events-none absolute h-[14%] w-[14%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
          style={{ left: '59%', top: '55%', opacity: Math.max(0, k * 1.6 - 0.6) }} aria-hidden>
          <div className="splash-glow h-full w-full rounded-full bg-[#FFB45A]/40 blur-xl" />
        </div>
      </div>
      <p className="-mt-2 text-sm text-[#8A6A52]">{t('A place that never forgets')}</p>

      <div className="mt-7 w-48">
        <div className="h-[3px] overflow-hidden rounded-full bg-[#8A6A52]/15">
          <div className="h-full rounded-full bg-gradient-to-r from-[#A9C3A0] via-[#D9B26A] to-[#B07A4F] transition-[width] duration-300"
            style={{ width: `${shown}%` }} role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100} />
        </div>
        <p className="mt-2 text-xs font-semibold tabular-nums tracking-[0.2em] text-[#9B7A5F]">{shown}%</p>
      </div>

      <p className={`mt-6 text-sm text-[#6E5442] transition-opacity duration-500 ${stats ? 'opacity-100' : 'opacity-0'}`}>
        {stats && <>🐾 {one(stats.pets, '{n} pets remembered', '1 pet remembered', 'n')} · 🌍 {one(stats.countries, '{c} countries', '1 country', 'c')}</>}
      </p>
    </div>
  )
}
