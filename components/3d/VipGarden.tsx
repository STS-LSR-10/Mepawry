'use client'
// components/3d/VipGarden.tsx — The VIP Garden on every floor: two cream arcades with big arched niches on both
// faces, crowned with flowers and trailing vines, fairy lights around each arch, hanging lanterns, paw-print
// planters and petals on the floor. A VIP pet's portrait fills its niche; empty niches wait with a small plaque.
// Everything repeated is instanced, so the room costs a handful of draw calls plus one per occupied niche.

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, Color, MeshStandardMaterial, Object3D, type InstancedMesh, type Texture } from 'three'
import { ROOMS, VIP_ARCADES, VIP_NICHE_W, VIP_SLOTS, type P, type VipSlot } from './layout'
import { glowTexture, petTexture, plaqueTexture } from './textures'
import { avatarShade, microMap, withRim } from './look'
import type { Pet } from '@/types'

const H = 3.1                 // arcade height
const ARCH_R = VIP_NICHE_W / 2 - 0.13
const ARCH_Y = H - 0.4 - ARCH_R // arch springs here, so its crown sits just under the top beam
const CREAM = '#F1E4CC'
const FLOWERS = ['#F7B6C8', '#F9D0DC', '#FFFFFF', '#CDB8F0', '#FBE38A', '#FFC9A8', '#E99AB8']
const noRay = () => null
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6

function useTex(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

/** Cheap seeded random, so the flowers grow the same on every visit. */
const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

export function VipGarden({ floor, pets, glow, onOpen, onFloor }: {
  floor: number
  pets: Pet[]
  glow: number
  onOpen: (pet: Pet, slot: VipSlot) => void
  onFloor: (p: P) => void
}) {
  const vip = useMemo(() => new Map(pets.filter(p => p.vip_position != null).map(p => [p.vip_position!, p])), [pets])
  const room = ROOMS.find(r => r.id === 'vip')!.rect
  const body = useMemo(() => withRim(new MeshStandardMaterial({ color: CREAM, roughness: 0.85, bumpMap: microMap('fuzz'), bumpScale: 0.4 }), 0.6), [])
  useEffect(() => { body.emissive.set('#FFB06A'); body.emissiveIntensity = glow * 0.9 }, [body, glow])
  useEffect(() => () => body.dispose(), [body])

  // Tapping the arcade itself walks you to the nearest niche's floor spot
  const tapArcade = (e: ThreeEvent<MouseEvent>) => {
    if (!isTap(e)) return
    e.stopPropagation()
    let best = VIP_SLOTS[0], d = Infinity
    for (const s of VIP_SLOTS) { const dd = Math.hypot(s.x - e.point.x, s.z - e.point.z); if (dd < d) { d = dd; best = s } }
    const pet = vip.get(VIP_SLOTS.indexOf(best))
    if (pet) onOpen(pet, best)
    else onFloor(best.standAt)
  }

  return (
    <group>
      {VIP_ARCADES.map((a, i) => <Arcade key={i} a={a} mat={body} onTap={tapArcade} />)}
      <ArchLights />
      <Greenery />
      <Petals x0={room.x0} x1={room.x1} z0={room.z0} z1={room.z1} />
      <Lanterns />
      <PawPlanters />
      <Niches vip={vip} onOpen={onOpen} />
      <GardenSign floor={floor} />
    </group>
  )
}

/** One arcade: plinth, top beam, a spine down the middle, pillars between niches, an arch over each niche. */
function Arcade({ a, mat, onTap }: { a: typeof VIP_ARCADES[number]; mat: MeshStandardMaterial; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const L = a.z1 - a.z0, cz = (a.z0 + a.z1) / 2
  const n = Math.floor(L / VIP_NICHE_W)
  return (
    <group onClick={onTap}>
      <mesh position={[a.x, 0.1, cz]} material={mat} castShadow receiveShadow><boxGeometry args={[a.depth + 0.15, 0.2, L + 0.3]} /></mesh>
      <mesh position={[a.x, H - 0.18, cz]} material={mat} castShadow><boxGeometry args={[a.depth + 0.2, 0.36, L + 0.4]} /></mesh>
      <mesh position={[a.x, H / 2, cz]} material={mat}><boxGeometry args={[0.16, H, L]} /></mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[a.x, H / 2, a.z1 - i * VIP_NICHE_W]} material={mat} castShadow>
          <boxGeometry args={[a.depth, H, 0.26]} />
        </mesh>
      ))}
      {/* arched heads of the niches, on both faces */}
      {([-1, 1] as const).map(dir => Array.from({ length: n }, (_, i) => (
        <mesh key={`${dir}${i}`} position={[a.x + dir * (a.depth / 2 - 0.02), ARCH_Y, a.z1 - VIP_NICHE_W * (i + 0.5)]} rotation={[0, Math.PI / 2, 0]} material={mat} raycast={noRay}>
          <torusGeometry args={[VIP_NICHE_W / 2 - 0.13, 0.11, 8, 20, Math.PI]} />
        </mesh>
      )))}
    </group>
  )
}

