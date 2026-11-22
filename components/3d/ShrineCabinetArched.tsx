'use client'
// components/3d/ShrineCabinetArched.tsx — Concept redesign of a pet's shrine: an arched walnut curio cabinet. The case
// is one arched piece with a brass inlay round the opening and a paw medallion on the crown; two glazed doors with
// arched heads and glazing bars swing open towards you when the shrine loads (tap a door to close or open them);
// it stands on a plinth with a drawer and little bun feet. Inside: the backdrop, the portrait, walnut shelves with
// brass lips for gifts, the candle that grows with each candle lit today, and the vase of baby's breath.
// A pet in the VIP pavilion gets the grand version: ivory lacquer and gilt instead of walnut and brass, columns
// either side, a gilt crest (paw, laurel wreath, little crown), a marble plinth on gold feet, and a golden glow
// behind the portrait.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import { ExtrudeGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Shape, ShapeGeometry, type BufferGeometry, type Group, type Mesh, type Texture } from 'three'
import { glowTexture, moonTexture, nameplateTexture, petTexture, plaqueTexture } from './textures'
import { microMap } from './look'
import { useContextLossRecovery, useQuality } from './quality'
import { giftById } from '@/lib/gifts'
import { DEFAULT_BACKDROP, frameById, type FrameStyle } from '@/lib/decor'
import { DEFAULT_FRAME_TILE, FRAME_TILE, framePatternTexture } from './frameTextures'
import { backdropTexture } from './backdrops'
import { BabysBreath, Bokeh, GiftSprite, Halo, PillarCandle, useMaterials, useTex, type Mats } from './ShrineCabinet'
import type { Pet } from '@/types'
import { flagEmoji, formatYears } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { SLOTS } from './sanctuary/plan'

type V3 = [number, number, number]

const DOOR_OPEN = (145 * Math.PI) / 180 // the doors stand open at 145°: swung right back, folded out to the sides, clear of the inside

/**
 * The cabinet's measurements. The case is W wide, its straight sides H tall, DP deep, with a shallow (segmental)
 * arch on top springing at SPRING. A VIP pet's cabinet is bigger, like its niche in the VIP pavilion: a bigger
 * portrait and three shelves a side instead of two.
 */
function dimsFor(vip: boolean) {
  const W = vip ? 3.2 : 2.4, H = vip ? 2.3 : 1.9, DP = vip ? 1.0 : 0.9
  const OUT = { half: W / 2, rise: vip ? 0.6 : 0.5, bottom: -H / 2 }
  const OPEN = { half: W / 2 - 0.18, rise: vip ? 0.42 : 0.34, bottom: -H / 2 + 0.1 } // the opening (and so the inside)
  return {
    W, H, DP, OUT, OPEN, SPRING: H / 2 - 0.17, FLOOR: OPEN.bottom, BACK: -DP / 2 + 0.05,
    SHELF_Y: vip ? [0.62, 0.12, -0.38] : [0.38, -0.18], SHELF_X: vip ? 1.07 : 0.78, SHELF_W: vip ? 0.6 : 0.5, GIFT_DX: vip ? 0.2 : 0.15,
    PORTRAIT: vip ? 1.5 : 1, PORTRAIT_Y: vip ? 0.18 : 0.16, ITEM_X: vip ? 0.8 : 0.6,
    DOOR_HALF: OPEN.half + 0.1, // each door: hinged halfway across the side frame, so it covers it and opens wide of the opening
  }
}
type Dims = ReturnType<typeof dimsFor>

/** The circle a shallow arch of half-width `half` and height `rise` lies on (springing at `spring`). */
function arc(half: number, rise: number, spring: number) {
  const R = (half * half + rise * rise) / (2 * rise)
  return { R, cy: spring + rise - R }
}

/** An arched-top outline: straight sides from `bottom` up to `spring`, then the arch. */
function archShape({ half, rise, bottom }: { half: number; rise: number; bottom: number }, spring: number) {
  const { R, cy } = arc(half, rise, spring), a = Math.atan2(spring - cy, half)
  const s = new Shape()
  s.moveTo(-half, bottom); s.lineTo(half, bottom); s.lineTo(half, spring)
  s.absarc(0, cy, R, a, Math.PI - a, false)
  s.lineTo(-half, bottom)
  return s
}

