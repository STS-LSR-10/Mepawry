'use client'
// components/3d/Nature.tsx — Landscape around the hall: mountains, hills, trees and birds, tinted by season

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Object3D } from 'three'
import type * as THREE from 'three'
import type { Season } from '@/lib/sky'

const TROPICAL: Season[] = ['hot', 'rainy', 'cool']

/** Seeded random, so the landscape is laid out the same on every visit. */
function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
}

// Leaf colours per season; round trees pick one at random
const LEAVES: Record<Season, string[]> = {
  spring: ['#7DB86A', '#8CC47A', '#F3B6C9', '#F7C9D6'],
  summer: ['#4E8A3E', '#5A9845', '#467F37'],
  autumn: ['#D9823B', '#C4512E', '#E3B23C', '#B8642A'],
  winter: ['#E3EAF1', '#D5DEE8', '#C9D3DE'],
  hot: ['#8DA24C', '#9BAE55', '#7E9645'],
  rainy: ['#3F8A3E', '#358035', '#4A9446'],
  cool: ['#5C8F48', '#6A9A52', '#527F40'],
}
const PINE: Record<Season, string> = {
  spring: '#2F5E3C', summer: '#2B5534', autumn: '#36583A', winter: '#3E5A4C',
  hot: '#3D5A32', rainy: '#2A5530', cool: '#30573A',
}
const HILL: Record<Season, string> = {
  spring: '#5E8A44', summer: '#567F3A', autumn: '#8A6A36', winter: '#DCE3EA',
  hot: '#8C8A4A', rainy: '#4A7A3C', cool: '#62804A',
}

export function Nature({ season, daylight }: { season: Season; daylight: number }) {
  return (
    <group position={[0, -0.5, 0]}>
      <Mountains season={season} />
      <Hills season={season} />
      <Trees season={season} />
      {daylight > 0.3 && <Birds />}
    </group>
  )
}

function Mountains({ season }: { season: Season }) {
  const peaks = useMemo(() => {
    const r = seeded(7)
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2 + r() * 0.2
      const d = 90 + r() * 30
      const h = 20 + r() * 32
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, h, w: h * (0.9 + r() * 0.5), rot: r() * Math.PI, shade: r() }
    })
  }, [])
  // Snow: thick in winter, none in the tropics, otherwise only on the tallest peaks
  const capFor = (h: number) => (season === 'winter' ? 0.45 : TROPICAL.includes(season) ? 0 : h > 42 ? 0.22 : 0)

  return (
    <>
      {peaks.map((p, i) => {
        const cap = capFor(p.h)
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
            <mesh position={[0, p.h / 2, 0]}>
              <coneGeometry args={[p.w, p.h, 7]} />
              <meshStandardMaterial color={p.shade > 0.5 ? '#5E6E7E' : '#6E7C70'} flatShading roughness={1} />
            </mesh>
            {cap > 0 && (
              <mesh position={[0, p.h * (1 - cap / 2), 0]}>
                <coneGeometry args={[p.w * cap * 1.03, p.h * cap, 7]} />
                <meshStandardMaterial color="#F4F7FA" flatShading roughness={0.9} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}

function Hills({ season }: { season: Season }) {
  const hills = useMemo(() => {
    const r = seeded(11)
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + r() * 0.4
      const d = 50 + r() * 18
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, sx: 14 + r() * 12, sy: 4 + r() * 5, sz: 10 + r() * 8 }
    })
  }, [])
  return (
    <>
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, -1, h.z]} scale={[h.sx, h.sy, h.sz]}>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={HILL[season]} roughness={1} />
        </mesh>
      ))}
    </>
  )
}

