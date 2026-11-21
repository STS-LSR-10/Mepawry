'use client'
// components/3d/ShrineCabinetArched.tsx — Concept redesign of a pet's shrine: an arched walnut curio cabinet. The case
// is one arched piece with a brass inlay round the opening and a paw medallion on the crown; two glazed doors with
// arched heads and glazing bars swing open towards you when the shrine loads (tap a door to close or open them);
// it stands on a plinth with a drawer and little bun feet. Inside: the backdrop, the portrait, walnut shelves with
// brass lips for gifts, the candle that grows with each candle lit today, and the vase of baby's breath.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import { ExtrudeGeometry, MeshStandardMaterial, Shape, ShapeGeometry, type BufferGeometry, type Group, type Mesh, type Texture } from 'three'
import { glowTexture, moonTexture, petTexture, plaqueTexture } from './textures'
import { useContextLossRecovery, useQuality } from './quality'
import { giftById } from '@/lib/gifts'
import { DEFAULT_BACKDROP, frameById } from '@/lib/decor'
import { backdropTexture } from './backdrops'
import { BabysBreath, Bokeh, GiftSprite, PillarCandle, useMaterials, useTex, type Mats } from './ShrineCabinet'
import type { Pet } from '@/types'

type V3 = [number, number, number]

// Case: W wide, its straight sides H tall, DP deep; the top is a shallow (segmental) arch
const W = 2.4, H = 1.9, DP = 0.9
const SPRING = 0.78                 // where the arches start curving
const OUT = { half: W / 2, rise: 0.5, bottom: -H / 2 }
const OPEN = { half: 1.02, rise: 0.34, bottom: -H / 2 + 0.1 } // the opening (and so the inside)
const FLOOR = OPEN.bottom
const BACK = -DP / 2 + 0.05
const SHELF_Y = [0.38, -0.18]
const SHELF_X = 0.78
const DOOR_OPEN = 1.22              // radians the doors stand open at (~70°): you see their glass and bars, and they clear the candle and vase
const DOOR_HALF = 1.12              // each door's width: hinged halfway across the side frame, so they cover it and open wide of the opening

/** The circle a shallow arch of half-width `half` and height `rise` lies on (springing at SPRING). */
function arc(half: number, rise: number) {
  const R = (half * half + rise * rise) / (2 * rise)
  return { R, cy: SPRING + rise - R }
}
const archTop = (half: number, rise: number) => SPRING + rise

/** An arched-top outline: straight sides from `bottom` up to SPRING, then the arch. */
function archShape({ half, rise, bottom }: { half: number; rise: number; bottom: number }) {
  const { R, cy } = arc(half, rise), a = Math.atan2(SPRING - cy, half)
  const s = new Shape()
  s.moveTo(-half, bottom); s.lineTo(half, bottom); s.lineTo(half, SPRING)
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
  return (
    <Canvas
      key={recovery.key}
      shadows={!low ? 'percentage' : false}
      camera={{ position: [0, 0.2, 5], fov: 38 }}
      dpr={[1, low ? 1.5 : 2]}
      gl={{ antialias: true }}
      onCreated={recovery.onCreated}
    >
      <ambientLight intensity={0.3} color="#FFD9B5" />
      <hemisphereLight args={['#FFE9D0', '#3A2414', 0.35]} />
      <directionalLight
        position={[-2.2, 3, 4]} intensity={1.6} color="#FFE3C2" castShadow={!low}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-2.2} shadow-camera-right={2.2} shadow-camera-top={1.8} shadow-camera-bottom={-1.8}
      />
      {!low && (
        <Environment resolution={64}>
          <Lightformer intensity={3} color="#FFE2BF" position={[0, 3, 3]} scale={[8, 3, 1]} />
          <Lightformer intensity={2} color="#FFF0DC" position={[0, 0, 5]} scale={[6, 4, 1]} />
          <Lightformer intensity={1.2} color="#FFC890" position={[-4, 1, 1]} scale={[2, 4, 1]} />
          <Lightformer intensity={0.6} color="#9FA8FF" position={[4, 0, -2]} scale={[2, 3, 1]} />
        </Environment>
      )}
      <FitCamera />
      <Cabinet pet={pet} candlesToday={candlesToday} flowers={flowers} gifts={gifts} low={low} />
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
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const t = Math.tan(((camera as unknown as { fov: number }).fov * Math.PI) / 360)
    const aspect = size.width / size.height
    const z = Math.max(1.42 / t, 1.72 / (t * aspect)) + 0.5
    camera.position.set(0, 0.12, z)
    camera.lookAt(0, 0.08, 0)
  }, [camera, size.width, size.height])
  return null
}

