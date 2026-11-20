'use client'
// components/3d/sanctuary/GalleryInterior.tsx — Inside a gallery: walls of tall oak memorial cabinets.
// Each bay holds a cabinet with closed doors below and a grid of separate cubbies above: one pet per cubby, a
// framed portrait on a white mat with a little nameplate and a candle glowing in front (a few hold an urn, a few
// are still waiting). Ivy trails from the crown moulding. Fluted pilasters between bays carry a
// zone sign and a wall lantern. Brass lanterns hang down the middle of the glass vault; the floor is pale marble
// with oak inlay strips, and benches sit along the walls. Everything repeated is instanced (a few dozen draw calls).

import { useMemo, useRef } from 'react'
import {
  CanvasTexture, DoubleSide, InstancedMesh, LatheGeometry, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace,
  Vector2,
} from 'three'
import { H, leafCardTexture, polar, seeded, useInstances, VAULT_TOP, W, type V3 } from './shared'

const CAB_H = 3.0        // cabinet height (the crown sits just under the timber beam)
const CAB_D = 0.55       // cabinet depth
const BASE_H = 0.78      // closed cupboards at the bottom
const ROWS = 5           // rows of cubbies above the cupboards
const COLS = 6           // cubbies across each cabinet: one pet in each
const ROW_H = (CAB_H - 0.2 - BASE_H) / ROWS
const PETS = ['🐶', '🐱', '🐕', '🐈', '🐰', '🐹', '🦜', '🐾']

type Item = { p: V3; ry?: number; rx?: number; s?: V3; c?: string }