/** One door leaf, from its hinge edge `xo` to the meeting edge `xi`, its head following the opening's arch (a circle). */
function leafShape(xo: number, xi: number, bottom: number, c: { R: number; cy: number }) {
  const ang = (x: number) => Math.acos(Math.max(-1, Math.min(1, x / c.R)))
  const s = new Shape()
  s.moveTo(xi, bottom); s.lineTo(xo, bottom); s.lineTo(xo, c.cy + c.R * Math.sin(ang(xo)))
  s.absarc(0, c.cy, c.R, ang(xo), ang(xi), ang(xo) > ang(xi))
  s.lineTo(xi, bottom)
  return s
}

function useGeo<G extends BufferGeometry>(make: () => G, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps)
  useEffect(() => () => g.dispose(), [g])
  return g
}

export default function ShrineCabinetArched({ pet, candlesToday, flowers, gifts }: { pet: Pet; candlesToday: number; flowers: number; gifts: string[] }) {
  const low = useQuality() === 'low'
  const recovery = useContextLossRecovery()
  const vip = pet.vip_position != null
  const d = useMemo(() => dimsFor(vip), [vip])
  return (
    <Canvas
      key={recovery.key}
      shadows={!low ? 'percentage' : false}
      camera={{ position: [0, 0.2, 5], fov: 38 }}
      dpr={[1, low ? 1.5 : 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }} // so the camera button can copy the cabinet as it looks
      onCreated={recovery.onCreated}
    >
      <ambientLight intensity={0.3} color="#FFD9B5" />
      <hemisphereLight args={['#FFE9D0', '#3A2414', 0.35]} />
      <directionalLight
        position={[-2.2, 3, 4]} intensity={1.6} color="#FFE3C2" castShadow={!low}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={2.4} shadow-camera-bottom={-2}
      />
      {!low && (
        <Environment resolution={64}>
          <Lightformer intensity={3} color="#FFE2BF" position={[0, 3, 3]} scale={[8, 3, 1]} />
          <Lightformer intensity={2} color="#FFF0DC" position={[0, 0, 5]} scale={[6, 4, 1]} />
          <Lightformer intensity={1.2} color="#FFC890" position={[-4, 1, 1]} scale={[2, 4, 1]} />
          <Lightformer intensity={0.6} color="#9FA8FF" position={[4, 0, -2]} scale={[2, 3, 1]} />
        </Environment>
      )}
      <FitCamera d={d} vip={vip} />
      <Cabinet d={d} pet={pet} candlesToday={candlesToday} flowers={flowers} gifts={gifts} low={low} />
      <Bokeh count={low ? 10 : 22} />
      <Sparkles count={low ? 25 : 60} scale={[5, 3.4, 2.5]} size={1.6} speed={0.18} color="#FFE0B0" opacity={0.55} />
      <OrbitControls
        enablePan={false} minDistance={2.8} maxDistance={11}
        minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} minPolarAngle={Math.PI / 2 - 0.5} maxPolarAngle={Math.PI / 2 + 0.3}
      />
    </Canvas>
  )
}

/** Backs the camera off so the whole cabinet, open doors and feet included, fits (phones are narrow, desktops wide). */
function FitCamera({ d, vip }: { d: Dims; vip: boolean }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const t = Math.tan(((camera as unknown as { fov: number }).fov * Math.PI) / 360)
    const aspect = size.width / size.height
    // from the feet to the top of the crown (the VIP crest and its crown stand taller), and out to the open doors
    const top = d.SPRING + d.OUT.rise + (vip ? 0.78 : 0.25), bottom = -d.H / 2 - 0.3
    const half = (top - bottom) / 2 + 0.05, mid = (top + bottom) / 2 - 0.05
    const wide = d.DOOR_HALF * (1 - Math.cos(DOOR_OPEN)) + 0.08 // out to the tips of the open doors
    const z = Math.max(half / t, wide / (t * aspect)) + 0.5
    camera.position.set(0, mid + 0.04, z)
    camera.lookAt(0, mid, 0)
  }, [camera, size.width, size.height, d, vip])
  return null
}

