'use client'
// components/3d/MemorialWorld3D.tsx — Three.js 3D World (React Three Fiber)
// Walkable world: tap to walk, go in through the entrance, wander the lobby, corridors and galleries,
// take the stairs or the elevator between floors, tap a shrine to visit it

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor, Sky, Stars } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Color } from 'three'
import { useRouter } from 'next/navigation'
import type { LocalSky, Season } from '@/lib/sky'
import { Nature } from './Nature'
import { Park } from './Park'
import { WindClock } from './wind'
import { Polish, RIM, Vignette } from './look'
import { CrowdAvatars, useCrowd, type Me } from './Crowd'
import { getVisitor } from '@/lib/visitor'
import { saveSpot } from '@/lib/spot'
import { defaultLook, type AvatarLook } from '@/lib/look'
import { useAccount } from '@/lib/account'
import { lawnTexture } from './textures'
import { useContextLossRecovery, useQuality } from './quality'
import { Hall } from './Hall'
import { Player, type Route } from './Player'
import { isFree, planRoute, type P } from './walk'
import { DOWN_FOOT, ELEVATOR_FRONT, ELEVATOR_X, HUB, LEVEL_HEIGHT, STAIRS_DOWN, STAIRS_UP, UP_FOOT } from './layout'
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
  /** Stairs: go to that floor, appearing at that spot. */
  onRequestFloor: (floor: number, at: P) => void
  /** Elevator: the page opens its floor picker. */
  onElevator: () => void
}

const NIGHT: LocalSky = { hour: 22, phase: 'night', season: 'cool', place: '' }

const GROUND: Record<Season, string> = {
  spring: '#3F5A2E', summer: '#4A6B2A', autumn: '#5E4124', winter: '#C9D2DC',
  hot: '#6B5A33', rainy: '#2E472A', cool: '#46562F',
}

