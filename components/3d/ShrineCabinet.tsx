'use client'
// components/3d/ShrineCabinet.tsx — A pet's shrine as a cozy miniature shadow box: dark walnut case, midnight sky
// with a crescent moon, a gold-framed portrait, floating shelves, pastel fairy lights and a glass door.
// It starts with just a candle and a vase; gifts visitors leave fill the shelves. The candle grows a little with
// each candle lit in the last day (each visitor can light one a day), up to a cap so it never outgrows the case.
// On phones (quality 'low') we skip shadows, reflections and the soft halos to stay inside the GPU budget.

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Line, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import {
  AdditiveBlending, CanvasTexture, Color, SRGBColorSpace, DoubleSide, InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector2,
  type Group, type Mesh, type PointLight, type Sprite, type Texture,
} from 'three'
import { glowTexture, moonTexture, petTexture, plaqueTexture, woodTexture } from './textures'
import { useContextLossRecovery, useQuality } from './quality'
import { microMap, withRim } from './look'
import type { Pet } from '@/types'
import { giftById } from '@/lib/gifts'
import { DEFAULT_BACKDROP, frameById } from '@/lib/decor'
import { backdropTexture } from './backdrops'

const W = 2.4, H = 1.9, DP = 0.9, T = 0.08
const BACK = -DP / 2 + T / 2          // front face of the back panel
const FLOOR = -H / 2 + 0.05           // top of the cabinet floor
const SHELF_Y = [0.42, -0.16]
const PASTEL = ['#FF8A80', '#FFC170', '#FFE680', '#9EEA8C', '#74D4E8', '#A79BFF', '#FF9AE0']
type V3 = [number, number, number]

export function useTex(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

export default function ShrineCabinet({ pet, candlesToday, flowers, gifts }: { pet: Pet; candlesToday: number; flowers: number; gifts: string[] }) {
  const low = useQuality() === 'low'
  const recovery = useContextLossRecovery()
  return (
    <Canvas
      key={recovery.key}
      shadows={!low ? 'soft' : false}
      camera={{ position: [0, 0.25, 4.6], fov: 38 }}
      dpr={[1, low ? 1.5 : 2]}
      gl={{ antialias: true }}
      onCreated={recovery.onCreated}
    >
      <ambientLight intensity={0.22} color="#FFD9B5" />
      <hemisphereLight args={['#FFE9D0', '#3A2414', 0.35]} />
      <directionalLight
        position={[-2.2, 3, 4]}
        intensity={1.25}
        color="#FFE3C2"
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
      />
      {/* Soft studio reflections for the gold, brass and glass, made from light panels (no image download) */}
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
      <Sparkles count={low ? 25 : 60} scale={[5, 3.2, 2.5]} size={1.6} speed={0.18} color="#FFE0B0" opacity={0.55} />
      <OrbitControls
        enablePan={false}
        minDistance={2.8}
        maxDistance={11}
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
        minPolarAngle={Math.PI / 2 - 0.5}
        maxPolarAngle={Math.PI / 2 + 0.3}
      />
    </Canvas>
  )
}

/** Backs the camera off far enough that the cabinet fits the width (phones are narrow). */
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const halfFov = ((camera as unknown as { fov: number }).fov * Math.PI) / 360
    const aspect = size.width / size.height
    const z = Math.max(4.5, 1.75 / (Math.tan(halfFov) * aspect) + 0.6)
    camera.position.set(0, 0.05, z)
    camera.lookAt(0, -0.22, 0)
  }, [camera, size.width, size.height])
  return null
}