function Cabinet({ d, pet, candlesToday, flowers, gifts, low }: { d: Dims; pet: Pet; candlesToday: number; flowers: number; gifts: string[]; low: boolean }) {
  const { W, H, DP, OUT, OPEN, SPRING, FLOOR, BACK, SHELF_Y, SHELF_X } = d
  const m = useMaterials(low)
  const photo = useTex(() => petTexture(pet, false), [pet.id, pet.primary_photo_url])
  const backdrop = pet.backdrop ?? DEFAULT_BACKDROP
  const sky = useTex(() => backdropTexture(backdrop), [backdrop])
  const style = frameById(pet.frame_style)
  const frameMat = useMemo(() => new MeshStandardMaterial({
    color: style.color, metalness: low ? Math.min(style.metalness, 0.45) : style.metalness, roughness: style.roughness,
    emissive: style.metalness > 0.5 ? '#4A3205' : '#000000', emissiveIntensity: low ? 0.6 : 0.25,
  }), [style, low])
  useEffect(() => () => frameMat.dispose(), [frameMat])
  const moon = useTex(() => moonTexture(), [])
  const glow = useTex(() => glowTexture(), [])
  const sub = [pet.show_flag === false ? '' : flagEmoji(pet.country_code), formatYears(pet.birth_year, pet.death_year)].filter(Boolean).join('  ')
  const nameplate = useTex(() => nameplateTexture(pet.name, sub), [pet.name, sub])
  // the plinth says where the shrine stands: dome, gallery and zone (VIP: the pavilion)
  const t = useT()
  const room = SLOTS[pet.shrine_position]?.room.split(' · ') ?? []
  const where = [t('Dome {n}', { n: pet.floor_id }), ...(pet.vip_position != null ? [t('VIP pavilion')]
    : room.length === 2 ? [t(room[0]), t('Zone {z}', { z: room[1].replace('Zone ', '') })] : [])].join(' · ')
  const plate = useTex(() => plaqueTexture(where, 'stone', 1470, 100, 0.6), [where]) // same shape as the plate below, so the letters aren't stretched
  const vip = pet.vip_position != null
  const grand = useMemo(() => vip ? {
    ivory: low ? new MeshStandardMaterial({ color: '#EFE6D6', roughness: 0.4 })
      : new MeshPhysicalMaterial({ color: '#EFE6D6', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    marble: new MeshStandardMaterial({ color: '#ECE7DF', roughness: 0.22, bumpMap: microMap('stone'), bumpScale: 0.3 }),
  } : null, [vip, low])
  useEffect(() => () => { if (grand) Object.values(grand).forEach(x => x.dispose()) }, [grand])
  // the walnut cabinet, or (VIP) ivory and gilt
  const look = grand
    ? { case: grand.ivory, trim: m.gold, plinth: grand.marble, drawer: grand.ivory, feet: m.gold, shelf: grand.ivory }
    : { case: m.wood, trim: m.brass, plinth: m.wood, drawer: m.woodSide, feet: m.wood, shelf: m.wood }

  // The case: the arched outline with the arched opening cut through it, run back the full depth
  const body = useGeo(() => {
    const s = archShape(OUT, SPRING); s.holes.push(archShape(OPEN, SPRING))
    const g = new ExtrudeGeometry(s, { depth: DP, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 })
    g.translate(0, 0, -DP / 2)
    return g
  }, [d])
  // A thin brass line inlaid round the opening
  const inlay = useGeo(() => {
    const s = archShape({ half: OPEN.half + 0.075, rise: OPEN.rise + 0.06, bottom: FLOOR - 0.06 }, SPRING)
    s.holes.push(archShape({ half: OPEN.half + 0.06, rise: OPEN.rise + 0.048, bottom: FLOOR - 0.045 }, SPRING))
    return new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false, curveSegments: 40 })
  }, [d])
  // The back wall, cut to the arch, with the backdrop stretched over it
  const back = useGeo(() => {
    const g = new ShapeGeometry(archShape(OPEN, SPRING), 40)
    const pos = g.attributes.position, uv = g.attributes.uv, top = SPRING + OPEN.rise
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + OPEN.half) / (2 * OPEN.half), (pos.getY(i) - FLOOR) / (top - FLOOR))
    return g
  }, [d])

  const root = useRef<Group>(null!)
  useEffect(() => {
    if (low) return
    root.current.traverse(o => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const solid = !(mesh.material as MeshStandardMaterial).transparent
      mesh.castShadow = solid; mesh.receiveShadow = solid
    })
  }, [low, flowers, gifts.length])

  const giftSpots: V3[] = [0, -d.GIFT_DX, d.GIFT_DX].flatMap(dx => [-1, 1].flatMap(s => SHELF_Y.map(y => [s * SHELF_X + dx, y + 0.02 + 0.11, BACK + 0.2] as V3)))

  return (
    <group ref={root} position={[0, -0.05, 0]}>
      {/* ── The walnut case, arched ── */}
      <mesh geometry={body} material={look.case} />
      <mesh geometry={inlay} position-z={DP / 2 + 0.02} material={look.trim} />
      {grand && <Columns d={d} ivory={grand.ivory} gold={m.gold} />}
      {backdrop === DEFAULT_BACKDROP
        ? <mesh geometry={back} position-z={BACK} material={look.case} />
        : <mesh geometry={back} position-z={BACK}><meshBasicMaterial map={sky} toneMapped={false} /></mesh>}
      {backdrop === 'midnight' && (
        <mesh position={[-OPEN.half * 0.5, SPRING - 0.16, BACK + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={moon} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* a soft cream floor inside */}
      <mesh position={[0, FLOOR + 0.012, 0]} material={m.cream}><boxGeometry args={[OPEN.half * 2, 0.024, DP - 0.02]} /></mesh>

      {/* ── Crown: a brass paw medallion on a walnut boss (VIP: a gilt crest) ── */}
      {grand ? <Crest d={d} gold={m.gold} ivory={grand.ivory} /> : <group position={[0, SPRING + OUT.rise + 0.02, DP / 2 - 0.12]}>
        <mesh rotation-x={Math.PI / 2} material={m.wood}><cylinderGeometry args={[0.17, 0.19, 0.12, 40]} /></mesh>
        <group position-z={0.065}>
          <mesh rotation-x={Math.PI / 2} material={m.brass}><cylinderGeometry args={[0.13, 0.13, 0.015, 40]} /></mesh>
          <mesh position={[0, -0.025, 0.012]} scale={[1.15, 0.95, 0.4]} material={m.wood}><sphereGeometry args={[0.045, 20, 14]} /></mesh>
          {[[-0.062, 0.03], [-0.022, 0.065], [0.022, 0.065], [0.062, 0.03]].map(([x, y]) => (
            <mesh key={x} position={[x, y, 0.012]} scale={[1, 1.15, 0.4]} material={m.wood}><sphereGeometry args={[0.02, 14, 10]} /></mesh>
          ))}
        </group>
      </group>}

      {/* ── Plinth: a drawer with a brass pull and the dome plate, on bun feet ── */}
      <group position={[0, -H / 2 - 0.1, 0]}>
        <RoundedBox args={[W + 0.14, 0.2, DP + 0.12]} radius={0.03} smoothness={3} material={look.plinth} />
        <RoundedBox args={[W - 0.3, 0.13, 0.02]} radius={0.01} smoothness={2} position={[0, 0, DP / 2 + 0.065]} material={look.drawer} />
        <mesh position={[0, 0, DP / 2 + 0.077]}>
          <planeGeometry args={[1.76, 0.12]} />
          <meshStandardMaterial map={plate} roughness={0.9} transparent alphaTest={0.5} />
        </mesh>
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * (W / 2 - 0.25), 0, DP / 2 + 0.09]} rotation-x={Math.PI / 2} material={look.trim}><cylinderGeometry args={[0.028, 0.028, 0.035, 20]} /></mesh>
        ))}
        {[-1, 1].flatMap(sx => [-1, 1].map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.08), -0.15, sz * (DP / 2 - 0.06)]} scale={[1, 0.62, 1]} material={look.feet}><sphereGeometry args={[0.085, 20, 14]} /></mesh>
        )))}
      </group>

      {/* ── Inside ── */}
      {grand && !low && <Halo glow={glow} at={[0, d.PORTRAIT_Y, BACK + 0.03]} size={2.1 * d.PORTRAIT} color="#FFD27A" opacity={0.5} />}
      <Portrait d={d} photo={photo} frame={frameMat} style={style} />
      {[-1, 1].map(s => SHELF_Y.map(y => (
        <group key={`${s}${y}`} position={[s * SHELF_X, y, BACK + 0.22]}>
          <RoundedBox args={[d.SHELF_W, 0.04, 0.42]} radius={0.01} smoothness={2} material={look.shelf} />
          <mesh position={[0, 0, 0.212]} material={look.trim}><boxGeometry args={[d.SHELF_W, 0.012, 0.006]} /></mesh>
        </group>
      )))}
      {/* one of each kind of gift, newest kinds first, with how many were left */}
      {[...gifts.reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>())].slice(0, giftSpots.length).map(([id, n], i) =>
        <GiftSprite key={`${i}${id}${n}`} emoji={giftById(id)?.emoji ?? '🎁'} img={giftById(id)?.img} at={giftSpots[i]} count={n} />)}
      <BabysBreath at={[-d.ITEM_X, FLOOR + 0.024, 0.02]} stems={5 + Math.min(flowers, 7)} m={m} />
      <PillarCandle at={[d.ITEM_X, FLOOR + 0.024, 0.02]} today={candlesToday} glow={glow} m={m} low={low} />
      <group position={[0, FLOOR + 0.024, 0.1]}>
        {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.03, 0]} material={m.gold}><boxGeometry args={[0.05, 0.06, 0.05]} /></mesh>)}
        {/* a big brass plate, leaning back a little: the name, and their flag and years */}
        <group position={[0, 0.2 * (vip ? 1.3 : 1), 0]} rotation-x={-0.12} scale={vip ? 1.3 : 1}>
          <RoundedBox args={[0.98, 0.31, 0.035]} radius={0.012} smoothness={2} material={m.wood} />
          <mesh position={[0, 0, 0.019]}>
            <planeGeometry args={[0.96, 0.299]} />
            <meshStandardMaterial map={nameplate} roughness={0.35} metalness={0.25} transparent alphaTest={0.5} />
          </mesh>
        </group>
      </group>
      {/* warm light from under the crown, and a little fill */}
      <spotLight position={[0, SPRING + 0.2, 0.2]} angle={1.15} penumbra={1} intensity={1.8} distance={3.5} decay={1.4} color="#FFD3A0" />
      <pointLight position={[0, 0, 0.7]} intensity={0.6} distance={3} decay={1.6} color="#FFB878" />

      <Doors d={d} m={m} frame={grand ? m.gold : m.wood} />
    </group>
  )
}

