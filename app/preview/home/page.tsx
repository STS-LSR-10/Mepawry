// app/preview/home/page.tsx — Sample of the redesigned home page ("Glasshouse Almanac"), to look at before it replaces
// app/page.tsx. Same live data; the pictures are real renders of the sanctuary (public/home/*), framed as arched oak
// windows to echo the logo. Not linked from anywhere and not indexed.

import Link from 'next/link'
import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import { SiteNav, SiteFooter } from '@/components/site/SiteNav'
import { OnlineCount, Ticker, Reveal, CountUp } from '@/components/site/LandingFx'
import { AddPetButton } from '@/components/site/AddPetButton'
import { ShrineCard } from '@/components/ui/ShrineCard'
import { getFloors, getMemorials, getOpenFloor, getStats } from '@/lib/data'
import { FLOOR_CAPACITY } from '@/components/3d/sanctuary/plan'
import { getFloorName } from '@/lib/utils'
import { ARTICLES } from '@/lib/articles'
import './home.css'

const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'WONK', 'opsz'], style: ['normal', 'italic'], variable: '--font-display' })

export const metadata: Metadata = { title: 'Home preview · Mepawry', robots: { index: false } }
export const dynamic = 'force-dynamic'

const TOUR = [
  { img: '/home/entrance.jpg', n: 'I', title: 'The glass dome', text: 'Walk up the path to the reception. The doors are always open.' },
  { img: '/home/lobby.jpg', n: 'II', title: 'The reception', text: 'A desk, a directory and soft chairs. Left and right lead into the galleries.' },
  { img: '/home/gallery.jpg', n: 'III', title: 'The ring galleries', text: 'Oak cabinets of little lit cubbies, one companion in each.' },
  { img: '/home/vip.jpg', n: 'IV', title: 'The VIP pavilion', text: 'On the terrace past the garden: arched niches round a fountain.' },
]

const STEPS = [
  { title: 'Share a photo and a name', text: 'No password, no account. Add their years and a few words if you like.' },
  { title: 'They take their own cubby', text: 'Their shrine appears right away in the open dome, beside companions from all over the world.' },
  { title: 'Others keep the light on', text: 'Visitors light candles, leave flowers and sign the guestbook. We send you a gentle note when someone stops by.' },
]

const FAQ = [
  { q: 'Is it free to create a memorial?', a: 'Yes, completely. Anyone, anywhere can create a shrine without a password or subscription.' },
  { q: 'How do the domes work?', a: `Each dome is a whole sanctuary of ${FLOOR_CAPACITY.toLocaleString('en-US')} cubbies. Dome 1 fills first; when it has fewer than 150 left the next one opens.` },
  { q: "Can I edit my pet's memorial later?", a: 'When you create a shrine we email you a private edit link. Update photos, dates and words any time.' },
  { q: 'Can I keep a memorial private?', a: 'Yes. Choose "Unlisted" and only people with the link can visit.' },
]