/** The contents of each niche: a warm back panel, two little shelves, and the pet's portrait (or a plaque). */
function Niches({ vip, onOpen }: { vip: Map<number, Pet>; onOpen: (pet: Pet, slot: VipSlot) => void }) {
  const reserved = useTex(() => plaqueTexture('Reserved · VIP', 'wood', 512, 128), [])
  const shelfRef = useRef<InstancedMesh>(null!)
  const backRef = useRef<InstancedMesh>(null!)
  useLayoutEffect(() => {
    const o = new Object3D()
    let k = 0
    VIP_SLOTS.forEach((s, i) => {
      const out = Math.sign(s.x - VIP_ARCADES[s.x < 22.4 ? 0 : 1].x)
      // glowing back panel
      o.position.set(s.x - out * 0.56, 1.45, s.z); o.rotation.set(0, s.rot, 0); o.scale.set(VIP_NICHE_W - 0.3, 2.6, 1); o.updateMatrix()
      backRef.current.setMatrixAt(i, o.matrix)
      for (const y of [0.6, 1.0]) {
        o.position.set(s.x - out * 0.3, y, s.z); o.rotation.set(0, s.rot, 0); o.scale.set(VIP_NICHE_W - 0.35, 0.05, 0.5); o.updateMatrix()
        shelfRef.current.setMatrixAt(k++, o.matrix)
      }
    })
    backRef.current.instanceMatrix.needsUpdate = true
    shelfRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <instancedMesh ref={backRef} args={[undefined, undefined, VIP_SLOTS.length]} raycast={noRay}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#FFE9C9" emissive="#FFC78A" emissiveIntensity={0.55} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={shelfRef} args={[undefined, undefined, VIP_SLOTS.length * 2]} raycast={noRay}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#E8D6B8" roughness={0.8} onBeforeCompile={avatarShade} />
      </instancedMesh>
      {VIP_SLOTS.map((s, i) => {
        const pet = vip.get(i)
        const out = Math.sign(s.x - VIP_ARCADES[s.x < 22.4 ? 0 : 1].x)
        return pet
          ? <Portrait key={i} pet={pet} slot={s} out={out} onOpen={() => onOpen(pet, s)} />
          : (
            <mesh key={i} position={[s.x - out * 0.45, 1.75, s.z]} rotation={[0, s.rot, 0]} raycast={noRay}>
              <planeGeometry args={[0.9, 0.23]} />
              <meshStandardMaterial map={reserved} transparent alphaTest={0.5} />
            </mesh>
          )
      })}
    </group>
  )
}

/** A VIP pet's big gold-framed portrait with its name, filling the niche. */
function Portrait({ pet, slot, out, onOpen }: { pet: Pet; slot: VipSlot; out: number; onOpen: () => void }) {
  const tex = useTex(() => petTexture(pet, true), [pet.id, pet.primary_photo_url])
  const click = (e: ThreeEvent<MouseEvent>) => { if (isTap(e)) { e.stopPropagation(); onOpen() } }
  return (
    <group position={[slot.x - out * 0.42, 1.75, slot.z]} rotation={[0, slot.rot, 0]} onClick={click}>
      <mesh castShadow><boxGeometry args={[1.12, 1.4, 0.06]} /><meshStandardMaterial color="#C9A227" metalness={0.7} roughness={0.3} emissive="#5A3A00" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, 0, 0.035]}><planeGeometry args={[0.98, 1.26]} /><meshStandardMaterial map={tex} roughness={0.6} emissive="#FFFFFF" emissiveMap={tex} emissiveIntensity={0.18} /></mesh>
    </group>
  )
}

