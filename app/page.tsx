// app/page.tsx — Landing page: candlelit hero, stats, featured memorials, how it works, floors, guides, FAQ

import Link from 'next/link'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { Starfield, OnlineCount, Ticker, Reveal, CountUp } from '@/components/site/LandingFx'
import { AddPetButton } from '@/components/site/AddPetButton'
import { ShrineCard } from '@/components/ui/ShrineCard'
import { getFloors, getMemorials, getOpenFloor, getStats } from '@/lib/data'
import { FLOOR_CAPACITY, FLOOR_COUNT } from '@/components/3d/layout'
import { getFloorName } from '@/lib/utils'
import { ARTICLES } from '@/lib/articles'

const STEPS = [
  { icon: '📷', title: 'Share a photo and a name', text: "No password, no account. Add their years and a few words if you'd like." },
  { icon: '🏛️', title: 'Their shrine takes its place', text: 'It appears right away on the open floor of the hall, beside companions from around the world.' },
  { icon: '🕯️', title: 'Others keep the light on', text: "Visitors leave candles, flowers and words. We'll send you a gentle note when someone stops by." },
]

const FAQ = [
  { q: 'Is it free to create a memorial?', a: 'Yes, completely. Anyone, anywhere can create a shrine without a password or subscription.' },
  { q: 'How do the floors work?', a: `The building has ${FLOOR_COUNT} floors of ${FLOOR_CAPACITY.toLocaleString('en-US')} shrines each, in galleries off a central lobby. Floor 1 fills first; take the stairs or the elevator to visit the others.` },
  { q: "Can I edit my pet's memorial later?", a: 'When you create a shrine, we email you a private edit link. You can update photos, dates and words at any time.' },
  { q: 'Can I keep a memorial private?', a: 'Yes. Choose "Unlisted" and only people with the link can visit. It won\'t appear in the public directory.' },
]

const GUIDE_ART = [
  ['🌈', '#FCE7C8', '#D8B4E2'], ['🌿', '#E3EEDD', '#C9DEC0'], ['🧒', '#DCE8F5', '#C3D6EE'],
  ['🌻', '#FBEFD5', '#F3DDB0'], ['💌', '#F6E1E1', '#EBC8CC'],
]

