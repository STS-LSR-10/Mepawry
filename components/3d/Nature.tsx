'use client'
// components/3d/Nature.tsx — Landscape around the hall: mountains, hills, trees and birds, tinted by season

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, MeshStandardMaterial, Object3D, type BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type * as THREE from 'three'
import type { Season } from '@/lib/sky'
import { PARK } from './layout'
import { windify } from './wind'
import { contactShadowMap, microMap, withRim } from './look'

/** Smooth, cheap "noise" from a few sines: enough to make shapes look grown rather than machined. */
const wobble = (x: number, y: number, z: number) =>
  Math.sin(x * 1.7 + z * 2.3) * 0.5 + Math.sin(x * 3.1 - y * 2.7 + z * 1.3) * 0.3 + Math.sin(y * 4.3 + z * 3.7 - x * 1.1) * 0.2

/** Darker underneath and in the folds (fake ambient occlusion), lighter on top: per-vertex brightness. */
function shade(g: BufferGeometry, f: (x: number, y: number, z: number) => number) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { const v = f(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v }
  g.setAttribute('color', new BufferAttribute(c, 3))
  return g
}

function leafClump() {
  const g = mergeVertices(new IcosahedronGeometry(1, 3))
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const k = 1 + 0.16 * wobble(x * 2.2, y * 2.2, z * 2.2) + 0.06 * wobble(x * 6, y * 6, z * 6)
    p.setXYZ(i, x * k, y * k * 0.9, z * k)
  }
  g.computeVertexNormals()
  return shade(g, (x, y, z) => 0.62 + 0.3 * (y + 1) / 2 + 0.08 * wobble(x * 7, y * 7, z * 7))
}

function pineLayer() {
  const g = new ConeGeometry(1, 1.6, 14, 3)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    if (y < 0.7) { // jagged, drooping lower edge of the branches
      const a = Math.atan2(z, x), k = 1 + 0.18 * Math.sin(a * 7) * (0.7 - y)
      p.setXYZ(i, x * k, y - 0.08 * Math.abs(Math.sin(a * 7)) * (0.8 - y), z * k)
    }
  }
  g.computeVertexNormals()
  return shade(g, (_x, y) => 0.6 + 0.35 * (y + 0.8) / 1.6)
}

function trunkGeo() {
  const g = new CylinderGeometry(0.11, 0.2, 1.6, 8, 4)
  return shade(g, (x, y, z) => 0.75 + 0.15 * wobble(x * 20, y * 6, z * 20) + 0.1 * (y + 0.8) / 1.6)
}

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

/** A ridged peak: forest at the foot, rock above, snow on top (how much depends on the season). */
function peakGeometry(variant: number, snow: number) {
  const g = new ConeGeometry(1, 1, 40, 18)
  g.translate(0, 0.5, 0)
  const p = g.attributes.position, c = new Float32Array(p.count * 3)
  const forest = new Color('#4E6B44'), rock = new Color('#7A756D'), rockDark = new Color('#5E5A55'), white = new Color('#F2F5F8'), col = new Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const a = Math.atan2(z, x) + variant
    const ridge = 0.22 * Math.abs(Math.sin(a * 3 + variant)) + 0.12 * wobble(x * 3 + variant, y * 4, z * 3)
    const k = 1 + ridge * (1 - y) * 1.2
    const yy = y + 0.06 * wobble(x * 5, variant, z * 5) * y * (1 - y)
    p.setXYZ(i, x * k, Math.max(0, yy), z * k)
    const t = Math.max(0, yy)
    col.copy(t < 0.28 ? forest : rock).lerp(rockDark, 0.5 + 0.5 * wobble(x * 9, y * 9, z * 9) * 0.6)
    if (t < 0.34 && t >= 0.28) col.lerp(forest, (0.34 - t) / 0.06)
    if (snow > 0 && t > 1 - snow - 0.05 * wobble(x * 12, 0, z * 12)) col.copy(white)
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b
  }
  g.setAttribute('color', new BufferAttribute(c, 3))
  g.computeVertexNormals()
  return g
}

function Mountains({ season }: { season: Season }) {
  const peaks = useMemo(() => {
    const r = seeded(7)
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2 + r() * 0.2
      const d = 90 + r() * 30
      const h = 20 + r() * 32
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, h, w: h * (0.9 + r() * 0.5), rot: r() * Math.PI, v: i % 4, tall: h > 42 }
    })
  }, [])
  // Snow: thick in winter, none in the tropics, otherwise only on the tallest peaks
  const geos = useMemo(() => {
    const snowFor = (tall: boolean) => (season === 'winter' ? 0.5 : TROPICAL.includes(season) ? 0 : tall ? 0.24 : 0.08)
    return [0, 1, 2, 3].flatMap(v => [peakGeometry(v * 1.7, snowFor(false)), peakGeometry(v * 1.7, snowFor(true))])
  }, [season])
  useEffect(() => () => geos.forEach(g => g.dispose()), [geos])
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 1 }), [])
  useEffect(() => () => mat.dispose(), [mat])

  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={[p.w, p.h, p.w]} geometry={geos[p.v * 2 + (p.tall ? 1 : 0)]} material={mat} />
      ))}
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

