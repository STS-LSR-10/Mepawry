'use client'
// components/3d/sanctuary/VipInterior.tsx — Inside the VIP pavilion: a warm conservatory lounge.
// Honey-oak panelling all round; softly lit arched alcoves holding large portraits (one with a window seat);
// glass display cabinets of keepsakes beside the openings to the wings; the middle left open under a crystal
// chandelier, on a marble mosaic medallion in the herringbone oak floor; rugs, potted and hanging ferns.
// The wings carry on the same way: five alcoves each (two at the back, two against the front glass, one with a
// window seat at the far end), a cabinet and a chandelier.

import { useMemo } from 'react'
import type { Texture } from 'three'
import type { Pet } from '@/types'
import { useVipPhoto } from './Shrines'
import {
  Chandelier, FernPot, Ferns, FlowerUrn, herringboneTexture, medallionTexture, PortraitAlcove, portraitTexture,
  Rug, rugTexture, useDecorLamps, useDecorMaterials, Vitrine, Wainscot, type DMats,
} from './decor'
import { polar, type V3 } from './shared'

import { VIP_DOME, VIP_PLANTER_R, VIP_WING } from './plan'

/** Everything inside the VIP pavilion. `y` is the terrace height, `z` the centre of the domed hall. */
/** The VIP pets in niche order (see VIP_SLOTS in plan.ts), and what to do when one is tapped. Without it: sample portraits. */
export interface VipPets { pets: (Pet | null)[]; onOpen: (k: number) => void }

/** A niche: the real pet's photo when there are real pets, otherwise a sample portrait. A pet's candle burns once
 * someone has lit one; a niche waiting for a pet stands bare. */
function Niche({ k, sample, vip, m, ...alcove }: { k: number; sample: Texture; vip?: VipPets; m: DMats; w?: number; h?: number; seat?: boolean }) {
  const real = useVipPhoto(vip?.pets[k] ?? null)
  const pet = vip?.pets[k]
  const candle = !vip ? 'lit' : !pet ? null : pet.candle_count > 0 ? 'lit' : 'unlit'
  return <PortraitAlcove m={m} photo={vip ? real : sample} onOpen={pet ? () => vip!.onOpen(k) : undefined} candle={candle} {...alcove} />
}

