// app/report/page.tsx — S11 Global Pet Loss Analytics & Report

import Link from 'next/link'
import { T } from '@/lib/i18n'
import { k } from '@/lib/tkey'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { getStats, getTopNames } from '@/lib/data'
import { formatCount } from '@/lib/utils'

export const metadata = {
  title: 'Global Pet Loss Report — Mepawry',
  description: 'Live statistics counted from every memorial in the hall.',
}

export const dynamic = 'force-dynamic'

export default async function ReportPage() {
  const [stats, topNames] = await Promise.all([getStats(), getTopNames()])

  // No memorials yet → all zero instead of dividing by zero
  const pct = (n: number) => (stats.total_pets ? Math.round((n / stats.total_pets) * 100) : 0)
  const dogPct = pct(stats.total_dogs)
  const catPct = pct(stats.total_cats)
  const otherPct = stats.total_pets ? 100 - dogPct - catPct : 0

  return (
    <div className="min-h-dvh bg-[#FAF7F2]">
      <SiteNav solid />

      <main className="max-w-4xl mx-auto px-4 pt-[calc(68px+3rem)] pb-16 space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <span className="text-4xl">📊</span>
          <h1 className="font-serif text-3xl font-bold text-[#2A1E17]">
            <T text="Global Pet Loss Report" />
          </h1>
          <p className="text-xs text-[#8E8278]">
            <T text="Live from {n} memorials across {c} countries" vars={{ n: stats.total_pets.toLocaleString('en-US'), c: stats.total_countries }} />
          </p>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: k('Memorials'), value: formatCount(stats.total_pets), sub: k('From {c} countries'), icon: '🐾' },
            { label: k('Candles Lit'), value: formatCount(stats.total_candles), sub: k('Shared warmth'), icon: '🕯️' },
            { label: k('Flowers Placed'), value: formatCount(stats.total_flowers), sub: k('Tributes of love'), icon: '🌸' },
            { label: k('Average Age'), value: stats.avg_age == null ? '—' : <T text="{n} yrs" vars={{ n: stats.avg_age }} />, sub: k('When birth and passing years are given'), icon: '⏳' },
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E8DFD6] shadow-sm text-center">
              <span className="text-2xl block mb-1">{item.icon}</span>
              <span className="font-serif text-2xl font-bold text-[#2A1E17] block">{item.value}</span>
              <span className="text-xs font-semibold text-[#5C5046] block mt-0.5"><T text={item.label} /></span>
              <span className="text-[10px] text-[#8E8278]"><T text={item.sub} vars={{ c: stats.total_countries }} /></span>
            </div>
          ))}
        </div>

        {/* Species Breakdown */}
        <section className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2A1E17]"><T text="Species Breakdown" /></h2>
          {/* Visual bar */}
          <div className="h-4 rounded-full overflow-hidden flex">
            <div style={{ width: `${dogPct}%` }} className="bg-[#2471A3]" title={`Dogs: ${dogPct}%`} />
            <div style={{ width: `${catPct}%` }} className="bg-[#D4AC0D]" title={`Cats: ${catPct}%`} />
            <div style={{ width: `${otherPct}%` }} className="bg-[#27AE60]" title={`Others: ${otherPct}%`} />
          </div>
          <div className="flex justify-around text-center pt-2 text-xs">
            <div>
              <span className="font-bold text-[#2471A3] block text-sm">🐶 <T text="Dogs" /> ({dogPct}%)</span>
              <span className="text-[#8E8278]"><T text="{n} memorials" vars={{ n: stats.total_dogs.toLocaleString('en-US') }} /></span>
            </div>
            <div>
              <span className="font-bold text-[#D4AC0D] block text-sm">🐱 <T text="Cats" /> ({catPct}%)</span>
              <span className="text-[#8E8278]"><T text="{n} memorials" vars={{ n: stats.total_cats.toLocaleString('en-US') }} /></span>
            </div>
            <div>
              <span className="font-bold text-[#27AE60] block text-sm">🐾 <T text="Others" /> ({otherPct}%)</span>
              <span className="text-[#8E8278]"><T text="{n} memorials" vars={{ n: stats.total_others.toLocaleString('en-US') }} /></span>
            </div>
          </div>
        </section>

        {/* Top Pet Names */}
        <section className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2A1E17]"><T text="Most Cherished Names Globally" /></h2>
          <div className="flex flex-wrap gap-2">
            {topNames.length === 0 && <span className="text-sm text-[#8E8278]"><T text="No memorials yet." /></span>}
            {topNames.map((n, i) => (
              <span
                key={n.name}
                className="bg-[#FAF7F2] border border-[#E8DFD6] rounded-full px-3.5 py-1.5 text-xs text-[#2A1E17] font-medium flex items-center gap-1.5"
              >
                <span className="text-[#D9823B] font-bold">#{i + 1}</span>
                {n.name}
                <span className="text-[#8E8278] text-[10px]">({n.count})</span>
              </span>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
