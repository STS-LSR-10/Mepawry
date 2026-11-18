'use client'
// components/3d/ShrineCabinet.tsx — A pet's shrine as a cozy miniature shadow box: dark walnut case, midnight sky
// with a crescent moon, a gold-framed portrait, floating shelves of keepsakes, pastel fairy lights and a glass door.
// Candles: a jar candle on the shelf, then tea lights along the front (one per candle lit, up to 7).
// On phones (quality 'low') we skip shadows, reflections and the soft halos to stay inside the GPU budget.

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Line, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import {
  AdditiveBlending, Color, DoubleSide, InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector2,
  type Group, type Mesh, type PointLight, type Sprite, type Texture,
} from 'three'
import { glowTexture, midnightTexture, moonTexture, petTexture, plaqueTexture, woodTexture } from './textures'
import { useContextLossRecovery, useQuality } from './quality'
import type { Pet } from '@/types'

const W = 2.4, H = 1.9, DP = 0.9, T = 0.08
const BACK = -DP / 2 + T / 2          // front face of the back panel
const FLOOR = -H / 2 + 0.05           // top of the cabinet floor
const SHELF_Y = [0.42, -0.16]
const PASTEL = ['#FF8A80', '#FFC170', '#FFE680', '#9EEA8C', '#74D4E8', '#A79BFF', '#FF9AE0']
type V3 = [number, number, number]