/** Warm fairy lights following every arch (one instanced draw call), twinkling gently. */
function ArchLights() {
  const ref = useRef<InstancedMesh>(null!)
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#FFF4D6', emissive: '#FFD58A', emissiveIntensity: 2.4, toneMapped: false }), [])
  useEffect(() => () => mat.dispose(), [mat])
  const count = VIP_SLOTS.length * 11
  useLayoutEffect(() => {
    const o = new Object3D()
    let k = 0
    VIP_SLOTS.forEach(s => {
      const out = Math.sign(s.x - VIP_ARCADES[s.x < 22.4 ? 0 : 1].x)
      const r = ARCH_R
      for (let j = 0; j <= 10; j++) {
        const t = Math.PI * (j / 10)
        o.position.set(s.x + out * 0.16, ARCH_Y + Math.sin(t) * (r - 0.02), s.z + Math.cos(t) * (r - 0.02)) // just in front of the arch
        o.scale.setScalar(1); o.updateMatrix()
        ref.current.setMatrixAt(k++, o.matrix)
      }
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  useFrame(({ clock }) => { mat.emissiveIntensity = 2.1 + Math.sin(clock.elapsedTime * 1.7) * 0.35 })
  return (
    <instancedMesh ref={ref} args={[undefined, mat, count]} raycast={noRay}>
      <sphereGeometry args={[0.035, 6, 6]} />
    </instancedMesh>
  )
}

/** Flowers and leaves over the tops of the arcades, with vines trailing down the pillars (instanced). */
function Greenery() {
  const flowers = useRef<InstancedMesh>(null!)
  const leaves = useRef<InstancedMesh>(null!)
  const fMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.7 }), [])
  const lMat = useMemo(() => new MeshStandardMaterial({ color: '#5E8E48', roughness: 0.8 }), [])
  useEffect(() => { fMat.onBeforeCompile = avatarShade; lMat.onBeforeCompile = avatarShade; return () => { fMat.dispose(); lMat.dispose() } }, [fMat, lMat])
  const NF = 520, NL = 700
  useLayoutEffect(() => {
    const r = rand(42), o = new Object3D(), c = new Color()
    let fi = 0, li = 0
    for (const a of VIP_ARCADES) {
      const L = a.z1 - a.z0
      // crown along the top
      // Flowers bunch along the two long edges and spill over them, like climbing roses
      for (let i = 0; i < NF / 2 && fi < NF; i++) {
        const side = r() < 0.5 ? -1 : 1, spill = r()
        o.position.set(a.x + side * (a.depth / 2 + 0.02 + spill * 0.12 - 0.15 * r()), H + 0.06 - spill * 0.22 + r() * 0.08, a.z0 + r() * L)
        o.rotation.set(r() * 0.6, r() * 6, r() * 0.6); o.scale.set(1, 0.55, 1).multiplyScalar(0.8 + r() * 0.9); o.updateMatrix()
        flowers.current.setMatrixAt(fi, o.matrix); flowers.current.setColorAt(fi++, c.set(FLOWERS[Math.floor(r() * FLOWERS.length)]))
      }
      for (let i = 0; i < NL / 4; i++) {
        o.position.set(a.x + (r() - 0.5) * (a.depth + 0.35), H - 0.02 + r() * 0.12, a.z0 + r() * L)
        o.rotation.set(r() * 3, r() * 6, r() * 3); o.scale.set(1, 0.3, 0.6).multiplyScalar(0.8 + r() * 0.6); o.updateMatrix()
        leaves.current.setMatrixAt(li++, o.matrix)
      }
      // vines trailing down every pillar face
      const n = Math.floor(L / VIP_NICHE_W)
      for (let p = 0; p <= n; p++) for (const dir of [-1, 1]) {
        const z = a.z1 - p * VIP_NICHE_W, len = 1.2 + r() * 1.3
        for (let k = 0; k < 7 && li < NL; k++) {
          const t = k / 6
          o.position.set(a.x + dir * (a.depth / 2 + 0.05), H - 0.1 - t * len, z + Math.sin(t * 6 + p) * 0.12)
          o.rotation.set(r() * 2, r() * 6, r() * 2); o.scale.set(0.8, 0.28, 0.5).multiplyScalar(0.7 + r() * 0.4); o.updateMatrix()
          leaves.current.setMatrixAt(li++, o.matrix)
          if (k % 3 === 1 && fi < NF) {
            o.scale.set(0.7, 0.5, 0.7); o.updateMatrix()
            flowers.current.setMatrixAt(fi, o.matrix); flowers.current.setColorAt(fi++, c.set(FLOWERS[Math.floor(r() * FLOWERS.length)]))
          }
        }
      }
    }
    flowers.current.count = fi; leaves.current.count = li
    for (const m of [flowers.current, leaves.current]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere() }
  }, [])
  return (
    <>
      <instancedMesh ref={flowers} args={[undefined, fMat, NF]} raycast={noRay}><icosahedronGeometry args={[0.075, 1]} /></instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, lMat, NL]} raycast={noRay}><sphereGeometry args={[0.07, 6, 5]} /></instancedMesh>
    </>
  )
}

