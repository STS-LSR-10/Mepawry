'use client'
// components/3d/MemorialWorld3D.tsx — The walkable Mepawry Sanctuary (React Three Fiber).
// Tap to walk: in through the reception, round the ring galleries of cubbies, through the garden and up to the VIP
// pavilion on its terrace. Tap a pet's frame (or a VIP niche) to walk there and visit. Light follows the visitor's
// own time of day: lamps off by day, on after dark. Floors are separate sanctuaries; the Floor button moves between them.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type * as THREE from 'three'
import type { LocalSky, Season } from '@/lib/sky'
import { AVATAR_FILL, RIM } from './look'
import { CrowdAvatars, useCrowd, type Me } from './Crowd'
import { crowdLimit, usePref, type CrowdPref } from '@/lib/settings'
import { useT } from '@/lib/i18n'
import { getVisitor } from '@/lib/visitor'
import { saveSpot } from '@/lib/spot'
import { defaultLook, type AvatarLook } from '@/lib/look'
import { useAccount } from '@/lib/account'
import { useContextLossRecovery, useQuality } from './quality'
import { Player, type Route } from './Player'
import { Joystick, type Stick } from './Joystick'
import { isFree, planRoute, type P } from './walk'
import { DOME, SPAWN, VIP_CAPACITY, VIP_CENTER, VIP_ENTRY, VIP_SLOTS } from './sanctuary/plan'
import { SanctuaryWorld, type TimeOfDay } from './sanctuary/SanctuaryPreview'
import { GalleryShrines } from './sanctuary/Shrines'
import type { Pet } from '@/types'

interface MemorialWorld3DProps {
  floorId: number
  avatarName: string
  avatarGender?: 'male' | 'female'
  avatarLook?: AvatarLook
  /** Restored spot after a refresh (same floor as floorId). */
  startAt?: P
  /** How many people are in the hall on this floor, you included. */
  onPeopleHere?: (n: number, status: 'connecting' | 'live' | 'offline') => void
  sky?: LocalSky
  /** Where to put the avatar after changing floors; a new object each time. */
  arrival: { at: P } | null
  /** Walk to this spot and offer to open the pet there (set again with a new nonce to repeat). */
  guide?: { pet: Pet; at: P; face: P; nonce: number } | null
  /** The hall has drawn its first frames (the opening screen can go). */
  onReady?: () => void
}

const NIGHT: LocalSky = { hour: 22, phase: 'night', season: 'cool', place: '' }
const timeOf = (sky: LocalSky): TimeOfDay => (sky.phase === 'day' ? 'day' : sky.phase === 'night' ? 'night' : 'evening')

