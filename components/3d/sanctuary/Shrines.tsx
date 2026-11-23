'use client'
// components/3d/sanctuary/Shrines.tsx — The real pets in the gallery cubbies.
// Every placed pet gets a frame that nearly fills its cubby, a white mat, a colour card in its species' colour and a
// candle beside it, burning once someone has lit one: all instanced, a handful of draw calls however full the galleries are.
// Only the shrines near the avatar load their real photo (each is a texture in GPU memory). Tap a frame to visit.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, type Texture } from 'three'
import type { Pet } from '@/types'
import { SPECIES_LOOK } from '@/lib/utils'
import { petTexture } from '../textures'
import { ROW_H, SLOTS, type P, type Slot } from './plan'
import { useLamp, useLampGlow } from './shared'

const NEAR = 7       // photos load only for shrines this close to the avatar…
const MAX_NEAR = 24  // …and never more than this many at once
// the frame nearly fills the cubby (the narrowest is 0.43 wide), nudged left to leave room for the candle
const FH = ROW_H - 0.05, FW = FH * 0.82, TILT = -0.1, DX = -0.035, CANDLE_X = DX + FW / 2 + 0.055
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6
const noRay = () => null

/** A soft round falloff for the glow round a lit candle. */
function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

function useTexture(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

/** The matrix for something sitting in a cubby: dx/dy/dz in the cubby's own frame (z out of the cubby). */
function placer() {
  const o = new Object3D()
  return (s: Slot, dx: number, dy: number, dz: number, tilt = TILT, scale: [number, number, number] = [1, 1, 1]) => {
    o.position.set(s.x, s.y, s.z); o.rotation.set(tilt, s.rot, 0, 'YXZ'); o.scale.set(1, 1, 1)
    o.translateX(dx); o.translateY(dy); o.translateZ(dz)
    o.scale.set(...scale)
    o.updateMatrix()
    return o.matrix
  }
}

export function GalleryShrines({ pets, playerPos, onOpen }: { pets: Pet[]; playerPos: React.RefObject<P>; onOpen: (pet: Pet, slot: Slot) => void }) {
  // a VIP pet keeps its shelf in the database but stands only in the VIP pavilion
  const placed = useMemo(() => pets.filter(p => p.vip_position == null && SLOTS[p.shrine_position]), [pets])
  const lit = useMemo(() => placed.filter(p => p.candle_count > 0), [placed])
  const refs = { frames: useRef<InstancedMesh>(null), mats: useRef<InstancedMesh>(null), cards: useRef<InstancedMesh>(null), candles: useRef<InstancedMesh>(null), flames: useRef<InstancedMesh>(null), halos: useRef<InstancedMesh>(null), hits: useRef<InstancedMesh>(null) }
  const flame = useMemo(() => new MeshStandardMaterial({ color: '#FFE0A0', emissive: '#FFB040', emissiveIntensity: 9, toneMapped: false }), [])
  const glows = useMemo((): [MeshStandardMaterial, number, number?][] => [[flame, 9, 0.45]], [flame])
  const halo = useTexture(haloTexture, [])
  useLampGlow(glows, useLamp())

  useLayoutEffect(() => {
    const at = placer(), c = new Color()
    placed.forEach((pet, i) => {
      const s = SLOTS[pet.shrine_position]
      refs.frames.current!.setMatrixAt(i, at(s, DX, -0.008, -0.02))
      refs.hits.current!.setMatrixAt(i, at(s, 0, 0, 0.12, 0))
      refs.mats.current!.setMatrixAt(i, at(s, DX, -0.008, 0.0))
      refs.cards.current!.setMatrixAt(i, at(s, DX, -0.004, 0.003))
      refs.cards.current!.setColorAt(i, c.set(SPECIES_LOOK[pet.species].to))
      refs.candles.current!.setMatrixAt(i, at(s, CANDLE_X, -ROW_H / 2 + 0.09, 0.15, 0))
    })
    lit.forEach((pet, i) => {
      const s = SLOTS[pet.shrine_position]
      refs.flames.current!.setMatrixAt(i, at(s, CANDLE_X, -ROW_H / 2 + 0.15, 0.15, 0, [1, 1.7, 1]))
      refs.halos.current!.setMatrixAt(i, at(s, CANDLE_X, -ROW_H / 2 + 0.15, 0.15, 0))
    })
    for (const r of Object.values(refs)) {
      const m = r.current
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [placed, lit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Every 0.4 s, work out which shrines are close enough to show their real photo
  const [near, setNear] = useState<Pet[]>([])
  const clock = useRef(0)
  useFrame((_, dt) => {
    clock.current += dt
    if (clock.current < 0.4) return
    clock.current = 0
    const p = playerPos.current
    if (!p) return
    const close = placed
      .map(pet => { const s = SLOTS[pet.shrine_position]; return { pet, d: Math.hypot(s.x - p.x, s.z - p.z) } })
      .filter(x => x.d < NEAR).sort((a, b) => a.d - b.d).slice(0, MAX_NEAR).map(x => x.pet)
    if (close.length !== near.length || close.some((pet, i) => pet.id !== near[i]?.id)) setNear(close)
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId == null) return
    e.stopPropagation()
    if (isTap(e)) { const pet = placed[e.instanceId]; onOpen(pet, SLOTS[pet.shrine_position]) }
  }
  const hover = (on: boolean) => () => { document.body.style.cursor = on ? 'pointer' : '' }
  const n = Math.max(1, placed.length), nl = Math.max(1, lit.length)

  return (
    <>
      {/* key: an instanced mesh's size is fixed when it's created */}
      <instancedMesh key={`f${n}`} ref={refs.frames} args={[undefined, undefined, n]} count={placed.length} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)} castShadow>
        <boxGeometry args={[FW, FH, 0.03]} />
        <meshStandardMaterial color="#5E3A1E" roughness={0.4} />
      </instancedMesh>
      {/* an invisible box filling each cubby, so a tap anywhere in it (not just on the small portrait) opens the shrine */}
      <instancedMesh key={`x${n}`} ref={refs.hits} args={[undefined, undefined, n]} count={placed.length} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <boxGeometry args={[0.42, ROW_H - 0.02, 0.36]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </instancedMesh>
      <instancedMesh key={`m${n}`} ref={refs.mats} args={[undefined, undefined, n]} count={placed.length} raycast={noRay}>
        <planeGeometry args={[FW * 0.92, FH * 0.93]} />
        <meshStandardMaterial color="#EFE6D6" roughness={0.85} />
      </instancedMesh>
      <instancedMesh key={`c${n}`} ref={refs.cards} args={[undefined, undefined, n]} count={placed.length} raycast={noRay}>
        <planeGeometry args={[FW * 0.82, FH * 0.85]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`k${n}`} ref={refs.candles} args={[undefined, undefined, n]} count={placed.length} raycast={noRay}>
        <cylinderGeometry args={[0.026, 0.026, 0.09, 12]} />
        <meshStandardMaterial color="#F8EEDC" roughness={0.6} />
      </instancedMesh>
      <instancedMesh key={`l${nl}`} ref={refs.flames} args={[undefined, undefined, nl, ]} count={lit.length} raycast={noRay} material={flame}>
        <sphereGeometry args={[0.013, 8, 6]} />
      </instancedMesh>
      {/* a soft warm glow round each lit flame */}
      <instancedMesh key={`h${nl}`} ref={refs.halos} args={[undefined, undefined, nl]} count={lit.length} raycast={noRay}>
        <planeGeometry args={[0.26, 0.26]} />
        <meshBasicMaterial map={halo} color="#FFE2A8" transparent opacity={1} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      {near.map(pet => <NearPhoto key={pet.id} pet={pet} slot={SLOTS[pet.shrine_position]} />)}
    </>
  )
}

/** The real photo, laid over a nearby shrine's colour card. */
function NearPhoto({ pet, slot }: { pet: Pet; slot: Slot }) {
  const tex = useTexture(() => petTexture(pet, false), [pet.id, pet.primary_photo_url])
  const matrix = useMemo(() => placer()(slot, DX, -0.004, 0.005), [slot])
  return (
    <mesh matrix={matrix} matrixAutoUpdate={false} raycast={noRay}>
      <planeGeometry args={[FW * 0.84, FH * 0.87]} />
      <meshStandardMaterial map={tex} roughness={0.55} />
    </mesh>
  )
}

/** A VIP pet's photo for its alcove (made once per pet, freed when it goes). */
export function useVipPhoto(pet: Pet | null) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(() => (pet ? petTexture(pet, false) : null), [pet?.id, pet?.primary_photo_url])
  useEffect(() => () => t?.dispose(), [t])
  return t
}
