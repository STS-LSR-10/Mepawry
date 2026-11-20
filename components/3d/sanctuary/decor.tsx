'use client'
// components/3d/sanctuary/decor.tsx — Furnishings shared by the reception hall and the VIP pavilion: a crystal
// chandelier, ferns (instanced leaf cards), wingback armchairs, side tables, rugs, glass display cabinets, urns of
// flowers, candles, backlit arched portrait alcoves, wood panelling, and the floor textures (herringbone oak,
// mosaic medallion, radial marble). Everything faces +z in its own space.

import { useMemo, useRef } from 'react'
import { CanvasTexture, DoubleSide, InstancedMesh, LatheGeometry, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2, type Texture } from 'three'
import { oakTexture, portraitTexture } from './GalleryInterior'
import { polar, seeded, useInstances, type V3 } from './shared'

// ── Materials ──

export function useDecorMaterials() {
  return useMemo(() => {
    const grain = oakTexture()
    return {
      panel: new MeshStandardMaterial({ map: grain, color: '#B07A48', roughness: 0.45 }),
      panelDark: new MeshStandardMaterial({ map: grain, color: '#7A4D2C', roughness: 0.5 }),
      gilt: new MeshStandardMaterial({ color: '#C2A060', roughness: 0.34, metalness: 0.8 }),
      velvet: new MeshStandardMaterial({ color: '#7A2E3E', roughness: 0.95 }),
      fabric: new MeshStandardMaterial({ color: '#C9AE8C', roughness: 0.95 }),
      cushion: new MeshStandardMaterial({ color: '#E9DCC6', roughness: 0.95 }),
      marbleWhite: new MeshStandardMaterial({ color: '#F2EEE7', roughness: 0.2 }),
      stone: new MeshStandardMaterial({ color: '#CDBFA9', roughness: 0.85 }),
      soil: new MeshStandardMaterial({ color: '#4A3626', roughness: 1 }),
      mat: new MeshStandardMaterial({ color: '#F7F1E6', roughness: 0.8 }),
      glow: new MeshStandardMaterial({ color: '#E9CFA6', emissive: '#FFB45E', emissiveIntensity: 0.55, roughness: 0.9 }),
      waterfall: new MeshStandardMaterial({ color: '#CFEAF2', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }),
      wax: new MeshStandardMaterial({ color: '#F8EEDC', roughness: 0.6, emissive: '#FFB866', emissiveIntensity: 0.4 }),
      flame: new MeshStandardMaterial({ color: '#FFE0A0', emissive: '#FFB040', emissiveIntensity: 9, toneMapped: false }),
      crystal: new MeshStandardMaterial({ color: '#FFF4DE', emissive: '#FFD9A0', emissiveIntensity: 4, toneMapped: false }),
      glass: new MeshStandardMaterial({ color: '#E6F2F4', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }),
      rose: new MeshStandardMaterial({ color: '#E8879E', roughness: 0.7 }),
      roseWhite: new MeshStandardMaterial({ color: '#FBF3EE', roughness: 0.7 }),
      leaf: new MeshStandardMaterial({ color: '#4E7A3A', roughness: 0.9 }),
      water: new MeshStandardMaterial({ color: '#7FC0D2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }),
      ceramic: new MeshStandardMaterial({ color: '#EFE4D2', roughness: 0.3 }),
    }
  }, [])
}
export type DMats = ReturnType<typeof useDecorMaterials>

// ── Textures ──

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return { c, g: c.getContext('2d')! }
}
function done(c: HTMLCanvasElement, repeat = false) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Herringbone oak parquet. */
export function herringboneTexture() {
  const { c, g } = canvas(512, 512)
  g.fillStyle = '#5E3A20'; g.fillRect(0, 0, 512, 512)
  const rnd = seeded(41), L = 96, Wd = 24
  const tones = ['#A8703F', '#9A6537', '#B47B47', '#8F5C31', '#A26A3B']
  for (let row = -4; row < 26; row++) for (let col = -4; col < 14; col++) {
    for (const flip of [0, 1]) {
      g.save()
      g.translate(col * L * 0.71 * 2 + flip * L * 0.71, row * Wd * 1.414 + flip * Wd * 0.707)
      g.rotate(flip ? -Math.PI / 4 : Math.PI / 4)
      g.fillStyle = tones[Math.floor(rnd() * tones.length)]
      g.fillRect(0, 0, L - 2, Wd - 2)
      g.strokeStyle = 'rgba(60,35,18,.25)'; g.lineWidth = 1
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 4 + k * 5); g.lineTo(L - 2, 4 + k * 5 + (rnd() - 0.5) * 3); g.stroke() }
      g.restore()
    }
  }
  return done(c, true)
}