function useTex(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

export default function ShrineCabinet({ pet, candles, flowers }: { pet: Pet; candles: number; flowers: number }) {
  const low = useQuality() === 'low'
  const recovery = useContextLossRecovery()
  return (
    <Canvas
      key={recovery.key}
      shadows={!low}
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
      <Cabinet pet={pet} candles={candles} flowers={flowers} low={low} />
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
function useMaterials(low: boolean) {
  const wood = useTex(() => woodTexture(), [])
  const mats = useMemo(() => {
    const woodMat = new MeshStandardMaterial({ map: wood, color: '#B88A6A', roughness: 0.55, metalness: 0 })
    const woodSide = woodMat.clone()
    woodSide.map = wood.clone(); woodSide.map.rotation = Math.PI / 2; woodSide.map.needsUpdate = true
    return {
      wood: woodMat,
      woodSide,
      gold: new MeshStandardMaterial({ color: '#E2B64C', metalness: low ? 0.45 : 0.85, roughness: 0.3, emissive: '#4A3205', emissiveIntensity: low ? 0.6 : 0.25 }),
      brass: new MeshStandardMaterial({ color: '#C99A48', metalness: low ? 0.45 : 0.85, roughness: 0.35, emissive: '#3A2405', emissiveIntensity: low ? 0.5 : 0.2 }),
      shelf: new MeshStandardMaterial({ color: '#F6F0E6', roughness: 0.6 }),
      cream: new MeshStandardMaterial({ color: '#F3EADB', roughness: 0.7 }),
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
type Mats = ReturnType<typeof useMaterials>

function Cabinet({ pet, candles, flowers, low }: { pet: Pet; candles: number; flowers: number; low: boolean }) {
  const m = useMaterials(low)
  const photo = useTex(() => petTexture(pet, false), [pet.id, pet.primary_photo_url])
  const sky = useTex(() => midnightTexture(), [])
  const moon = useTex(() => moonTexture(), [])
  const glow = useTex(() => glowTexture(), [])
  const nameplate = useTex(() => plaqueTexture(pet.name, 'wood', 640, 160), [pet.name])
  const stone = useTex(() => plaqueTexture(`Floor ${pet.floor_id} · ${pet.name}'s place`, 'stone', 800, 128), [pet.name, pet.floor_id])

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
  }, [low, candles, flowers])

  const lit = Math.min(candles, 7)

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

      {/* Midnight sky and crescent moon on the back wall */}
      <mesh position={[0, 0.01, BACK + 0.003]}>
        <planeGeometry args={[W - T * 2, H - 0.04]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      <mesh position={[-0.5, 0.52, BACK + 0.01]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={moon} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* ── Gold-framed portrait ── */}
      <Portrait photo={photo} m={m} />

      {/* ── Floating shelves ── */}
      {[-1, 1].map(s => SHELF_Y.map(y => (
        <RoundedBox key={`${s}${y}`} args={[0.6, 0.035, 0.4]} radius={0.008} smoothness={2} position={[s * 0.82, y, BACK + 0.2]} material={m.shelf} />
      )))}
      <Books at={[-0.83, SHELF_Y[0] + 0.018, BACK + 0.2]} />
      <JarCandle at={[-0.83, SHELF_Y[1] + 0.018, BACK + 0.2]} lit={lit > 0} glow={glow} m={m} low={low} />
      <Toys at={[0.82, SHELF_Y[0] + 0.018, BACK + 0.2]} />
      <Terrarium at={[0.7, SHELF_Y[1] + 0.018, BACK + 0.2]} m={m} />
      <PlantJar at={[0.96, SHELF_Y[1] + 0.018, BACK + 0.2]} m={m} />
      <BabysBreath at={[-0.8, FLOOR, -0.02]} stems={5 + Math.min(flowers, 7)} m={m} />
      <Lantern at={[0.8, FLOOR, -0.02]} glow={glow} m={m} low={low} />

      {/* Tea lights along the front, one per extra candle lit */}
      {[-0.42, 0.42, -0.58, 0.58, -0.26, 0.26].slice(0, Math.max(0, lit - 1)).map(x => (
        <TeaLight key={x} at={[x, FLOOR, 0.3]} glow={glow} low={low} />
      ))}

      {/* Wooden nameplate on little gold feet */}
      <group position={[0, FLOOR, 0.02]}>
        {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.03, 0]} material={m.gold}><boxGeometry args={[0.05, 0.06, 0.05]} /></mesh>)}
        <RoundedBox args={[0.8, 0.21, 0.04]} radius={0.012} smoothness={2} position={[0, 0.165, 0]} material={m.wood} />
        <mesh position={[0, 0.165, 0.0215]}>
          <planeGeometry args={[0.78, 0.195]} />
          <meshStandardMaterial map={nameplate} roughness={0.45} metalness={0.1} transparent alphaTest={0.5} />
        </mesh>
      </group>

      {/* Warm light: an LED strip under the top, the candle and the lantern */}
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

/** Gold frame with a bevelled inner lip, a cream mat and the picture. */
function Portrait({ photo, m }: { photo: Texture; m: Mats }) {
  const fw = 1.0, fh = 1.2, b = 0.085, z = BACK + 0.06
  const bars: [number, number, number, number][] = [
    [0, fh / 2 - b / 2, fw, b], [0, -fh / 2 + b / 2, fw, b],
    [-fw / 2 + b / 2, 0, b, fh], [fw / 2 - b / 2, 0, b, fh],
  ]
  return (
    <group position={[0, 0.12, z]}>
      {bars.map(([x, y, w, h], i) => (
        <RoundedBox key={i} args={[w, h, 0.07]} radius={0.015} smoothness={2} position={[x, y, 0]} material={m.gold} />
      ))}
      {/* thin inner lip */}
      {bars.map(([x, y, w, h], i) => (
        <mesh key={`l${i}`} position={[x * 0.83, y * 0.86, 0.02]} material={m.gold}>
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
function Halo({ glow, at, size, color, opacity = 0.8 }: { glow: Texture; at: V3; size: number; color: string; opacity?: number }) {
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

/** Scented candle in a glass jar: the first candle lit. */
function JarCandle({ at, lit, glow, m, low }: { at: V3; lit: boolean; glow: Texture; m: Mats; low: boolean }) {
  const light = useRef<PointLight>(null!)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (light.current) light.current.intensity = 1.5 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.15
  })
  return (
    <group position={at}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.1, 24]} />
        <meshStandardMaterial color="#F6E3C6" emissive="#FF9A40" emissiveIntensity={lit ? 0.35 : 0} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, 0]} material={m.glass}><cylinderGeometry args={[0.08, 0.08, 0.16, 24, 1, true]} /></mesh>
      <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.002, 0.002, 0.025]} /><meshBasicMaterial color="#2A1A10" /></mesh>
      {lit && (
        <>
          <Flame at={[0, 0.14, 0]} />
          {!low && <Halo glow={glow} at={[0, 0.13, 0.02]} size={0.55} color="#FFA850" />}
          <pointLight ref={light} position={[0, 0.2, 0.05]} distance={2.2} decay={1.6} color="#FFAA55" />
        </>
      )}
    </group>
  )
}

function TeaLight({ at, glow, low }: { at: V3; glow: Texture; low: boolean }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 18]} />
        <meshStandardMaterial color="#C9CDD2" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.041, 0]}><cylinderGeometry args={[0.031, 0.031, 0.004, 18]} /><meshStandardMaterial color="#F7EEDC" /></mesh>
      <Flame at={[0, 0.065, 0]} size={0.8} />
      {!low && <Halo glow={glow} at={[0, 0.065, 0.01]} size={0.3} color="#FFA850" opacity={0.7} />}
    </group>
  )
}