// Every number here is counted live from real use
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [stats, { pets: featured }, floors, openFloor] = await Promise.all([getStats(), getMemorials({ limit: 8 }), getFloors(), getOpenFloor()])

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <header className="night-sky relative flex min-h-svh flex-col overflow-hidden text-[#FAF7F2]">
        <Starfield />
        <div className="moon" aria-hidden="true" />
        <div className="relative z-[2] grid flex-1 place-items-center px-5 pb-10 pt-[130px] text-center">
          <div>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.82rem] text-[#FAF7F2]/85 backdrop-blur">
              <span className="live-dot" /><OnlineCount /> people are visiting the hall right now
            </span>
            <h1 className="mx-auto mb-5 mt-6 max-w-[14ch] font-serif font-normal leading-[1.05] tracking-[-0.01em]" style={{ fontSize: 'clamp(2.6rem,7vw,5.2rem)' }}>
              A place that <em className="text-glow">never forgets</em>
            </h1>
            <p className="mx-auto mb-8 max-w-[52ch] text-lg text-[#FAF7F2]/70">
              Give your companion a candlelit shrine in a shared memorial hall. Strangers from around the world stop by to light a candle, leave a flower and say their name.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <AddPetButton className="btn btn-amber">🕯️ Create a free memorial</AddPetButton>
              <Link href="/hall" className="btn btn-ghost">Walk the 3D hall →</Link>
            </div>
          </div>
        </div>
        <div className="relative z-[2] flex h-[220px] items-end justify-center gap-[clamp(10px,3vw,40px)]" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="alcove"><div className="candle"><div className="flame" /></div></div>
          ))}
          <div className="absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-[#FAF7F2] to-transparent" />
        </div>
      </header>

      {/* Live ticker */}
      <div role="status" aria-live="polite" className="relative z-[3] mx-auto -mt-7 flex w-[min(680px,calc(100%-32px))] items-center gap-3 overflow-hidden rounded-full border border-[#E8DFD6] bg-white px-5 py-3 text-[0.9rem] text-[#5C5046] shadow-[0_18px_40px_-20px_rgba(42,30,23,.35)]">
        <span aria-hidden>✨</span>
        <Ticker />
      </div>

      <main>
        {/* Stats */}
        <section className="py-24">
          <Reveal className="mx-auto max-w-[1180px] px-5">
            <span className="eyebrow">Tonight in the hall</span>
            <h2 className="title">Every light is someone remembered.</h2>
            <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                [stats.total_pets, 'pets remembered'],
                [stats.total_countries, 'countries'],
                [stats.total_candles, 'candles lit'],
                [stats.total_flowers, 'flowers left'],
              ].map(([n, label]) => (
                <div key={label} className="card px-6 py-7">
                  <div className="font-serif text-[clamp(1.7rem,3vw,2.3rem)]"><CountUp to={n as number} /></div>
                  <div className="text-sm text-[#8E8278]">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Featured memorials */}
        <section className="pb-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow">The memorials</span>
                <h2 className="title">Say their names.</h2>
                <p className="max-w-[56ch] text-[#5C5046]">Open a shrine to light a candle or sign the guestbook. Some are still waiting for their very first light.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/memorials?waiting=true" className="chip">🕯️ Waiting for a candle</Link>
                <Link href="/memorials" className="chip" aria-current="true">See all memorials →</Link>
              </div>
            </Reveal>
            {featured.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
                {featured.map(p => <ShrineCard key={p.id} pet={p} />)}
              </div>
            ) : (
              <div className="card px-6 py-14 text-center">
                <div className="mb-3 text-4xl">🕯️</div>
                <p className="mb-5 font-serif text-xl">No shrines yet. The first light is waiting to be lit.</p>
                <AddPetButton className="btn btn-amber">Create the first memorial</AddPetButton>
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-[#F4EFE6] py-24">
          <Reveal className="mx-auto max-w-[1180px] px-5">
            <span className="eyebrow">How it works</span>
            <h2 className="title">Three quiet steps.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="rounded-[20px] border border-[#E8DFD6] bg-[#FFFDF9] px-6 py-8">
                  <span className="mb-5 block font-serif text-[#C67129]">0{i + 1}</span>
                  <div className="mb-2.5 text-3xl">{s.icon}</div>
                  <h3 className="mb-1.5 font-serif text-xl font-medium">{s.title}</h3>
                  <p className="text-[0.95rem] text-[#5C5046]">{s.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Floors */}
        <section className="bg-[#17131B] py-24 text-[#FAF7F2]">
          <Reveal className="mx-auto max-w-[1180px] px-5">
            <span className="eyebrow !text-[#F6C48A]">The hall</span>
            <h2 className="title">{FLOOR_COUNT} floors, {FLOOR_CAPACITY.toLocaleString('en-US')} shrines each.</h2>
            <p className="max-w-[56ch] text-[#FAF7F2]/70">
              Each floor has a lobby, corridors and three galleries of shrines; stairs and an elevator join them. Floor 1 fills first.
              New shrines go to floor {openFloor}, <em className="font-serif">{getFloorName(openFloor)}</em>.
            </p>
            <div className="mt-9 grid grid-cols-6 gap-2 sm:grid-cols-11">
              {floors.map(fl => {
                const n = fl.id, open = n === openFloor, fill = fl.current_count / fl.capacity
                return (
                  <Link
                    key={n}
                    href="/hall"
                    title={`Floor ${n} · ${getFloorName(n)} · ${fl.current_count.toLocaleString('en-US')} of ${fl.capacity.toLocaleString('en-US')} shrines`}
                    className={`relative flex aspect-square flex-col justify-end overflow-hidden rounded-xl border bg-[#2A2331] p-2 text-[0.6rem] text-[#FAF7F2]/55 transition hover:border-[#D9823B]/60 sm:text-xs ${open ? 'border-[#D9823B] shadow-[0_0_30px_-6px_rgba(229,149,75,.55)]' : 'border-white/[.07]'}`}
                  >
                    <i className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#E5954B]/35 to-[#E5954B]/10" style={{ height: `${Math.round(fill * 100)}%` }} />
                    <b className="relative font-serif text-sm font-medium text-[#FAF7F2] sm:text-base">{n}</b>
                    <span className="relative">{fill >= 1 ? 'Full' : open ? 'Open' : fl.current_count ? `${fl.current_count}` : 'Empty'}</span>
                  </Link>
                )
              })}
            </div>
          </Reveal>
        </section>

        {/* Guides */}
        <section className="py-24">
          <Reveal className="mx-auto max-w-[1180px] px-5">
            <span className="eyebrow">Guides</span>
            <h2 className="title">For the days after.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ARTICLES.map((a, i) => {
                const [emoji, c1, c2] = GUIDE_ART[i % GUIDE_ART.length]
                return (
                  <Link key={a.slug} href="/guides" className={`card flex flex-col overflow-hidden transition hover:-translate-y-1 ${i === 0 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}>
                    <div className={`grid place-items-center ${i === 0 ? 'min-h-[200px] flex-1 text-6xl' : 'h-[140px] text-[2.6rem]'}`} style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>{emoji}</div>
                    <div className="p-5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#C67129]">{a.category} · {a.readTime}</span>
                      <h3 className="my-1.5 font-serif text-lg font-medium">{a.title}</h3>
                      <p className="text-sm text-[#5C5046]">{a.excerpt}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="pb-24">
          <Reveal className="mx-auto max-w-[760px] px-5">
            <div className="text-center"><span className="eyebrow">About</span><h2 className="title">Questions, gently answered.</h2></div>
            <div className="mt-8">
              {FAQ.map(f => (
                <details key={f.q} className="group border-b border-[#E8DFD6] py-5">
                  <summary className="flex cursor-pointer list-none justify-between gap-4 font-serif text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="font-sans text-xl text-[#C67129] transition group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2.5 text-[#5C5046]">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Closing CTA */}
        <Reveal className="mx-5">
          <div className="rounded-[32px] px-6 py-20 text-center text-[#FAF7F2]" style={{ background: 'radial-gradient(100% 140% at 50% 120%,#4a2c25,#17131B 70%)' }}>
            <h2 className="mx-auto mb-4 max-w-[18ch] font-serif font-normal leading-[1.15]" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)' }}>Their light can stay on, always.</h2>
            <p className="mb-8 text-[#FAF7F2]/70">It takes about a minute. No account needed.</p>
            <AddPetButton className="btn btn-amber">🕯️ Create a free memorial</AddPetButton>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
