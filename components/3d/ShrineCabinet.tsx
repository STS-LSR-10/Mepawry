'use client'
// components/3d/ShrineCabinet.tsx — A pet's shrine as a little lit cabinet: glass doors swing open on a framed
// portrait, string lights, candles (one per candle lit, up to 8), flowers, a lantern and a few toys

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { MeshStandardMaterial, type Group, type PointLight, type Texture } from 'three'
import { nightTexture, petTexture, signTexture } from './textures'
import { useContextLossRecovery, useQuality } from './quality'
import type { Pet } from '@/types'

const W = 2.4, H = 1.9, DP = 0.9, T = 0.07
const WOOD = '#5A3A24'
const GOLD = '#C9A227'
const BULBS = ['#FF5E5E', '#FFD34E', '#5EC8FF', '#7DFF8A', '#FF8AE2']

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
      camera={{ position: [0, 0.25, 4.6], fov: 38 }}
      dpr={[1, low ? 1.5 : 2]}
      gl={{ antialias: true }}
      onCreated={recovery.onCreated}
    >
      <ambientLight intensity={0.55} color="#FFE2C4" />
      <directionalLight position={[2, 3, 4]} intensity={0.9} color="#FFF1DE" />
      <FitCamera />
      <Cabinet pet={pet} candles={candles} flowers={flowers} />
      <Sparkles count={low ? 20 : 40} scale={[5, 3, 2]} size={2.5} speed={0.25} color="#FFC870" opacity={0.6} />
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
    // Fit the cabinet body (open doors may run off the edges on a phone)
    const z = Math.max(5.2, 1.75 / (Math.tan(halfFov) * aspect) + 0.6)
    camera.position.set(0, 0.25, z)
    camera.lookAt(0, 0, 0)
  }, [camera, size.width, size.height])
  return null
}