/** Shared materials, so ~150 meshes don't each compile their own. */
export function useMaterials(low: boolean) {
  const wood = useTex(() => woodTexture(), [])
  const mats = useMemo(() => {
    const woodMat = withRim(new MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 2, roughnessMap: microMap('grain'), color: '#B88A6A', roughness: 0.55, metalness: 0 }), 0.6)
    const woodSide = woodMat.clone()
    woodSide.map = wood.clone(); woodSide.map.rotation = Math.PI / 2; woodSide.map.needsUpdate = true
    return {
      wood: woodMat,
      woodSide,
      gold: new MeshStandardMaterial({ color: '#E2B64C', metalness: low ? 0.45 : 0.85, roughness: 0.3, emissive: '#4A3205', emissiveIntensity: low ? 0.6 : 0.25 }),
      brass: new MeshStandardMaterial({ color: '#C99A48', metalness: low ? 0.45 : 0.85, roughness: 0.35, emissive: '#3A2405', emissiveIntensity: low ? 0.5 : 0.2 }),
      shelf: withRim(new MeshStandardMaterial({ color: '#F6F0E6', roughness: 0.6, bumpMap: microMap('fuzz'), bumpScale: 0.4 }), 0.5),
      cream: new MeshStandardMaterial({ color: '#F3EADB', roughness: 0.7, bumpMap: microMap('fuzz'), bumpScale: 0.4 }),
      glass: new MeshPhysicalMaterial({
        color: '#EAF4FA', transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0,
        clearcoat: low ? 0 : 1, depthWrite: false, side: DoubleSide,
      }),
      frameMetal: new MeshStandardMaterial({ color: '#2B2724', metalness: 0.7, roughness: 0.4 }),
    }
  }, [wood, low])
  useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats])
  return mats
}
export type Mats = ReturnType<typeof useMaterials>

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
  const stone = useTex(() => plaqueTexture(`Dome ${pet.floor_id} · ${pet.name}'s place`, 'stone', 800, 128), [pet.name, pet.floor_id])

  const root = useRef<Group>(null!)
  // Everything solid casts and catches soft shadows (glass and glows don't)
  useEffect(() => {
    if (low) return
    root.current.traverse(o => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as MeshStandardMaterial
      const solid = !mat.transparent
      mesh.castShadow = solid
      mesh.receiveShadow = solid
    })
  }, [low, flowers, gifts.length])

  return (
    <group ref={root} position={[0, 0.05, 0]}>
      {/* ── Walnut case ── */}
      <mesh position={[0, 0, -DP / 2]} material={m.wood}><boxGeometry args={[W, H, T]} /></mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * (W / 2 - T / 2), 0, 0]} material={m.woodSide}><boxGeometry args={[T, H, DP]} /></mesh>
      ))}
      <RoundedBox args={[W + 0.18, 0.15, DP + 0.16]} radius={0.03} smoothness={3} position={[0, H / 2 + 0.03, 0]} material={m.wood} />
      <RoundedBox args={[W + 0.18, 0.17, DP + 0.16]} radius={0.03} smoothness={3} position={[0, -H / 2 - 0.06, 0]} material={m.wood} />
      <mesh position={[0, -H / 2 + 0.025, 0.01]} material={m.cream}><boxGeometry args={[W - T * 2, 0.05, DP - 0.04]} /></mesh>

      {/* The backdrop on the back wall (midnight sky with a crescent moon by default) */}
      <mesh position={[0, 0.01, BACK + 0.003]}>
        <planeGeometry args={[W - T * 2, H - 0.04]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {backdrop === 'midnight' && (
        <mesh position={[-0.5, 0.52, BACK + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={moon} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* ── Gold-framed portrait ── */}
      <Portrait photo={photo} frame={frameMat} />

      {/* ── Floating shelves ── */}
      {[-1, 1].map(s => SHELF_Y.map(y => (
        <RoundedBox key={`${s}${y}`} args={[0.6, 0.035, 0.4]} radius={0.008} smoothness={2} position={[s * 0.82, y, BACK + 0.2]} material={m.shelf} />
      )))}
      <GiftDecor gifts={gifts} />
      <BabysBreath at={[-0.8, FLOOR, -0.02]} stems={5 + Math.min(flowers, 7)} m={m} />
      <PillarCandle at={[0.8, FLOOR, -0.02]} today={candlesToday} glow={glow} m={m} low={low} />

      {/* Wooden nameplate on little gold feet */}
      <group position={[0, FLOOR, 0.02]}>
        {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.03, 0]} material={m.gold}><boxGeometry args={[0.05, 0.06, 0.05]} /></mesh>)}
        <RoundedBox args={[0.8, 0.21, 0.04]} radius={0.012} smoothness={2} position={[0, 0.165, 0]} material={m.wood} />
        <mesh position={[0, 0.165, 0.0215]}>
          <planeGeometry args={[0.78, 0.195]} />
          <meshStandardMaterial map={nameplate} roughness={0.45} metalness={0.1} transparent alphaTest={0.5} />
        </mesh>
      </group>

      {/* Warm light: an LED strip under the top, and the candle */}
      <spotLight position={[0, H / 2 - 0.08, 0.25]} angle={1.15} penumbra={1} intensity={2.4} distance={3.5} decay={1.4} color="#FFD3A0" />
      <pointLight position={[0, 0, 0.6]} intensity={0.6} distance={3} decay={1.6} color="#FFB878" />

      <FairyLights glow={glow} low={low} />
      <GlassDoor side={-1} m={m} />
      <GlassDoor side={1} m={m} />

      {/* Stone plaque under the case */}
      <group position={[0, -H / 2 - 0.36, DP / 2 - 0.04]}>
        <RoundedBox args={[1.56, 0.24, 0.05]} radius={0.1} smoothness={3}>
          <meshStandardMaterial color="#D3CCC0" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[1.52, 0.23]} />
          <meshStandardMaterial map={stone} roughness={0.9} transparent alphaTest={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/** The frame (gold unless they've been given another) with a bevelled inner lip, a cream mat and the picture. */
function Portrait({ photo, frame }: { photo: Texture; frame: MeshStandardMaterial }) {
  const fw = 1.0, fh = 1.2, b = 0.085, z = BACK + 0.06
  const bars: [number, number, number, number][] = [
    [0, fh / 2 - b / 2, fw, b], [0, -fh / 2 + b / 2, fw, b],
    [-fw / 2 + b / 2, 0, b, fh], [fw / 2 - b / 2, 0, b, fh],
  ]
  return (
    <group position={[0, 0.12, z]}>
      {bars.map(([x, y, w, h], i) => (
        <RoundedBox key={i} args={[w, h, 0.07]} radius={0.015} smoothness={2} position={[x, y, 0]} material={frame} />
      ))}
      {/* thin inner lip */}
      {bars.map(([x, y, w, h], i) => (
        <mesh key={`l${i}`} position={[x * 0.83, y * 0.86, 0.02]} material={frame}>
          <boxGeometry args={[i < 2 ? w - 0.16 : 0.015, i < 2 ? 0.015 : h - 0.16, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[fw - b * 1.6, fh - b * 1.6]} />
        <meshStandardMaterial color="#FBF6EC" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.68, 0.8]} />
        <meshStandardMaterial map={photo} roughness={0.55} />
      </mesh>
    </group>
  )
}

/** A soft additive glow; fakes bloom around flames and bulbs. */
export function Halo({ glow, at, size, color, opacity = 0.8 }: { glow: Texture; at: V3; size: number; color: string; opacity?: number }) {
  return (
    <sprite position={at} scale={[size, size, 1]}>
      <spriteMaterial map={glow} color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

/** A flame that flickers by itself. */
function Flame({ at, size = 1 }: { at: V3; size?: number }) {
  const ref = useRef<Mesh>(null!)
  const seed = useMemo(() => Math.random() * 10, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed
    ref.current.scale.set(size * (1 + Math.sin(t * 17) * 0.06), size * 1.8 * (1 + Math.sin(t * 11) * 0.14), size)
  })
  return (
    <mesh ref={ref} position={at}>
      <sphereGeometry args={[0.018, 10, 10]} />
      <meshBasicMaterial color="#FFE7A0" toneMapped={false} />
    </mesh>
  )
}

/** Tallest the candle gets (candles lit in the last day beyond this don't add height), so it stays well under the shelf. */
const CANDLE_MAX_STEPS = 6

/** One pillar candle on a brass dish. Each candle lit in the last 24 hours makes it a little taller, up to a cap. */
export function PillarCandle({ at, today, glow, m, low }: { at: V3; today: number; glow: Texture; m: Mats; low: boolean }) {
  const target = 0.14 + 0.035 * Math.min(Math.max(today, 0), CANDLE_MAX_STEPS)
  const body = useRef<Mesh>(null!)
  const top = useRef<Group>(null!)
  const light = useRef<PointLight>(null!)
  const h = useRef(target)
  useFrame(({ clock }, dt) => {
    h.current += (target - h.current) * Math.min(1, dt * 3) // grows smoothly when a candle is lit
    body.current.scale.y = h.current
    body.current.position.y = 0.02 + h.current / 2
    top.current.position.y = 0.02 + h.current
    const t = clock.elapsedTime
    if (light.current) light.current.intensity = 1.5 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.15
  })
  const lit = today > 0
  return (
    <group position={at}>
      <mesh position={[0, 0.01, 0]} material={m.brass}><cylinderGeometry args={[0.1, 0.085, 0.02, 28]} /></mesh>
      <mesh ref={body}>
        <cylinderGeometry args={[0.055, 0.058, 1, 28]} />
        <meshStandardMaterial color="#F7ECDA" emissive="#FF9A40" emissiveIntensity={lit ? 0.18 : 0} roughness={0.75} />
      </mesh>
      <group ref={top}>
        <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.002, 0.002, 0.025]} /><meshBasicMaterial color="#2A1A10" /></mesh>
        {lit && (
          <>
            <Flame at={[0, 0.045, 0]} />
            {!low && <Halo glow={glow} at={[0, 0.04, 0.02]} size={0.55} color="#FFA850" />}
            <pointLight ref={light} position={[0, 0.1, 0.05]} distance={2.2} decay={1.6} color="#FFAA55" />
          </>
        )}
      </group>
    </group>
  )
}

/** Gifts left by visitors, standing on the floating shelves: up to 3 per shelf, newest first, spread across both sides. */
const GIFT_SPOTS: V3[] = [0, -0.17, 0.17].flatMap(dx => [-1, 1].flatMap(s => SHELF_Y.map(y => [s * 0.82 + dx, y + 0.018 + 0.11, BACK + 0.2] as V3)))
function GiftDecor({ gifts }: { gifts: string[] }) {
  const shown = gifts.slice(0, GIFT_SPOTS.length)
  return <>{shown.map((id, i) => <GiftSprite key={`${i}${id}`} emoji={giftById(id)?.emoji ?? '🎁'} img={giftById(id)?.img} at={GIFT_SPOTS[i]} />)}</>
}
/** A gift on a shelf; `count` above 1 adds a small ×N tag (several of the same gift share one spot). */
export function GiftSprite({ emoji, img, at, count = 1 }: { emoji: string; img?: string; at: V3; count?: number }) {
  const map = useTex(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.font = '104px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const tag = () => {
      if (count < 2) return
      const label = `×${count > 99 ? '99+' : count}`
      g.font = '700 36px system-ui, sans-serif'
      const w = Math.min(124, g.measureText(label).width + 26)
      g.fillStyle = 'rgba(42,28,18,.88)'; g.beginPath(); g.roundRect(64 - w / 2, 84, w, 42, 21); g.fill()
      g.fillStyle = '#FFF3DE'; g.fillText(label, 64, 106)
    }
    if (!img) { if (count > 1) g.font = '88px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(emoji, 64, count > 1 ? 50 : 70); tag() }
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    if (img) { // a picture: draw it in once it has loaded
      const pic = new Image()
      pic.onload = () => { if (count > 1) g.drawImage(pic, 20, 0, 88, 88); else g.drawImage(pic, 8, 8, 112, 112); tag(); t.needsUpdate = true }
      pic.src = img
    }
    return t
  }, [emoji, img, count])
  return (
    <sprite position={at} scale={[0.22, 0.22, 1]}>
      <spriteMaterial map={map} transparent alphaTest={0.1} />
    </sprite>
  )
}

/** Dried baby's breath in a small glass vase; more sprigs as more flowers are left. */
export function BabysBreath({ at, stems, m }: { at: V3; stems: number; m: Mats }) {
  const blossoms = useRef<InstancedMesh>(null!)
  const sprigs = useMemo(() => Array.from({ length: stems }, (_, i) => {
    const a = (i / stems) * Math.PI * 2 + i * 0.7
    const lean = 0.12 + (i % 3) * 0.08
    return { a, lean, len: 0.2 + (i % 4) * 0.035 }
  }), [stems])
  const perSprig = 16
  useEffect(() => {
    const o = new Object3D(), c = new Color()
    let n = 0
    sprigs.forEach((s, i) => {
      const tip = new Vector2(Math.cos(s.a), Math.sin(s.a)).multiplyScalar(Math.sin(s.lean) * s.len)
      for (let k = 0; k < perSprig; k++) {
        const a = k * 2.39996, r = 0.012 + (k % 5) * 0.009
        o.position.set(tip.x + Math.cos(a) * r, 0.14 + Math.cos(s.lean) * s.len + ((k * 7) % 5) * 0.006 - 0.012, tip.y + Math.sin(a) * r)
        o.scale.setScalar(0.7 + ((k + i) % 4) * 0.15)
        o.updateMatrix()
        blossoms.current.setMatrixAt(n, o.matrix)
        blossoms.current.setColorAt(n, c.set(['#F6C6D4', '#FBE3EA', '#EFA9BE', '#FFFFFF'][(k + i) % 4]))
        n++
      }
    })
    blossoms.current.count = n
    blossoms.current.instanceMatrix.needsUpdate = true
    if (blossoms.current.instanceColor) blossoms.current.instanceColor.needsUpdate = true
  }, [sprigs])
  const vase = useMemo(() => [[0, 0], [0.05, 0], [0.065, 0.04], [0.055, 0.1], [0.028, 0.14], [0.032, 0.16]].map(([x, y]) => new Vector2(x, y)), [])
  return (
    <group position={at}>
      <mesh material={m.glass}><latheGeometry args={[vase, 28]} /></mesh>
      {sprigs.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.a) * Math.sin(s.lean) * s.len / 2, 0.14 + Math.cos(s.lean) * s.len / 2 - 0.06, Math.sin(s.a) * Math.sin(s.lean) * s.len / 2]}
          rotation={[Math.sin(s.a) * s.lean, 0, -Math.cos(s.a) * s.lean]}>
          <cylinderGeometry args={[0.0018, 0.0022, s.len + 0.12, 5]} />
          <meshStandardMaterial color="#8A8A5A" roughness={1} />
        </mesh>
      ))}
      <instancedMesh ref={blossoms} args={[undefined, undefined, 12 * perSprig]}>
        <sphereGeometry args={[0.009, 6, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  )
}