function Cabinet({ pet, candlesToday, flowers, gifts, low }: { pet: Pet; candlesToday: number; flowers: number; gifts: string[]; low: boolean }) {
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
  const nameplate = useTex(() => plaqueTexture(pet.name, 'wood', 640, 160), [pet.name])
  const plate = useTex(() => plaqueTexture(`Dome ${pet.floor_id} · ${pet.name}'s place`, 'stone', 800, 128), [pet.name, pet.floor_id])

  // The case: the arched outline with the arched opening cut through it, run back the full depth
  const body = useGeo(() => {
    const s = archShape(OUT); s.holes.push(archShape(OPEN))
    const g = new ExtrudeGeometry(s, { depth: DP, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 })
    g.translate(0, 0, -DP / 2)
    return g
  }, [])
  // A thin brass line inlaid round the opening
  const inlay = useGeo(() => {
    const s = archShape({ half: OPEN.half + 0.075, rise: OPEN.rise + 0.06, bottom: FLOOR - 0.06 })
    s.holes.push(archShape({ half: OPEN.half + 0.06, rise: OPEN.rise + 0.048, bottom: FLOOR - 0.045 }))
    return new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false, curveSegments: 40 })
  }, [])
  // The back wall, cut to the arch, with the backdrop stretched over it
  const back = useGeo(() => {
    const g = new ShapeGeometry(archShape(OPEN), 40)
    const pos = g.attributes.position, uv = g.attributes.uv, top = archTop(OPEN.half, OPEN.rise)
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + OPEN.half) / (2 * OPEN.half), (pos.getY(i) - FLOOR) / (top - FLOOR))
    return g
  }, [])

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

  const giftSpots: V3[] = [0, -0.15, 0.15].flatMap(dx => [-1, 1].flatMap(s => SHELF_Y.map(y => [s * SHELF_X + dx, y + 0.02 + 0.11, BACK + 0.2] as V3)))

  return (
    <group ref={root} position={[0, -0.05, 0]}>
      {/* ── The walnut case, arched ── */}
      <mesh geometry={body} material={m.wood} />
      <mesh geometry={inlay} position-z={DP / 2 + 0.02} material={m.brass} />
      <mesh geometry={back} position-z={BACK}><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
      {backdrop === DEFAULT_BACKDROP && (
        <mesh position={[-0.5, 0.62, BACK + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={moon} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* a soft cream floor inside */}
      <mesh position={[0, FLOOR + 0.012, 0]} material={m.cream}><boxGeometry args={[OPEN.half * 2, 0.024, DP - 0.02]} /></mesh>

      {/* ── Crown: a brass paw medallion on a walnut boss ── */}
      <group position={[0, archTop(OUT.half, OUT.rise) + 0.02, DP / 2 - 0.12]}>
        <mesh rotation-x={Math.PI / 2} material={m.wood}><cylinderGeometry args={[0.17, 0.19, 0.12, 40]} /></mesh>
        <group position-z={0.065}>
          <mesh rotation-x={Math.PI / 2} material={m.brass}><cylinderGeometry args={[0.13, 0.13, 0.015, 40]} /></mesh>
          <mesh position={[0, -0.025, 0.012]} scale={[1.15, 0.95, 0.4]} material={m.wood}><sphereGeometry args={[0.045, 20, 14]} /></mesh>
          {[[-0.062, 0.03], [-0.022, 0.065], [0.022, 0.065], [0.062, 0.03]].map(([x, y]) => (
            <mesh key={x} position={[x, y, 0.012]} scale={[1, 1.15, 0.4]} material={m.wood}><sphereGeometry args={[0.02, 14, 10]} /></mesh>
          ))}
        </group>
      </group>

      {/* ── Plinth: a drawer with a brass pull and the dome plate, on bun feet ── */}
      <group position={[0, -H / 2 - 0.1, 0]}>
        <RoundedBox args={[W + 0.14, 0.2, DP + 0.12]} radius={0.03} smoothness={3} material={m.wood} />
        <RoundedBox args={[W - 0.3, 0.13, 0.02]} radius={0.01} smoothness={2} position={[0, 0, DP / 2 + 0.065]} material={m.woodSide} />
        <mesh position={[0, 0, DP / 2 + 0.077]}>
          <planeGeometry args={[1.36, 0.1]} />
          <meshStandardMaterial map={plate} roughness={0.9} transparent alphaTest={0.5} />
        </mesh>
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * 0.95, 0, DP / 2 + 0.09]} rotation-x={Math.PI / 2} material={m.brass}><cylinderGeometry args={[0.028, 0.028, 0.035, 20]} /></mesh>
        ))}
        {[-1, 1].flatMap(sx => [-1, 1].map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.08), -0.15, sz * (DP / 2 - 0.06)]} scale={[1, 0.62, 1]} material={m.wood}><sphereGeometry args={[0.085, 20, 14]} /></mesh>
        )))}
      </group>

      {/* ── Inside ── */}
      <Portrait photo={photo} frame={frameMat} />
      {[-1, 1].map(s => SHELF_Y.map(y => (
        <group key={`${s}${y}`} position={[s * SHELF_X, y, BACK + 0.22]}>
          <RoundedBox args={[0.5, 0.04, 0.42]} radius={0.01} smoothness={2} material={m.wood} />
          <mesh position={[0, 0, 0.212]} material={m.brass}><boxGeometry args={[0.5, 0.012, 0.006]} /></mesh>
        </group>
      )))}
      {gifts.slice(0, giftSpots.length).map((id, i) => <GiftSprite key={`${i}${id}`} emoji={giftById(id)?.emoji ?? '🎁'} at={giftSpots[i]} />)}
      <BabysBreath at={[-0.6, FLOOR + 0.024, 0.02]} stems={5 + Math.min(flowers, 7)} m={m} />
      <PillarCandle at={[0.6, FLOOR + 0.024, 0.02]} today={candlesToday} glow={glow} m={m} low={low} />
      <group position={[0, FLOOR + 0.024, 0.1]}>
        {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.03, 0]} material={m.gold}><boxGeometry args={[0.05, 0.06, 0.05]} /></mesh>)}
        <RoundedBox args={[0.8, 0.21, 0.04]} radius={0.012} smoothness={2} position={[0, 0.165, 0]} material={m.wood} />
        <mesh position={[0, 0.165, 0.0215]}>
          <planeGeometry args={[0.78, 0.195]} />
          <meshStandardMaterial map={nameplate} roughness={0.45} metalness={0.1} transparent alphaTest={0.5} />
        </mesh>
      </group>
      {/* warm light from under the crown, and a little fill */}
      <spotLight position={[0, SPRING + 0.2, 0.2]} angle={1.15} penumbra={1} intensity={1.8} distance={3.5} decay={1.4} color="#FFD3A0" />
      <pointLight position={[0, 0, 0.7]} intensity={0.6} distance={3} decay={1.6} color="#FFB878" />

      <Doors m={m} />
    </group>
  )
}