/** Miniature books, one leaning, and a tiny ceramic cat. */
function Books({ at }: { at: V3 }) {
  const books: [string, number, number][] = [['#7A2A2A', 0.2, 0.05], ['#2F5B4A', 0.22, 0.045], ['#3D4E7A', 0.18, 0.055], ['#C99B3A', 0.21, 0.04], ['#8C5A9A', 0.17, 0.05]]
  let x = -0.24
  return (
    <group position={at}>
      {books.map(([c, h, w], i) => {
        const lean = i === 4 ? -0.32 : 0
        x += w + 0.004
        return (
          <group key={c} position={[x - w / 2 + (lean ? 0.03 : 0), 0, 0]} rotation={[0, 0, lean]}>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[w, h, 0.16]} />
              <meshStandardMaterial color={c} roughness={0.75} />
            </mesh>
            {[0.25, 0.75].map(f => (
              <mesh key={f} position={[0, h * f, 0.081]}><planeGeometry args={[w * 0.8, 0.008]} /><meshStandardMaterial color="#E8C365" metalness={0.6} roughness={0.4} /></mesh>
            ))}
          </group>
        )
      })}
      {/* ceramic cat */}
      <group position={[0.17, 0, 0.04]}>
        <mesh position={[0, 0.04, 0]} scale={[1, 1.15, 0.9]}><sphereGeometry args={[0.035, 14, 14]} /><meshStandardMaterial color="#F4F1EC" roughness={0.3} /></mesh>
        <mesh position={[0, 0.095, 0]}><sphereGeometry args={[0.026, 14, 14]} /><meshStandardMaterial color="#F4F1EC" roughness={0.3} /></mesh>
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * 0.014, 0.122, 0]} rotation={[0, 0, -s * 0.3]}><coneGeometry args={[0.009, 0.02, 4]} /><meshStandardMaterial color="#F4F1EC" /></mesh>
        ))}
      </group>
    </group>
  )
}

/** A glossy red ball and a bone. */
function Toys({ at }: { at: V3 }) {
  return (
    <group position={at}>
      <mesh position={[-0.11, 0.075, 0]}>
        <sphereGeometry args={[0.075, 28, 28]} />
        <meshPhysicalMaterial color="#C8322A" roughness={0.35} clearcoat={0.6} />
      </mesh>
      <group position={[0.11, 0.03, 0.03]} rotation={[0, 0.35, Math.PI / 2]}>
        <mesh><capsuleGeometry args={[0.022, 0.15, 4, 12]} /><meshStandardMaterial color="#F1E6D2" roughness={0.6} /></mesh>
        {[-1, 1].map(s => [-1, 1].map(t => (
          <mesh key={`${s}${t}`} position={[t * 0.022, s * 0.095, 0]}><sphereGeometry args={[0.032, 14, 14]} /><meshStandardMaterial color="#F1E6D2" roughness={0.6} /></mesh>
        )))}
      </group>
    </group>
  )
}