export default function MemorialWorld3D({ floorId, avatarName, avatarGender, avatarLook, onPeopleHere, startAt, sky = NIGHT, arrival, guide, onReady }: MemorialWorld3DProps) {
  const router = useRouter()
  const t = useT()
  // In front of the reception, nudged a little so visitors arriving together don't stand on each other
  const pos = useRef<P>(
    startAt && isFree(startAt)
      ? { ...startAt } // back where you were before the refresh
      : { x: SPAWN.x + (Math.random() - 0.5) * 1.6, z: SPAWN.z + (Math.random() - 0.5) * 1.4 },
  )
  // Remember where you are (every couple of seconds, and when the page is hidden or closed) for the next visit
  useEffect(() => {
    const save = () => saveSpot(floorId, pos.current.x, pos.current.z)
    const id = setInterval(save, 2000)
    const hide = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', save)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', save); save() }
  }, [floorId])
  const [route, setRoute] = useState<Route | null>(null)
  const [inside, setInside] = useState(false)
  const [near, setNear] = useState<Pet | null>(null) // the shrine you're standing at
  const [pets, setPets] = useState<Pet[]>([])
  const quality = useQuality()
  const low = quality === 'low'
  const [dpr, setDpr] = useState(1.5)
  const recovery = useContextLossRecovery()

  // The shrines on this floor, from the server
  useEffect(() => {
    let live = true
    fetch(`/api/pets?floor=${floorId}`).then(r => r.json()).then(d => { if (live) setPets(d.pets ?? []) }).catch(() => {})
    return () => { live = false }
  }, [floorId])

  // Arrived on a new floor: stand at the arrival spot, forget any walk in progress
  useEffect(() => {
    if (!arrival) return
    pos.current = { ...arrival.at }
    setNear(null)
    // Face into the VIP hall, or into the reception
    const face = Math.abs(arrival.at.z - VIP_ENTRY.z) < 0.1 && Math.abs(arrival.at.x - VIP_ENTRY.x) < 0.1 ? VIP_CENTER : DOME
    setRoute({ points: [], face })
  }, [arrival])

  // Other visitors on this floor (a random pick if there are many)
  const { user } = useAccount()
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    const v = getVisitor()
    setMe({ id: user?.id ?? v.id, name: avatarName, look: avatarLook ?? defaultLook(avatarGender) })
  }, [user?.id, avatarName, avatarGender, avatarLook])
  const crowdPref = usePref<CrowdPref>('pm-crowd')
  const crowd = useCrowd(floorId, me, pos, crowdLimit(crowdPref, low))
  useEffect(() => { onPeopleHere?.(crowd.count + 1, crowd.status) }, [crowd.count, crowd.status, onPeopleHere])

  // The on-screen walking stick; while it's in use, tell the others where you're heading every 0.4 s
  const stick = useRef<Stick>({ x: 0, y: 0 })
  useEffect(() => {
    let last = { ...pos.current }
    const id = setInterval(() => {
      const p = pos.current
      if (Math.hypot(stick.current.x, stick.current.y) > 0.12 && Math.hypot(p.x - last.x, p.z - last.z) > 0.05) {
        crowd.announce([{ ...p }]); setNear(null)
      }
      last = { ...p }
    }, 400)
    return () => clearInterval(id)
  }, [crowd.announce]) // eslint-disable-line react-hooks/exhaustive-deps

  const walkTo = useCallback((to: P, onArrive?: () => void, face?: P) => {
    setNear(null)
    const points = planRoute(pos.current, to)
    setRoute({ points, onArrive, face })
    crowd.announce(points) // others play the same walk back
  }, [crowd.announce]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Find my pet": walk there and offer to open the shrine on arrival
  useEffect(() => {
    if (guide) walkTo(guide.at, () => setNear(guide.pet), guide.face)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.nonce])

  // The VIP pets in niche order
  const vipPets = useMemo(() => {
    const list: (Pet | null)[] = Array(VIP_CAPACITY).fill(null)
    for (const p of pets) if (p.vip_position != null && p.vip_position < VIP_CAPACITY) list[p.vip_position] = p
    return list
  }, [pets])
  const vip = useMemo(() => ({
    pets: vipPets,
    onOpen: (k: number) => { const pet = vipPets[k], s = VIP_SLOTS[k]; if (pet) walkTo(s.standAt, () => setNear(pet), s) },
  }), [vipPets, walkTo])

  const time = timeOf(sky)
  // Rim and fill light on the avatars follow the time of day and whether you're indoors
  useEffect(() => {
    RIM.color.value.set(time === 'night' ? '#7F94C8' : time === 'evening' ? '#FFC890' : '#CFE0FF')
    // The sanctuary is properly lit (sun, sky and lamps reach the avatars), so only a faint extra fill after dark
    RIM.strength.value = time === 'night' ? 0.12 : 0.1
    const dark = time === 'night' ? 1 : time === 'evening' ? 0.5 : 0
    if (inside) AVATAR_FILL.value.set('#FFC08A').multiplyScalar(0.08 * dark)
    else AVATAR_FILL.value.set('#AFC2E8').multiplyScalar(0.05 * dark)
  }, [time, inside])

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        key={`${quality}-${recovery.key}`}
        camera={{ position: [SPAWN.x, 5.5, SPAWN.z + 8.5], fov: 60, near: 0.2, far: 900 }}
        // Phones: no real-time shadows, no MSAA, and a lower pixel ratio — the big memory and GPU savers
        shadows={!low ? 'soft' : false}
        dpr={[1, low ? Math.min(dpr, 1.25) : dpr]}
        // Desktop: tone mapping happens in the finishing pass (ACES filmic), so the renderer stays linear ("flat")
        flat={!low}
        gl={{ antialias: !low, powerPreference: 'high-performance' }}
        onCreated={state => { recovery.onCreated(state); requestAnimationFrame(() => requestAnimationFrame(() => onReady?.())) }}
      >
        {/* If frames drop, render fewer pixels; if there's headroom, go back up */}
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
        <Suspense fallback={null}>
          <StatsProbe />
          <SanctuaryWorld time={time} interior={inside} low={low} vip={vip} onFloor={p => walkTo(p)}>
            <GalleryShrines pets={pets} playerPos={pos} onOpen={(pet, slot) => walkTo(slot.standAt, () => setNear(pet), slot)} />
            {WEATHER[sky.season] && <Weather {...WEATHER[sky.season]!} count={Math.round(WEATHER[sky.season]!.count / (low ? 3 : 1))} />}
            <Player name={avatarName} gender={avatarGender} look={avatarLook} pos={pos} route={route} onInsideChange={setInside} stick={stick} />
            <CrowdAvatars list={crowd.list} myPos={pos} radius={low ? 16 : 24} />
            <OrbitControls makeDefault enablePan={false} enableZoom minDistance={inside ? 2 : 3} maxDistance={inside ? 9 : 30} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2.1} />
          </SanctuaryWorld>
        </Suspense>
      </Canvas>

      <Joystick stick={stick} />

      {recovery.lost && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[#17131B]/80 text-sm text-[#FAF7F2]/80">Reloading the hall…</div>
      )}

      {/* Standing at a shrine: offer to open it */}
      {near && (
        <button
          onClick={() => router.push(`/${near.slug}`)}
          className="pop-in fixed bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#D9823B] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(217,130,59,.8)] transition hover:bg-[#C67129]"
        >
          🕯️ {t('Visit {name}', { name: near.name })}
        </button>
      )}
    </div>
  )
}