/** The portrait in the frame they chose, with a bevelled inner lip and a cream mat. */
function Portrait({ photo, frame }: { photo: Texture; frame: MeshStandardMaterial }) {
  const fw = 0.98, fh = 1.18, b = 0.085
  const bars: [number, number, number, number][] = [
    [0, fh / 2 - b / 2, fw, b], [0, -fh / 2 + b / 2, fw, b], [-fw / 2 + b / 2, 0, b, fh], [fw / 2 - b / 2, 0, b, fh],
  ]
  return (
    <group position={[0, 0.16, BACK + 0.06]}>
      {bars.map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 0.07]} radius={0.015} smoothness={2} position={[x, y, 0]} material={frame} />)}
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
function Doors({ m }: { m: Mats }) {
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
        <group key={side} ref={g => { leaves.current[i] = g }} position={[side * DOOR_HALF, 0, DP / 2 + 0.045]}
          onClick={toggle}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <Leaf side={side as -1 | 1} m={m} />
        </group>
      ))}
    </>
  )
}

/** One door, drawn from its hinge (x = 0) towards the middle: an arched walnut frame, glass, glazing bars, a knob, hinges. */
function Leaf({ side, m }: { side: -1 | 1; m: Mats }) {
  const c = arc(DOOR_HALF, OPEN.rise + 0.1)
  const rim = 0.085, bottom = FLOOR - 0.05
  const xo = side * DOOR_HALF, xi = 0 // in cabinet space; the group below moves the hinge to the origin
  const ci = { R: c.R - rim, cy: c.cy }
  const frame = useGeo(() => {
    const s = leafShape(xo, xi, bottom, c)
    s.holes.push(leafShape(xo - side * rim, xi + side * rim * 0.6, bottom + rim, ci))
    return new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 32 })
  }, [side])
  const pane = useGeo(() => new ShapeGeometry(leafShape(xo - side * rim, xi + side * rim * 0.6, bottom + rim, ci), 32), [side])
  // glazing bars: one upright down the middle of the pane, two rails across it
  const gx = (xo - side * rim + xi + side * rim * 0.6) / 2
  const headAt = (x: number) => ci.cy + Math.sqrt(Math.max(0, ci.R * ci.R - x * x))
  const paneW = Math.abs(xo - xi) - rim * 1.6
  return (
    <group position-x={-xo}>
      <mesh geometry={frame} position-z={-0.02} material={m.wood} />
      <mesh geometry={pane} position-z={0} material={m.glass} />
      <mesh position={[gx, (bottom + rim + headAt(gx)) / 2, 0.004]} material={m.wood}><boxGeometry args={[0.022, headAt(gx) - bottom - rim, 0.022]} /></mesh>
      {[-0.32, 0.36].map(y => <mesh key={y} position={[gx, y, 0.004]} material={m.wood}><boxGeometry args={[paneW, 0.022, 0.022]} /></mesh>)}
      {/* brass knob near the meeting edge, and two hinges on the outer edge */}
      <mesh position={[xi + side * 0.075, 0.02, 0.05]} material={m.brass}><sphereGeometry args={[0.03, 20, 14]} /></mesh>
      <mesh position={[xi + side * 0.075, 0.02, 0.03]} rotation-x={Math.PI / 2} material={m.brass}><cylinderGeometry args={[0.012, 0.016, 0.03, 12]} /></mesh>
      {[-0.55, 0.45].map(y => <mesh key={y} position={[xo, y, 0]} material={m.brass}><cylinderGeometry args={[0.016, 0.016, 0.16, 12]} /></mesh>)}
    </group>
  )
}
