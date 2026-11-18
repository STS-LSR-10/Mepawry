'use client'
// components/3d/Furniture.tsx — Lobby furniture built from simple shapes: reception, sofas, tables, plants, lamps…

import { useEffect, useMemo } from 'react'
import type { Texture } from 'three'
import type { Furniture } from './layout'
import { boardTexture, petTexture, signTexture, type BoardCard } from './textures'
import type { ThreeEvent } from '@react-three/fiber'
import type { Pet } from '@/types'

const DARK_WOOD = '#8A9C8D' // legs and frames: muted sage (interior is ivory + sage)
const noRay = () => null

function useTexture(make: () => Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

// ── Lobby furniture (all built from simple shapes; front faces +z before rotation) ──

export function FurniturePiece({ it, featured }: { it: Furniture; featured?: Pet }) {
  const body = (() => {
    switch (it.kind) {
      case 'reception': return <Reception w={it.w} d={it.d} />
      case 'sofa': return <Sofa w={it.w} d={it.d} />
      case 'armchair': return <Sofa w={it.w} d={it.d} />
      case 'coffeeTable': return <Table w={it.w} d={it.d} h={0.42} />
      case 'sideTable': return <SideTable />
      case 'rug': return <Rug w={it.w} d={it.d} />
      case 'plant': return <Plant />
      case 'floorLamp': return <FloorLamp />
      case 'noticeBoard': return <NoticeBoard w={it.w} />
      case 'easel': return featured ? <Easel pet={featured} /> : null
      case 'candleTable': return <CandleTable w={it.w} d={it.d} />
      case 'bench': return <Bench w={it.w} d={it.d} />
    }
  })()
  return <group position={[it.x, 0, it.z]} rotation={[0, it.rot, 0]}>{body}</group>
}

function Box({ size, at, color, rough = 0.8 }: { size: [number, number, number]; at: [number, number, number]; color: string; rough?: number }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  )
}

function Reception({ w, d }: { w: number; d: number }) {
  const plate = useTexture(() => signTexture('Reception · Welcome', { w: 512, h: 96, bg: '#FBF6EC', font: 'italic 600 44px Georgia, serif' }), [])
  return (
    <>
      <Box size={[w, 1.05, d]} at={[0, 0.525, 0]} color="#E9DCC6" />
      <Box size={[w + 0.15, 0.08, d + 0.15]} at={[0, 1.09, 0]} color={DARK_WOOD} />
      <mesh position={[0, 0.62, d / 2 + 0.01]}>
        <planeGeometry args={[2.4, 0.45]} />
        <meshStandardMaterial map={plate} transparent alphaTest={0.5} />
      </mesh>
      {/* Desk lamp and a small candle */}
      <Box size={[0.06, 0.4, 0.06]} at={[-1.5, 1.33, -0.2]} color="#5F6F64" />
      <mesh position={[-1.5, 1.6, -0.2]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#FFE7B8" emissive="#FFC070" emissiveIntensity={1.8} />
      </mesh>
      <Candle at={[1.4, 1.13, 0]} />
    </>
  )
}

function Sofa({ w, d }: { w: number; d: number }) {
  const fabric = '#8FA595', cushion = '#B7C7B2'
  return (
    <>
      <Box size={[w, 0.42, d]} at={[0, 0.21, 0]} color={fabric} rough={1} />
      <Box size={[w - 0.4, 0.14, d - 0.3]} at={[0, 0.49, 0.1]} color={cushion} rough={1} />
      <Box size={[w, 0.6, 0.25]} at={[0, 0.7, -d / 2 + 0.125]} color={fabric} rough={1} />
      {[-1, 1].map(s => <Box key={s} size={[0.22, 0.62, d]} at={[s * (w / 2 - 0.11), 0.5, 0]} color={fabric} rough={1} />)}
    </>
  )
}

function Table({ w, d, h }: { w: number; d: number; h: number }) {
  return (
    <>
      <Box size={[w, 0.07, d]} at={[0, h, 0]} color={DARK_WOOD} rough={0.5} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <Box key={`${a}${b}`} size={[0.06, h, 0.06]} at={[a * (w / 2 - 0.08), h / 2, b * (d / 2 - 0.08)]} color={DARK_WOOD} />)}
      {/* A book and a cup of tea */}
      <Box size={[0.3, 0.05, 0.22]} at={[-0.3, h + 0.06, 0]} color="#3E6B8A" />
      <mesh position={[0.35, h + 0.08, 0.05]}>
        <cylinderGeometry args={[0.05, 0.04, 0.09, 12]} />
        <meshStandardMaterial color="#FBF6EC" />
      </mesh>
    </>
  )
}

function SideTable() {
  return (
    <>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.05, 20]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      <Box size={[0.06, 0.55, 0.06]} at={[0, 0.27, 0]} color={DARK_WOOD} />
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#FFE7B8" emissive="#FFC070" emissiveIntensity={1.6} />
      </mesh>
    </>
  )
}