/** The portrait in the frame they chose, with a bevelled inner lip and a cream mat. */
const FW = 0.98, FH = 1.18, FB = 0.085
const BARS: [number, number, number, number][] = [
  [0, FH / 2 - FB / 2, FW, FB], [0, -FH / 2 + FB / 2, FW, FB], [-FW / 2 + FB / 2, 0, FB, FH], [FW / 2 - FB / 2, 0, FB, FH],
]

function Portrait({ d, photo, frame, style }: { d: Dims; photo: Texture; frame: MeshStandardMaterial; style: FrameStyle }) {
  const fw = FW, fh = FH, b = FB, bars = BARS
  // patterned frames: each bar gets its own copy of the tile, repeated to its length so the pattern isn't stretched
  const barMats = useMemo(() => style.pattern ? bars.map(([, , w, h]) => {
    const tile = FRAME_TILE[style.pattern!] ?? DEFAULT_FRAME_TILE, map = framePatternTexture(style.pattern!)
    if (style.pattern === 'oak' && w > h) { map.center.set(0.5, 0.5); map.rotation = Math.PI / 2; map.repeat.set(h / tile, w / tile) } // grain along the bar
    else map.repeat.set(w / tile, h / tile)
    return new MeshStandardMaterial({ map, metalness: style.metalness, roughness: style.roughness })
  }) : null, [style, bars])
  useEffect(() => () => barMats?.forEach(m => { m.map?.dispose(); m.dispose() }), [barMats])
  return (
    <group position={[0, d.PORTRAIT_Y, d.BACK + 0.06]} scale={d.PORTRAIT}>
      {bars.map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 0.07]} radius={0.015} smoothness={2} position={[x, y, 0]} material={barMats?.[i] ?? frame} />)}
      {bars.map(([x, y, w, h], i) => (
        <mesh key={`l${i}`} position={[x * 0.83, y * 0.86, 0.02]} material={frame}>
          <boxGeometry args={[i < 2 ? w - 0.16 : 0.015, i < 2 ? 0.015 : h - 0.16, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.01]}><planeGeometry args={[fw - b * 1.6, fh - b * 1.6]} /><meshStandardMaterial color="#D9CFBF" roughness={0.95} /></mesh>
      {/* the photo shows its own colours (unlit, a touch dimmed), so the spotlight can't wash it out */}
      <mesh position={[0, 0, 0.002]}><planeGeometry args={[0.66, 0.8]} /><meshBasicMaterial map={photo} color="#E4DED6" /></mesh>
    </group>
  )
}

/** The two glazed doors. They open towards you when the shrine loads; tap either to close or open them both. */
function Doors({ d, m, frame }: { d: Dims; m: Mats; frame: MeshStandardMaterial }) {
  const [open, setOpen] = useState(true)
  const t0 = useRef<number | null>(null)
  const leaves = useRef<(Group | null)[]>([])
  useFrame(({ clock }, dt) => {
    t0.current ??= clock.elapsedTime
    const want = open && clock.elapsedTime - t0.current > 0.7 ? DOOR_OPEN : 0 // a beat closed first, then they swing open
    leaves.current.forEach((g, i) => {
      if (!g) return
      const side = i === 0 ? -1 : 1
      g.rotation.y += (side * want - g.rotation.y) * Math.min(1, dt * 2.2)
    })
  })
  const toggle = (e: { stopPropagation: () => void; delta: number }) => { e.stopPropagation(); if (e.delta < 6) setOpen(o => !o) }
  return (
    <>
      {[-1, 1].map((side, i) => (
        <group key={side} ref={g => { leaves.current[i] = g }} position={[side * d.DOOR_HALF, 0, d.DP / 2 + 0.045]}
          onClick={toggle}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <Leaf d={d} side={side as -1 | 1} m={m} frame={frame} />
        </group>
      ))}
    </>
  )
}

/** One door, drawn from its hinge (x = 0) towards the middle: an arched walnut frame, glass, glazing bars, a knob, hinges. */
function Leaf({ d, side, m, frame: wood }: { d: Dims; side: -1 | 1; m: Mats; frame: MeshStandardMaterial }) {
  const { DOOR_HALF, OPEN, FLOOR, SPRING } = d
  const c = arc(DOOR_HALF, OPEN.rise + 0.1, SPRING)
  const up = (f: number) => FLOOR + (SPRING - FLOOR) * f // a height up the door, as a fraction of its straight part
  const rim = 0.085, bottom = FLOOR - 0.05
  const xo = side * DOOR_HALF, xi = 0 // in cabinet space; the group below moves the hinge to the origin
  const ci = { R: c.R - rim, cy: c.cy }
  const frame = useGeo(() => {
    const s = leafShape(xo, xi, bottom, c)
    s.holes.push(leafShape(xo - side * rim, xi + side * rim * 0.6, bottom + rim, ci))
    return new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 32 })
  }, [side, d])
  const pane = useGeo(() => new ShapeGeometry(leafShape(xo - side * rim, xi + side * rim * 0.6, bottom + rim, ci), 32), [side, d])
  // glazing bars: one upright down the middle of the pane, two rails across it
  const gx = (xo - side * rim + xi + side * rim * 0.6) / 2
  const headAt = (x: number) => ci.cy + Math.sqrt(Math.max(0, ci.R * ci.R - x * x))
  const paneW = Math.abs(xo - xi) - rim * 1.6
  return (
    <group position-x={-xo}>
      <mesh geometry={frame} position-z={-0.02} material={wood} />
      <mesh geometry={pane} position-z={0} material={m.glass} />
      <mesh position={[gx, (bottom + rim + headAt(gx)) / 2, 0.004]} material={wood}><boxGeometry args={[0.022, headAt(gx) - bottom - rim, 0.022]} /></mesh>
      {[up(0.33), up(0.74)].map(y => <mesh key={y} position={[gx, y, 0.004]} material={wood}><boxGeometry args={[paneW, 0.022, 0.022]} /></mesh>)}
      {/* brass knob near the meeting edge, and two hinges on the outer edge */}
      <mesh position={[xi + side * 0.075, up(0.53), 0.05]} material={m.brass}><sphereGeometry args={[0.03, 20, 14]} /></mesh>
      <mesh position={[xi + side * 0.075, up(0.53), 0.03]} rotation-x={Math.PI / 2} material={m.brass}><cylinderGeometry args={[0.012, 0.016, 0.03, 12]} /></mesh>
      {[up(0.18), up(0.8)].map(y => <mesh key={y} position={[xo, y, 0]} material={m.brass}><cylinderGeometry args={[0.016, 0.016, 0.16, 12]} /></mesh>)}
    </group>
  )
}