/** Pastel fairy lights on a thin wire around the inside of the front edge, softly twinkling. */
function FairyLights({ glow, low }: { glow: Texture; low: boolean }) {
  const pts = useMemo(() => {
    const z = DP / 2 - 0.05, top: V3[] = [], left: V3[] = [], right: V3[] = []
    for (let i = 0; i <= 20; i++) { const x = -1.06 + i * 0.106; top.push([x, H / 2 - 0.06 - Math.sin((i / 20) * Math.PI * 4) ** 2 * 0.025, z]) }
    for (let i = 1; i <= 12; i++) { const y = H / 2 - 0.06 - i * 0.14; left.push([-1.08, y, z]); right.push([1.08, y, z]) }
    return { top, left, right, all: [...left.slice().reverse(), ...top, ...right] }
  }, [])
  const mats = useMemo(() => PASTEL.map(c => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 })), [])
  useEffect(() => () => mats.forEach(x => x.dispose()), [mats])
  const halos = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Twinkle with a slowly drifting phase per bulb, so they never pulse in lockstep (soft glow comes from the halos;
    // the cabinet keeps a transparent canvas, so it skips the bloom pass)
    mats.forEach((x, i) => { x.emissiveIntensity = 0.75 + Math.sin(t * 1.6 + i * 1.1 + Math.sin(t * 0.37 + i) * 0.8) * 0.3 })
    halos.current?.children.forEach((h, i) => { ((h as Sprite).material).opacity = 0.35 + Math.sin(t * 1.6 + (i % 7) * 1.1) * 0.15 })
  })
  return (
    <group>
      <Line points={pts.all} color="#3A2A1A" lineWidth={1} />
      {pts.all.map((p, i) => (
        <mesh key={i} position={p} material={mats[i % PASTEL.length]}><sphereGeometry args={[0.02, 10, 10]} /></mesh>
      ))}
      {!low && (
        <group ref={halos}>
          {pts.all.map((p, i) => <Halo key={i} glow={glow} at={p} size={0.13} color={PASTEL[i % PASTEL.length]} opacity={0.4} />)}
        </group>
      )}
    </group>
  )
}