/** A pet portrait: soft studio background, the pet, a pale mat. Eight of them, shared across thousands of frames. */
export function portraitTexture(i: number) {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 160
  const g = c.getContext('2d')!
  const bgs = [['#F7E3C8', '#D9B48A'], ['#E3EEF7', '#A9C2D9'], ['#F6E0E6', '#D8A7B6'], ['#E8F1DE', '#AFC797'], ['#F4EBDD', '#C9B293'], ['#EDE6F5', '#B9A9D3']]
  const [a, b] = bgs[i % bgs.length]
  const gr = g.createRadialGradient(64, 70, 10, 64, 80, 100)
  gr.addColorStop(0, a); gr.addColorStop(1, b)
  g.fillStyle = gr; g.fillRect(0, 0, 128, 160)
  g.font = '86px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(PETS[i % PETS.length], 64, 86)
  g.strokeStyle = 'rgba(255,250,240,.9)'; g.lineWidth = 10; g.strokeRect(5, 5, 118, 150) // the mat
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Light oak grain: long, gently waving lines; tinted per material by its colour. */
function oakTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#E9D2B4'; g.fillRect(0, 0, 256, 256)
  const rnd = seeded(31)
  for (let i = 0; i < 70; i++) {
    const x0 = rnd() * 256
    g.strokeStyle = `rgba(${110 + rnd() * 40},${70 + rnd() * 30},${40 + rnd() * 20},${0.12 + rnd() * 0.2})`
    g.lineWidth = 0.6 + rnd() * 1.8
    g.beginPath()
    for (let y = 0; y <= 256; y += 8) g.lineTo(x0 + Math.sin(y * 0.03 + i) * 3 + Math.sin(y * 0.11 + i * 2) * 1.2, y)
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Polished pale marble with soft grey veins. */
function marbleTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#ECEAE5'; g.fillRect(0, 0, 512, 512)
  const rnd = seeded(77)
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${95 + rnd() * 40},${95 + rnd() * 40},${100 + rnd() * 40},${0.18 + rnd() * 0.3})`
    g.lineWidth = 0.6 + rnd() * 2.2
    g.beginPath()
    let x = rnd() * 512, y = rnd() * 512
    g.moveTo(x, y)
    for (let k = 0; k < 14; k++) { x += (rnd() - 0.3) * 60; y += (rnd() - 0.5) * 50; g.lineTo(x, y) }
    g.stroke()
  }
  // tile joints
  g.strokeStyle = 'rgba(150,140,128,.35)'; g.lineWidth = 2
  g.strokeRect(0, 0, 512, 512)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

function signTexture(label: string) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#3B2414'; g.fillRect(0, 0, 256, 128)
  g.fillStyle = '#F5EBD8'; g.fillRect(8, 8, 240, 112)
  g.fillStyle = '#3B2414'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = '600 26px Georgia, serif'; g.fillText('🐾 Zone', 128, 44)
  g.font = '700 38px Georgia, serif'; g.fillText(label, 128, 86)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

export function GalleryInterior({ r, angles, step, twoSided, m }: {
  r: number; angles: number[]; step: number; twoSided: boolean
  m: { frame: MeshStandardMaterial }
}) {
  const ri = r - W / 2, ro = r + W / 2

  const grain = useMemo(oakTexture, [])
  const mats = useMemo(() => ({
    // warm honey oak with a visible grain (the grain map is shared and repeats)
    oak: new MeshStandardMaterial({ map: grain, color: '#C88B55', roughness: 0.48 }),
    oakDark: new MeshStandardMaterial({ map: grain, color: '#6A4024', roughness: 0.6 }),
    oakLight: new MeshStandardMaterial({ map: grain, color: '#D79A5E', roughness: 0.42 }),
    photoFrame: new MeshStandardMaterial({ color: '#5E3A1E', roughness: 0.4, metalness: 0.1 }),
    gilt: new MeshStandardMaterial({ color: '#C9A15A', roughness: 0.35, metalness: 0.7 }),
    wax: new MeshStandardMaterial({ color: '#F8EEDC', roughness: 0.6, emissive: '#FFB866', emissiveIntensity: 0.35 }),
    flame: new MeshStandardMaterial({ color: '#FFE0A0', emissive: '#FFB040', emissiveIntensity: 9, toneMapped: false }),
    ceramic: new MeshStandardMaterial({ color: '#EFE4D2', roughness: 0.35, envMapIntensity: 0.4 }),
    lantern: new MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFB45E', emissiveIntensity: 5, toneMapped: false, transparent: true, opacity: 0.95 }),
    brass: new MeshStandardMaterial({ color: '#8A6A3A', roughness: 0.35, metalness: 0.85 }),
    iron: new MeshStandardMaterial({ color: '#2E2A26', roughness: 0.5, metalness: 0.6 }),
    dried: new MeshStandardMaterial({ color: '#B98A7A', roughness: 0.9 }),
  }), [grain])
  const portraits = useMemo(() => PETS.map((_, i) => portraitTexture(i)), [])
  const marble = useMemo(() => { const t = marbleTexture(); t.repeat.set((ro * 2) / 1.6, (ro * 2) / 1.6); return t }, [ro])
  const ivyTex = useMemo(() => leafCardTexture('tree'), [])
  const signs = useMemo(() => 'ABCDEFGH'.split('').map(l => signTexture(`${l}`)), [])
  const urnGeo = useMemo(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.05, 0), new Vector2(0.075, 0.05), new Vector2(0.08, 0.11), new Vector2(0.055, 0.17), new Vector2(0.04, 0.19), new Vector2(0.05, 0.21), new Vector2(0, 0.215)], 16), [])

  const built = useMemo(() => {
    const rnd = seeded(Math.round(r * 13))
    const L = {
      backs: [] as Item[], sides: [] as Item[], bases: [] as Item[], doors: [] as Item[], shelves: [] as Item[], dividers: [] as Item[],
      crowns: [] as Item[], cornices: [] as Item[], pilasters: [] as Item[], capitals: [] as Item[],
      frames: [] as Item[], mats: [] as Item[], plaques: [] as Item[], photos: PETS.map(() => [] as Item[]), candles: [] as Item[], flames: [] as Item[], urns: [] as Item[], dried: [] as Item[],
      ivy: [] as Item[], signs: signsInit(), sconces: [] as Item[], sconceGlass: [] as Item[],
      rods: [] as Item[], lanterns: [] as Item[], caps: [] as Item[], benchSeats: [] as Item[], benchBacks: [] as Item[], benchLegs: [] as Item[],
      strips: [] as Item[],
    }
    function signsInit() { return Array.from({ length: 8 }, () => [] as Item[]) }

    // A frame of reference for a wall at angle a: `inward` cabinets on the outer wall face the centre line
    const wall = (a: number, rr: number, facing: 1 | -1) => {
      const nx = Math.cos(a) * facing, nz = Math.sin(a) * facing   // the way the cabinet faces
      const ry = Math.atan2(nx, nz)
      const xx = Math.cos(ry), xz = -Math.sin(ry)                   // the cabinet's own left→right
      const [bx, , bz] = polar(a, rr)
      return { ry, at: (x: number, y: number, z: number): V3 => [bx + xx * x + nx * z, y, bz + xz * x + nz * z] }
    }

    const sides: { rr: number; facing: 1 | -1 }[] = [{ rr: ro - 0.12 - CAB_D / 2, facing: -1 }]
    if (twoSided) sides.push({ rr: ri + 0.12 + CAB_D / 2, facing: 1 })

    angles.slice(0, -1).forEach((a0, bay) => {
      const a = a0 + step / 2
      for (const { rr, facing } of sides) {
        const w = 2 * rr * Math.sin(step / 2) - 0.34 // leave room for the pilasters
        const { ry, at } = wall(a, rr, facing)
        const fz = CAB_D / 2
        L.backs.push({ p: at(0, CAB_H / 2, -fz + 0.03), ry, s: [w, CAB_H, 0.06] })
        ;[-1, 1].forEach(sd => L.sides.push({ p: at(sd * w / 2, CAB_H / 2, 0), ry, s: [0.07, CAB_H, CAB_D] }))
        L.bases.push({ p: at(0, BASE_H / 2, 0), ry, s: [w, BASE_H, CAB_D] })
        const nDoors = 3
        for (let d = 0; d < nDoors; d++) {
          const dw = w / nDoors - 0.08
          L.doors.push({ p: at((d - (nDoors - 1) / 2) * (w / nDoors), BASE_H / 2, fz + 0.012), ry, s: [dw, BASE_H - 0.14, 0.025] })
        }
        for (let k = 0; k <= ROWS; k++) L.shelves.push({ p: at(0, BASE_H + k * ROW_H, 0.02), ry, s: [w, 0.045, CAB_D - 0.04] })
        // uprights between cubbies
        for (let c = 1; c < COLS; c++) L.dividers.push({ p: at(-w / 2 + (c * w) / COLS, BASE_H + (ROWS * ROW_H) / 2, 0.02), ry, s: [0.035, ROWS * ROW_H, CAB_D - 0.04] })
        L.crowns.push({ p: at(0, CAB_H - 0.1, 0.03), ry, s: [w + 0.2, 0.2, CAB_D + 0.12] })
        L.cornices.push({ p: at(0, CAB_H + 0.02, 0.06), ry, s: [w + 0.34, 0.07, CAB_D + 0.22] })

        // One pet per cubby: a dark frame on a white mat, a nameplate leaning in front, a candle glowing beside it
        const cw = w / COLS
        for (let row = 0; row < ROWS; row++) {
          const y = BASE_H + row * ROW_H + 0.025
          for (let col = 0; col < COLS; col++) {
            const x = -w / 2 + (col + 0.5) * cw
            const roll = rnd()
            if (roll < 0.1) continue // waiting for a pet
            if (roll < 0.17) { L.urns.push({ p: at(x, y, -0.02), ry, s: [1.1, 1.1, 1.1] }); continue }
            const fh = ROW_H - 0.07, fw = Math.min(cw - 0.14, fh * 0.8)
            const z = -0.06, tilt = -0.1
            L.frames.push({ p: at(x, y + fh / 2 + 0.02, z), ry, rx: tilt, s: [fw, fh, 0.03] })
            L.mats.push({ p: at(x, y + fh / 2 + 0.021, z + 0.017), ry, rx: tilt, s: [fw * 0.86, fh * 0.88, 1] })
            L.photos[Math.floor(rnd() * PETS.length)].push({ p: at(x, y + fh / 2 + 0.022, z + 0.02), ry, rx: tilt, s: [fw * 0.7, fh * 0.72, 1] })
            L.plaques.push({ p: at(x, y + 0.03, 0.14), ry, rx: -0.5, s: [fw * 0.8, 0.045, 0.012] })
            const side = rnd() < 0.5 ? -1 : 1
            L.candles.push({ p: at(x + side * (fw / 2 + 0.035), y + 0.035, 0.12), ry, s: [0.75, 0.7, 0.75] })
            L.flames.push({ p: at(x + side * (fw / 2 + 0.035), y + 0.09, 0.12), ry, s: [1, 1.6, 1] })
          }
        }
        // Ivy trailing over the crown
        const nIvy = 6 + Math.floor(rnd() * 4)
        for (let k = 0; k < nIvy; k++) {
          const len = 0.35 + rnd() * 0.9
          L.ivy.push({ p: at((rnd() - 0.5) * w, CAB_H - len / 2 + 0.12, fz + 0.12 + rnd() * 0.08), ry, s: [0.35 + rnd() * 0.3, len, 1], c: ['#FFFFFF', '#E3EDCF', '#D3E3BC'][Math.floor(rnd() * 3)] })
        }
      }
    })

    // Fluted pilasters between bays (where the posts are), with zone signs and lanterns on every third
    angles.forEach((a, i) => {
      for (const { rr, facing } of sides) {
        const { ry, at } = wall(a, rr, facing)
        L.pilasters.push({ p: at(0, CAB_H / 2, 0.04), ry, s: [0.32, CAB_H, CAB_D + 0.1] })
        L.capitals.push({ p: at(0, CAB_H - 0.32, 0.08), ry, s: [0.42, 0.14, CAB_D + 0.2] })
        if (i % 3 === 1) {
          const zone = Math.floor((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) // eight zones round the ring
          L.signs[zone].push({ p: at(0, 2.45, CAB_D / 2 + 0.12), ry, s: [0.44, 0.22, 1] })
          L.sconces.push({ p: at(0, 2.05, CAB_D / 2 + 0.16), ry, s: [0.12, 0.2, 0.12] })
          L.sconceGlass.push({ p: at(0, 2.05, CAB_D / 2 + 0.16), ry, s: [0.09, 0.15, 0.09] })
        }
      }
    })

    // Lanterns hanging from the vault down the middle, one per bay
    angles.slice(0, -1).forEach(a0 => {
      const a = a0 + step / 2
      const top = VAULT_TOP - 0.05, ly = 4.25
      L.rods.push({ p: polar(a, r, (top + ly + 0.3) / 2), s: [0.015, top - ly - 0.3, 0.015] })
      L.lanterns.push({ p: polar(a, r, ly), ry: -a, s: [0.17, 0.38, 0.17] })
      L.caps.push({ p: polar(a, r, ly + 0.27), ry: -a, s: [0.24, 0.16, 0.24] })
    })

    // Oak inlay across the marble at every bay, and benches along the walls every few bays
    angles.forEach((a, i) => {
      L.strips.push({ p: polar(a, r, 0.026), ry: -a, s: [W - 0.4, 0.004, 0.14] })
      if (i % 3 === 1 && i < angles.length - 1) {
        const a2 = a + step / 2
        for (const off of twoSided ? [-1, 1] : [-1]) {
          const rr = r + off * 1.65, facing = (off < 0 ? 1 : -1) as 1 | -1
          const { ry, at } = wall(a2, rr, facing)
          ;[-0.14, 0, 0.14].forEach(z => L.benchSeats.push({ p: at(0, 0.45, z), ry, s: [1.5, 0.04, 0.11] }))
          ;[0.62, 0.78, 0.94].forEach(y => L.benchBacks.push({ p: at(0, y, -0.21 - (y - 0.62) * 0.12), ry, rx: -0.12, s: [1.5, 0.09, 0.03] }))
          ;[-0.68, 0.68].forEach(x => {
            ;[-0.17, 0.17].forEach(z => L.benchLegs.push({ p: at(x, 0.22, z), ry, s: [0.045, 0.44, 0.045] }))
            L.benchLegs.push({ p: at(x, 0.62, -0.02), ry, s: [0.04, 0.04, 0.42] }) // armrest
            L.benchLegs.push({ p: at(x, 0.7, -0.22), ry, rx: -0.12, s: [0.045, 0.6, 0.045] }) // back upright
          })
        }
      }
    })
    return L
  }, [r, angles, step, twoSided, ri, ro])

  return (
    <group>
      {/* marble floor with oak borders */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
        <ringGeometry args={[ri, ro, 220, 1]} />
        <meshStandardMaterial map={marble} color="#D6CEC2" roughness={0.26} metalness={0} envMapIntensity={0.3} />
      </mesh>
      {[r - 1.25, r + 1.25].map(rr => (
        <mesh key={rr} rotation-x={-Math.PI / 2} position-y={0.024} material={mats.oakLight}>
          <ringGeometry args={[rr - 0.08, rr + 0.08, 220, 1]} />
        </mesh>
      ))}
      <Inst items={built.strips} mat={mats.oakLight}><boxGeometry /></Inst>

      {/* cabinets */}
      <Inst items={built.backs} mat={mats.oakDark} shadow><boxGeometry /></Inst>
      <Inst items={built.sides} mat={mats.oak} shadow><boxGeometry /></Inst>
      <Inst items={built.bases} mat={mats.oak} shadow><boxGeometry /></Inst>
      <Inst items={built.doors} mat={mats.oakLight}><boxGeometry /></Inst>
      <Inst items={built.shelves} mat={mats.oak} shadow><boxGeometry /></Inst>
      <Inst items={built.dividers} mat={mats.oak}><boxGeometry /></Inst>
      <Inst items={built.crowns} mat={mats.oak} shadow><boxGeometry /></Inst>
      <Inst items={built.cornices} mat={m.frame} shadow><boxGeometry /></Inst>
      <Inst items={built.pilasters} mat={mats.oakLight} shadow><boxGeometry /></Inst>
      <Inst items={built.capitals} mat={mats.oak}><boxGeometry /></Inst>

      {/* shelf contents */}
      <Inst items={built.frames} mat={mats.photoFrame} shadow><boxGeometry /></Inst>
      <Inst items={built.mats} mat={null}><planeGeometry /><meshStandardMaterial color="#F6F1E7" roughness={0.8} /></Inst>
      <Inst items={built.plaques} mat={mats.gilt}><boxGeometry /></Inst>
      {built.photos.map((list, i) => (
        <Inst key={i} items={list} mat={null}><planeGeometry /><meshStandardMaterial map={portraits[i]} roughness={0.5} /></Inst>
      ))}
      <Inst items={built.candles} mat={mats.wax}><cylinderGeometry args={[0.03, 0.03, 0.1, 10]} /></Inst>
      <Inst items={built.flames} mat={mats.flame}><sphereGeometry args={[0.014, 8, 6]} /></Inst>
      <Inst items={built.urns} mat={mats.ceramic} geo={urnGeo} shadow />
      <Inst items={built.dried} mat={null}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={0.9} /></Inst>
      <Inst items={built.ivy} mat={null}><planeGeometry /><meshStandardMaterial map={ivyTex} alphaTest={0.4} side={DoubleSide} roughness={0.85} /></Inst>

      {/* zone signs and wall lanterns on the pilasters */}
      {built.signs.map((list, i) => (
        <Inst key={i} items={list} mat={null}><planeGeometry /><meshStandardMaterial map={signs[i]} roughness={0.6} /></Inst>
      ))}
      <Inst items={built.sconces} mat={mats.brass}><cylinderGeometry args={[1, 1, 1, 6, 1, true]} /></Inst>
      <Inst items={built.sconceGlass} mat={mats.lantern}><cylinderGeometry args={[1, 1, 1, 6]} /></Inst>

      {/* hanging lanterns */}
      <Inst items={built.rods} mat={mats.iron}><cylinderGeometry args={[1, 1, 1, 6]} /></Inst>
      <Inst items={built.lanterns} mat={mats.lantern}><cylinderGeometry args={[1, 0.8, 1, 8]} /></Inst>
      <Inst items={built.caps} mat={mats.brass}><coneGeometry args={[1, 1, 8]} /></Inst>

      {/* benches */}
      <Inst items={built.benchSeats} mat={mats.oakLight} shadow><boxGeometry /></Inst>
      <Inst items={built.benchBacks} mat={mats.oakLight} shadow><boxGeometry /></Inst>
      <Inst items={built.benchLegs} mat={mats.iron} shadow><boxGeometry /></Inst>
    </group>
  )
}

/** One instanced mesh from a list. Give a shared material, or null and a material child (with the geometry child first). */
function Inst({ items, mat, geo, shadow, children }: {
  items: Item[]; mat: MeshStandardMaterial | null; geo?: import('three').BufferGeometry; shadow?: boolean; children?: React.ReactNode
}) {
  const ref = useRef<InstancedMesh>(null)
  useInstances(ref, items)
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[geo, mat ?? undefined, items.length]} castShadow={shadow} receiveShadow>
      {children}
    </instancedMesh>
  )
}