/** VIP: an ivory column either side of the case, with gilt base and capital. */
function Columns({ d, ivory, gold }: { d: Dims; ivory: MeshStandardMaterial; gold: MeshStandardMaterial }) {
  const { W, H, DP } = d, h = d.SPRING + H / 2
  return (
    <>
      {[-1, 1].map(s => (
        <group key={s} position={[s * (W / 2 + 0.075), -H / 2 + h / 2, DP / 2 - 0.08]}>
          <mesh material={ivory}><cylinderGeometry args={[0.055, 0.062, h - 0.16, 24]} /></mesh>
          {/* flutes: thin gilt lines down the front */}
          {[-0.5, 0, 0.5].map(a => (
            <mesh key={a} position={[Math.sin(a) * 0.058, 0, Math.cos(a) * 0.058]} material={gold}><boxGeometry args={[0.006, h - 0.22, 0.004]} /></mesh>
          ))}
          <mesh position-y={-h / 2 + 0.05} material={gold}><cylinderGeometry args={[0.085, 0.09, 0.1, 24]} /></mesh>
          <mesh position-y={h / 2 - 0.05} material={gold}><cylinderGeometry args={[0.095, 0.065, 0.1, 24]} /></mesh>
          <mesh position-y={h / 2 + 0.01} material={gold}><boxGeometry args={[0.2, 0.025, 0.2]} /></mesh>
        </group>
      ))}
    </>
  )
}