/** Glass door hinged on the outer edge; swings open when the shrine loads. */
function GlassDoor({ side, m }: { side: -1 | 1; m: Mats }) {
  const hinge = useRef<Group>(null!)
  const OPEN = 1.75
  useFrame((_, dt) => {
    const want = -side * OPEN
    hinge.current.rotation.y += (want - hinge.current.rotation.y) * Math.min(1, dt * 1.8)
  })
  const w = W / 2 - 0.01
  return (
    <group ref={hinge} position={[side * (W / 2 + 0.04), 0, DP / 2 + 0.03]}>
      <group position={[-side * (w / 2), 0, 0]}>
        <mesh material={m.glass}><boxGeometry args={[w, H, 0.012]} /></mesh>
        {[[w, 0.035, 0, H / 2], [w, 0.035, 0, -H / 2], [0.035, H, w / 2, 0], [0.035, H, -w / 2, 0]].map(([fw, fh, x, y], i) => (
          <mesh key={i} position={[x, y, 0]} material={m.frameMetal}><boxGeometry args={[fw, fh, 0.03]} /></mesh>
        ))}
      </group>
    </group>
  )
}

/** Big soft out-of-focus lights drifting around the shrine, kept inside the view so the canvas edge never cuts one. */
export function Bokeh({ count }: { count: number }) {
  const glow = useTex(() => glowTexture(), [])
  const ref = useRef<Group>(null!)
  const { width, height } = useThree(s => s.viewport)
  const spots = useMemo(() => Array.from({ length: count }, (_, i) => {
    // spread around the edges of the view, leaving the cabinet itself clear
    const a = i * 2.39996, ring = 0.72 + (i % 4) * 0.07
    const s = 0.22 + ((i * 7) % 9) * 0.05
    return {
      p: [Math.cos(a) * (width / 2 - s) * ring, Math.sin(a) * (height / 2 - s) * ring, -0.6 + (i % 5) * 0.25] as V3,
      s, o: 0.1 + ((i * 3) % 5) * 0.035, sp: 0.15 + (i % 4) * 0.05,
    }
  }), [count, width, height])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current.children.forEach((c, i) => {
      const s = spots[i]
      c.position.y = s.p[1] + Math.sin(t * s.sp + i) * 0.06
      c.position.x = s.p[0] + Math.cos(t * s.sp * 0.7 + i) * 0.05
    })
  })
  return (
    <group ref={ref}>
      {spots.map((s, i) => (
        <sprite key={i} position={s.p} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={glow} color="#FFCF8A" transparent opacity={s.o} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  )
}
