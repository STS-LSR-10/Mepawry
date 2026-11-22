'use client'
// components/3d/FlowerVase.tsx — A glazed ceramic vase with a bouquet of garden roses, leaves and a little baby's breath.
// More roses as more flowers are left. Petals, leaves and blossoms are instanced: a few draw calls for the whole vase.

import { useLayoutEffect, useMemo, useRef } from 'react'
import { SplineCurve, CatmullRomCurve3, Color, DoubleSide, InstancedMesh, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Vector2, Vector3 } from 'three'

type V3 = [number, number, number]

const ROSE = ['#EFA3B4', '#F6CAD2', '#FFF4EC', '#F4BC9C', '#E07F98', '#FADBD2']
const RINGS = [3, 4, 5, 7] // petals per ring, inside out
const NECK = 0.17       // where the stems leave the vase

/** A small cupped plane: base at y = 0, `w` wide and `h` tall, edges curled towards +z. */
function cupped(w: number, h: number, curl: number, cup: number, leaf = false) {
  const g = new PlaneGeometry(w, h, 8, 8)
  g.translate(0, h / 2, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / h
    // a petal: narrow at the base, wide and round at the top; a leaf: pointed at both ends
    const width = leaf ? Math.sin(Math.PI * y) ** 0.8 : Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(0.999, 0.18 + y * 0.72))))
    p.setX(i, p.getX(i) * (leaf ? width : 0.3 + 0.7 * width))
    if (!leaf) p.setY(i, p.getY(i) - h * 0.3 * x * x * y * y) // round the top edge
    p.setZ(i, curl * x * x * w + cup * (y - 0.5) * (y - 0.5) * h)
  }
  g.computeVertexNormals()
  return g
}