/** VIP: the crest on the crown, a gilt disc with an ivory paw, ringed by a laurel wreath, a little crown above. */
function Crest({ d, gold, ivory }: { d: Dims; gold: MeshStandardMaterial; ivory: MeshStandardMaterial }) {
  // laurel leaves up both sides from the bottom, leaving the top open for the crown
  const leaves = useMemo(() => [-1, 1].flatMap(s => Array.from({ length: 7 }, (_, i) => {
    const a = -Math.PI / 2 + s * (0.3 + i * 0.27)
    return { x: Math.cos(a) * 0.205, y: Math.sin(a) * 0.205, rz: a + (s > 0 ? 0.5 : -0.5) }
  })), [])
  return (
    <group position={[0, d.SPRING + d.OUT.rise + 0.08, d.DP / 2 - 0.1]} scale={1.2}>
      <mesh rotation-x={Math.PI / 2} material={ivory}><cylinderGeometry args={[0.2, 0.22, 0.1, 40]} /></mesh>
      <group position-z={0.055}>
        <mesh rotation-x={Math.PI / 2} material={gold}><cylinderGeometry args={[0.15, 0.15, 0.02, 40]} /></mesh>
        <mesh position={[0, -0.028, 0.014]} scale={[1.15, 0.95, 0.4]} material={ivory}><sphereGeometry args={[0.05, 20, 14]} /></mesh>
        {[[-0.07, 0.034], [-0.025, 0.072], [0.025, 0.072], [0.07, 0.034]].map(([x, y]) => (
          <mesh key={x} position={[x, y, 0.014]} scale={[1, 1.15, 0.4]} material={ivory}><sphereGeometry args={[0.022, 14, 10]} /></mesh>
        ))}
        {leaves.map((l, i) => (
          <mesh key={i} position={[l.x, l.y, 0.01]} rotation-z={l.rz} scale={[0.45, 1, 0.3]} material={gold}><sphereGeometry args={[0.04, 12, 8]} /></mesh>
        ))}
        {/* the little crown */}
        <group position-y={0.215}>
          <mesh material={gold}><cylinderGeometry args={[0.09, 0.08, 0.05, 24, 1, true]} /></mesh>
          {[-2, -1, 0, 1, 2].map(k => (
            <group key={k} position={[k * 0.04, 0.05, 0.065 - Math.abs(k) * 0.012]}>
              <mesh material={gold}><coneGeometry args={[0.016, 0.06, 10]} /></mesh>
              <mesh position-y={0.04} material={gold}><sphereGeometry args={[0.012, 10, 8]} /></mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}