export default function MemorialWorld3D({ floorId, avatarName, avatarGender, avatarLook, onPeopleHere, startAt, sky = NIGHT, arrival, onRequestFloor, onElevator }: MemorialWorld3DProps) {
  const router = useRouter()
  const ground = floorId === 1
  // On the park path facing the fountain and the door, nudged a little so visitors arriving together don't stand on each other
const pos = useRef<P>(
    startAt && isFree(startAt, floorId === 1)
      ? { ...startAt } // back where you were before the refresh
      : { x: (Math.random() - 0.5) * 1.6, z: 13.5 + (Math.random() - 0.5) * 1.4 },
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

  // Debug only (with ?stats): ?at=x,z starts the avatar at that spot, for measuring a particular room
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const at = q.has('stats') ? q.get('at')?.split(',').map(Number) : undefined
    if (at?.length === 2 && at.every(Number.isFinite)) pos.current = { x: at[0], z: at[1] }
  }, [])

  // Arrived on a new floor: stand at the stairs or elevator, forget any walk in progress
  useEffect(() => {
    if (!arrival) return
    pos.current = { ...arrival.at }
    setNear(null)
    setRoute({ points: [] })
  }, [arrival])

  // Other visitors on this floor: up to 40 shown on desktop, 20 on phones (a random pick if there are more)
  const { user } = useAccount()
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    const v = getVisitor()
    const id = user?.id ?? v.id
    setMe({ id, name: avatarName, look: avatarLook ?? defaultLook(avatarGender) })
  }, [user?.id, avatarName, avatarGender, avatarLook])
  const crowd = useCrowd(floorId, me, pos, low ? 20 : 40)
  useEffect(() => { onPeopleHere?.(crowd.count + 1, crowd.status) }, [crowd.count, crowd.status, onPeopleHere])

  const walkTo = useCallback((to: P, onArrive?: () => void, face?: P) => {
    setNear(null)
    const points = planRoute(pos.current, to, ground)
    setRoute({ points, onArrive, face })
    crowd.announce(points) // others play the same walk back
  }, [ground, crowd.announce]) // eslint-disable-line react-hooks/exhaustive-deps

  const takeStairs = (dir: 'up' | 'down') => {
    const up = dir === 'up'
    const flight = up ? STAIRS_UP : STAIRS_DOWN
    // Walk to the foot of the stairs, then arrive by the other staircase on the next floor
    walkTo(up ? UP_FOOT : DOWN_FOOT, () => onRequestFloor(floorId + (up ? 1 : -1), up ? DOWN_FOOT : UP_FOOT), { x: (flight.x0 + flight.x1) / 2, z: flight.z0 })
  }
  const callElevator = () => walkTo(ELEVATOR_FRONT, onElevator, { x: ELEVATOR_X, z: HUB.z0 })

  // Upper floors look down on the garden far below
  const groundY = -0.5 - (floorId - 1) * LEVEL_HEIGHT
  // Grass all the way to the mountains, in the season's colour
  const lawn = useMemo(() => { const t = lawnTexture(GROUND[sky.season]); t.repeat.set(110, 110); return t }, [sky.season])
  useEffect(() => () => lawn.dispose(), [lawn])

  // Sun climbs from 6:00 to 12:00 and sets at 18:00; below the horizon it's night
  const angle = ((sky.hour - 6) / 12) * Math.PI
  const sunPos: [number, number, number] = [Math.cos(angle) * 100, Math.sin(angle) * 100, -100]
  // +0.3 keeps some twilight glow while the sun is just under the horizon
  const daylight = Math.min(1, Math.max(0, Math.sin(angle) * 3 + 0.3))
  const golden = sky.phase === 'dawn' || sky.phase === 'dusk'
  const overcast = sky.season === 'rainy' && daylight > 0
  const ambient = useMemo(() => new Color('#6B5E80').lerp(new Color('#FFF4E0'), daylight), [daylight])
  // Rim light colour follows the sky: soft blue by day, golden at dawn/dusk, moonlit at night
  useEffect(() => {
    RIM.color.value.set(daylight === 0 ? '#7F94C8' : golden ? '#FFC890' : '#CFE0FF')
    RIM.strength.value = 0.2 + 0.06 * daylight
  }, [daylight, golden])
  // Haze matches the horizon so far mountains fade into the sky
  const haze = useMemo(() => {
    const c = new Color('#1E1B2B').lerp(new Color('#BFCFDF'), daylight)
    return golden ? c.lerp(new Color('#D69470'), 0.6) : c
  }, [daylight, golden])

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        key={`${quality}-${recovery.key}`}
        camera={{ position: [0, 5.5, 22], fov: 60 }} // behind the avatar's starting spot on the park path
        // Phones: no real-time shadows, no MSAA, and a lower pixel ratio — the big memory and GPU savers
        shadows={!low ? 'soft' : false}
        dpr={[1, low ? Math.min(dpr, 1.25) : dpr]}
        // Desktop: tone mapping happens in the post-processing pass (ACES filmic), so the renderer stays linear ("flat").
        // Phones skip post-processing; the renderer's own ACES filmic tone mapping (R3F's default) does the job there.
        flat={!low}
        gl={{ antialias: !low, powerPreference: 'high-performance' }}
        onCreated={recovery.onCreated}
      >
        {/* If frames drop, render fewer pixels; if there's headroom, go back up */}
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
        <Suspense fallback={null}>
          <StatsProbe />
          {/* Three-point light: warm golden key (the sun), cool sky fill from above, a soft cool rim from behind */}
          <ambientLight intensity={0.34 - 0.14 * daylight} color={ambient} />
          <hemisphereLight args={[daylight > 0.2 ? '#A5C8FF' : '#5E6E9A', '#5A4632', (low ? 0.75 : 0.55) + 0.25 * daylight]} />
          <directionalLight
            position={daylight > 0 ? [sunPos[0] / 10, Math.max(2, sunPos[1] / 10), 5] : [-5, 10, 5]}
            intensity={0.45 + (overcast ? 0.5 : 1.5) * daylight}
            color={daylight === 0 ? '#9FB2D9' : golden ? '#FFB070' : '#FFE8C2'}
            castShadow={!low}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.03}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
          {!low && <directionalLight position={[6, 8, -18]} intensity={0.25 + 0.2 * daylight} color="#A5C8FF" />}


          {/* Environment */}
          {overcast ? (
            <>
              <color attach="background" args={['#6E7884']} />
              <fogExp2 attach="fog" args={['#6E7884', 0.016]} />
            </>
          ) : (
            <>
              <Sky distance={450000} sunPosition={sunPos} rayleigh={golden ? 3 : 0.6} turbidity={golden ? 8 : 2} mieCoefficient={0.004} />
              <fogExp2 attach="fog" args={[haze, 0.0082]} />
            </>
          )}
          {daylight < 0.35 && !overcast && <Stars radius={170} depth={40} count={low ? 1200 : 3000} factor={4} fade />}
          {WEATHER[sky.season] && <Weather {...WEATHER[sky.season]!} count={Math.round(WEATHER[sky.season]!.count / (low ? 3 : 1))} />}

          {/* Ground (walkable only on the ground floor) */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            position={[0, groundY, 0]}
            onClick={e => { if (ground && e.delta < 6) { e.stopPropagation(); walkTo({ x: e.point.x, z: e.point.z }) } }}
          >
            <planeGeometry args={[400, 400]} />
            <meshLambertMaterial map={lawn} />
          </mesh>
          <WindClock ground={groundY} />

          {/* This floor of the building, with its shrines */}
          <Hall
            floor={floorId}
            playerPos={pos}
            quality={quality}
            pets={pets}
            inside={inside}
            onFloor={walkTo}
            onShrine={(pet, standAt, face) => walkTo(standAt, () => setNear(pet), face)}
            onStairs={takeStairs}
            // Lamplight on the interior surfaces themselves (walls, floors, shelves): the rooms read as lit at night
            // from anywhere, and the outside isn't brightened when you step in
            glow={0.08 + 0.22 * (1 - daylight)}
            onElevator={callElevator}
          />

          {/* Mountains, hills, trees, birds */}
          <group position={[0, groundY + 0.5, 0]}>
            <Nature season={sky.season} daylight={daylight} />
          </group>

          {/* The park in front of the entrance (seen from above on upper floors) */}
          <group position={[0, groundY, 0]}>
            <Park season={sky.season} night={daylight < 0.35} low={low} />
          </group>

          {/* Player Avatar */}
          <Player name={avatarName} gender={avatarGender} look={avatarLook} pos={pos} route={route} onInsideChange={setInside} />
          <CrowdAvatars list={crowd.list} myPos={pos} radius={low ? 16 : 24} />

          {/* Controls */}
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={3}
            maxDistance={inside ? 9 : 30}
            // Inside, keep the camera high enough to see over the cut-down walls
            maxPolarAngle={inside ? 1.15 : Math.PI / 2.1}
          />
          {!low && <Polish bloom={daylight < 0.35 ? 0.9 : 0.5} />}
        </Suspense>
      </Canvas>
      <Vignette />

      {recovery.lost && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[#17131B]/80 text-sm text-[#FAF7F2]/80">Reloading the hall…</div>
      )}

      {/* Standing at a shrine: offer to open it */}
      {near && (
        <button
          onClick={() => router.push(`/${near.slug}`)}
          className="pop-in fixed bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#D9823B] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(217,130,59,.8)] transition hover:bg-[#C67129]"
        >
          🕯️ Visit {near.name}
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

/** Falling snow, petals, leaves or rain around the hall. */
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
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

// Fix missing THREE import for ref type
import type * as THREE from 'three'

/** ?stats exposes the renderer so draw calls and GPU memory can be read from the browser console. */
function StatsProbe() {
  const gl = useThree(s => s.gl)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('stats')) (window as unknown as { __pmRenderer: unknown }).__pmRenderer = gl
  }, [gl])
  return null
}