/** Moss garden sealed in a cork-stoppered jar. */
function Terrarium({ at, m }: { at: V3; m: Mats }) {
  const moss = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.4, r = 0.015 + (i % 3) * 0.015
    return { p: [Math.cos(a) * r, 0.035 + (i % 2) * 0.012, Math.sin(a) * r] as V3, s: 0.022 + (i % 4) * 0.006, c: ['#4E7A2E', '#6B9A3A', '#3E6A28'][i % 3] }
  }), [])
  return (
    <group position={at}>
      <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.058, 0.058, 0.03, 20]} /><meshStandardMaterial color="#5A3C26" roughness={1} /></mesh>
      {moss.map((x, i) => <mesh key={i} position={x.p}><sphereGeometry args={[x.s, 10, 10]} /><meshStandardMaterial color={x.c} roughness={1} /></mesh>)}
      <mesh position={[0, 0.07, 0]} material={m.glass}><cylinderGeometry args={[0.065, 0.065, 0.14, 24, 1, true]} /></mesh>
      <mesh position={[0, 0.155, 0]}><cylinderGeometry args={[0.05, 0.055, 0.035, 20]} /><meshStandardMaterial color="#C9A57A" roughness={0.95} /></mesh>
    </group>
  )
}

/** A little plant growing in a glass jar. */
function PlantJar({ at, m }: { at: V3; m: Mats }) {
  const leaves = [[0.25, 0.16], [-0.4, 0.2], [1.2, 0.23], [2.3, 0.18], [3.4, 0.25], [4.6, 0.21]]
  return (
    <group position={at}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.048, 0.048, 0.04, 20]} /><meshStandardMaterial color="#4A3020" roughness={1} /></mesh>
      <mesh position={[0, 0.065, 0]} material={m.glass}><cylinderGeometry args={[0.055, 0.05, 0.13, 22, 1, true]} /></mesh>
      <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.004, 0.005, 0.16]} /><meshStandardMaterial color="#4E7A2E" /></mesh>
      {leaves.map(([a, y], i) => (
        <mesh key={i} position={[Math.cos(a) * 0.03, y, Math.sin(a) * 0.03]} rotation={[0.4 * Math.sin(a), a, 0.8]} scale={[1, 0.35, 0.55]}>
          <sphereGeometry args={[0.04, 12, 10]} />
          <meshStandardMaterial color={i % 2 ? '#5E9E3A' : '#78B84A'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** Dried baby's breath in a small glass vase; more sprigs as more flowers are left. */
function BabysBreath({ at, stems, m }: { at: V3; stems: number; m: Mats }) {
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

/** Brass lantern with glass panes and a candle glowing inside. */
function Lantern({ at, glow, m, low }: { at: V3; glow: Texture; m: Mats; low: boolean }) {
  const light = useRef<PointLight>(null!)
  useFrame(({ clock }) => { light.current.intensity = 0.9 + Math.sin(clock.elapsedTime * 7.3) * 0.12 })
  const s = 0.2, h = 0.26
  return (
    <group position={at}>
      <RoundedBox args={[s + 0.03, 0.03, s + 0.03]} radius={0.006} position={[0, 0.015, 0]} material={m.brass} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * s / 2, 0.03 + h / 2, b * s / 2]} material={m.brass}><boxGeometry args={[0.016, h, 0.016]} /></mesh>
      ))}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[Math.sin(i * Math.PI / 2) * s / 2, 0.03 + h / 2, Math.cos(i * Math.PI / 2) * s / 2]} rotation={[0, i * Math.PI / 2, 0]} material={m.glass}>
          <planeGeometry args={[s, h]} />
        </mesh>
      ))}
      <mesh position={[0, 0.03 + h + 0.04, 0]} rotation={[0, Math.PI / 4, 0]} material={m.brass}><coneGeometry args={[s * 0.78, 0.08, 4]} /></mesh>
      <mesh position={[0, 0.03 + h + 0.12, 0]} material={m.brass}><torusGeometry args={[0.035, 0.007, 8, 20]} /></mesh>
      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.025, 0.025, 0.08, 14]} /><meshStandardMaterial color="#F7EEDC" /></mesh>
      <Flame at={[0, 0.13, 0]} />
      {!low && <Halo glow={glow} at={[0, 0.13, 0.02]} size={0.5} color="#FFB060" />}
      <pointLight ref={light} position={[0, 0.15, 0.08]} distance={1.8} decay={1.6} color="#FFB060" />
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
    mats.forEach((x, i) => { x.emissiveIntensity = 0.75 + Math.sin(t * 1.6 + i * 1.1) * 0.3 })
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
function Bokeh({ count }: { count: number }) {
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
