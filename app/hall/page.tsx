'use client'
// app/hall/page.tsx — S01 3D Memorial Hall: the building, the live HUD, and travel between floors

import { Suspense, useEffect, useState } from 'react'
import { FloatingHeader } from '@/components/shrine/FloatingHeader'
import { FloorSelector } from '@/components/shrine/FloorSelector'
import { ELEVATOR_FRONT, type P } from '@/components/3d/layout'
import { describe, getVisitor, useActivity, useOnlineCount } from '@/lib/visitor'
import { useAccount } from '@/lib/account'
import { timeAgo } from '@/lib/utils'
import type { Floor } from '@/types'
import { getLocalSky, PHASE_LABEL, SEASON_LABEL, type LocalSky, type Season } from '@/lib/sky'
import dynamic from 'next/dynamic'

// Lazy-load the heavy 3D scene
const MemorialWorld3D = dynamic(() => import('@/components/3d/MemorialWorld3D'), {
  ssr: false,
  loading: () => <WorldLoader />,
})

export default function HallPage() {
  // Everyone starts outside the entrance on the ground floor
  const [currentFloor, setCurrentFloor] = useState(1)
  const [arrival, setArrival] = useState<{ at: P } | null>(null)
  const [fading, setFading] = useState(false)
  // The visitor's own saved name; only on the client, or SSR and hydration disagree
  const [avatarName, setAvatarName] = useState('Visitor')
  const { profile } = useAccount()
  useEffect(() => setAvatarName(profile?.display_name ?? getVisitor().name), [profile])
  const [floorSelectorOpen, setFloorSelectorOpen] = useState(false)

  // Live numbers
  const online = useOnlineCount()
  const activity = useActivity()
  const [floors, setFloors] = useState<Floor[]>([])
  const [today, setToday] = useState<{ candles: number; countries: number } | null>(null)
  useEffect(() => {
    fetch('/api/floors').then(r => r.json()).then(d => setFloors(d.floors ?? [])).catch(() => {})
    fetch('/api/stats').then(r => r.json()).then(d => setToday({ candles: d.candles_today, countries: d.countries_today })).catch(() => {})
  }, [currentFloor])

  /** Fade out, swap floors, put the avatar at the stairs or elevator, fade back in. */
  const goToFloor = (floor: number, at: P) => {
    setFading(true)
    setTimeout(() => {
      setCurrentFloor(floor)
      setArrival({ at })
      setTimeout(() => setFading(false), 250)
    }, 450)
  }

  // Visitor's own time and season; ?hour=14&season=winter previews others
  const [sky, setSky] = useState<LocalSky>()
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
        visitorCount={online ?? 1}
        avatarName={avatarName}
        currentFloor={currentFloor}
        activityFeed={activity.map(it => `${describe(it)} · ${timeAgo(it.at)}`)}
      />

      {/* 3D World */}
      <Suspense fallback={<WorldLoader />}>
        <MemorialWorld3D
          floorId={currentFloor}
          avatarName={avatarName}
          avatarGender={profile?.gender}
          sky={sky}
          arrival={arrival}
          onRequestFloor={goToFloor}
          onElevator={() => setFloorSelectorOpen(true)}
        />
      </Suspense>

      {/* Local time and season */}
      {sky && (
        <div className="fixed bottom-24 left-4 z-20 max-w-[55vw] truncate glass rounded-full border border-white/20 px-4 py-2.5 text-sm text-[#FAF7F2] shadow-md">
          {PHASE_LABEL[sky.phase]} · {SEASON_LABEL[sky.season]} · {sky.place}
        </div>
      )}

      {/* Floor Selector Button */}
      <div className="fixed bottom-24 right-4 z-20">
        <button
          onClick={() => setFloorSelectorOpen(true)}
          className="glass border border-white/20 rounded-full px-4 py-2.5 text-sm text-[#FAF7F2] hover:bg-white/20 transition-colors shadow-md flex items-center gap-2"
          aria-label={`Floor ${currentFloor}. Take the elevator to another floor`}
        >
          🛗 Floor {currentFloor}
        </button>
      </div>

      {/* Nav hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="glass rounded-full px-4 py-2 text-xs text-[#FAF7F2]/70 border border-white/10">
          Tap to walk · Drag to look around
        </div>
      </div>

      {/* Candles in the last 24 hours, counted from real tributes */}
      {today && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
          <div className="glass border border-[#D9823B]/30 rounded-full px-5 py-3 text-center text-sm text-[#FAF7F2] shadow-md">
            🕯️ {today.candles
              ? <><span className="font-medium">{today.candles.toLocaleString('en-US')} {today.candles === 1 ? 'candle' : 'candles'}</span> lit today{today.countries ? ` for pets from ${today.countries} ${today.countries === 1 ? 'country' : 'countries'}` : ''}</>
              : 'No candles lit yet today. Find a shrine and light the first one.'}
          </div>
        </div>
      )}

      {/* Fade between floors */}
      <div className={`pointer-events-none fixed inset-0 z-40 bg-[#17131B] transition-opacity duration-300 ${fading ? 'opacity-100' : 'opacity-0'}`} />

      {/* Floor Selector Modal */}
      <FloorSelector
        open={floorSelectorOpen}
        onClose={() => setFloorSelectorOpen(false)}
        floors={floors}
        currentFloorId={currentFloor}
        onSelectFloor={f => { if (f !== currentFloor) goToFloor(f, ELEVATOR_FRONT) }}
      />
    </main>
  )
}

function WorldLoader() {
  return (
    <div className="world-bg fixed inset-0 flex flex-col items-center justify-center gap-4 z-10">
      <div className="text-6xl float-anim">🐾</div>
      <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D9823B] rounded-full transition-all duration-500"
          style={{ width: '70%' }}
          role="progressbar"
          aria-valuenow={70}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading memorial hall"
        />
      </div>
      <p className="text-sm text-[#FAF7F2]/60">Loading the memorial hall…</p>
    </div>
  )
}
