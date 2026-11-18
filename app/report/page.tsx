// app/report/page.tsx — S11 Global Pet Loss Analytics & Report

import Link from 'next/link'
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
            Global Pet Loss Report
          </h1>
          <p className="text-xs text-[#8E8278]">
            Live from {stats.total_pets.toLocaleString('en-US')} memorials across {stats.total_countries} {stats.total_countries === 1 ? 'country' : 'countries'}
          </p>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Memorials', value: formatCount(stats.total_pets), sub: `From ${stats.total_countries} ${stats.total_countries === 1 ? 'country' : 'countries'}`, icon: '🐾' },
            { label: 'Candles Lit', value: formatCount(stats.total_candles), sub: 'Shared warmth', icon: '🕯️' },
            { label: 'Flowers Placed', value: formatCount(stats.total_flowers), sub: 'Tributes of love', icon: '🌸' },
            { label: 'Average Age', value: stats.avg_age == null ? '—' : `${stats.avg_age} yrs`, sub: 'When birth and passing years are given', icon: '⏳' },
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E8DFD6] shadow-sm text-center">
              <span className="text-2xl block mb-1">{item.icon}</span>
              <span className="font-serif text-2xl font-bold text-[#2A1E17] block">{item.value}</span>
              <span className="text-xs font-semibold text-[#5C5046] block mt-0.5">{item.label}</span>
              <span className="text-[10px] text-[#8E8278]">{item.sub}</span>
            </div>
          ))}
        </div>

        {/* Species Breakdown */}
        <section className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2A1E17]">Species Breakdown</h2>
          {/* Visual bar */}
          <div className="h-4 rounded-full overflow-hidden flex">
            <div style={{ width: `${dogPct}%` }} className="bg-[#2471A3]" title={`Dogs: ${dogPct}%`} />
            <div style={{ width: `${catPct}%` }} className="bg-[#D4AC0D]" title={`Cats: ${catPct}%`} />
            <div style={{ width: `${otherPct}%` }} className="bg-[#27AE60]" title={`Others: ${otherPct}%`} />
          </div>
          <div className="flex justify-around text-center pt-2 text-xs">
            <div>
              <span className="font-bold text-[#2471A3] block text-sm">🐶 Dogs ({dogPct}%)</span>
              <span className="text-[#8E8278]">{stats.total_dogs.toLocaleString()} memorials</span>
            </div>
            <div>
              <span className="font-bold text-[#D4AC0D] block text-sm">🐱 Cats ({catPct}%)</span>
              <span className="text-[#8E8278]">{stats.total_cats.toLocaleString()} memorials</span>
            </div>
            <div>
              <span className="font-bold text-[#27AE60] block text-sm">🐾 Others ({otherPct}%)</span>
              <span className="text-[#8E8278]">{stats.total_others.toLocaleString()} memorials</span>
            </div>
          </div>
        </section>

        {/* Top Pet Names */}
        <section className="bg-white p-6 rounded-3xl border border-[#E8DFD6] shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2A1E17]">Most Cherished Names Globally</h2>
          <div className="flex flex-wrap gap-2">
            {topNames.length === 0 && <span className="text-sm text-[#8E8278]">No memorials yet.</span>}
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