/** Pink petals drifted across the floor (instanced). */
function Petals({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const ref = useRef<InstancedMesh>(null!)
  const N = 160
  useLayoutEffect(() => {
    const r = rand(7), o = new Object3D(), c = new Color()
    for (let i = 0; i < N; i++) {
      o.position.set(x0 + 0.4 + r() * (x1 - x0 - 0.8), 0.015, z0 + 0.4 + r() * (z1 - z0 - 0.8))
      o.rotation.set(-Math.PI / 2, 0, r() * 6); o.scale.set(1, 0.6 + r() * 0.4, 1); o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix); ref.current.setColorAt(i, c.set(r() > 0.3 ? '#F4A9BE' : '#FBD3DE'))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [x0, x1, z0, z1])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} raycast={noRay}>
      <circleGeometry args={[0.09, 7]} />
      <meshStandardMaterial roughness={0.9} onBeforeCompile={avatarShade} />
    </instancedMesh>
  )
}

/** Brass lanterns hanging at the ends of each arcade, glowing. */
function Lanterns() {
  const glow = useTex(() => glowTexture(), [])
  const spots = VIP_ARCADES.flatMap(a => [[a.x, a.z0 - 0.35], [a.x, a.z1 + 0.35]] as [number, number][])
  return (
    <>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, H - 0.55, z]}>
          <mesh raycast={noRay}><boxGeometry args={[0.26, 0.34, 0.26]} /><meshStandardMaterial color="#FFE2A8" emissive="#FFB060" emissiveIntensity={2.6} toneMapped={false} /></mesh>
          <mesh position={[0, 0.22, 0]} raycast={noRay}><coneGeometry args={[0.22, 0.14, 4]} /><meshStandardMaterial color="#B98A3C" metalness={0.8} roughness={0.35} /></mesh>
          <mesh position={[0, 0.4, 0]} raycast={noRay}><cylinderGeometry args={[0.01, 0.01, 0.3]} /><meshStandardMaterial color="#5A4630" /></mesh>
          <sprite scale={[1.6, 1.6, 1]}>
            <spriteMaterial map={glow} color="#FFB868" transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