// ── Sub-components ──

type WeatherLook = { color: string; size: number; speed: number; sway: number; count: number }

const WEATHER: Partial<Record<Season, WeatherLook>> = {
  winter: { color: '#FFFFFF', size: 0.12, speed: 1, sway: 0.5, count: 1500 },
  spring: { color: '#F6B8C8', size: 0.12, speed: 0.6, sway: 1, count: 300 },
  autumn: { color: '#D9823B', size: 0.16, speed: 0.8, sway: 1.2, count: 250 },
  rainy: { color: '#DCE6F2', size: 0.06, speed: 14, sway: 0, count: 3000 },
}

/** Falling snow, petals, leaves or rain around the avatar. */
function Weather({ color, size, speed, sway, count }: WeatherLook) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < a.length; i += 3) {
      a[i] = (Math.random() - 0.5) * 40
      a[i + 1] = Math.random() * 15
      a[i + 2] = (Math.random() - 0.5) * 40
    }
    return a
  }, [count])
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame(({ clock }, dt) => {
    if (still) return
    const attr = ref.current.geometry.attributes.position
    const a = attr.array as Float32Array
    const t = clock.elapsedTime
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= speed * dt
      a[i] += Math.sin(t + i) * sway * dt
      if (a[i + 1] < -0.5) a[i + 1] = 15
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

/** ?stats exposes the renderer, scene and camera so draw calls and GPU memory can be read from the browser console. */
function StatsProbe() {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene), camera = useThree(s => s.camera)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('stats')) Object.assign(window, { __pmRenderer: gl, __pmScene: scene, __pmCamera: camera })
  }, [gl, scene, camera])
  return null
}