export function FlowerVase({ at, stems }: { at: V3; stems: number }) {
  const n = Math.max(3, Math.min(12, stems))
  // each bloom: where its stem ends, how it leans
  const blooms = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996 + 0.4, ring = i === 0 ? 0 : i < 5 ? 1 : 2
    const lean = 0.08 + ring * 0.16 + (i % 3) * 0.03, len = 0.2 + (ring === 0 ? 0.08 : ring === 1 ? 0.05 : 0.01) + (i % 4) * 0.012
    const tip = new Vector3(Math.cos(a) * Math.sin(lean) * len, NECK + Math.cos(lean) * len, Math.sin(a) * Math.sin(lean) * len)
    return { a, lean, tip, size: 0.9 + (i % 3) * 0.12, color: ROSE[i % ROSE.length], open: 0.16 + (i % 4) * 0.05 }
  }), [n])

  const geo = useMemo(() => ({
    petal: cupped(0.036, 0.04, 0.9, 0.25),
    leaf: cupped(0.042, 0.07, 0.3, -0.1, true),
    // a smooth bottle-bellied vase: a spline through the outline, then a small lip
    vase: [...new SplineCurve([[0.036, 0], [0.058, 0.02], [0.07, 0.06], [0.064, 0.105], [0.044, 0.138], [0.029, 0.158], [0.028, NECK - 0.004]].map(([x, y]) => new Vector2(x, y))).getPoints(36),
      new Vector2(0.034, NECK + 0.004), new Vector2(0.031, NECK + 0.008)],

    stems: blooms.map(b => new CatmullRomCurve3([new Vector3(b.tip.x * 0.05, 0.06, b.tip.z * 0.05), new Vector3(b.tip.x * 0.18, NECK, b.tip.z * 0.18), new Vector3(b.tip.x * 0.7, (NECK + b.tip.y) / 2 + 0.03, b.tip.z * 0.7), b.tip.clone().add(new Vector3(0, -0.01, 0))])),
  }), [blooms])

  const mats = useMemo(() => ({
    glaze: new MeshPhysicalMaterial({ color: '#E8DDCB', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2 }),
    gold: new MeshStandardMaterial({ color: '#C9A15A', roughness: 0.3, metalness: 0.9 }),
    inside: new MeshStandardMaterial({ color: '#3A2A20', roughness: 1 }),
    stem: new MeshStandardMaterial({ color: '#5E7F45', roughness: 0.8 }),
    petal: new MeshStandardMaterial({ roughness: 0.65, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ color: '#6E9A55', roughness: 0.55, side: DoubleSide }),
    bud: new MeshStandardMaterial({ roughness: 0.7 }),
    puff: new MeshStandardMaterial({ color: '#FFFDF8', roughness: 0.9 }),
  }), [])

  const petals = useRef<InstancedMesh>(null!), leaves = useRef<InstancedMesh>(null!), buds = useRef<InstancedMesh>(null!), puffs = useRef<InstancedMesh>(null!)
  useLayoutEffect(() => {
    const o = new Object3D(), local = new Object3D(), m = new Matrix4(), c = new Color()
    let p = 0, l = 0, s = 0
    blooms.forEach((b, i) => {
      // the rose's own frame: at the stem tip, tilted along the stem's lean
      o.position.copy(b.tip); o.rotation.set(Math.sin(b.a) * b.lean, 0, -Math.cos(b.a) * b.lean); o.scale.setScalar(b.size); o.updateMatrix()
      RINGS.forEach((count, r) => {
        for (let k = 0; k < count; k++) {
          const yaw = (k / count) * Math.PI * 2 + r * 0.7 + i
          local.position.set(0, 0, 0); local.rotation.set(0, yaw, 0, 'YXZ'); local.updateMatrix()
          const ring = new Object3D(); ring.position.set(0, -0.003 * r, -(0.003 + r * 0.006)); ring.rotation.set(-(0.04 + r * b.open + (r === RINGS.length - 1 ? 0.35 : 0)), 0, 0); ring.scale.setScalar(0.7 + r * 0.2); ring.updateMatrix()
          m.multiplyMatrices(o.matrix, local.matrix).multiply(ring.matrix)
          petals.current.setMatrixAt(p, m)
          petals.current.setColorAt(p, c.set(b.color).offsetHSL(0, 0, (r - 1) * 0.05 - 0.04))
          p++
        }
      })
      local.position.set(0, 0.012, 0); local.rotation.set(0, 0, 0); local.scale.set(0.012, 0.016, 0.012); local.updateMatrix()
      buds.current.setMatrixAt(s, m.multiplyMatrices(o.matrix, local.matrix)); buds.current.setColorAt(s, c.set(b.color).offsetHSL(0, 0.05, -0.12)); s++
      // two leaves on each stem, part way up, turned out to the sides
      for (const [t, side] of [[0.45, 1], [0.7, -1]] as const) {
        const pt = geo.stems[i].getPoint(t)
        local.position.copy(pt); local.rotation.set(0.9 * side, b.a + side * 1.2, 0.3, 'YXZ'); local.scale.setScalar(0.9 + (i % 3) * 0.1); local.updateMatrix()
        leaves.current.setMatrixAt(l++, local.matrix)
      }
    })
    // baby's breath: soft white clouds tucked between the roses
    let f = 0
    blooms.forEach((b, i) => {
      if (i % 2) return
      const base = b.tip.clone().multiplyScalar(0.85).add(new Vector3(Math.cos(b.a + 1) * 0.03, -0.02, Math.sin(b.a + 1) * 0.03))
      for (let k = 0; k < 10; k++) {
        const a = k * 2.39996
        local.position.set(base.x + Math.cos(a) * 0.016 * Math.sqrt(k), base.y + (k % 3) * 0.006, base.z + Math.sin(a) * 0.016 * Math.sqrt(k))
        local.rotation.set(0, 0, 0); local.scale.setScalar(0.004 + (k % 3) * 0.0012); local.updateMatrix()
        puffs.current.setMatrixAt(f++, local.matrix)
      }
    })
    for (const [mesh, count] of [[petals, p], [leaves, l], [buds, s], [puffs, f]] as const) {
      mesh.current.count = count
      mesh.current.instanceMatrix.needsUpdate = true
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }
  }, [blooms, geo])

  const maxPetals = 12 * RINGS.reduce((a, b) => a + b, 0)
  return (
    <group position={at}>
      <mesh material={mats.glaze} castShadow><latheGeometry args={[geo.vase, 40]} /></mesh>
      <mesh position-y={NECK + 0.004} rotation-x={Math.PI / 2} material={mats.gold}><torusGeometry args={[0.0325, 0.0028, 8, 40]} /></mesh>
      <mesh position-y={NECK + 0.005} rotation-x={-Math.PI / 2} material={mats.inside}><circleGeometry args={[0.029, 24]} /></mesh>
      {geo.stems.map((curve, i) => <mesh key={i} material={mats.stem}><tubeGeometry args={[curve, 12, 0.0022, 5, false]} /></mesh>)}
      <instancedMesh ref={petals} args={[geo.petal, mats.petal, maxPetals]} castShadow />
      <instancedMesh ref={buds} args={[undefined, mats.bud, 12]}><sphereGeometry args={[1, 12, 10]} /></instancedMesh>
      <instancedMesh ref={leaves} args={[geo.leaf, mats.leaf, 24]} />
      <instancedMesh ref={puffs} args={[undefined, mats.puff, 70]}><sphereGeometry args={[1, 6, 5]} /></instancedMesh>
    </group>
  )
}
