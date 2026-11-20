'use client'
// components/3d/sanctuary/shared.ts — Small helpers shared by the Sanctuary preview's parts.

import { useLayoutEffect } from 'react'
import { CanvasTexture, Color, Object3D, SRGBColorSpace, type InstancedMesh } from 'three'

export const W = 6     // gallery width (metres)
export const H = 3.2   // gallery wall height; the glass vault sits on top
export const VAULT_TOP = H + 0.28 + W / 2

export type V3 = [number, number, number]
export const polar = (a: number, r: number, y = 0): V3 => [Math.cos(a) * r, y, Math.sin(a) * r]

export function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
}

/** Sets every instance of a mesh from a list of (position, y-rotation, scale) and optional colours. */
export function useInstances(ref: React.RefObject<InstancedMesh | null>, items: { p: V3; ry?: number; rx?: number; rz?: number; s?: V3; c?: string }[]) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D(), col = new Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0, 'YXZ')
      o.scale.set(...(it.s ?? [1, 1, 1]))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.c) m.setColorAt(i, col.set(it.c))
    })
    m.count = items.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [ref, items])
}

/** A cluster of small leaves on a transparent card. Many crossed cards make a canopy that reads as foliage. */
export function leafCardTexture(kind: 'tree' | 'willow') {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const rnd = seeded(kind === 'tree' ? 5 : 9)
  const greens = kind === 'tree' ? ['#2F5A22', '#3D6E2B', '#4E8235', '#5E9440', '#76A84E', '#8DBA5C'] : ['#7FA548', '#94B85A', '#A9C86E', '#6E9640', '#BCD685']
  if (kind === 'tree') {
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 112
      const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d
      g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI * 2)
      g.fillStyle = greens[Math.floor((1 - d / 112) * 3 + rnd() * 3)]
      g.beginPath(); g.ellipse(0, 0, 5 + rnd() * 5, 2.5 + rnd() * 2.5, 0, 0, Math.PI * 2); g.fill()
      g.restore()
    }
  } else {
    // long hanging strands of narrow leaves
    for (let sx = 6; sx < 256; sx += 9 + rnd() * 6) {
      const len = 140 + rnd() * 116
      for (let y = 0; y < len; y += 5) {
        g.save(); g.translate(sx + Math.sin(y * 0.03) * 3, y); g.rotate((rnd() - 0.5) * 0.9)
        g.fillStyle = greens[Math.floor(rnd() * greens.length)]
        g.beginPath(); g.ellipse(0, 0, 1.6, 4.5, 0, 0, Math.PI * 2); g.fill()
        g.restore()
      }
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