/** A round marble mosaic medallion: rings of small tesserae and a compass star. */
export function medallionTexture() {
  const { c, g } = canvas(512, 512)
  g.translate(256, 256)
  g.fillStyle = '#E9E2D4'; g.beginPath(); g.arc(0, 0, 254, 0, Math.PI * 2); g.fill()
  const ring = (r: number, w: number, cols: string[]) => {
    const n = Math.round((2 * Math.PI * r) / 9)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      g.fillStyle = cols[i % cols.length]
      g.save(); g.rotate(a); g.fillRect(r - w / 2, -3.6, w, 7.2); g.restore()
    }
  }
  ring(246, 14, ['#7A4B30', '#B48A5A']); ring(226, 10, ['#C9B79C', '#9C8468']); ring(160, 12, ['#7A4B30', '#D4C2A2']); ring(90, 10, ['#9C8468'])
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, long = i % 2 === 0
    g.fillStyle = long ? '#8C5A3A' : '#B79566'
    g.beginPath(); g.moveTo(Math.cos(a - 0.12) * 40, Math.sin(a - 0.12) * 40); g.lineTo(Math.cos(a) * (long ? 215 : 150), Math.sin(a) * (long ? 215 : 150)); g.lineTo(Math.cos(a + 0.12) * 40, Math.sin(a + 0.12) * 40); g.fill()
  }
  return done(c)
}

/** Patterned rug: a deep border, a cream field and a central motif. */
export function rugTexture(base: string, accent: string) {
  const { c, g } = canvas(256, 384)
  g.fillStyle = base; g.fillRect(0, 0, 256, 384)
  g.fillStyle = '#EADCC3'; g.fillRect(22, 22, 212, 340)
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(34, 34, 188, 316)
  g.fillStyle = accent
  for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(128, 192, 70 - i * 5, 0, Math.PI * 2); g.globalAlpha = i % 2 ? 0.15 : 0.35; g.fill() }
  g.globalAlpha = 1
  for (let y = 48; y < 340; y += 24) for (const x of [48, 208]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill() }
  return done(c)
}

/** A fern frond on a transparent card: a midrib with paired leaflets, tapering to the tip. */
function frondTexture() {
  const { c, g } = canvas(128, 256)
  const greens = ['#3F7A2E', '#4C8A36', '#5C9A40', '#356A27']
  g.strokeStyle = '#3A6426'; g.lineWidth = 3
  g.beginPath(); g.moveTo(64, 256); g.quadraticCurveTo(60, 120, 64, 4); g.stroke()
  for (let y = 240; y > 8; y -= 7) {
    const t = 1 - y / 256, len = 52 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1)) * (0.4 + 0.6 * (1 - t))
    for (const s of [-1, 1]) {
      g.fillStyle = greens[(y / 7 + (s > 0 ? 1 : 0)) % greens.length | 0]
      g.save(); g.translate(64, y); g.rotate(s * (1.15 - t * 0.4))
      g.beginPath(); g.ellipse(0, -len / 2, 4.5, len / 2, 0, 0, Math.PI * 2); g.fill()
      g.restore()
    }
  }
  return done(c)
}

// ── Small pieces ──

export function Roses({ at, r = 0.12, m }: { at: V3; r?: number; m: DMats }) {
  const buds = useMemo(() => {
    const rnd = seeded((at[0] * 31 + at[1] * 17 + at[2] * 7) * 100)
    const n = Math.round(9 + r * r * 900)
    return Array.from({ length: n }, () => {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r
      const bs = Math.min(0.06, r * 0.32) * (0.8 + rnd() * 0.5)
      return { p: [Math.cos(a) * d, r * 0.36 * Math.sqrt(1 - (d / r) ** 2) + bs * 0.7, Math.sin(a) * d] as V3, s: bs, white: rnd() < 0.35 }
    })
  }, [at, r])
  return (
    <group position={at}>
      <mesh scale={[r * 1.02, r * 0.36, r * 1.02]} material={m.leaf}><sphereGeometry args={[1, 12, 8]} /></mesh>
      {buds.map((b, i) => <mesh key={i} position={b.p} material={b.white ? m.roseWhite : m.rose}><icosahedronGeometry args={[b.s, 1]} /></mesh>)}
    </group>
  )
}

