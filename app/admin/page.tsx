// app/admin/page.tsx — The site owner's page: visitors (and their countries), purchases, and this month's AI costs.
// Only admins can open it: an ADMIN_EMAILS email signed in on the site, or come in through Cloudflare Access
// (lib/accessAuth.ts). Everyone else gets a 404. Written in Thai: it's for the owner.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/site/SiteNav'
import { getUser, isAdmin, isAdminEmail } from '@/lib/auth'
import { accessEmail } from '@/lib/accessAuth'
import { aiCosts, PERIODS, purchaseStats, range, visitorStats, WORKERS_FREE_NEURONS, type Period } from '@/lib/adminStats'
import { flagEmoji } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Mepawry', robots: { index: false, follow: false } }

const PERIOD_TH: Record<Period, string> = { day: 'วันนี้', week: '7 วันล่าสุด', month: 'เดือนนี้', year: 'ปีนี้' }
const KIND_TH: Record<string, string> = { vip: 'ย้ายเข้า VIP', niche: 'ช่อง VIP (ศาลใหม่)', frame: 'กรอบรูป', backdrop: 'ฉากหลัง', gift: 'ของขวัญพิเศษ' }
const countryName = (cc: string) => {
  if (cc === 'XX') return 'ไม่ทราบประเทศ'
  try { return new Intl.DisplayNames(['th'], { type: 'region' }).of(cc) ?? cc } catch { return cc }
}
const n0 = (n: number) => Math.round(n).toLocaleString('en-US')
const usd = (n: number) => `$${n > 0 && n < 1 ? n.toFixed(4) : n.toFixed(2)}`

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (!isAdminEmail(await accessEmail()) && !isAdmin(await getUser())) notFound()
  const p: Period = PERIODS.includes((await searchParams).p as Period) ? ((await searchParams).p as Period) : 'day'
  const [visits, sales, ai] = await Promise.all([visitorStats(p), purchaseStats(p), aiCosts()])
  const { from, to } = range(p)
  const maxDay = Math.max(1, ...visits.days.map(d => d.n))
  const freePct = Math.min(100, (ai.workers.neuronsToday / WORKERS_FREE_NEURONS) * 100)

  return (
    <div className="min-h-dvh bg-[#FAF7F2] text-[#2A1E17]">
      <SiteNav solid />
      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-[calc(68px+2rem)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D9823B]">Admin</p>
            <h1 className="font-serif text-3xl font-bold">ภาพรวม Mepawry</h1>
            <p className="mt-1 text-sm text-[#8E8278]">{from === to ? from : `${from} – ${to}`} · เวลาไทย</p>
          </div>
          <nav className="flex gap-1 rounded-2xl bg-[#F4EBDD] p-1" aria-label="ช่วงเวลา">
            {PERIODS.map(x => (
              <Link key={x} href={`/admin?p=${x}`} aria-current={x === p ? 'page' : undefined}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${x === p ? 'bg-white shadow-sm' : 'text-[#8E8278] hover:text-[#2A1E17]'}`}>
                {PERIOD_TH[x]}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── visitors ── */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#EFE4D4]">
          <h2 className="font-serif text-xl font-bold">👥 ผู้เข้าชม</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="คน (ไม่นับซ้ำ)" value={n0(visits.visitors)} />
            <Stat label="ประเทศ" value={n0(visits.countries.filter(c => c.country !== 'XX').length)} />
          </div>
          {visits.days.length > 1 && (
            <div className="mt-4 flex h-24 items-end gap-0.5" aria-label="ผู้เข้าชมรายวัน">
              {visits.days.map(d => (
                <div key={d.day} title={`${d.day}: ${d.n} คน`} className="min-w-[3px] flex-1 rounded-t bg-[#D9823B]/70" style={{ height: `${(d.n / maxDay) * 100}%` }} />
              ))}
            </div>
          )}
          <CountryList rows={visits.countries.map(c => ({ country: c.country, n: c.n }))} unit="คน" />
          <p className="mt-3 text-xs text-[#8E8278]">นับ 1 ครั้งต่อเบราว์เซอร์ต่อวัน (เริ่มนับตั้งแต่ 23 พ.ย. 2026) · ประเทศดูจากที่อยู่ IP</p>
        </section>

        {/* ── purchases ── */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#EFE4D4]">
          <h2 className="font-serif text-xl font-bold">🛍️ การซื้อ</h2>
          {sales.error ? (
            <p className="mt-3 rounded-xl bg-[#FDECEA] px-4 py-3 text-sm text-[#C0392B]">อ่านข้อมูลจาก Stripe ไม่ได้: {sales.error}</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="ชิ้นที่ขายได้" value={n0(sales.count)} />
                <Stat label="ยอดขาย" value={`฿${n0(sales.totalThb)}`} />
              </div>
              {Object.keys(sales.byKind).length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                  {Object.entries(sales.byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <li key={k} className="rounded-full bg-[#F4EBDD] px-3 py-1">{KIND_TH[k] ?? k} <b>{v}</b></li>
                  ))}
                </ul>
              )}
              <CountryList rows={sales.byCountry.map(c => ({ country: c.country, n: c.n, extra: `฿${n0(c.thb)}` }))} unit="ชิ้น" />
              <p className="mt-3 text-xs text-[#8E8278]">จาก Stripe (จ่ายเงินสำเร็จแล้ว) · ประเทศดูจากที่อยู่เรียกเก็บเงินของผู้ซื้อ</p>
            </>
          )}
        </section>

        {/* ── AI costs ── */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#EFE4D4]">
          <h2 className="font-serif text-xl font-bold">🤖 ค่า AI เดือนนี้ <span className="text-base font-normal text-[#8E8278]">({ai.month})</span></h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ค่าใช้จ่ายรวม" value={usd(ai.usd)} />
            <Stat label="จำนวนครั้งที่แปล" value={n0(ai.calls)} />
            <Stat label="Token ขาเข้า" value={n0(ai.inputTokens)} />
            <Stat label="Token ขาออก" value={n0(ai.outputTokens)} />
          </div>

          <h3 className="mt-5 text-sm font-semibold">Cloudflare Workers AI (m2m100)</h3>
          <p className="mt-1 text-sm text-[#5C5046]">
            {n0(ai.workers.calls)} ครั้ง · {n0(ai.workers.neurons)} neurons เดือนนี้ · เกินโควต้าฟรี {n0(ai.workers.billableNeurons)} neurons · {usd(ai.workers.usd)}
          </p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[#8E8278]"><span>ใช้ไปวันนี้ {n0(ai.workers.neuronsToday)} / {n0(WORKERS_FREE_NEURONS)} neurons ฟรี</span><span>{freePct.toFixed(1)}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F4EBDD]"><div className={`h-full rounded-full ${freePct >= 90 ? 'bg-[#C0392B]' : 'bg-[#7FA36B]'}`} style={{ width: `${freePct}%` }} /></div>
          </div>

          <h3 className="mt-5 text-sm font-semibold">Google Gemini</h3>
          <p className="mt-1 text-sm text-[#5C5046]">
            {ai.gemini.calls ? <>{n0(ai.gemini.calls)} ครั้ง · in {n0(ai.gemini.inputTokens)} / out {n0(ai.gemini.outputTokens)} token · {usd(ai.gemini.usd)}</> : 'ยังไม่ได้ใช้ (ตั้ง TRANSLATE_PROVIDER = gemini เพื่อเปิด)'}
          </p>
          <p className="mt-3 text-xs text-[#8E8278]">
            นับเฉพาะการแปลข้อความบนเว็บ (คำแปลที่เก็บไว้แล้วไม่นับซ้ำ){ai.estimated && ' · token ของ Workers AI เป็นค่าประมาณจากความยาวข้อความ เพราะโมเดลไม่ได้บอกจำนวนจริง'} ·
            ราคาตามหน้าราคาของผู้ให้บริการ (พ.ย. 2026) · ยอดจริงดูได้ที่ Cloudflare และ Google Cloud
          </p>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FAF3E8] px-4 py-3">
      <p className="text-xs text-[#8E8278]">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-bold">{value}</p>
    </div>
  )
}

function CountryList({ rows, unit }: { rows: { country: string; n: number; extra?: string }[]; unit: string }) {
  if (!rows.length) return <p className="mt-4 text-sm text-[#8E8278]">ยังไม่มีข้อมูลในช่วงนี้</p>
  const max = Math.max(...rows.map(r => r.n))
  return (
    <ul className="mt-4 space-y-1.5">
      {rows.slice(0, 20).map(r => (
        <li key={r.country} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate">{r.country === 'XX' ? '🌐' : flagEmoji(r.country)} {countryName(r.country)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[#F4EBDD]"><span className="block h-full rounded-full bg-[#D9823B]/70" style={{ width: `${(r.n / max) * 100}%` }} /></span>
          <span className="tabular-nums text-[#5C5046]">{n0(r.n)} {unit}{r.extra ? ` · ${r.extra}` : ''}</span>
        </li>
      ))}
    </ul>
  )
}