/** ~90 trees in three draw calls (trunks, pine layers, leaf clumps), swaying in the wind. */
function Trees({ season }: { season: Season }) {
  const geo = useMemo(() => ({ trunk: trunkGeo(), cone: pineLayer(), blob: leafClump() }), [])
  const mats = useMemo(() => ({
    trunk: withRim(windify(new MeshStandardMaterial({ vertexColors: true, roughness: 1, bumpMap: microMap('grain'), bumpScale: 3 }), 'tree', 0.5), 0.5),
    cone: withRim(windify(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, bumpMap: microMap('fuzz'), bumpScale: 2 }), 'tree', 0.8), 0.5),
    blob: withRim(windify(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, bumpMap: microMap('fuzz'), bumpScale: 2.5 }), 'tree', 1), 0.5),
  }), [])
  useEffect(() => () => { Object.values(geo).forEach(g => g.dispose()); Object.values(mats).forEach(m => m.dispose()) }, [geo, mats])

  const trees = useMemo(() => {
    const r = seeded(23)
    const wild = Array.from({ length: 80 }, () => {
      const a = r() * Math.PI * 2
      const d = 15 + r() * 30
      return { x: Math.cos(a) * d, z: Math.sin(a) * d - 4, pine: r() < 0.45, s: 0.8 + r() * 0.9, leaf: r(), tilt: (r() - 0.5) * 0.08 }
    }).filter(t => !(Math.abs(t.x) < 33 && t.z > -55 && t.z < -3) && !(Math.abs(t.x) < 19 && t.z > -7 && t.z < 18)) // keep the building and the park clear
    // Shade trees planted in the park
    const park = PARK.trees.map(([x, z], i) => ({ x, z, pine: false, s: 1.25 + (i % 3) * 0.15, leaf: (i * 0.37) % 1, tilt: 0 }))
    return [...wild, ...park]
  }, [])

  // Each tree's parts as [kind, local position, local scale]
  const parts = useMemo(() => {
    const trunk: { t: typeof trees[0] }[] = [], cones: { t: typeof trees[0]; k: number }[] = [], blobs: { t: typeof trees[0]; k: number }[] = []
    for (const t of trees) {
      trunk.push({ t })
      if (t.pine) for (let k = 0; k < 4; k++) cones.push({ t, k })
      else for (let k = 0; k < 5; k++) blobs.push({ t, k })
    }
    return { trunk, cones, blobs }
  }, [trees])

  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const shadowRef = useRef<THREE.InstancedMesh>(null!)
  const coneRef = useRef<THREE.InstancedMesh>(null!)
  const blobRef = useRef<THREE.InstancedMesh>(null!)

  useLayoutEffect(() => {
    const tree = new Object3D(), part = new Object3D(), c = new Color()
    const put = (mesh: THREE.InstancedMesh, i: number, t: typeof trees[0], pos: [number, number, number], scale: [number, number, number]) => {
      tree.position.set(t.x, 0, t.z); tree.rotation.set(t.tilt, t.leaf * 6, 0); tree.scale.setScalar(t.s); tree.updateMatrix()
      part.position.set(...pos); part.rotation.set(0, t.leaf * 3, 0); part.scale.set(...scale); part.updateMatrix()
      mesh.setMatrixAt(i, part.matrix.premultiply(tree.matrix))
    }
    parts.trunk.forEach(({ t }, i) => { put(trunkRef.current, i, t, [0, 0.8, 0], [1, t.pine ? 1.1 : 1.2, 1]); trunkRef.current.setColorAt(i, c.set('#6A4A34')) })
    const PINE_LAYERS: [number, number][] = [[1.2, 1.6], [1.0, 2.3], [0.78, 2.95], [0.52, 3.55]]
    parts.cones.forEach(({ t, k }, i) => {
      const [w, y] = PINE_LAYERS[k]
      put(coneRef.current, i, t, [0, y, 0], [w, 1, w])
      coneRef.current.setColorAt(i, c.set(season === 'winter' && k >= 2 ? '#E8EEF3' : PINE[season]).multiplyScalar(1.15))
    })
    // A full crown: a big middle clump with smaller ones around and above it
    const BLOBS: [number, number, number, number][] = [[0, 2.45, 0, 1.05], [0.6, 2.15, 0.25, 0.72], [-0.55, 2.2, -0.2, 0.78], [0.15, 2.0, -0.6, 0.66], [-0.1, 3.05, 0.1, 0.7]]
    const leaves = LEAVES[season]
    parts.blobs.forEach(({ t, k }, i) => {
      const [x, y, z, w] = BLOBS[k]
      put(blobRef.current, i, t, [x, y, z], [w, w, w])
      blobRef.current.setColorAt(i, c.set(leaves[Math.floor(t.leaf * leaves.length + (k > 2 ? 1 : 0)) % leaves.length]).multiplyScalar(1.2))
    })
    // Soft dark pool under each tree, so trunks sit in the grass instead of standing on it
    trees.forEach((t, i) => {
      tree.position.set(t.x, 0.02, t.z); tree.rotation.set(-Math.PI / 2, 0, 0); tree.scale.setScalar(t.s * (t.pine ? 3.2 : 4)); tree.updateMatrix()
      shadowRef.current.setMatrixAt(i, tree.matrix)
    })
    for (const m of [trunkRef.current, coneRef.current, blobRef.current, shadowRef.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [parts, season, trees])

  return (
    <>
      <instancedMesh ref={shadowRef} args={[undefined, undefined, trees.length]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={contactShadowMap()} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[geo.trunk, mats.trunk, Math.max(1, parts.trunk.length)]} castShadow />
      <instancedMesh ref={coneRef} args={[geo.cone, mats.cone, Math.max(1, parts.cones.length)]} castShadow />
      <instancedMesh ref={blobRef} args={[geo.blob, mats.blob, Math.max(1, parts.blobs.length)]} castShadow />
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