export function VipInterior({ y, z, vip }: { y: number; z: number; vip?: VipPets }) {
  const m = useDecorMaterials()
  useDecorLamps(m)
  const floor = useMemo(() => { const t = herringboneTexture(); t.repeat.set(4, 4); return t }, [])
  const wingFloor = useMemo(() => { const t = herringboneTexture(); t.repeat.set(2, 2); return t }, [])
  const medallion = useMemo(medallionTexture, [])
  const rugA = useMemo(() => rugTexture('#6E2A34', '#8C4A3A'), [])
  const rugB = useMemo(() => rugTexture('#5A3A2A', '#7A5A3A'), [])
  const photos = useMemo(() => Array.from({ length: 8 }, (_, i) => portraitTexture(i)), [])
  const { r, wall } = VIP_DOME
  const apothem = r * Math.cos(Math.PI / 8)
  const side = 2 * r * Math.sin(Math.PI / 8)

  // Walls: 2 is the door (+z), 0 and 4 open into the wings, 6 has the window seat, the diagonals hold alcoves
  const wallAt = (i: number, inset: number) => {
    const a = (i * Math.PI) / 4
    const [x, , zz] = polar(a, apothem - inset)
    return { pos: [x, 0, zz] as V3, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), a }
  }

  const ferns = useMemo(() => {
    const plants: { at: V3; size: number }[] = []
    const pots: V3[] = [[-3.7, 0, -1.9], [3.7, 0, -1.9], [-1.9, 0, 4.2], [1.9, 0, 4.2]]
    pots.forEach(p => plants.push({ at: [p[0], 0.44, p[2]], size: 0.7 }))
    const hanging = [0, 1, 2, 3].map(i => ({ at: polar((i / 4) * Math.PI * 2 + Math.PI / 4, 3.3, 3.5), size: 0.85 }))
    return { plants, pots, hanging }
  }, [])

  return (
    <group position={[0, y, z]}>
      {/* ── domed hall ── */}
      {/* the floor lies on the terrace's stone: pulled forward (and the medallion further) so they never flicker */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 8} position-y={0.035} receiveShadow>
        <circleGeometry args={[r - 0.05, 8]} />
        <meshStandardMaterial map={floor} roughness={0.35} envMapIntensity={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.045} receiveShadow>
        <circleGeometry args={[VIP_PLANTER_R - 0.5, 48]} />
        <meshStandardMaterial map={medallion} roughness={0.25} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
      </mesh>
      <Ferns plants={ferns.plants} hanging={ferns.hanging} />
      {ferns.pots.map((p, i) => <FernPot key={i} at={p} m={m} />)}
      {ferns.hanging.map((p, i) => <FernPot key={i} at={p.at} m={m} hanging />)}
      <Chandelier at={[0, 3.9, 0]} r={0.75} drop={wall + r - 3.9} m={m} />

      {/* walls: panelling everywhere but the door and the wing openings */}
      {[1, 3, 5, 6, 7].map(i => {
        const { pos, ry } = wallAt(i, 0.06)
        return <group key={`w${i}`} position={pos} rotation-y={ry}><Wainscot w={side - 0.3} m={m} /></group>
      })}
      {[1, 3, 5, 7].map((i, k) => {
        const { pos, ry } = wallAt(i, 0.22)
        return <group key={`a${i}`} position={pos} rotation-y={ry}><Niche k={k} m={m} sample={photos[k]} vip={vip} /></group>
      })}
      {(() => { const { pos, ry } = wallAt(6, 0.22); return <group position={pos} rotation-y={ry}><Niche k={4} m={m} sample={photos[4]} vip={vip} w={1.8} seat /></group> })()}
      {/* display cabinets either side of each wing opening */}
      {[0, 4].flatMap(i => [-1, 1].map(s => {
        const { pos, ry, a } = wallAt(i, 0.3)
        const tx = -Math.sin(a), tz = Math.cos(a)
        return <Vitrine key={`v${i}${s}`} at={[pos[0] + tx * s * 1.45, 0, pos[2] + tz * s * 1.45]} ry={ry} m={m} photo={photos[(i + s + 8) % 8]} />
      }))}
      {/* urns of flowers beside the door */}
      {[-1, 1].map(s => <FlowerUrn key={s} at={[s * 1.25, 0, apothem - 0.5]} m={m} scale={0.9} />)}

      {/* a rug at each side of the open middle */}
      {[-1, 1].map(s => <Rug key={s} at={[s * 3.5, 0.055, 1.6]} size={[1.2, 2.2]} tex={s < 0 ? rugA : rugB} ry={s * 0.5} />)}

      {/* ── the wings ── */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * VIP_WING.x, 0, 0]}>
          {/* sits on the terrace's stone: a little higher and pulled forward so the two never flicker */}
          <mesh rotation-x={-Math.PI / 2} position-y={0.035} receiveShadow>
            <planeGeometry args={[VIP_WING.w - 0.1, VIP_WING.d - 0.1]} />
            <meshStandardMaterial map={wingFloor} roughness={0.35} envMapIntensity={0.4} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
          </mesh>
          <group position={[0, 0, -VIP_WING.d / 2 + 0.06]}><Wainscot w={VIP_WING.w - 0.3} m={m} /></group>
          {[-1.5, 1.5].map((x, k) => (
            <group key={x} position={[x, 0, -VIP_WING.d / 2 + 0.22]}><Niche k={(s < 0 ? 5 : 8) + k} m={m} sample={photos[(k + 5 + (s > 0 ? 2 : 0)) % 8]} vip={vip} w={1.15} h={2.3} /></group>
          ))}
          <Vitrine at={[0, 0, -VIP_WING.d / 2 + 0.32]} ry={0} m={m} photo={photos[s > 0 ? 6 : 1]} />
          <group position={[s * (VIP_WING.w / 2 - 0.06), 0, 0]} rotation-y={-s * Math.PI / 2}><Wainscot w={VIP_WING.d - 0.3} m={m} /></group>
          <group position={[s * (VIP_WING.w / 2 - 0.22), 0, 0.2]} rotation-y={-s * Math.PI / 2}><Niche k={s < 0 ? 7 : 10} m={m} sample={photos[s > 0 ? 3 : 7]} vip={vip} w={1.3} h={2.3} seat /></group>
          {/* two more alcoves against the front glass, facing the back ones */}
          {[-1.3, 1.3].map((x, k) => (
            <group key={x} position={[x, 0, VIP_WING.d / 2 - 0.22]} rotation-y={Math.PI}><Niche k={(s < 0 ? 11 : 13) + k} m={m} sample={photos[(k + (s > 0 ? 4 : 0)) % 8]} vip={vip} w={1.15} h={2.3} /></group>
          ))}
          <Chandelier at={[0, 3.0, 0]} r={0.45} drop={0.35} m={m} light={14} />
        </group>
      ))}
    </group>
  )
}