export function Candle({ at, m, h = 0.18 }: { at: V3; m: DMats; h?: number }) {
  return (
    <group position={at}>
      <mesh position-y={0.015} material={m.gilt}><cylinderGeometry args={[0.06, 0.07, 0.03, 12]} /></mesh>
      <mesh position-y={0.03 + h / 2} material={m.wax}><cylinderGeometry args={[0.03, 0.03, h, 12]} /></mesh>
      <mesh position-y={0.05 + h} scale={[1, 1.7, 1]} material={m.flame}><sphereGeometry args={[0.016, 8, 6]} /></mesh>
    </group>
  )
}

/** A crystal chandelier: two tiers of glowing drops on brass rings, a cascade below, and its warm light. */
export function Chandelier({ at, r, drop, m, light = 26 }: { at: V3; r: number; drop: number; m: DMats; light?: number }) {
  return (
    <group position={at}>
      <mesh position-y={drop / 2} material={m.gilt}><cylinderGeometry args={[0.015, 0.015, drop, 6]} /></mesh>
      {[[r, 0, 12], [r * 0.62, -0.42, 9], [r * 0.3, -0.8, 6]].map(([rr, y, n], k) => (
        <group key={k} position-y={y}>
          <mesh rotation-x={Math.PI / 2} material={m.gilt}><torusGeometry args={[rr, 0.03, 8, 32]} /></mesh>
          {Array.from({ length: n }, (_, i) => {
            const [x, , z] = polar((i / n) * Math.PI * 2 + k * 0.3, rr)
            return (
              <group key={i} position={[x, 0, z]}>
                <mesh position-y={0.1} material={m.crystal}><cylinderGeometry args={[0.018, 0.018, 0.14, 6]} /></mesh>
                <mesh position-y={-0.1} material={m.crystal}><octahedronGeometry args={[0.04, 0]} /></mesh>
              </group>
            )
          })}
        </group>
      ))}
      <mesh position-y={-1.05} material={m.crystal}><octahedronGeometry args={[0.1, 0]} /></mesh>
      <pointLight position-y={-0.4} intensity={light} distance={12} decay={2} color="#FFD3A0" />
    </group>
  )
}

/** A wingback armchair: tall back with wings, rolled arms, a cushion and short turned legs. */
export function Armchair({ at, ry, m, fabric }: { at: V3; ry: number; m: DMats; fabric?: MeshStandardMaterial }) {
  const f = fabric ?? m.fabric
  return (
    <group position={at} rotation-y={ry}>
      <mesh position={[0, 0.36, 0.02]} material={f} castShadow><boxGeometry args={[0.72, 0.22, 0.66]} /></mesh>
      <mesh position={[0, 0.5, 0.06]} material={m.cushion}><boxGeometry args={[0.56, 0.08, 0.5]} /></mesh>
      <mesh position={[0, 0.82, -0.28]} rotation-x={-0.08} material={f} castShadow><boxGeometry args={[0.72, 0.78, 0.14]} /></mesh>
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[s * 0.33, 0.95, -0.17]} rotation-y={s * 0.35} material={f} castShadow><boxGeometry args={[0.08, 0.5, 0.26]} /></mesh>
          <mesh position={[s * 0.33, 0.6, 0.04]} material={f} castShadow><boxGeometry args={[0.1, 0.24, 0.6]} /></mesh>
          <mesh position={[s * 0.33, 0.72, 0.04]} rotation-x={Math.PI / 2} material={f}><cylinderGeometry args={[0.07, 0.07, 0.6, 10]} /></mesh>
        </group>
      ))}
      {[[-0.3, -0.26], [0.3, -0.26], [-0.3, 0.3], [0.3, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.13, z]} material={m.panelDark}><cylinderGeometry args={[0.03, 0.022, 0.26, 8]} /></mesh>
      ))}
    </group>
  )
}

export function SideTable({ at, m, withFlowers = true }: { at: V3; m: DMats; withFlowers?: boolean }) {
  return (
    <group position={at}>
      <mesh position-y={0.52} material={m.panelDark} castShadow><boxGeometry args={[0.6, 0.05, 0.6]} /></mesh>
      {[[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].map(([x, z], i) => <mesh key={i} position={[x, 0.26, z]} material={m.panelDark}><boxGeometry args={[0.05, 0.52, 0.05]} /></mesh>)}
      {withFlowers && <>
        <mesh position-y={0.62} material={m.ceramic}><cylinderGeometry args={[0.06, 0.08, 0.16, 12]} /></mesh>
        <Roses at={[0, 0.74, 0]} r={0.1} m={m} />
      </>}
      <mesh position={[0.15, 0.56, 0.1]} rotation-y={0.4} material={m.cushion}><boxGeometry args={[0.18, 0.03, 0.24]} /></mesh>
    </group>
  )
}

export function Rug({ at, size, tex, ry = 0 }: { at: V3; size: [number, number]; tex: Texture; ry?: number }) {
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, ry]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  )
}

