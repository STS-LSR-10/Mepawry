'use client'
// components/3d/Hall.tsx — One floor of the memorial building: a lobby with stairs and an elevator,
// corridors with lamps and paintings, and three library galleries of shrine shelves. Laid out from layout.ts.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, Object3D, Vector3, type InstancedMesh, type Mesh, type Texture } from 'three'
import {
  CORRIDORS, ELEVATOR_X, FLOOR_COUNT, GALLERIES, HUB, LEVEL_HEIGHT, ROOMS, SHELF, SLOTS, STAIRS_DOWN, STAIRS_UP,
  WALL_T, furniture, wallRects, type P, type Rect, type Slot,
} from './layout'
import { FurniturePiece } from './Furniture'
import { floorTexture, nightTexture, petTexture, roofTileTexture, signTexture, stoneWallTexture } from './textures'
import { getFloorName, SPECIES_LOOK } from '@/lib/utils'
import type { Quality } from './quality'
import type { Pet } from '@/types'

const H = 5.5          // full wall height (seen from outside)
const CUT = 2.6        // walls are cut down to this inside, so the camera can see over them
const WOOD = '#6B4A33'
const DARK_WOOD = '#4A2F1E'

// A drag to look around also ends in a click; ignore those
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6
const noRay = () => null

/** Makes a texture once and frees its GPU memory when the component goes away. */
function useTexture(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

const size = (r: Rect) => ({ w: r.x1 - r.x0, d: r.z1 - r.z0, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2 })

interface HallProps {
  floor: number
  playerPos: React.RefObject<P>
  quality: Quality
  pets: Pet[]
  inside: boolean
  onFloor: (p: P) => void
  onShrine: (pet: Pet, standAt: P, face: P) => void
  onStairs: (dir: 'up' | 'down') => void
  onElevator: () => void
}

export function Hall({ floor, playerPos, quality, pets, inside, onFloor, onShrine, onStairs, onElevator }: HallProps) {
  const ground = floor === 1
  const floorTap = (e: ThreeEvent<MouseEvent>) => { if (isTap(e)) { e.stopPropagation(); onFloor({ x: e.point.x, z: e.point.z }) } }
  const placed = pets.filter(p => p.shrine_position < SLOTS.length)
  const perRoom = (room: string) => placed.filter(p => SLOTS[p.shrine_position].room === room).length

  return (
    <group position={[0, -0.5, 0]}>
      <Walls ground={ground} inside={inside} />
      {!inside && ground && <Roofs />}
      {!ground && <Foundations floor={floor} />}
      <Floors onTap={floorTap} hole={ground ? null : STAIRS_DOWN} />
      {quality === 'high' && <Lights />}

      {ground ? <Entrance onTap={floorTap} lit={quality === 'high'} /> : <Window />}
      <UpStairs floor={floor} onUse={() => onStairs('up')} />
      <DownStairs floor={floor} onUse={() => onStairs('down')} />
      <Elevator floor={floor} onUse={onElevator} />

      {/* Signs: floor name over the north corridor, gallery names over each corridor mouth.
          Hung above the camera's usual height so they don't block the view as you walk under them. */}
      <Sign text={`Floor ${floor} · ${getFloorName(floor)}`} at={[0, 4.5, HUB.z0 + 0.3]} w={3.4} />
      <Sign text={`← West Gallery · ${perRoom('west')}`} at={[HUB.x0 + 0.3, 4.3, -15]} rot={Math.PI / 2} w={3} />
      <Sign text={`East Gallery · ${perRoom('east')} →`} at={[HUB.x1 - 0.3, 4.3, -15]} rot={-Math.PI / 2} w={3} />
      <Sign text={`North Library · ${perRoom('north')} ↑`} at={[0, 4.3, -31.3]} w={3.4} />

      {furniture(ground).map((it, i) => <FurniturePiece key={i} it={it} featured={placed[0]} />)}
      <CorridorDecor />

      {/* Tapping a shelf next to a shrine opens that shrine (small targets on a phone);
          anywhere else on the shelf walks you to the open floor on that side of it */}
      <Bookcases onTap={e => {
        if (!isTap(e)) return
        const hit = nearestShrine(placed, e.point)
        if (hit) { e.stopPropagation(); const slot = SLOTS[hit.shrine_position]; onShrine(hit, slot.standAt, slot) }
        else floorTap(e)
      }} />
      <ShelfFrames pets={placed} playerPos={playerPos} onOpen={pet => { const slot = SLOTS[pet.shrine_position]; onShrine(pet, slot.standAt, slot) }} />
    </group>
  )
}

// ── Structure ──

function Walls({ ground, inside }: { ground: boolean; inside: boolean }) {
  const h = inside ? CUT : H
  const stop = (e: ThreeEvent<MouseEvent>) => e.stopPropagation() // walls aren't walkable
  const stone = useTexture(() => stoneWallTexture(), [])
  return (
    <group onClick={stop}>
      {wallRects(ground).map((r, i) => {
        const s = size(r)
        return (
          <group key={i}>
            {/* Outside: cut stone. Inside (cut down so the camera sees over): warm wood */}
            {inside ? (
              <mesh position={[s.cx, h / 2, s.cz]} castShadow receiveShadow>
                <boxGeometry args={[s.w, h, s.d]} />
                <meshStandardMaterial color={WOOD} roughness={0.9} />
              </mesh>
            ) : (
              <StoneWall tex={stone} at={[s.cx, h / 2, s.cz]} size={[s.w, h, s.d]} />
            )}
            {/* Cap rail on the cut-down walls */}
            {inside && (
              <mesh position={[s.cx, h + 0.04, s.cz]} raycast={noRay}>
                <boxGeometry args={[s.w + 0.06, 0.08, s.d + 0.06]} />
                <meshStandardMaterial color={DARK_WOOD} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

/** One outside wall in stone; each gets its own copy of the texture so the blocks stay the same size. */
function StoneWall({ tex, at, size: [w, h, d] }: { tex: Texture; at: [number, number, number]; size: [number, number, number] }) {
  const t = useMemo(() => { const c = tex.clone(); c.repeat.set(Math.max(w, d) / 3, h / 2.2); c.needsUpdate = true; return c }, [tex, w, h, d])
  useEffect(() => () => t.dispose(), [t])
  return (
    <group>
      <mesh position={at} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={t} roughness={0.92} />
      </mesh>
      {/* darker plinth along the foot of the wall */}
      <mesh position={[at[0], 0.2, at[2]]} raycast={noRay}>
        <boxGeometry args={[w + 0.08, 0.4, d + 0.08]} />
        <meshStandardMaterial color="#6E6559" roughness={1} />
      </mesh>
    </group>
  )
}

function Roofs() {
  const stop = (e: ThreeEvent<MouseEvent>) => e.stopPropagation()
  const tiles = useTexture(() => { const t = roofTileTexture(); t.repeat.set(6, 3); return t }, [])
  return (
    <group onClick={stop}>
      {[...ROOMS.map(r => r.rect), ...CORRIDORS.map(c => c.rect)].map((r, i) => {
        const s = size(r)
        return (
          <mesh key={i} position={[s.cx, H + 0.15, s.cz]} castShadow>
            <boxGeometry args={[s.w + WALL_T * 2 + 0.3, 0.3, s.d + WALL_T * 2 + 0.3]} />
            <meshStandardMaterial color="#4A4440" roughness={0.95} />
          </mesh>
        )
      })}
      {/* Pitched roof over the lobby */}
      <mesh position={[0, H + 1.9, size(HUB).cz]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[(size(HUB).w / 2) * Math.SQRT2 + 0.6, 3.4, 4]} />
        <meshStandardMaterial map={tiles} roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

/** On upper floors, the storeys below, down to the ground. */
function Foundations({ floor }: { floor: number }) {
  const depth = (floor - 1) * LEVEL_HEIGHT
  return (
    <>
      {[...ROOMS.map(r => r.rect), ...CORRIDORS.map(c => c.rect)].map((r, i) => {
        const s = size(r)
        return (
          <mesh key={i} position={[s.cx, -depth / 2 - 0.05, s.cz]} raycast={noRay}>
            <boxGeometry args={[s.w + WALL_T * 2, depth, s.d + WALL_T * 2]} />
            <meshStandardMaterial color="#5A3E2B" roughness={1} />
          </mesh>
        )
      })}
    </>
  )
}

/** Floor surfaces; the lobby floor has a gap where the stairs go down (not on the ground floor). */
function Floors({ onTap, hole }: { onTap: (e: ThreeEvent<MouseEvent>) => void; hole: Rect | null }) {
  const tex = {
    tiles: useTexture(() => floorTexture('tiles', [1, 1]), []),
    planks: useTexture(() => floorTexture('planks', [1, 1]), []),
  }
  const pieces = (r: Rect): Rect[] => {
    if (!hole) return [r]
    return [
      { ...r, z1: hole.z0 > r.z0 ? hole.z0 : r.z0 },                 // north of the gap
      { ...r, z0: hole.z1 },                                          // south of the gap
      { x0: r.x0, z0: hole.z0, x1: hole.x0, z1: hole.z1 },            // west of the gap
      { x0: hole.x1, z0: hole.z0, x1: r.x1, z1: hole.z1 },            // east of the gap
    ].filter(p => p.x1 - p.x0 > 0.01 && p.z1 - p.z0 > 0.01)
  }
  return (
    <>
      {ROOMS.map(rm => (rm.id === 'hub' ? pieces(rm.rect) : [rm.rect]).map((r, i) => {
        const s = size(r)
        const t = tex[rm.floor]
        return <FloorPlane key={`${rm.id}${i}`} r={r} tex={t} repeat={rm.floor === 'tiles' ? [s.w / 2, s.d / 2] : [s.w / 4, s.d / 4]} onTap={onTap} />
      }))}
      {CORRIDORS.map(c => (
        <group key={c.id}>
          <FloorPlane r={c.rect} tex={tex.planks} repeat={[size(c.rect).w / 4, size(c.rect).d / 4]} onTap={onTap} />
          {/* Runner */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[size(c.rect).cx, 0.02, size(c.rect).cz]} raycast={noRay}>
            <planeGeometry args={c.axis === 'x' ? [size(c.rect).w, 1.4] : [1.4, size(c.rect).d]} />
            <meshStandardMaterial color="#8E2F2A" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Runner down the centre of the North Library */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -41]} raycast={noRay}>
        <planeGeometry args={[1.8, 19]} />
        <meshStandardMaterial color="#8E2F2A" roughness={1} />
      </mesh>
    </>
  )
}

function FloorPlane({ r, tex, repeat, onTap }: { r: Rect; tex: Texture; repeat: [number, number]; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const s = size(r)
  // Each plane needs its own repeat, so it gets its own copy of the texture (sharing the image)
  const t = useMemo(() => { const c = tex.clone(); c.repeat.set(repeat[0], repeat[1]); c.needsUpdate = true; return c }, [tex, repeat[0], repeat[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => t.dispose(), [t])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s.cx, 0.01, s.cz]} receiveShadow onClick={onTap}>
      <planeGeometry args={[s.w, s.d]} />
      <meshStandardMaterial map={t} roughness={0.75} />
    </mesh>
  )
}

/** Warm ceiling lights, desktop only. Phones get the same mood from the hemisphere light and glowing lamps. */
function Lights() {
  return (
    <>
      {[[0, -14], [-22, -15], [22, -15], [0, -41]].map(([x, z]) => (
        <pointLight key={`${x},${z}`} position={[x, 4.4, z]} intensity={7} color="#FFB870" distance={17} decay={1.3} />
      ))}
    </>
  )
}

// ── Entrance (ground floor) / window (upper floors) ──

function Entrance({ onTap, lit }: { onTap: (e: ThreeEvent<MouseEvent>) => void; lit: boolean }) {
  const z = HUB.z1 + WALL_T
  return (
    <>
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[s * 1.9, 1.8, z + 0.1]}>
            <boxGeometry args={[0.3, 3.6, 0.3]} />
            <meshStandardMaterial color="#8A5A2B" />
          </mesh>
          <mesh position={[s * 2.65, 3, z + 0.35]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshStandardMaterial color="#FF6B35" emissive="#FF4500" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.75, z + 0.1]}>
        <boxGeometry args={[4.1, 0.3, 0.3]} />
        <meshStandardMaterial color="#8A5A2B" />
      </mesh>
      {lit && <pointLight position={[0, 3, HUB.z1 + 1.5]} intensity={4} color="#FF8C42" distance={8} decay={1.5} />}
      {/* Hedges closing the courtyards between the lobby and the side galleries */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 12, 0.5, HUB.z1 - 0.4]} raycast={noRay} castShadow>
          <boxGeometry args={[6, 1, 0.8]} />
          <meshStandardMaterial color="#3F6B35" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

/** Upper floors: a glowing window panel where the entrance would be. */
function Window() {
  const sky = useTexture(() => nightTexture(), [])
  return (
    <mesh position={[0, 1.6, HUB.z1 - 0.02]} rotation={[0, Math.PI, 0]} raycast={noRay}>
      <planeGeometry args={[5, 1.8]} />
      <meshStandardMaterial map={sky} emissive="#334" emissiveIntensity={0.5} />
    </mesh>
  )
}

// ── Getting between floors ──

const STEPS = 10

function UpStairs({ floor, onUse }: { floor: number; onUse: () => void }) {
  const s = size(STAIRS_UP)
  const top = floor >= FLOOR_COUNT
  const rise = 0.42, run = s.d / STEPS
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTap(e) && !top) onUse() }
  return (
    <group onClick={click} onPointerOver={() => { if (!top) document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {Array.from({ length: STEPS }, (_, k) => (
        <mesh key={k} position={[s.cx, ((k + 1) * rise) / 2, STAIRS_UP.z1 - run * (k + 0.5)]} castShadow receiveShadow>
          <boxGeometry args={[s.w, (k + 1) * rise, run]} />
          <meshStandardMaterial color={k % 2 ? '#8A6042' : '#7A5236'} roughness={0.8} />
        </mesh>
      ))}
      <Railing from={[STAIRS_UP.x0 - 0.05, STAIRS_UP.z1]} to={[STAIRS_UP.x0 - 0.05, STAIRS_UP.z0]} y0={1} y1={1 + STEPS * rise} />
      <Sign text={top ? 'Top floor' : `▲ Up to floor ${floor + 1}`} at={[s.cx, 2.5, STAIRS_UP.z1 + 0.1]} w={2.2} small />
    </group>
  )
}

function DownStairs({ floor, onUse }: { floor: number; onUse: () => void }) {
  const s = size(STAIRS_DOWN)
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTap(e)) onUse() }
  if (floor === 1) {
    // Ground floor: no way down, a planter fills the spot
    return (
      <group>
        <mesh position={[s.cx, 0.3, s.cz]} castShadow>
          <boxGeometry args={[s.w, 0.6, s.d]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
        {[-1.5, 0, 1.5].map(dz => (
          <mesh key={dz} position={[s.cx, 1, s.cz + dz]} castShadow>
            <icosahedronGeometry args={[0.6, 1]} />
            <meshStandardMaterial color="#4E8A3E" flatShading />
          </mesh>
        ))}
      </group>
    )
  }
  const drop = 0.42, run = s.d / STEPS
  return (
    <group onClick={click} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {/* Dark shaft and the steps going down into it */}
      <mesh position={[s.cx, -2.2, s.cz]}>
        <boxGeometry args={[s.w, 4.4, s.d]} />
        <meshStandardMaterial color="#1E140E" side={1} />
      </mesh>
      {Array.from({ length: STEPS }, (_, k) => (
        <mesh key={k} position={[s.cx, -(k + 1) * drop + 0.05, STAIRS_DOWN.z1 - run * (k + 0.5)]}>
          <boxGeometry args={[s.w - 0.02, 0.1, run]} />
          <meshStandardMaterial color={k % 2 ? '#8A6042' : '#7A5236'} />
        </mesh>
      ))}
      <Railing from={[STAIRS_DOWN.x0, STAIRS_DOWN.z1]} to={[STAIRS_DOWN.x0, STAIRS_DOWN.z0]} y0={1} y1={1} />
      <Railing from={[STAIRS_DOWN.x1, STAIRS_DOWN.z1]} to={[STAIRS_DOWN.x1, STAIRS_DOWN.z0]} y0={1} y1={1} />
      <Sign text={`▼ Down to floor ${floor - 1}`} at={[s.cx, 1.9, STAIRS_DOWN.z1 + 0.1]} w={2.2} small />
    </group>
  )
}

function Railing({ from, to, y0, y1 }: { from: [number, number]; to: [number, number]; y0: number; y1: number }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const posts = Math.max(2, Math.round(len / 1.2) + 1)
  const slope = Math.atan2(y1 - y0, len)
  return (
    <>
      {Array.from({ length: posts }, (_, i) => {
        const k = i / (posts - 1)
        const y = y0 + (y1 - y0) * k
        return (
          <mesh key={i} position={[from[0] + (to[0] - from[0]) * k, y / 2, from[1] + (to[1] - from[1]) * k]}>
            <boxGeometry args={[0.05, y, 0.05]} />
            <meshStandardMaterial color="#2A1E14" />
          </mesh>
        )
      })}
      <mesh position={[(from[0] + to[0]) / 2, (y0 + y1) / 2, (from[1] + to[1]) / 2]} rotation={[slope, 0, 0]}>
        <boxGeometry args={[0.07, 0.07, Math.hypot(len, y1 - y0)]} />
        <meshStandardMaterial color="#8A5A2B" />
      </mesh>
    </>
  )
}

function Elevator({ floor, onUse }: { floor: number; onUse: () => void }) {
  const z = HUB.z0
  const panel = useTexture(() => signTexture(`▲▼  ${floor}F`, { w: 256, h: 96, bg: '#1B1B22', fg: '#FFC870', font: '600 54px system-ui, sans-serif' }), [floor])
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTap(e)) onUse() }
  return (
    <group position={[ELEVATOR_X, 0, z]} onClick={click} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {/* Steel frame and doors, set into the north wall */}
      <mesh position={[0, 1.35, 0.06]}>
        <boxGeometry args={[2.5, 2.7, 0.16]} />
        <meshStandardMaterial color="#9AA0A6" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.52, 1.2, 0.16]}>
          <boxGeometry args={[1, 2.35, 0.04]} />
          <meshStandardMaterial color="#C8CCD0" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0.17]}>
        <planeGeometry args={[0.9, 0.34]} />
        <meshStandardMaterial map={panel} emissive="#FFC870" emissiveIntensity={0.3} />
      </mesh>
      {/* Call button */}
      <mesh position={[1.45, 1.2, 0.1]}>
        <boxGeometry args={[0.18, 0.3, 0.05]} />
        <meshStandardMaterial color="#2A2A30" />
      </mesh>
      <mesh position={[1.45, 1.2, 0.14]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#FFC870" emissive="#FF9A2E" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

// ── Corridors ──

function CorridorDecor() {
  const art = useTexture(() => nightTexture(), [])
  const lamps: [number, number, number][] = []
  const paintings: { at: [number, number, number]; rot: number }[] = []
  for (const c of CORRIDORS) {
    const s = size(c.rect)
    if (c.axis === 'x') {
      lamps.push([s.cx - 1.5, 2.2, c.rect.z0 + 0.12], [s.cx + 1.5, 2.2, c.rect.z1 - 0.12])
      paintings.push({ at: [s.cx + 1, 1.5, c.rect.z0 + 0.02], rot: 0 }, { at: [s.cx - 1, 1.5, c.rect.z1 - 0.02], rot: Math.PI })
    } else {
      lamps.push([c.rect.x0 + 0.12, 2.2, s.cz - 2], [c.rect.x1 - 0.12, 2.2, s.cz + 2])
      paintings.push({ at: [c.rect.x0 + 0.02, 1.5, s.cz + 1], rot: Math.PI / 2 }, { at: [c.rect.x1 - 0.02, 1.5, s.cz - 1], rot: -Math.PI / 2 })
    }
  }
  return (
    <>
      {lamps.map((p, i) => (
        <mesh key={i} position={p} raycast={noRay}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#FFE7B8" emissive="#FFC070" emissiveIntensity={1.8} />
        </mesh>
      ))}
      {paintings.map((p, i) => (
        <group key={i} position={p.at} rotation={[0, p.rot, 0]}>
          <mesh>
            <boxGeometry args={[1.1, 0.8, 0.04]} />
            <meshStandardMaterial color="#C9A227" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.025]} raycast={noRay}>
            <planeGeometry args={[0.95, 0.65]} />
            <meshStandardMaterial map={art} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ── Galleries ──

/** Every bookcase on the floor as ONE instanced mesh: a unit box scaled into panels, boards and dividers. */
function Bookcases({ onTap }: { onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<InstancedMesh>(null!)
  const parts = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string }[] = []
    const Ht = SHELF.height
    for (const b of GALLERIES.flatMap(g => g.bookcases)) {
      const L = b.z1 - b.z0, cz = (b.z0 + b.z1) / 2
      out.push({ p: [b.x, Ht / 2, cz], s: [0.08, Ht, L], c: '#3A2618' })                  // back panel
      out.push({ p: [b.x, Ht + 0.08, cz], s: [b.depth + 0.12, 0.16, L + 0.12], c: DARK_WOOD }) // top
      for (const y of [0.15, 0.95, 1.75, 2.55, 3.35]) out.push({ p: [b.x, y, cz], s: [b.depth, 0.06, L], c: DARK_WOOD })
      const n = Math.floor(L / SHELF.colW) + 1
      for (let i = 0; i < n; i++) out.push({ p: [b.x, Ht / 2, b.z1 - i * SHELF.colW], s: [b.depth, Ht, 0.05], c: DARK_WOOD })
    }
    return out
  }, [])
  useLayoutEffect(() => {
    const m = new Object3D(), c = new Color()
    parts.forEach((part, i) => {
      m.position.set(...part.p); m.scale.set(...part.s); m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
      ref.current.setColorAt(i, c.set(part.c))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [parts])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, parts.length]} onClick={onTap} receiveShadow>
      <boxGeometry />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  )
}

/** The shrine whose cubby is within reach of a point tapped on a shelf, if any. */
function nearestShrine(pets: Pet[], point: { x: number; y: number; z: number }): Pet | null {
  let best: Pet | null = null, bestD = 0.7
  for (const pet of pets) {
    const s = SLOTS[pet.shrine_position]
    const d = Math.hypot(s.x - point.x, s.y + 0.02 - 0.5 - point.y, s.z - point.z) // the floor group sits 0.5 below world zero
    if (d < bestD) { bestD = d; best = pet }
  }
  return best
}

const NEAR = 9       // photos load only for shrines this close to the avatar…
const MAX_NEAR = 24  // …and never more than this many at once (each photo is ~340 KB of GPU memory)

/**
 * All the shrine cubbies on a floor in a handful of draw calls: frames, colour cards and candles are instanced.
 * Only the shrines near the avatar get their real photo and name plate, which keeps memory flat however full the floor is.
 */
function ShelfFrames({ pets, playerPos, onOpen }: { pets: Pet[]; playerPos: React.RefObject<P>; onOpen: (pet: Pet) => void }) {
  const frames = useRef<InstancedMesh>(null!)
  const cards = useRef<InstancedMesh>(null!)
  const candles = useRef<InstancedMesh>(null!)
  const flames = useRef<InstancedMesh>(null!)
  const lit = useMemo(() => pets.filter(p => p.candle_count > 0), [pets])
  const [near, setNear] = useState<Pet[]>([])

  useLayoutEffect(() => {
    const m = new Object3D(), c = new Color()
    const place = (slot: Slot, dx: number, dy: number, dz: number) => {
      m.position.set(slot.x, slot.y + 0.02, slot.z); m.rotation.set(0, slot.rot, 0); m.scale.set(1, 1, 1)
      m.translateX(dx); m.translateY(dy); m.translateZ(dz); m.updateMatrix()
      return m.matrix
    }
    pets.forEach((pet, i) => {
      const slot = SLOTS[pet.shrine_position]
      frames.current.setMatrixAt(i, place(slot, 0, 0, -0.02))
      frames.current.setColorAt(i, c.set(pet.candle_count >= 50 ? '#C9A227' : '#2A1A10'))
      cards.current.setMatrixAt(i, place(slot, 0, 0, 0.005))
      cards.current.setColorAt(i, c.set(SPECIES_LOOK[pet.species].to))
    })
    lit.forEach((pet, i) => {
      const slot = SLOTS[pet.shrine_position]
      candles.current.setMatrixAt(i, place(slot, 0.36, -0.25, 0.12))
      flames.current.setMatrixAt(i, place(slot, 0.36, -0.17, 0.12))
    })
    for (const mesh of [frames.current, cards.current, candles.current, flames.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [pets, lit])

  // Every 0.4s, work out which shrines are close enough to deserve their real photo
  const clock = useRef(0)
  useFrame((_, dt) => {
    clock.current += dt
    if (clock.current < 0.4) return
    clock.current = 0
    const p = playerPos?.current
    if (!p) return
    const close = pets
      .map(pet => { const s = SLOTS[pet.shrine_position]; return { pet, d: Math.hypot(s.x - p.x, s.z - p.z) } })
      .filter(x => x.d < NEAR).sort((a, b) => a.d - b.d).slice(0, MAX_NEAR).map(x => x.pet)
    if (close.length !== near.length || close.some((pet, i) => pet.id !== near[i]?.id)) setNear(close)
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isTap(e) && e.instanceId != null) onOpen(pets[e.instanceId])
  }
  const hover = (on: boolean) => () => { document.body.style.cursor = on ? 'pointer' : '' }

  return (
    <>
      {/* key: an instanced mesh's size is fixed when it's created */}
      <instancedMesh key={`f${pets.length}`} ref={frames} args={[undefined, undefined, Math.max(1, pets.length)]} count={pets.length} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <boxGeometry args={[0.66, 0.76, 0.04]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh key={`c${pets.length}`} ref={cards} args={[undefined, undefined, Math.max(1, pets.length)]} count={pets.length} onClick={click}>
        <planeGeometry args={[0.56, 0.72]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`k${lit.length}`} ref={candles} args={[undefined, undefined, Math.max(1, lit.length)]} count={lit.length} raycast={noRay}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
        <meshStandardMaterial color="#F5EBD8" />
      </instancedMesh>
      <instancedMesh key={`l${lit.length}`} ref={flames} args={[undefined, undefined, Math.max(1, lit.length)]} count={lit.length} raycast={noRay}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#FFD27A" emissive="#FF9A2E" emissiveIntensity={3} />
      </instancedMesh>
      {near.map(pet => <NearPortrait key={pet.id} pet={pet} slot={SLOTS[pet.shrine_position]} />)}
    </>
  )
}

/** The real photo and name plate, laid over the colour card of a nearby shrine. */
function NearPortrait({ pet, slot }: { pet: Pet; slot: Slot }) {
  const tex = useTexture(() => petTexture(pet, true), [pet.id, pet.primary_photo_url])
  return (
    <group position={[slot.x, slot.y + 0.02, slot.z]} rotation={[0, slot.rot, 0]}>
      <mesh position={[0, 0, 0.01]} raycast={noRay}>
        <planeGeometry args={[0.56, 0.72]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {pet.candle_count >= 50 && <FairyLights />}
    </group>
  )
}

/** A hanging sign. It hides while the camera is right up against it, so it never blocks the view through a doorway. */
function Sign({ text, at, rot = 0, w = 2.6, small }: { text: string; at: [number, number, number]; rot?: number; w?: number; small?: boolean }) {
  const tex = useTexture(() => signTexture(text, small ? { font: '600 46px Georgia, serif' } : {}), [text, small])
  const ref = useRef<Mesh>(null!)
  const world = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    ref.current.getWorldPosition(world)
    ref.current.visible = camera.position.distanceTo(world) > 5
  })
  return (
    <mesh ref={ref} position={at} rotation={[0, rot, 0]} raycast={noRay}>
      <planeGeometry args={[w, w * (112 / 512)]} />
      <meshStandardMaterial map={tex} side={2} transparent alphaTest={0.5} />
    </mesh>
  )
}

/** One shrine cubby: framed portrait with a name plate, a candle once lit, fairy lights when much-loved. */
function PetFrame({ pet, slot, onOpen }: { pet: Pet; slot: Slot; onOpen: () => void }) {
  const tex = useTexture(() => petTexture(pet, true), [pet.id, pet.primary_photo_url])
  const loved = pet.candle_count >= 50
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTap(e)) onOpen() }
  const hover = (on: boolean) => () => { document.body.style.cursor = on ? 'pointer' : '' }
  return (
    <group position={[slot.x, slot.y + 0.02, slot.z]} rotation={[0, slot.rot, 0]} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.66, 0.76, 0.04]} />
        <meshStandardMaterial color={loved ? '#C9A227' : '#2A1A10'} metalness={loved ? 0.6 : 0} roughness={0.5} emissive={loved ? '#5A3A00' : '#000'} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[0.56, 0.72]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {pet.candle_count > 0 && (
        <group position={[0.36, -0.3, 0.12]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
            <meshStandardMaterial color="#F5EBD8" />
          </mesh>
          <mesh position={[0, 0.13, 0]} scale={[1, 1.6, 1]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#FFD27A" emissive="#FF9A2E" emissiveIntensity={3} />
          </mesh>
        </group>
      )}
      {loved && <FairyLights />}
    </group>
  )
}

const FAIRY = ['#FF5E5E', '#FFD34E', '#5EC8FF', '#7DFF8A', '#FF8AE2']

function FairyLights() {
  const dots: [number, number][] = []
  for (let i = 0; i <= 6; i++) { const x = -0.34 + i * 0.113; dots.push([x, 0.4], [x, -0.4]) }
  for (let i = 1; i < 7; i++) { const y = -0.4 + i * 0.114; dots.push([-0.36, y], [0.36, y]) }
  return (
    <>
      {dots.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.03]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color={FAIRY[i % FAIRY.length]} emissive={FAIRY[i % FAIRY.length]} emissiveIntensity={2} />
        </mesh>
      ))}
    </>
  )
}