function Cabinet({ pet, candles, flowers }: { pet: Pet; candles: number; flowers: number }) {
  const photo = useTex(() => petTexture(pet, false), [pet.id, pet.primary_photo_url])
  const night = useTex(() => nightTexture(), [])
  const plate = useTex(() => signTexture(pet.name, { w: 512, h: 110, bg: '#D9B44A', fg: '#3A2A12', font: '600 60px Georgia, serif' }), [pet.name])
  const slot = useTex(() => signTexture(`Floor ${pet.floor_id} · ${pet.name}'s place`, { w: 640, h: 96, bg: '#F4EFE6', fg: '#8E8278', font: '500 40px Georgia, serif' }), [pet.name, pet.floor_id])

  const glow = useRef<PointLight>(null!)
  const flames = useRef<Group>(null!)
  const bulbMats = useMemo(() => BULBS.map(c => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 })), [])
  useEffect(() => () => bulbMats.forEach(m => m.dispose()), [bulbMats])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    glow.current.intensity = candles > 0 ? 3 + Math.sin(t * 9) * 0.3 + Math.sin(t * 23) * 0.2 : 1.2
    flames.current.children.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 12 + i * 1.7) * 0.15 })
    bulbMats.forEach((m, i) => { m.emissiveIntensity = 1.4 + Math.sin(t * 2 + i * 1.3) * 0.9 })
  })

  const lit = Math.min(candles, 8)
  // Candle spots: lower shelves first, then along the floor of the cabinet
  const candleSpots: [number, number, number][] = [
    [-0.95, -0.12, 0.05], [-0.75, -0.12, 0.05], [0.75, -0.12, 0.05], [0.95, -0.12, 0.05],
    [-0.55, -0.88, 0.25], [0.55, -0.88, 0.25], [-0.3, -0.88, 0.32], [0.3, -0.88, 0.32],
  ]

  return (
    <group position={[0, 0.05, 0]}>
      {/* Wooden box */}
      <Box size={[W, H, T]} at={[0, 0, -DP / 2]} color={WOOD} />
      {[-1, 1].map(s => <Box key={s} size={[T, H, DP]} at={[s * (W / 2 - T / 2), 0, 0]} color={WOOD} />)}
      <Box size={[W + 0.12, T * 1.6, DP + 0.12]} at={[0, H / 2, 0]} color={WOOD} />
      <Box size={[W + 0.12, 0.14, DP + 0.12]} at={[0, -H / 2 - 0.07, 0]} color={WOOD} />
      <mesh position={[0, 0, -DP / 2 + T / 2 + 0.005]}>
        <planeGeometry args={[W - T * 2, H - 0.02]} />
        <meshStandardMaterial map={night} emissive="#202050" emissiveIntensity={0.3} />
      </mesh>
      <Box size={[W - T * 2, 0.05, DP - 0.05]} at={[0, -H / 2 + 0.025, 0]} color="#F3EADB" />

      {/* Gold-framed portrait */}
      <Box size={[0.98, 1.16, 0.06]} at={[0, 0.08, -DP / 2 + 0.12]} color={GOLD} metal />
      <mesh position={[0, 0.08, -DP / 2 + 0.155]}>
        <planeGeometry args={[0.82, 0.96]} />
        <meshStandardMaterial map={photo} roughness={0.5} />
      </mesh>
      {/* Brass name plate */}
      <Box size={[0.95, 0.22, 0.06]} at={[0, -0.7, -0.05]} color={GOLD} metal />
      <mesh position={[0, -0.7, -0.015]}>
        <planeGeometry args={[0.88, 0.19]} />
        <meshStandardMaterial map={plate} transparent alphaTest={0.5} />
      </mesh>

      {/* Side shelves */}
      {[-1, 1].map(s => [0.4, -0.2].map(y => <Box key={`${s}${y}`} size={[0.55, 0.03, 0.5]} at={[s * 0.85, y, -0.05]} color="#F3EADB" />))}
      <Books at={[-0.85, 0.415, -0.1]} />
      <Toys at={[0.85, 0.415, -0.05]} />
      {pet.visit_count > 20 && <Gifts at={[0.85, -0.185, -0.05]} />}
      {flowers > 0 && <Flowers at={[-0.82, -0.925, 0.12]} count={Math.min(flowers, 9)} />}
      <Lantern at={[0.85, -0.925, 0.1]} />

      {/* Candles */}
      <group ref={flames}>
        {candleSpots.slice(0, Math.max(lit, 1)).map((p, i) => <Candle key={i} at={p} lit={i < lit} />)}
      </group>
      <pointLight ref={glow} position={[0, 0.1, 0.3]} color="#FFB060" distance={4} decay={1.5} />

      {/* String lights along the top and down both sides */}
      {Array.from({ length: 19 }, (_, i) => {
        const x = -1.08 + i * 0.12
        return <Bulb key={`t${i}`} at={[x, 0.86 - Math.sin((i / 18) * Math.PI) * 0.06, 0.32]} mat={bulbMats[i % 5]} />
      })}
      {[-1, 1].map(s => Array.from({ length: 11 }, (_, i) => (
        <Bulb key={`${s}${i}`} at={[s * 1.12, 0.75 - i * 0.16, 0.32]} mat={bulbMats[(i + (s > 0 ? 2 : 0)) % 5]} />
      )))}

      <GlassDoor side={-1} />
      <GlassDoor side={1} />

      {/* Spot label under the cabinet */}
      <mesh position={[0, -H / 2 - 0.32, DP / 2 - 0.1]}>
        <planeGeometry args={[1.5, 0.22]} />
        <meshStandardMaterial map={slot} transparent alphaTest={0.5} />
      </mesh>
    </group>
  )
}

function Box({ size, at, color, metal }: { size: [number, number, number]; at: [number, number, number]; color: string; metal?: boolean }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={metal ? 0.35 : 0.8} metalness={metal ? 0.7 : 0} />
    </mesh>
  )
}

function Bulb({ at, mat }: { at: [number, number, number]; mat: MeshStandardMaterial }) {
  return (
    <mesh position={at} material={mat}>
      <sphereGeometry args={[0.022, 8, 8]} />
    </mesh>
  )
}

