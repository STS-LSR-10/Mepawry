'use client'
// app/hall/page.tsx — S01 3D Memorial Hall: the sanctuary, the live HUD, and travel between domes

import { Suspense, useCallback, useEffect, useState } from 'react'
import { FloatingHeader } from '@/components/shrine/FloatingHeader'
import { FloorSelector } from '@/components/shrine/FloorSelector'
import { ARRIVAL, FLOOR_COUNT, SLOTS, VIP_ENTRY, VIP_SLOTS, type P } from '@/components/3d/sanctuary/plan'
import type { Pet } from '@/types'

const PILL = 'glass rounded-full border border-white/20 px-4 py-2.5 text-sm text-[#FAF7F2] shadow-md hover:bg-white/20'
import { loadSpot } from '@/lib/spot'
import { describe, getVisitor, useActivity, useOnlineCount } from '@/lib/visitor'
import { useAccount } from '@/lib/account'
import { BoardSheet } from '@/components/board/Board'
import { LookEditor } from '@/components/account/LookEditor'
import { MyPageSheet } from '@/components/account/MyPageSheet'
import { useMyLook } from '@/lib/look'
import { useLang, useT } from '@/lib/i18n'
import { timeAgo } from '@/lib/utils'
import type { Floor } from '@/types'
import { getLocalSky, PHASE_LABEL, SEASON_LABEL, type LocalSky, type Season } from '@/lib/sky'
import dynamic from 'next/dynamic'
import { Splash } from '@/components/site/Splash'

// Lazy-load the heavy 3D scene
const MemorialWorld3D = dynamic(() => import('@/components/3d/MemorialWorld3D'), {
  ssr: false,
  loading: () => null, // the Splash covers loading
})