/** ~80 trees in three draw calls: one instanced mesh each for trunks, pine layers and round leaf clusters. */
function Trees({ season }: { season: Season }) {
  const geo = useMemo(() => ({
    trunk: new CylinderGeometry(0.12, 0.2, 1.6, 6),
    cone: new ConeGeometry(1, 1.6, 8),
    blob: new IcosahedronGeometry(1, 1),
  }), [])
  useEffect(() => () => Object.values(geo).forEach(g => g.dispose()), [geo])

  const trees = useMemo(() => {
    const r = seeded(23)
    return Array.from({ length: 80 }, () => {
      const a = r() * Math.PI * 2
      const d = 15 + r() * 30
      return { x: Math.cos(a) * d, z: Math.sin(a) * d - 4, pine: r() < 0.45, s: 0.8 + r() * 0.9, leaf: r(), tilt: (r() - 0.5) * 0.08 }
    }).filter(t => !(Math.abs(t.x) < 33 && t.z > -55 && t.z < -3) && !(Math.abs(t.x) < 3 && t.z > -6)) // keep the building and its path clear
  }, [])

  // Each tree's parts as [kind, local position, local scale]
  const parts = useMemo(() => {
    const trunk: { t: typeof trees[0] }[] = [], cones: { t: typeof trees[0]; k: number }[] = [], blobs: { t: typeof trees[0]; k: number }[] = []
    for (const t of trees) {
      trunk.push({ t })
      if (t.pine) for (let k = 0; k < 3; k++) cones.push({ t, k })
      else for (let k = 0; k < 3; k++) blobs.push({ t, k })
    }
    return { trunk, cones, blobs }
  }, [trees])

  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const coneRef = useRef<THREE.InstancedMesh>(null!)
  const blobRef = useRef<THREE.InstancedMesh>(null!)

  useLayoutEffect(() => {
    const tree = new Object3D(), part = new Object3D(), c = new Color()
    const put = (mesh: THREE.InstancedMesh, i: number, t: typeof trees[0], pos: [number, number, number], scale: [number, number, number]) => {
      tree.position.set(t.x, 0, t.z); tree.rotation.set(t.tilt, t.leaf * 6, 0); tree.scale.setScalar(t.s); tree.updateMatrix()
      part.position.set(...pos); part.rotation.set(0, 0, 0); part.scale.set(...scale); part.updateMatrix()
      mesh.setMatrixAt(i, part.matrix.premultiply(tree.matrix))
    }
    parts.trunk.forEach(({ t }, i) => { put(trunkRef.current, i, t, [0, 0.8, 0], [1, 1, 1]); trunkRef.current.setColorAt(i, c.set('#5A3E2B')) })
    const PINE_LAYERS: [number, number][] = [[1.15, 1.7], [0.9, 2.5], [0.62, 3.2]]
    parts.cones.forEach(({ t, k }, i) => {
      const [w, y] = PINE_LAYERS[k]
      put(coneRef.current, i, t, [0, y, 0], [w, 1, w])
      coneRef.current.setColorAt(i, c.set(season === 'winter' && k === 2 ? '#E8EEF3' : PINE[season]))
    })
    const BLOBS: [number, number, number, number][] = [[0, 2.3, 0, 1], [0.55, 2.0, 0.2, 0.75], [-0.5, 2.1, -0.2, 0.8]]
    const leaves = LEAVES[season]
    parts.blobs.forEach(({ t, k }, i) => {
      const [x, y, z, w] = BLOBS[k]
      put(blobRef.current, i, t, [x, y, z], [w, w, w])
      blobRef.current.setColorAt(i, c.set(leaves[Math.floor(t.leaf * leaves.length + k) % leaves.length]))
    })
    for (const m of [trunkRef.current, coneRef.current, blobRef.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [parts, season])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[geo.trunk, undefined, Math.max(1, parts.trunk.length)]}>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[geo.cone, undefined, Math.max(1, parts.cones.length)]}>
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={blobRef} args={[geo.blob, undefined, Math.max(1, parts.blobs.length)]}>
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
    </>
  )
}

function Birds() {
  const flock = useMemo(() => {
    const r = seeded(3)
    return Array.from({ length: 10 }, () => ({
      radius: 34 + r() * 8, height: 12 + r() * 4, speed: 0.12 + r() * 0.08, phase: r() * Math.PI * 2, flap: 7 + r() * 4,
    }))
  }, [])
  const birds = useRef<THREE.Group[]>([])
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime
    flock.forEach((b, i) => {
      const g = birds.current[i]
      if (!g) return
      const a = b.phase + t * b.speed
      g.position.set(Math.cos(a) * b.radius, b.height + Math.sin(t * 0.7 + i) * 0.6, Math.sin(a) * b.radius - 24) // wide circle round the building, clear of every floor
      g.rotation.y = -a // face along the circle
      const f = Math.sin(t * b.flap + i) * 0.7
      g.children[1].rotation.z = f
      g.children[2].rotation.z = -f
    })
  })

  return (
    <>
      {flock.map((_, i) => (
        <group key={i} scale={2} ref={el => { if (el) birds.current[i] = el }}>
          <mesh scale={[0.7, 0.6, 1.6]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color="#2E2A2A" />
          </mesh>
          {[-1, 1].map(side => (
            <group key={side}>
              <mesh position={[side * 0.32, 0, 0]}>
                <boxGeometry args={[0.6, 0.02, 0.2]} />
                <meshStandardMaterial color="#3A3434" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  )
}