/** Pink paw-print planters with succulents and a flowering cactus, along the walls. */
function PawPlanters() {
  const room = ROOMS.find(r => r.id === 'vip')!.rect
  const spots: [number, number][] = [[room.x0 + 0.55, -33], [room.x0 + 0.55, -40], [room.x0 + 0.55, -46], [room.x1 - 0.55, -33], [room.x1 - 0.55, -40], [room.x1 - 0.55, -46]]
  return (
    <>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.22, 0]} castShadow raycast={noRay}><cylinderGeometry args={[0.28, 0.22, 0.44, 16]} /><meshStandardMaterial color="#F6CFD6" roughness={0.6} onBeforeCompile={avatarShade} /></mesh>
          {/* paw print on the pot */}
          <group position={[x < 22 ? 0.27 : -0.27, 0.24, 0]} rotation={[0, x < 22 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <mesh scale={[1, 0.85, 0.3]} raycast={noRay}><sphereGeometry args={[0.06, 10, 8]} /><meshStandardMaterial color="#D97A90" /></mesh>
            {[[-0.07, 0.07], [-0.025, 0.1], [0.025, 0.1], [0.07, 0.07]].map(([px, py], k) => (
              <mesh key={k} position={[px, py, 0]} scale={[1, 1, 0.3]} raycast={noRay}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color="#D97A90" /></mesh>
            ))}
          </group>
          {i % 2 === 0 ? (
            // succulent: a rosette of fat leaves
            Array.from({ length: 8 }, (_, k) => (
              <mesh key={k} position={[Math.cos(k * 0.8) * 0.08, 0.55, Math.sin(k * 0.8) * 0.08]} rotation={[Math.cos(k * 0.8) * 0.7, 0, -Math.sin(k * 0.8) * 0.7]} raycast={noRay}>
                <coneGeometry args={[0.07, 0.38, 6]} /><meshStandardMaterial color="#6E9E5A" roughness={0.7} onBeforeCompile={avatarShade} />
              </mesh>
            ))
          ) : (
            <>
              <mesh position={[0, 0.62, 0]} scale={[1, 1.15, 1]} raycast={noRay}><sphereGeometry args={[0.2, 14, 12]} /><meshStandardMaterial color="#7FAF66" roughness={0.75} onBeforeCompile={avatarShade} /></mesh>
              {[0, 2.1, 4.2].map(t => (
                <mesh key={t} position={[Math.cos(t) * 0.16, 0.74, Math.sin(t) * 0.16]} raycast={noRay}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color={['#F7B6C8', '#FFFFFF', '#FBE38A'][Math.round(t / 2.1)]} /></mesh>
              ))}
            </>
          )}
        </group>
      ))}
    </>
  )
}

/** Big wooden sign at the garden's entrance. */
function GardenSign({ floor }: { floor: number }) {
  const tex = useTex(() => plaqueTexture(`✿ VIP Garden · Floor ${floor} ✿`, 'wood', 900, 160), [floor])
  return (
    <group position={[22, 3.5, -29.4]}>
      <mesh raycast={noRay}><boxGeometry args={[3.7, 0.68, 0.08]} /><meshStandardMaterial color="#6B4A33" roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.045]} raycast={noRay}><planeGeometry args={[3.6, 0.62]} /><meshStandardMaterial map={tex} transparent alphaTest={0.5} emissive="#FFFFFF" emissiveMap={tex} emissiveIntensity={0.15} /></mesh>
      <mesh position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]} raycast={noRay}><planeGeometry args={[3.6, 0.62]} /><meshStandardMaterial map={tex} transparent alphaTest={0.5} /></mesh>
    </group>
  )
}