export default async function HomePreview() {
  const [stats, { pets: featured }, floors, openFloor] = await Promise.all([getStats(), getMemorials({ limit: 8 }), getFloors(), getOpenFloor()])
  const lastShown = Math.max(openFloor, ...floors.filter(f => f.is_open).map(f => f.id))
  const domes = floors.filter(f => f.id <= lastShown)
  const open = floors.find(f => f.id === openFloor)

  return (
    <div className={`gh ${display.variable}`}>
      <SiteNav tone="light" />

      {/* ── Hero: words on the left, the sanctuary in an arched oak window on the right ── */}
      <header className="gh-grain relative overflow-hidden pt-[96px]">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-10 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,#dfe7d6_0%,transparent_68%)]" />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-28">
          <div>
            <span className="gh-rise inline-flex items-center gap-2.5 rounded-full bg-[#fffaf1] px-4 py-2 text-[0.8rem] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)]" style={{ animationDelay: '.05s' }}>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sage)] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--sage-d)]" /></span>
              <OnlineCount /> people are walking the sanctuary right now
            </span>
            <h1 className="display gh-rise mb-6 mt-7 font-normal leading-[0.98]" style={{ fontSize: 'clamp(2.9rem,7.2vw,5.8rem)', animationDelay: '.15s' }}>
              A place that <em>never&nbsp;forgets.</em>
            </h1>
            <p className="gh-rise max-w-[46ch] text-[1.08rem] leading-relaxed text-[var(--ink-2)]" style={{ animationDelay: '.3s' }}>
              Give your companion a cubby of their own in a glasshouse sanctuary. People from around the world walk its galleries to light a candle, leave a flower and say their name.
            </p>
            <div className="gh-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: '.45s' }}>
              <AddPetButton className="gh-btn gh-btn-clay">🕯️ Create a free memorial</AddPetButton>
              <Link href="/hall" className="gh-btn gh-btn-paper">Walk the sanctuary →</Link>
            </div>
            <p className="gh-rise mt-6 text-sm text-[var(--muted)]" style={{ animationDelay: '.6s' }}>Free · about a minute · no account needed</p>
          </div>

          <div className="gh-rise relative mx-auto w-full max-w-[520px]" style={{ animationDelay: '.25s' }}>
            <Sprig className="gh-sway absolute -left-16 bottom-2 z-10 w-40 sm:-left-20 sm:w-48" />
            {/* mirrored on a wrapper: the sway animation sets its own transform */}
            <div className="absolute -right-8 top-24 z-10 w-28 -scale-x-100 sm:-right-12 sm:w-32"><Sprig className="gh-sway w-full" style={{ animationDelay: '-3s' }} /></div>
            <div className="gh-arch mullions aspect-[4/5]">
              <div className="pane">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/home/aerial.jpg" alt="The Mepawry Sanctuary from above: two glass ring galleries round a garden, a domed reception at the front and the VIP pavilion at the back" width={1440} height={900} fetchPriority="high" style={{ objectPosition: '50% 60%' }} />
              </div>
              <div className="gh-sill" />
            </div>
            <Candle className="absolute -bottom-3 right-10 z-10 w-12" />
            {open && (
              <div className="absolute -left-4 top-10 z-10 rotate-[-4deg] rounded-xl bg-[#fffaf1] px-4 py-3 text-left shadow-[0_18px_30px_-18px_rgba(60,35,15,.6),inset_0_0_0_1px_var(--line)] sm:-left-10">
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--sage-d)]">Now filling</div>
                <div className="display text-lg leading-tight">Dome {open.id} · <em>{getFloorName(open.id)}</em></div>
                <div className="text-xs text-[var(--muted)]">{open.current_count.toLocaleString('en-US')} of {open.capacity.toLocaleString('en-US')} cubbies</div>
              </div>
            )}
          </div>
        </div>

        {/* live happenings, like a line in a ledger */}
        <div className="border-y border-[var(--line)] bg-[#fffaf1]/70">
          <div role="status" aria-live="polite" className="mx-auto flex max-w-[1200px] items-center gap-3 overflow-hidden px-5 py-3.5 text-[0.92rem] text-[var(--ink-2)]">
            <span aria-hidden className="text-[var(--clay)]">✦</span>
            <Ticker />
          </div>
        </div>
      </header>

      <main>
        {/* ── Tonight: the numbers as a ledger ── */}
        <section className="py-20 sm:py-24">
          <Reveal className="mx-auto max-w-[1200px] px-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="gh-eyebrow">Tonight in the sanctuary</span>
                <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">Every light is <em>someone remembered.</em></h2>
              </div>
            </div>
            <div className="gh-ledger mt-10 grid grid-cols-2 md:grid-cols-4">
              {([
                [stats.total_pets, 'companions remembered'],
                [stats.total_countries, 'countries'],
                [stats.total_candles, 'candles lit'],
                [stats.total_flowers, 'flowers left'],
              ] as const).map(([n, label]) => (
                <div key={label} className="px-5 py-8 sm:px-8">
                  <div className="display text-[clamp(2.4rem,5vw,3.6rem)] leading-none text-[var(--ink)]"><CountUp to={n} /></div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── A walk through: four rooms, four arches, a dotted path ── */}
        <section className="bg-[var(--paper-2)] py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
              <div>
                <span className="gh-eyebrow">A walk through</span>
                <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">A glasshouse you can <em>actually walk.</em></h2>
              </div>
              <p className="max-w-[46ch] text-[var(--ink-2)] md:justify-self-end">Not a list of links: a real place in 3D. Your character walks in through the dome, along the galleries and up to the pavilion, meeting other visitors on the way.</p>
            </Reveal>
            <div className="relative mt-12">
              <div aria-hidden className="gh-path absolute left-[8%] right-[8%] top-[34%] hidden h-1 lg:block" />
              <div className="gh-tour -mx-5 flex gap-6 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {TOUR.map((r, i) => (
                  <Reveal key={r.n} className="w-[72vw] max-w-[300px] shrink-0 lg:w-auto lg:max-w-none">
                    <div className="gh-arch aspect-[3/4] !p-2" style={{ transitionDelay: `${i * 80}ms` }}>
                      <div className="pane">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.img} alt={r.title} width={1100} height={688} loading="lazy" />
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <span className="display mt-0.5 text-lg italic text-[var(--clay)]">{r.n}.</span>
                      <div>
                        <h3 className="display text-xl">{r.title}</h3>
                        <p className="mt-1 text-[0.93rem] leading-relaxed text-[var(--ink-2)]">{r.text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="mt-12 flex justify-center">
              <Link href="/hall" className="gh-btn gh-btn-clay">Step inside →</Link>
            </div>
          </div>
        </section>

        {/* ── The memorials: a lit shelf beside their names ── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] px-5">
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] lg:gap-16">
              <Reveal className="lg:sticky lg:top-28 lg:self-start">
                <span className="gh-eyebrow">The memorials</span>
                <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">Say their <em>names.</em></h2>
                <p className="mt-4 text-[var(--ink-2)]">Open a shrine to light a candle or sign the guestbook. Some are still waiting for their very first light.</p>
                <div className="gh-arch mt-8 hidden aspect-[4/3] !rounded-[24px] !p-2 lg:block">
                  <div className="pane !rounded-[18px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/shelf.jpg" alt="A lit cabinet of cubbies, each holding one pet's portrait and a candle" width={1100} height={688} loading="lazy" />
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href="/memorials?waiting=true" className="gh-btn gh-btn-paper !px-4 !py-2.5 text-sm">🕯️ Waiting for a candle</Link>
                  <Link href="/memorials" className="gh-btn gh-btn-paper !px-4 !py-2.5 text-sm">See all →</Link>
                </div>
              </Reveal>
              {featured.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] content-start gap-5">
                  {featured.map(p => <ShrineCard key={p.id} pet={p} />)}
                </div>
              ) : (
                <div className="rounded-3xl bg-[#fffaf1] px-6 py-16 text-center shadow-[inset_0_0_0_1px_var(--line)]">
                  <Candle className="mx-auto w-14" />
                  <p className="display mb-6 mt-4 text-2xl">No shrines yet. <em>The first light is waiting.</em></p>
                  <AddPetButton className="gh-btn gh-btn-clay">Create the first memorial</AddPetButton>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── How it works, beside the sanctuary at night ── */}
        <section className="relative overflow-hidden bg-[#1d1915] py-20 text-[#f6efe2] sm:py-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/aerial-night.jpg" alt="" aria-hidden width={1440} height={900} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#1d1915_15%,rgba(29,25,21,.75)_55%,rgba(29,25,21,.2))]" />
          <Reveal className="relative mx-auto max-w-[1200px] px-5">
            <span className="gh-eyebrow !text-[#c9d8bf]">How it works</span>
            <h2 className="display mt-3 max-w-[16ch] text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">Three quiet steps, <em className="!text-[#f0b483]">and a light stays on.</em></h2>
            <ol className="mt-12 max-w-[560px] space-y-0">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-6 border-t border-white/15 py-7">
                  <span className="display w-10 shrink-0 text-3xl italic text-[#f0b483]">{['i', 'ii', 'iii'][i]}</span>
                  <div>
                    <h3 className="display text-xl">{s.title}</h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[#f6efe2]/70">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* ── The domes, drawn as little glasshouses that fill up ── */}
        <section className="py-20 sm:py-28">
          <Reveal className="mx-auto max-w-[1200px] px-5">
            <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <span className="gh-eyebrow">The domes</span>
                <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">One sanctuary at a time, <em>{FLOOR_CAPACITY.toLocaleString('en-US')} cubbies each.</em></h2>
                <p className="mt-4 max-w-[48ch] text-[var(--ink-2)]">Each dome is a whole sanctuary: a domed reception, two ring galleries round a garden, and a VIP pavilion on its terrace. When one has fewer than 150 cubbies left, the next one opens.</p>
              </div>
              <div className="flex flex-wrap gap-5">
                {domes.map(d => {
                  const fill = Math.min(1, d.current_count / d.capacity)
                  return (
                    <Link key={d.id} href="/hall" className="group w-[150px] text-center" title={`Dome ${d.id} · ${getFloorName(d.id)}`}>
                      <DomeGlyph fill={fill} active={d.id === openFloor} />
                      <div className="display mt-2 text-lg">Dome {d.id}</div>
                      <div className="text-xs text-[var(--muted)]">{getFloorName(d.id)} · {fill >= 1 ? 'full' : `${Math.max(1, Math.round(fill * 100))}% lit`}</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Guides, as a contents page ── */}
        <section className="bg-[var(--sage-l)] py-20 sm:py-28">
          <Reveal className="mx-auto max-w-[1200px] px-5">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <span className="gh-eyebrow">Guides</span>
                <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">For the <em>days after.</em></h2>
                <p className="mt-4 max-w-[40ch] text-[var(--ink-2)]">Short, kind reading for grief, for children, and for the little rituals that help.</p>
              </div>
              <ul className="border-t border-[var(--line)]">
                {ARTICLES.map((a, i) => (
                  <li key={a.slug}>
                    <Link href="/guides" className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-b border-[var(--line)] py-5 transition hover:bg-[#fffaf1]/50">
                      <span className="display italic text-[var(--sage-d)]">{String(i + 1).padStart(2, '0')}</span>
                      <span>
                        <span className="display block text-lg leading-snug transition group-hover:text-[var(--clay)]">{a.title}</span>
                        <span className="mt-1 block text-sm text-[var(--ink-2)]">{a.excerpt}</span>
                      </span>
                      <span className="hidden whitespace-nowrap text-xs uppercase tracking-wider text-[var(--muted)] sm:block">{a.readTime}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ── Questions ── */}
        <section className="py-20 sm:py-28">
          <Reveal className="mx-auto grid max-w-[1200px] gap-10 px-5 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="gh-eyebrow">About</span>
              <h2 className="display mt-3 text-[clamp(2rem,4.2vw,3rem)] font-normal leading-[1.05]">Questions, <em>gently answered.</em></h2>
            </div>
            <div className="border-t border-[var(--line)]">
              {FAQ.map(f => (
                <details key={f.q} className="group border-b border-[var(--line)] py-5">
                  <summary className="display flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
                    {f.q}
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fffaf1] font-sans text-[var(--clay)] shadow-[inset_0_0_0_1px_var(--line)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] text-[var(--ink-2)]">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Closing: the reception doors at golden hour ── */}
        <section className="px-5 pb-20">
          <Reveal className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[36px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/entrance.jpg" alt="" aria-hidden width={1100} height={688} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(29,25,21,.78),rgba(29,25,21,.45)_75%)]" />
            <div className="relative px-6 py-24 text-center text-[#f6efe2] sm:py-32">
              <Candle className="mx-auto mb-6 w-12" />
              <h2 className="display mx-auto max-w-[18ch] text-[clamp(2.1rem,5vw,3.6rem)] font-normal leading-[1.05]">Their light can stay on, <em className="!text-[#f0b483]">always.</em></h2>
              <p className="mt-4 text-[#f6efe2]/75">It takes about a minute. No account needed.</p>
              <div className="mt-8 flex justify-center"><AddPetButton className="gh-btn gh-btn-clay">🕯️ Create a free memorial</AddPetButton></div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

// ── Drawn bits (no images needed) ──

/** A sprig of sage leaves on a curving stem, like the ones round the logo's window. */
function Sprig({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const leaves = [[18, 150, -40], [34, 122, 35], [40, 96, -30], [58, 74, 40], [62, 50, -25], [80, 34, 45], [86, 14, -10]]
  return (
    <svg viewBox="0 0 120 170" className={className} style={style} aria-hidden>
      <path d="M10 168 C 30 130, 40 100, 60 70 S 84 22, 92 6" fill="none" stroke="#6f8c69" strokeWidth="3" strokeLinecap="round" />
      {leaves.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M0 0 C 10 -12, 30 -12, 40 0 C 30 12, 10 12, 0 0 Z" fill={i % 2 ? '#9db596' : '#87a382'} />
          <path d="M2 0 L 36 0" stroke="#6f8c69" strokeWidth="1" opacity=".55" />
        </g>
      ))}
    </svg>
  )
}

/** A small clay candle with a flickering flame and glow. */
function Candle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 80" className={className} aria-hidden>
      <defs>
        <radialGradient id="ghGlow"><stop offset="0" stopColor="#ffd28a" stopOpacity=".9" /><stop offset="1" stopColor="#ffb45a" stopOpacity="0" /></radialGradient>
        <linearGradient id="ghWax" x1="0" x2="1"><stop offset="0" stopColor="#fbf1df" /><stop offset=".6" stopColor="#f3e3c8" /><stop offset="1" stopColor="#e2cba8" /></linearGradient>
      </defs>
      <circle className="gh-glow" cx="24" cy="22" r="22" fill="url(#ghGlow)" />
      <rect x="11" y="36" width="26" height="40" rx="6" fill="url(#ghWax)" />
      <ellipse cx="24" cy="37" rx="13" ry="3.5" fill="#f9ecd6" />
      <path d="M24 37 v-6" stroke="#4a3322" strokeWidth="1.6" strokeLinecap="round" />
      <path className="gh-flame" d="M24 12 C 29 20, 31 24, 31 27 a7 7 0 0 1 -14 0 C 17 24, 19 20, 24 12 Z" fill="#ffb54d" />
      <path className="gh-flame" d="M24 19 C 26.5 23, 27.5 25, 27.5 27 a3.5 3.5 0 0 1 -7 0 C 20.5 25, 21.5 23, 24 19 Z" fill="#fff3cf" />
    </svg>
  )
}

/** A little glasshouse dome whose glass fills with warm light as its cubbies are taken. */
function DomeGlyph({ fill, active }: { fill: number; active: boolean }) {
  const h = 70 * fill
  return (
    <svg viewBox="0 0 120 110" className={`mx-auto w-[120px] transition group-hover:-translate-y-1 ${active ? 'drop-shadow-[0_10px_18px_rgba(184,104,58,.35)]' : ''}`} aria-hidden>
      <defs>
        <clipPath id="ghDome"><path d="M14 96 V 62 A 46 46 0 0 1 106 62 V 96 Z" /></clipPath>
      </defs>
      <path d="M14 96 V 62 A 46 46 0 0 1 106 62 V 96 Z" fill="#e7eee0" />
      <rect x="0" y={96 - Math.max(h, fill > 0 ? 4 : 0)} width="120" height="100" fill="#f2c48e" clipPath="url(#ghDome)" />
      {/* glazing bars */}
      <g stroke="#b07a4f" strokeWidth="2.4" fill="none" clipPath="url(#ghDome)">
        {[34, 60, 86].map(x => <path key={x} d={`M${x} 96 V 30`} />)}
        <path d="M14 62 H 106 M14 79 H 106" />
      </g>
      <path d="M14 96 V 62 A 46 46 0 0 1 106 62 V 96" fill="none" stroke="#7c5233" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="14" r="5" fill="#c99566" />
      <rect x="6" y="94" width="108" height="8" rx="3" fill="#7c5233" />
      {active && <circle cx="98" cy="22" r="6" fill="#8fa98a"><animate attributeName="opacity" values="1;.35;1" dur="2s" repeatCount="indefinite" /></circle>}
    </svg>
  )
}