export default function HallPage() {
  // Back within the hour: same floor and spot as before the refresh. Otherwise: the park entrance, ground floor
  const [currentFloor, setCurrentFloor] = useState(1)
  const [startAt, setStartAt] = useState<P | null | undefined>(undefined) // undefined until we've looked
  useEffect(() => {
    const s = loadSpot()
    if (s && s.floor <= FLOOR_COUNT) { setCurrentFloor(s.floor); setStartAt({ x: s.x, z: s.z }) }
    else setStartAt(null)
  }, [])
  const [arrival, setArrival] = useState<{ at: P } | null>(null)
  const [worldReady, setWorldReady] = useState(false)
  const [fading, setFading] = useState(false)
  // The visitor's own saved name; only on the client, or SSR and hydration disagree
  const [avatarName, setAvatarName] = useState('Visitor')
  const { profile } = useAccount()
  useEffect(() => setAvatarName(profile?.display_name ?? getVisitor().name), [profile])
  // Renamed on "My page": show it at once
  useEffect(() => {
    const on = (e: Event) => setAvatarName((e as CustomEvent<string>).detail)
    window.addEventListener('mepawry:name', on)
    return () => window.removeEventListener('mepawry:name', on)
  }, [])
  const [myPageOpen, setMyPageOpen] = useState(false)
  const [floorSelectorOpen, setFloorSelectorOpen] = useState(false)
  // The community board opens from the header button or by tapping the board in the lobby
  const [boardOpen, setBoardOpen] = useState(false)
  const myLook = useMyLook()
  const t = useT()
  const { lang } = useLang()
  // '☀️ Day' → '☀️' + the word in the visitor's language
  const label = (s: string) => { const i = s.indexOf(' '); return `${s.slice(0, i)} ${t(s.slice(i + 1))}` }
  const [lookOpen, setLookOpen] = useState(false)
  useEffect(() => {
    const open = () => setLookOpen(true)
    window.addEventListener('mepawry:look-editor', open)
    return () => window.removeEventListener('mepawry:look-editor', open)
  }, [])
  useEffect(() => {
    const open = () => setBoardOpen(true)
    window.addEventListener('mepawry:board', open)
    return () => window.removeEventListener('mepawry:board', open)
  }, [])

  // Live numbers
  const online = useOnlineCount()
  // The header counts people in the hall on this floor (the ones you can meet), not everyone on the site
  const [hereNow, setHereNow] = useState<number | null>(null)
  const [live, setLive] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const onPeopleHere = useCallback((n: number, st: 'connecting' | 'live' | 'offline') => { setHereNow(n); setLive(st) }, [])
  const activity = useActivity()
  const [floors, setFloors] = useState<Floor[]>([])
  // Only the domes that have opened are offered (the next one appears when the newest has fewer than 150 shelves left)
  const shownDomes = Math.max(currentFloor, ...floors.filter(f => f.is_open).map(f => f.id))
  useEffect(() => {
    fetch('/api/floors').then(r => r.json()).then(d => setFloors(d.floors ?? [])).catch(() => {})
  }, [currentFloor])
  // Today's candles: pops up when you arrive and whenever someone lights a new one, then fades away
  const [today, setToday] = useState<{ candles: number; countries: number } | null>(null)
  const [showToday, setShowToday] = useState(false)
  useEffect(() => {
    let last = -1
    let hide: ReturnType<typeof setTimeout> | undefined
    const load = () => fetch('/api/stats').then(r => r.json()).then(d => {
      const candles = Number(d.candles_today) || 0
      setToday({ candles, countries: Number(d.countries_today) || 0 })
      if (last < 0 || candles > last) {
        setShowToday(true)
        clearTimeout(hide)
        hide = setTimeout(() => setShowToday(false), 8000)
      }
      last = candles
    }).catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => { clearInterval(id); clearTimeout(hide) }
  }, [])
  // The right-hand buttons fold away into one, folded to start with on every screen; tap to open
  const [toolsOpen, setToolsOpen] = useState(false)

  /** Fade out, swap domes, put the avatar in the reception, fade back in. */
  const goToFloor = (floor: number, at: P, then?: () => void) => {
    setFading(true)
    setTimeout(() => {
      setCurrentFloor(floor)
      setArrival({ at })
      then?.()
      setTimeout(() => setFading(false), 250)
    }, 450)
  }

  // Find my pet: ride to its floor (if needed), then walk to its shrine — its VIP niche if it has one
  const [guide, setGuide] = useState<{ pet: Pet; at: P; face: P; nonce: number } | null>(null)
  const findPet = (pet: Pet) => {
    const slot = pet.vip_position != null ? VIP_SLOTS[pet.vip_position] : SLOTS[pet.shrine_position]
    if (!slot) return
    const go = () => setGuide({ pet, at: slot.standAt, face: { x: slot.x, z: slot.z }, nonce: Date.now() })
    if (pet.floor_id === currentFloor) go()
    else goToFloor(pet.floor_id, ARRIVAL, go)
  }
  const [menu, setMenu] = useState<'pets' | 'vip' | null>(null)

  // Visitor's own time and season; ?hour=14&season=winter previews others
  const [sky, setSky] = useState<LocalSky>()
  const [skyOpen, setSkyOpen] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const h = Number(q.get('hour') ?? NaN)
    const hour = Number.isFinite(h) ? ((h % 24) + 24) % 24 : undefined
    const season = (q.get('season') ?? undefined) as Season | undefined
    const update = () => setSky(getLocalSky(new Date(), { hour, season: season && season in SEASON_LABEL ? season : undefined }))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="world-bg min-h-dvh relative overflow-hidden">
      {/* Floating Header HUD */}
      <FloatingHeader
        visitorCount={hereNow ?? online ?? 1}
        liveStatus={live}
        avatarName={avatarName}
        currentFloor={currentFloor}
        activityFeed={activity.map(it => `${describe(it)} · ${timeAgo(it.at)}`)}
        onOpenMyPage={() => setMyPageOpen(true)}
      />

      {/* 3D World */}
      <Splash ready={worldReady} />
      <Suspense fallback={null}>
        {startAt !== undefined && <MemorialWorld3D
          startAt={startAt ?? undefined}
          floorId={currentFloor}
          avatarName={avatarName}
          avatarGender={profile?.gender}
          avatarLook={myLook}
          onPeopleHere={onPeopleHere}
          sky={sky}
          arrival={arrival}
          guide={guide}
          onReady={() => setWorldReady(true)}
        />}
      </Suspense>

      {menu === 'vip' && (
        <FloorGrid
          title={`✿ ${t('VIP — which dome?')}`}
          current={currentFloor}
          count={shownDomes}
          onPick={f => { setMenu(null); goToFloor(f, VIP_ENTRY) }}
          onClose={() => setMenu(null)}
        />
      )}

      {/* My look, Board, My pet, VIP and Floor in one column that folds away */}
      <div className="fixed bottom-20 right-4 z-20 flex flex-col items-end gap-2">
        {toolsOpen && (
          <div id="hall-tools" className="pop-in flex flex-col items-end gap-2">
            <button onClick={() => setLookOpen(true)} className={PILL}>👕 {t('My look')}</button>
            {/* The header has its own Board button on wide screens */}
            <button onClick={() => setBoardOpen(true)} className={`${PILL} sm:hidden`}>📖 {t('Board')}</button>
            <button onClick={() => setMenu(m => (m === 'pets' ? null : 'pets'))} aria-expanded={menu === 'pets'} className={PILL}>🐾 {t('My pet')}</button>
            <button
              onClick={() => setMenu(m => (m === 'vip' ? null : 'vip'))}
              aria-expanded={menu === 'vip'}
              className="rounded-full border border-[#E8C365]/60 bg-gradient-to-r from-[#F3D99B]/90 to-[#D9B26A]/90 px-4 py-2.5 text-sm font-semibold text-[#3A2612] shadow-md hover:brightness-105"
              aria-label="VIP pavilion: choose a dome"
            >
              ✿ VIP
            </button>
            <button onClick={() => setFloorSelectorOpen(true)} className={PILL} aria-label={`Dome ${currentFloor}. Go to another dome`}>
              🏛️ {t('Dome {n}', { n: currentFloor })}
            </button>
          </div>
        )}
        <button
          onClick={() => { setToolsOpen(o => !o); setMenu(null) }}
          aria-expanded={toolsOpen} aria-controls="hall-tools"
          aria-label={t(toolsOpen ? 'Hide buttons' : 'Show buttons')}
          className={`${PILL} min-w-11 font-semibold`}
        >
          {toolsOpen ? '✕' : <>☰ <span className="ml-1 font-normal">🏛️ {currentFloor}</span></>}
        </button>
        {/* Local time and season, under the dome button */}
        {sky && (
          // Folded to the time-of-day icon at first; tap to see the time of day, season and place, tap again to fold
          <button
            onClick={() => setSkyOpen(o => !o)}
            aria-expanded={skyOpen}
            aria-label={skyOpen ? undefined : `${label(PHASE_LABEL[sky.phase])} · ${label(SEASON_LABEL[sky.season])} · ${sky.place}`}
            className={`flex h-11 max-w-[60vw] items-center gap-1.5 glass rounded-full border border-white/20 text-sm text-[#FAF7F2] shadow-md ${skyOpen ? 'pl-3 pr-4' : 'w-11 justify-center'}`}
          >
            {/* Folded: just the time-of-day icon (☀️ 🌙 🌅 🌇); open: the rest of the line */}
            <span aria-hidden className="text-lg leading-none">{PHASE_LABEL[sky.phase].split(' ')[0]}</span>
            {skyOpen && <span className="truncate">{label(PHASE_LABEL[sky.phase]).split(' ').slice(1).join(' ')} · {label(SEASON_LABEL[sky.season])} · {sky.place}</span>}
          </button>
        )}

        {/* Dress your character: the panel sits at the bottom so your avatar stays in view and changes live */}
        {lookOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[46dvh] max-w-md overflow-y-auto rounded-t-3xl bg-[#FFFBF5] p-4 shadow-2xl sm:bottom-4 sm:left-4 sm:right-auto sm:max-h-[80dvh] sm:rounded-3xl" role="dialog" aria-label="Dress your character">
            <h2 className="mb-3 font-serif text-lg font-bold text-[#2A1E17]">Dress your character</h2>
            <LookEditor live onDone={() => setLookOpen(false)} />
          </div>
        )}

        {menu === 'pets' && <MyPetsMenu onPick={pet => { setMenu(null); findPet(pet) }} onClose={() => setMenu(null)} />}
      </div>

      {/* Nav hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="glass whitespace-nowrap rounded-full px-4 py-2 text-xs text-[#FAF7F2]/70 border border-white/10">
          {t('Tap to walk · Drag to look around')}
        </div>
      </div>

      {/* Candles in the last 24 hours, counted from real tributes */}
      {today && showToday && (
        <div role="status" className="pop-in fixed bottom-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
          <div className="glass border border-[#D9823B]/30 rounded-full px-5 py-3 text-center text-sm text-[#FAF7F2] shadow-md">
            🕯️ {today.candles
              ? lang === 'en'
                ? <><span className="font-medium">{today.candles.toLocaleString('en-US')} {today.candles === 1 ? 'candle' : 'candles'}</span> lit today{today.countries ? ` for pets from ${today.countries} ${today.countries === 1 ? 'country' : 'countries'}` : ''}</>
                : <>{t('{n} candles lit today', { n: today.candles.toLocaleString() })}{today.countries ? ` · ${t('for pets from {c} countries', { c: today.countries })}` : ''}</>
              : t('No candles lit yet today. Find a shrine and light the first one.')}
          </div>
        </div>
      )}

      {/* Fade between domes */}
      <div className={`pointer-events-none fixed inset-0 z-40 bg-[#17131B] transition-opacity duration-300 ${fading ? 'opacity-100' : 'opacity-0'}`} />

      <BoardSheet open={boardOpen} onClose={() => setBoardOpen(false)} />
      <MyPageSheet open={myPageOpen} onClose={() => setMyPageOpen(false)} name={avatarName} />

      {/* Dome picker */}
      <FloorSelector
        open={floorSelectorOpen}
        onClose={() => setFloorSelectorOpen(false)}
        floors={floors.slice(0, shownDomes)}
        currentFloorId={currentFloor}
        onSelectFloor={f => { if (f !== currentFloor) goToFloor(f, ARRIVAL) }}
      />
    </main>
  )
}