function Rug({ w, d }: { w: number; d: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[w / 2, d / 2, 1]} receiveShadow raycast={noRay}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#9DB09A" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} scale={[w / 2 - 0.4, d / 2 - 0.4, 1]} raycast={noRay}>
        <ringGeometry args={[0.92, 0.96, 40]} />
        <meshStandardMaterial color="#F3EEE6" roughness={1} />
      </mesh>
    </>
  )
}

function Plant() {
  return (
    <>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.6, 16]} />
        <meshStandardMaterial color="#F2EDE4" roughness={0.6} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]} castShadow>
            <coneGeometry args={[0.1, 0.9, 6]} />
            <meshStandardMaterial color={i % 2 ? '#4E8A3E' : '#3F7A35'} flatShading />
          </mesh>
        )
      })}
    </>
  )
}

function FloorLamp() {
  return (
    <>
      <Box size={[0.08, 2.4, 0.08]} at={[0, 1.2, 0]} color="#1E1814" rough={0.4} />
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.28, 20, 16]} />
        <meshStandardMaterial color="#FFF4DE" emissive="#FFE2A8" emissiveIntensity={1.4} />
      </mesh>
    </>
  )
}

/** Cork board on legs showing the latest stories and kind words; tap it to open the community board. */
function NoticeBoard({ w }: { w: number }) {
  const board = useMemo(() => boardTexture(), [])
  useEffect(() => () => board.texture.dispose(), [board])
  useEffect(() => {
    let live = true
    const get = (kind: string) => fetch(`/api/board/posts?kind=${kind}`).then(r => r.json()).then(d => d.posts ?? []).catch(() => [])
    Promise.all([get('story'), get('note')]).then(([stories, notes]) => {
      if (!live) return
      const cards: BoardCard[] = [
        ...stories.slice(0, 3).map((p: { pet?: { name: string; primary_photo_url: string | null } | null; author_name: string; body: string; photo_url: string | null }) =>
          ({ kind: 'story' as const, title: p.pet?.name ?? p.author_name, body: p.body, photo: p.photo_url ?? p.pet?.primary_photo_url })),
        ...notes.slice(0, 3).map((p: { author_name: string; body: string; note_color: string | null }) =>
          ({ kind: 'note' as const, title: p.author_name, body: p.body, color: p.note_color })),
      ]
      board.set(cards)
    })
    return () => { live = false }
  }, [board])
  const open = (e: ThreeEvent<MouseEvent>) => { if (e.delta < 6) { e.stopPropagation(); window.dispatchEvent(new Event('mepawry:board')) } }
  const bw = w, bh = bw * (640 / 1024)
  return (
    <group onClick={open} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {[-1, 1].map(s => <Box key={s} size={[0.08, 2.1, 0.08]} at={[s * (bw / 2 - 0.12), 1.05, -0.02]} color={DARK_WOOD} />)}
      {/* frame */}
      <Box size={[bw + 0.12, bh + 0.12, 0.06]} at={[0, 1.45, 0]} color={DARK_WOOD} />
      <mesh position={[0, 1.45, 0.035]}>
        <planeGeometry args={[bw, bh]} />
        <meshStandardMaterial map={board.texture} roughness={0.95} />
      </mesh>
    </group>
  )
}

function Easel({ pet }: { pet: Pet }) {
  const tex = useTexture(() => petTexture(pet, false), [pet.id, pet.primary_photo_url])
  const label = useTexture(() => signTexture('Forever in our hearts', { w: 512, h: 90, font: 'italic 600 40px Georgia, serif' }), [])
  return (
    <>
      {[-0.4, 0.4].map(x => <Box key={x} size={[0.06, 1.9, 0.06]} at={[x, 0.95, 0]} color={DARK_WOOD} />)}
      <Box size={[1.05, 1.25, 0.06]} at={[0, 1.55, 0.06]} color="#C9A227" rough={0.35} />
      <mesh position={[0, 1.55, 0.1]}>
        <planeGeometry args={[0.85, 1]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      <mesh position={[0, 0.82, 0.1]}>
        <planeGeometry args={[1.1, 0.2]} />
        <meshStandardMaterial map={label} transparent alphaTest={0.5} />
      </mesh>
    </>
  )
}

function CandleTable({ w, d }: { w: number; d: number }) {
  return (
    <>
      <Box size={[w, 0.8, d]} at={[0, 0.4, 0]} color={DARK_WOOD} />
      {Array.from({ length: 9 }, (_, i) => <Candle key={i} at={[-0.55 + (i % 5) * 0.27, 0.8, i < 5 ? -0.12 : 0.15]} />)}
      <pointLight position={[0, 1.4, 0.2]} intensity={2.5} color="#FFA54F" distance={5} decay={1.5} />
    </>
  )
}

function Candle({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.16, 10]} />
        <meshStandardMaterial color="#F5EBD8" />
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1, 1.6, 1]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#FFD27A" emissive="#FF9A2E" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

function Bench({ w, d }: { w: number; d: number }) {
  return (
    <>
      <Box size={[w, 0.08, d]} at={[0, 0.45, 0]} color="#E6DCCB" />
      {[-1, 1].map(s => <Box key={s} size={[0.08, 0.45, d - 0.1]} at={[s * (w / 2 - 0.15), 0.22, 0]} color={DARK_WOOD} />)}
    </>
  )
}