/** A tall glass display cabinet: wooden frame, glass sides, shelves of urns and small framed photos. */
export function Vitrine({ at, ry, m, photo }: { at: V3; ry: number; m: DMats; photo: Texture }) {
  const w = 0.8, h = 2.2, d = 0.45
  return (
    <group position={at} rotation-y={ry}>
      <mesh position-y={0.25} material={m.panel} castShadow><boxGeometry args={[w, 0.5, d]} /></mesh>
      <mesh position-y={h + 0.05} material={m.panel} castShadow><boxGeometry args={[w + 0.08, 0.1, d + 0.06]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 - 0.03), h / 2 + 0.25, 0]} material={m.panel}><boxGeometry args={[0.06, h - 0.5, d]} /></mesh>)}
      <mesh position={[0, 1.35, -d / 2 + 0.02]} material={m.panelDark}><boxGeometry args={[w - 0.06, 1.7, 0.03]} /></mesh>
      {[0.95, 1.45, 1.9].map(y => (
        <group key={y}>
          <mesh position-y={y} material={m.glass}><boxGeometry args={[w - 0.08, 0.015, d - 0.06]} /></mesh>
          <mesh position={[-0.16, y + 0.11, 0]} material={m.ceramic}><cylinderGeometry args={[0.05, 0.07, 0.2, 12]} /></mesh>
          <group position={[0.15, y + 0.13, -0.05]} rotation-x={-0.1}>
            <mesh material={m.gilt}><boxGeometry args={[0.2, 0.25, 0.02]} /></mesh>
            <mesh position-z={0.012}><planeGeometry args={[0.15, 0.19]} /><meshStandardMaterial map={photo} /></mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 1.35, d / 2 - 0.01]} material={m.glass} renderOrder={2}><planeGeometry args={[w - 0.08, 1.7]} /></mesh>
      <mesh position-y={h - 0.1} material={m.glow}><boxGeometry args={[w - 0.1, 0.02, d - 0.1]} /></mesh>
    </group>
  )
}

/** A big stone urn on a pedestal, overflowing with roses. */
export function FlowerUrn({ at, m, scale = 1 }: { at: V3; m: DMats; scale?: number }) {
  const urn = useMemo(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.16, 0), new Vector2(0.12, 0.08), new Vector2(0.1, 0.18), new Vector2(0.22, 0.34), new Vector2(0.24, 0.46), new Vector2(0.2, 0.5), new Vector2(0, 0.5)], 20), [])
  return (
    <group position={at} scale={scale}>
      <mesh position-y={0.25} material={m.marbleWhite} castShadow><boxGeometry args={[0.36, 0.5, 0.36]} /></mesh>
      <mesh geometry={urn} position-y={0.5} material={m.marbleWhite} castShadow />
      <Roses at={[0, 1.0, 0]} r={0.26} m={m} />
    </group>
  )
}

/** A recessed arch in the panelling, softly lit from inside, holding a large portrait above a little shelf. */
export function PortraitAlcove({ m, photo, w = 1.3, h = 2.6, seat = false }: { m: DMats; photo: Texture; w?: number; h?: number; seat?: boolean }) {
  return (
    <group>
      {/* the glowing recess and its arched head */}
      <mesh position={[0, h / 2 + 0.4, -0.16]} material={m.glow}><boxGeometry args={[w, h, 0.02]} /></mesh>
      <mesh position={[0, h + 0.4 - w / 2, -0.15]} material={m.glow}><circleGeometry args={[w / 2, 24, 0, Math.PI]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 + 0.06), h / 2 + 0.2, -0.05]} material={m.panel} castShadow><boxGeometry args={[0.12, h - w / 2 + 0.4, 0.24]} /></mesh>)}
      <mesh position={[0, h + 0.4 - w / 2, -0.05]} material={m.panel} castShadow><torusGeometry args={[w / 2 + 0.06, 0.07, 8, 24, Math.PI]} /></mesh>
      {/* the portrait */}
      <group position={[0, seat ? 2.05 : 1.75, -0.12]}>
        <mesh material={m.gilt} castShadow><boxGeometry args={[w * 0.62, w * 0.78, 0.05]} /></mesh>
        <mesh position-z={0.027} material={m.mat}><planeGeometry args={[w * 0.54, w * 0.7]} /></mesh>
        <mesh position-z={0.029}><planeGeometry args={[w * 0.44, w * 0.58]} /><meshStandardMaterial map={photo} roughness={0.5} /></mesh>
      </group>
      {seat ? (
        <>
          <mesh position={[0, 0.25, 0.05]} material={m.panel} castShadow><boxGeometry args={[w, 0.5, 0.5]} /></mesh>
          <mesh position={[0, 0.56, 0.05]} material={m.cushion}><boxGeometry args={[w - 0.06, 0.12, 0.46]} /></mesh>
          <mesh position={[-w / 3, 0.8, -0.12]} rotation-x={-0.2} material={m.velvet}><boxGeometry args={[0.36, 0.36, 0.1]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 1.05, 0]} material={m.panel} castShadow><boxGeometry args={[w * 0.9, 0.06, 0.3]} /></mesh>
          <Candle at={[-w * 0.32, 1.08, 0.04]} m={m} />
          <mesh position={[w * 0.28, 1.16, 0]} material={m.ceramic}><cylinderGeometry args={[0.05, 0.07, 0.18, 12]} /></mesh>
          <Roses at={[w * 0.28, 1.3, 0]} r={0.11} m={m} />
        </>
      )}
    </group>
  )
}