/** Glass door hinged on the outer edge; swings open when the shrine loads. */
function GlassDoor({ side }: { side: -1 | 1 }) {
  const hinge = useRef<Group>(null!)
  const OPEN = 1.85
  useFrame((_, dt) => {
    const want = -side * OPEN
    hinge.current.rotation.y += (want - hinge.current.rotation.y) * Math.min(1, dt * 1.8)
  })
  const w = W / 2 - 0.02
  return (
    <group ref={hinge} position={[side * (W / 2), 0, DP / 2 + 0.01]}>
      <group position={[-side * (w / 2), 0, 0]}>
        <mesh>
          <boxGeometry args={[w, H, 0.02]} />
          <meshStandardMaterial color="#E8F2F8" transparent opacity={0.22} roughness={0.05} metalness={0.2} depthWrite={false} />
        </mesh>
        {/* Metal frame */}
        {[[w, 0.04, 0, H / 2], [w, 0.04, 0, -H / 2], [0.04, H, w / 2, 0], [0.04, H, -w / 2, 0]].map(([fw, fh, x, y], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[fw, fh, 0.04]} />
            <meshStandardMaterial color="#C8CCD0" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Candle({ at, lit }: { at: [number, number, number]; lit: boolean }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.14, 12]} />
        <meshStandardMaterial color="#F5EBD8" />
      </mesh>
      {lit && (
        <mesh position={[0, 0.18, 0]} scale={[1, 1.7, 1]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#FFE08A" emissive="#FF9A2E" emissiveIntensity={4} />
        </mesh>
      )}
    </group>
  )
}

function Flowers({ at, count }: { at: [number, number, number]; count: number }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.24, 14]} />
        <meshStandardMaterial color="#DCEEF5" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        const r = i % 3 === 0 ? 0 : 0.08
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * r * 0.5, 0.3, Math.sin(a) * r * 0.5]}>
              <cylinderGeometry args={[0.006, 0.006, 0.2]} />
              <meshStandardMaterial color="#4E8A3E" />
            </mesh>
            <mesh position={[Math.cos(a) * r, 0.42 + (i % 2) * 0.05, Math.sin(a) * r]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color={['#F3B6C9', '#FFFFFF', '#F7D36B'][i % 3]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Lantern({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <Box size={[0.2, 0.03, 0.2]} at={[0, 0.015, 0]} color={GOLD} metal />
      <Box size={[0.2, 0.03, 0.2]} at={[0, 0.3, 0]} color={GOLD} metal />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <Box key={`${a}${b}`} size={[0.02, 0.3, 0.02]} at={[a * 0.09, 0.16, b * 0.09]} color={GOLD} metal />)}
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#FFE7A8" emissive="#FFB040" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <torusGeometry args={[0.05, 0.01, 6, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Books({ at }: { at: [number, number, number] }) {
  const colors = ['#8E2F2A', '#3E6B8A', '#4E7A3E', '#C9A227']
  return (
    <group position={at}>
      {colors.map((c, i) => (
        <mesh key={c} position={[-0.15 + i * 0.07, 0.11, 0]} rotation={[0, 0, i === 3 ? -0.25 : 0]}>
          <boxGeometry args={[0.06, 0.22 - (i % 2) * 0.03, 0.17]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

/** A ball and a bone, for the toy-loving. */
function Toys({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh position={[-0.1, 0.08, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#E85D4A" roughness={0.6} />
      </mesh>
      <group position={[0.12, 0.04, 0.05]} rotation={[0, 0.5, Math.PI / 2]}>
        <mesh>
          <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
          <meshStandardMaterial color="#F5EBD8" />
        </mesh>
        {[-1, 1].map(s => [-1, 1].map(t => (
          <mesh key={`${s}${t}`} position={[t * 0.025, s * 0.1, 0]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#F5EBD8" />
          </mesh>
        )))}
      </group>
    </group>
  )
}

function Gifts({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      {[[-0.1, 0.16, '#D9823B'], [0.12, 0.12, '#5EC8A0']].map(([x, s, c]) => (
        <group key={c as string} position={[x as number, (s as number) / 2, 0]}>
          <mesh>
            <boxGeometry args={[s as number, s as number, s as number]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
          <mesh>
            <boxGeometry args={[(s as number) + 0.005, (s as number) + 0.005, 0.03]} />
            <meshStandardMaterial color="#FFF4D6" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.03, (s as number) + 0.005, (s as number) + 0.005]} />
            <meshStandardMaterial color="#FFF4D6" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