/** Your memorials, to jump to: tap one and you're taken to its floor and walked to its shrine. */
function MyPetsMenu({ onPick, onClose }: { onPick: (pet: Pet) => void; onClose: () => void }) {
  const [pets, setPets] = useState<Pet[] | null>(null)
  const t = useT()
  useEffect(() => {
    fetch('/api/me/pets', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { pets: [] })).then(d => setPets(d.pets ?? [])).catch(() => setPets([]))
  }, [])
  return (
    <Popover title={`🐾 ${t('Take me to my pet')}`} onClose={onClose}>
      {pets === null ? <p className="py-3 text-center text-sm text-[#8E8278]">{t('Loading…')}</p>
        : pets.length === 0 ? <p className="py-3 text-center text-sm text-[#8E8278]">{t('No memorials yet on this device. Add your pet, or sign in on My page.')}</p>
        : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {pets.map(p => (
              <li key={p.id}>
                <button onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-2xl bg-[#FAF3E8] px-3 py-2 text-left hover:bg-[#F4E6D2]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EADFCF] text-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.primary_photo_url ? <img src={p.primary_photo_url} alt="" className="h-full w-full object-cover" /> : '🐾'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#2A1E17]">{p.name}</span>
                    <span className="block text-xs text-[#8E8278]">
                      {t('Dome {n}', { n: p.floor_id })} · {p.vip_position != null ? `✿ ${t('VIP niche {n}', { n: p.vip_position + 1 })}` : t('shelf {n}', { n: p.shrine_position + 1 })}
                    </span>
                  </span>
                  <span className="text-sm text-[#C67129]">{t('Go →')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </Popover>
  )
}

/** Pick a dome (for the VIP shortcut). */
function FloorGrid({ title, current, count, onPick, onClose }: { title: string; current: number; count: number; onPick: (f: number) => void; onClose: () => void }) {
  return (
    <Popover title={title} onClose={onClose}>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: count }, (_, i) => i + 1).map(f => (
          <button key={f} onClick={() => onPick(f)} aria-current={f === current}
            className={`rounded-lg py-2 text-sm font-semibold ${f === current ? 'bg-gradient-to-r from-[#F3D99B] to-[#D9B26A] text-[#3A2612]' : 'bg-[#FAF3E8] text-[#5C5046] hover:bg-[#F4E6D2]'}`}>
            {f}
          </button>
        ))}
      </div>
    </Popover>
  )
}

function Popover({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed bottom-36 right-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-[#FFFBF5] p-4 shadow-2xl" role="dialog" aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-base font-bold text-[#2A1E17]">{title}</h2>
        <button onClick={onClose} aria-label={useT()('Close')} className="grid h-8 w-8 place-items-center rounded-full bg-[#F4EBDD] text-[#8E8278]">✕</button>
      </div>
      {children}
    </div>
  )
}