/** Lower wall panelling with raised panels and a moulded top rail, `w` wide. */
export function Wainscot({ w, m, h = 1.0 }: { w: number; m: DMats; h?: number }) {
  const n = Math.max(1, Math.round(w / 0.7))
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={m.panel} receiveShadow><boxGeometry args={[w, h, 0.06]} /></mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / n), h / 2, 0.035]} material={m.panelDark}><boxGeometry args={[w / n - 0.12, h - 0.22, 0.02]} /></mesh>
      ))}
      <mesh position={[0, h + 0.03, 0.02]} material={m.panel}><boxGeometry args={[w, 0.06, 0.12]} /></mesh>
    </group>
  )
}

// ── Ferns ──

/** All the ferns in a room as one instanced mesh of frond cards. Pass the plants' positions and sizes. */
export function Ferns({ plants, hanging = [] }: { plants: { at: V3; size: number }[]; hanging?: { at: V3; size: number }[] }) {
  const tex = useMemo(frondTexture, [])
  const cards = useMemo(() => {
    const out: { p: V3; ry: number; rx: number; s: V3; c: string }[] = []
    const rnd = seeded(plants.length * 13 + hanging.length + 3)
    const tints = ['#FFFFFF', '#E8F2D8', '#D8EAC4']
    const plant = (at: V3, size: number, droop: number) => {
      const n = 22
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.4, len = size * (0.75 + rnd() * 0.55)
        const tilt = droop + 0.25 + rnd() * 0.6 // arching outwards like a real fern
        // the card's base sits at the crown; it leans out by `tilt`
        const cx = Math.cos(a) * Math.sin(tilt) * len / 2, cz = Math.sin(a) * Math.sin(tilt) * len / 2
        out.push({ p: [at[0] + cx, at[1] + Math.cos(tilt) * len / 2, at[2] + cz], ry: -a + Math.PI / 2, rx: tilt, s: [len * 0.32, len, 1], c: tints[Math.floor(rnd() * 3)] })
      }
    }
    plants.forEach(p => plant(p.at, p.size, 0.55))
    hanging.forEach(p => plant(p.at, p.size, 1.25)) // hanging baskets: fronds spill over and down
    return out
  }, [plants, hanging])
  const ref = useRef<InstancedMesh>(null)
  useInstances(ref, cards)
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cards.length]} castShadow>
      <planeGeometry />
      <meshStandardMaterial map={tex} alphaTest={0.4} side={DoubleSide} roughness={0.85} />
    </instancedMesh>
  )
}

/** A pot (floor) or a basket on chains (hanging) for a fern. */
export function FernPot({ at, m, hanging = false }: { at: V3; m: DMats; hanging?: boolean }) {
  return (
    <group position={at}>
      <mesh position-y={hanging ? -0.12 : 0.22} material={hanging ? m.panelDark : m.ceramic} castShadow>
        <cylinderGeometry args={[hanging ? 0.26 : 0.24, hanging ? 0.18 : 0.18, hanging ? 0.24 : 0.44, 14]} />
      </mesh>
      {hanging && [0, 1, 2].map(i => {
        const [x, , z] = polar((i / 3) * Math.PI * 2, 0.22)
        return <mesh key={i} position={[x / 2, 0.5, z / 2]} rotation={[z * 0.4, 0, -x * 0.4]} material={m.gilt}><cylinderGeometry args={[0.006, 0.006, 1.1, 4]} /></mesh>
      })}
    </group>
  )
}

export { portraitTexture }
