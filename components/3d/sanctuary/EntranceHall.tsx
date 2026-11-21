'use client'
// components/3d/sanctuary/EntranceHall.tsx — The reception hall inside the front dome.
// A curved reception desk ("Welcome to Mepawry") with marble panels faces the front door. Openings left and right
// lead into the outer gallery; the doorway behind the desk leads on to the inner gallery, the garden and the VIP
// pavilion — each has a sign above it. Behind the desk to the right, a slatted oak wall with the MEPAWRY SANCTUARY
// lettering and a screen showing the latest community-board stories (tap it to open the board); to the left, a mirror and a plant shelf. A board near the door, "Today we
// remember", cycles through the pets who joined today. Lounge corners with armchairs, a sofa and coffee tables, hanging ferns, potted palms, a wooden chandelier.

import { useEffect, useMemo } from 'react'
import { CanvasTexture, ExtrudeGeometry, MeshStandardMaterial, Shape, SRGBColorSpace, Vector2, type Texture } from 'three'
import {
  Armchair, FernPot, Ferns, herringboneTexture, Roses, Rug, rugTexture, SideTable, useDecorLamps, useDecorMaterials, type DMats,
} from './decor'
import { polar, useLamp, type V3 } from './shared'
import { startOfToday } from '@/lib/utils'

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

const welcomeTexture = () => tex(512, 160, g => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#C79566'); gr.addColorStop(1, '#A87448')
  g.fillStyle = gr; g.beginPath(); g.roundRect(4, 4, 504, 152, 18); g.fill()
  g.strokeStyle = '#7A4F2C'; g.lineWidth = 5; g.stroke()
  g.fillStyle = '#4A2A14'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = 'italic 600 40px Georgia, serif'; g.fillText('Welcome to', 256, 52)
  g.font = 'italic 700 58px Georgia, serif'; g.fillText('Mepawry 🐾', 256, 112)
})

const lettersTexture = () => tex(512, 160, g => {
  g.clearRect(0, 0, 512, 160)
  g.fillStyle = '#F5ECDC'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3
  g.font = '700 64px Georgia, serif'; g.fillText('MEPAWRY', 256, 52)
  g.font = '600 50px Georgia, serif'; g.fillText('SANCTUARY', 256, 116)
})

/** Break text into at most `max` lines that fit `width`, between words (Intl.Segmenter also splits Thai, which has
 * no spaces); the last line ends in … when the text runs on. */
function wrapLines(g: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const words = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text.replace(/\s+/g, ' ').trim())].map(w => w.segment)
  const lines: string[][] = [[]]
  const str = (l: string[]) => l.join('')
  for (const w of words) {
    const line = lines[lines.length - 1]
    if (!line.length && w === ' ') continue
    if (line.length && g.measureText(str(line) + w).width > width) {
      if (lines.length === max) {
        // out of room: drop whole words until the … fits
        while (line.length && g.measureText(str(line).trimEnd() + '…').width > width) line.pop()
        line.push('…')
        break
      }
      lines.push(w === ' ' ? [] : [w]); continue
    }
    line.push(w)
  }
  return lines.map(l => str(l).replace(/\s+…$/, '…'))
}

type BoardPost = { author_name: string; body: string; like_count: number; comment_count: number; pet: { name: string } | null }

/** The screen on the slat wall: the latest stories from the community board. */
function drawBoard(g: CanvasRenderingContext2D, posts: BoardPost[] | null) {
  const W = 1024, H = 576
  g.fillStyle = '#F6F0E4'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#3E5A36'; g.fillRect(0, 0, W, 86)
  g.fillStyle = '#FFFFFF'; g.textBaseline = 'middle'; g.textAlign = 'left'
  g.font = '700 44px Georgia, serif'; g.fillText('📖 Community Board', 34, 45)
  g.textAlign = 'right'; g.font = '24px sans-serif'; g.fillStyle = '#DDE8D2'; g.fillText('Latest stories', W - 34, 47)
  g.textAlign = 'left'
  if (!posts) { g.fillStyle = '#8A7A66'; g.font = 'italic 30px Georgia, serif'; g.fillText('Loading stories…', 34, 300) }
  else if (!posts.length) { g.fillStyle = '#8A7A66'; g.font = 'italic 30px Georgia, serif'; g.fillText('No stories yet — be the first to share one.', 34, 300) }
  posts?.slice(0, 3).forEach((p, i) => {
    const y = 106 + i * 132
    g.fillStyle = i % 2 ? '#EFE6D6' : '#FBF7EF'; g.beginPath(); g.roundRect(22, y, W - 44, 120, 14); g.fill()
    g.fillStyle = '#5A3A22'; g.font = '700 28px sans-serif'
    g.fillText(`${p.author_name}${p.pet ? ` · 🐾 ${p.pet.name}` : ''}`.slice(0, 48), 44, y + 32)
    g.fillStyle = '#3A2A1A'; g.font = '26px sans-serif'
    const lines = wrapLines(g, p.body, W - 220, 2)
    lines.forEach((l, k) => g.fillText(l, 44, y + 70 + k * 32))
    g.textAlign = 'right'; g.fillStyle = '#B0603A'; g.font = '24px sans-serif'
    g.fillText(`❤ ${p.like_count}  💬 ${p.comment_count}`, W - 44, y + 32); g.textAlign = 'left'
  })
  g.fillStyle = '#3E5A36'; g.font = '600 26px sans-serif'; g.textAlign = 'center'
  g.fillText('Tap the board to read and share stories →', W / 2, H - 28)
}

function BoardScreen({ m }: { m: DMats }) {
  const t = useMemo(() => tex(1024, 576, g => drawBoard(g, null)), [])
  useEffect(() => {
    let off = false
    const load = () => fetch('/api/board/posts?kind=story&sort=latest').then(r => r.json()).then(d => {
      if (off) return
      drawBoard((t.image as HTMLCanvasElement).getContext('2d')!, d.posts ?? [])
      t.needsUpdate = true
    }).catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => { off = true; clearInterval(id); t.dispose() }
  }, [t])
  const cursor = (c: string) => () => { document.body.style.cursor = c }
  return (
    <group position={[0, 1.6, 0]}
      onClick={e => { e.stopPropagation(); if (e.delta < 6) window.dispatchEvent(new Event('mepawry:board')) }}
      onPointerOver={cursor('pointer')} onPointerOut={cursor('')}>
      <mesh position-z={0.06} material={m.panelDark}><boxGeometry args={[2.05, 1.2, 0.05]} /></mesh>
      <mesh position-z={0.09}><planeGeometry args={[1.95, 1.1]} /><meshStandardMaterial map={t} emissiveMap={t} emissive="#FFFFFF" emissiveIntensity={0.3} /></mesh>
    </group>
  )
}

type NewPet = { name: string; primary_photo_url: string | null; species: 'dog' | 'cat' | 'other'; birth_year: number | null; death_year: number | null; epitaph: string | null }
const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', other: '🐰' }
const SHOW_MS = 6000 // how long each pet stays on the board (time to read their words)

/** The board by the door: the friends who joined today, one at a time — the photo fills the board, with the title
 * across the top and their name, years and the words their family wrote across the bottom. */
function drawToday(g: CanvasRenderingContext2D, pets: NewPet[] | null, i: number, img: HTMLImageElement | null) {
  const W = 384, H = 512
  const p = pets?.[i]
  const shade = (y0: number, y1: number, a0: number, a1: number) => {
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(20,14,8,${a0})`); gr.addColorStop(1, `rgba(20,14,8,${a1})`)
    g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0)
  }
  // the picture, cropped to fill the whole board (or a soft species backdrop without one)
  if (p && img) {
    const k = Math.max(W / img.width, H / img.height)
    g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k)
  } else {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#E9DCC4'); gr.addColorStop(1, '#C9B08A')
    g.fillStyle = gr; g.fillRect(0, 0, W, H)
    if (p) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '170px sans-serif'; g.fillText(SPECIES_EMOJI[p.species] ?? '🐾', W / 2, H / 2 - 30) }
  }
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6
  shade(0, 110, 0.7, 0)
  g.fillStyle = '#FFFFFF'; g.font = '700 30px Georgia, serif'; g.fillText('Today we remember', W / 2, 30)
  g.fillStyle = '#F1E4C8'; g.font = 'italic 17px Georgia, serif'
  g.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, 57)
  if (!p) {
    g.fillStyle = '#5A4636'; g.shadowBlur = 0; g.font = 'italic 22px Georgia, serif'
    if (!pets) g.fillText('Loading…', W / 2, 260)
    else { g.fillText('No new friends have', W / 2, 240); g.fillText('joined yet today.', W / 2, 270); g.font = 'italic 16px Georgia, serif'; g.fillText('Every friend here is remembered, always.', W / 2, 320) }
    return
  }
  // name, years and their words over a dark fade at the bottom
  g.font = 'italic 18px Georgia, serif'
  const words = p.epitaph ? wrapLines(g, `“${p.epitaph}”`, W - 48, 3) : []
  const years = p.birth_year && p.death_year ? `${p.birth_year} – ${p.death_year}` : p.death_year ? `† ${p.death_year}` : p.birth_year ? `b. ${p.birth_year}` : ''
  const top = H - 58 - words.length * 23 - (years ? 24 : 0) - 34
  g.shadowBlur = 0; shade(top - 110, top - 20, 0, 0.55); shade(top - 20, H, 0.55, 0.85); g.shadowBlur = 6
  let y = top
  g.fillStyle = '#FFFFFF'; g.font = '700 30px Georgia, serif'
  g.fillText(p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name, W / 2, y); y += 30
  if (years) { g.fillStyle = '#E8D9BE'; g.font = '16px sans-serif'; g.fillText(years, W / 2, y); y += 24 }
  g.fillStyle = '#FBF3E4'; g.font = 'italic 18px Georgia, serif'
  words.forEach((l, k) => g.fillText(l, W / 2, y + k * 23))
  g.fillStyle = '#D9C8AA'; g.font = '14px sans-serif'
  g.fillText(`${i + 1} / ${pets.length}  ·  Tap to see them all`, W / 2, H - 18)
  g.shadowBlur = 0
}

/** The board by the front door, cycling through today's new friends; tapping it opens the new-friends viewer in the hall page. */
function NewPetsBoard({ m }: { m: DMats }) {
  const t = useMemo(() => tex(384, 512, g => drawToday(g, null, 0, null)), [])
  useEffect(() => {
    let off = false, pets: NewPet[] = [], i = 0
    const imgs = new Map<string, Promise<HTMLImageElement | null>>()
    const photo = (url: string | null) => {
      if (!url) return Promise.resolve(null)
      if (!imgs.has(url)) imgs.set(url, new Promise(res => {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => res(img); img.onerror = () => res(null); img.src = url
      }))
      return imgs.get(url)!
    }
    const show = async () => {
      const p = pets[i], img = p ? await photo(p.primary_photo_url) : null
      if (off) return
      drawToday((t.image as HTMLCanvasElement).getContext('2d')!, pets, i, img)
      t.needsUpdate = true
      if (pets.length > 1) photo(pets[(i + 1) % pets.length].primary_photo_url) // have the next one ready
    }
    const load = () => fetch(`/api/pets?limit=100&since=${encodeURIComponent(startOfToday())}`).then(r => r.json()).then((d: { pets?: NewPet[] }) => {
      pets = d.pets ?? []; i = Math.min(i, Math.max(0, pets.length - 1)); show()
    }).catch(() => {})
    load()
    const tick = setInterval(() => { if (pets.length > 1) { i = (i + 1) % pets.length; show() } }, SHOW_MS)
    const refresh = setInterval(load, 120_000)
    return () => { off = true; clearInterval(tick); clearInterval(refresh); t.dispose() }
  }, [t])
  const cursor = (c: string) => () => { document.body.style.cursor = c }
  return (
    <group onClick={e => { e.stopPropagation(); if (e.delta < 6) window.dispatchEvent(new Event('mepawry:new-pets')) }}
      onPointerOver={cursor('pointer')} onPointerOut={cursor('')}>
      <mesh position={[0, 1.35, 0]} material={m.panelDark} castShadow><boxGeometry args={[1.0, 1.32, 0.06]} /></mesh>
      <mesh position={[0, 1.35, 0.035]}><planeGeometry args={[0.92, 1.24]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>
      {[-0.4, 0.4].map(x => <mesh key={x} position={[x, 0.36, 0]} material={m.panelDark}><boxGeometry args={[0.06, 0.72, 0.06]} /></mesh>)}
    </group>
  )
}

const passageSign = (label: string) => tex(512, 96, g => {
  g.fillStyle = '#3B2A1C'; g.beginPath(); g.roundRect(2, 2, 508, 92, 14); g.fill()
  g.strokeStyle = '#C9A15A'; g.lineWidth = 4; g.stroke()
  g.fillStyle = '#F6EAD2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 34px Georgia, serif'
  g.fillText(label, 256, 50)
})

/** Slatted oak feature wall. */
function SlatWall({ w, h, m }: { w: number; h: number; m: DMats }) {
  const n = Math.round(w / 0.12)
  return (
    <group>
      <mesh position={[0, h / 2, -0.03]} material={m.panelDark}><boxGeometry args={[w, h, 0.04]} /></mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / n), h / 2, 0.01]} material={m.panel}><boxGeometry args={[w / n - 0.035, h, 0.05]} /></mesh>
      ))}
    </group>
  )
}

/** Rustic chandelier: two wooden rings on iron chains, candle bulbs glowing. */
function WoodChandelier({ at, drop, m }: { at: V3; drop: number; m: DMats }) {
  const lamp = useLamp()
  const iron = useMemo(() => new MeshStandardMaterial({ color: '#3A2E24', roughness: 0.5, metalness: 0.6 }), [])
  return (
    <group position={at}>
      <mesh position-y={drop / 2} material={iron}><cylinderGeometry args={[0.02, 0.02, drop, 6]} /></mesh>
      {[[0.95, 0, 10], [0.55, -0.45, 6]].map(([r, y, n], k) => (
        <group key={k} position-y={y}>
          <mesh rotation-x={Math.PI / 2} material={m.panelDark} castShadow><torusGeometry args={[r, 0.05, 8, 40]} /></mesh>
          {Array.from({ length: n }, (_, i) => {
            const [x, , z] = polar((i / n) * Math.PI * 2, r)
            return (
              <group key={i} position={[x, 0.06, z]}>
                <mesh position-y={0.08} material={m.wax}><cylinderGeometry args={[0.025, 0.025, 0.14, 8]} /></mesh>
                <mesh position-y={0.19} material={m.flame}><sphereGeometry args={[0.03, 8, 6]} /></mesh>
              </group>
            )
          })}
          {[0, 1, 2, 3].map(i => { const [x, , z] = polar((i / 4) * Math.PI * 2 + 0.4, r); return <mesh key={i} position={[x / 2, 0.45, z / 2]} rotation={[z * 0.5, 0, -x * 0.5]} material={iron}><cylinderGeometry args={[0.008, 0.008, 1.0, 4]} /></mesh> })}
        </group>
      ))}
      <pointLight position-y={-0.3} intensity={30 * lamp} distance={12} decay={2} color="#FFD3A0" />
    </group>
  )
}

/** A curved slab: the ring between radii r0 and r1 over `span` radians centred on +z, `h` tall, standing on y = 0. */
function arcSlab(r0: number, r1: number, span: number, h: number) {
  // the shape is drawn in x/y and stood up (x stays, shape y becomes -z), so a point at angle a sits at (r·sin a, r·cos a)
  const at = (r: number, a: number) => new Vector2(r * Math.sin(a), -r * Math.cos(a))
  const n = 40, shape = new Shape()
  for (let i = 0; i <= n; i++) { const p = at(r1, -span / 2 + (span * i) / n); if (i) shape.lineTo(p.x, p.y); else shape.moveTo(p.x, p.y) }
  for (let i = n; i >= 0; i--) { const p = at(r0, -span / 2 + (span * i) / n); shape.lineTo(p.x, p.y) }
  const g = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  return g
}

/** The curved reception desk, its front facing +z. */
function ReceptionDesk({ m, welcome }: { m: DMats; welcome: Texture }) {
  const lamp = useLamp()
  const marble = useMemo(() => new MeshStandardMaterial({ color: '#DCD3C5', roughness: 0.25 }), [])
  // plain satin oak: the grain texture stretches into thick stripes around the curve
  const oak = useMemo(() => new MeshStandardMaterial({ color: '#94623A', roughness: 0.42 }), [])
  const span = 2.3 // radians of arc, centred on the front
  const [body, counter, plinth] = useMemo(() => [
    arcSlab(1.15, 1.6, span, 1.0), arcSlab(1.05, 1.72, span + 0.08, 0.06), arcSlab(1.2, 1.55, span, 0.08),
  ], [])
  useEffect(() => () => { body.dispose(); counter.dispose(); plinth.dispose() }, [body, counter, plinth])
  return (
    <group>
      {/* body, counter and plinth as solid curved slabs (inner wall, top and ends included), so it's whole from behind too */}
      <mesh geometry={body} material={oak} castShadow receiveShadow />
      <mesh geometry={counter} position-y={1.0} material={marble} castShadow receiveShadow />
      <mesh geometry={plinth} material={m.panelDark} />
      {/* marble panels either side of the sign */}
      {[-1, 1].map(s => {
        const a = s * 0.68
        return <mesh key={s} position={[Math.sin(a) * 1.615, 0.52, Math.cos(a) * 1.615]} rotation-y={a} material={marble}><planeGeometry args={[0.72, 0.78]} /></mesh>
      })}
      <mesh position={[0, 0.55, 1.62]}><planeGeometry args={[1.2, 0.38]} /><meshStandardMaterial map={welcome} roughness={0.5} /></mesh>
      {/* on the counter: a lamp, a screen, flowers, a little stand of cards */}
      <group position={[-0.95, 1.06, 0.95]}>
        <mesh position-y={0.18} material={m.gilt}><cylinderGeometry args={[0.02, 0.06, 0.36, 10]} /></mesh>
        <mesh position-y={0.42} material={m.glow}><cylinderGeometry args={[0.1, 0.16, 0.2, 16, 1, true]} /></mesh>
        <pointLight position-y={0.38} intensity={2.5 * lamp} distance={3} decay={2} color="#FFD3A0" />
      </group>
      <group position={[-0.25, 1.06, 1.05]} rotation-y={0.15}>
        <mesh position={[0, 0.03, 0]} material={m.marbleWhite}><boxGeometry args={[0.18, 0.02, 0.14]} /></mesh>
        <mesh position={[0, 0.24, -0.02]} material={m.marbleWhite}><boxGeometry args={[0.5, 0.32, 0.02]} /></mesh>
        <mesh position={[0, 0.24, -0.008]}><planeGeometry args={[0.46, 0.28]} /><meshStandardMaterial color="#BFD8E8" emissive="#9CC4E0" emissiveIntensity={0.6} /></mesh>
      </group>
      <mesh position={[0.75, 1.13, 1.0]} material={m.ceramic}><cylinderGeometry args={[0.06, 0.08, 0.16, 12]} /></mesh>
      <Roses at={[0.75, 1.24, 1.0]} r={0.14} m={m} />
      <mesh position={[0.35, 1.13, 1.18]} rotation-x={-0.4} material={m.panelDark}><boxGeometry args={[0.24, 0.14, 0.02]} /></mesh>
    </group>
  )
}

/** Everything inside the reception dome; `at` is the dome's centre on the ground, the front door faces +z. */
export function EntranceHall({ at, r }: { at: [number, number]; r: number }) {
  const m = useDecorMaterials()
  useDecorLamps(m)
  const floor = useMemo(() => { const t = herringboneTexture(); t.repeat.set(4, 4); return t }, [])
  const welcome = useMemo(welcomeTexture, [])
  const letters = useMemo(lettersTexture, [])
  const signs = useMemo(() => ({
    left: passageSign('← Outer Gallery · Zones A–D'),
    right: passageSign('Outer Gallery · Zones E–H →'),
    back: passageSign('↑ Garden · Inner Gallery · VIP'),
  }), [])
  const rugA = useMemo(() => rugTexture('#6B7B5A', '#8A9A70'), [])
  const sage = useMemo(() => new MeshStandardMaterial({ color: '#7E9A6E', roughness: 0.95 }), [])
  const apothem = r * Math.cos(Math.PI / 8)

  // a wall of the octagon: 0 = right (+x), 2 = front door (+z), 4 = left, 6 = back
  const wallAt = (i: number, inset: number) => {
    const a = (i * Math.PI) / 4
    const [x, , z] = polar(a, apothem - inset)
    return { pos: [x, 0, z] as V3, ry: Math.atan2(-Math.cos(a), -Math.sin(a)) }
  }
  const signOver = (i: number, t: Texture) => {
    const { pos, ry } = wallAt(i, 0.12)
    return <mesh position={[pos[0], 2.75, pos[2]]} rotation-y={ry}><planeGeometry args={[2.0, 0.38]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>
  }

  const ferns = useMemo(() => {
    const pots: V3[] = [[-4.1, 0, 1.4], [4.1, 0, 1.4], [-2.2, 0, -3.9], [2.2, 0, -3.9], [-3.3, 0, -2.6]]
    const plants = pots.map(p => ({ at: [p[0], 0.44, p[2]] as V3, size: 0.8 }))
    const hanging = [1, 3, 5, 7].map(i => ({ at: polar((i * Math.PI) / 4, apothem - 0.9, 3.4), size: 0.85 }))
    // a plant shelf under the mirror
    for (let k = -1; k <= 1; k++) plants.push({ at: [...polar((5 * Math.PI) / 4, apothem - 0.35, 1.25)].map((v, j) => (j === 0 ? v + k * 0.45 * Math.cos(Math.PI / 4) : j === 2 ? v - k * 0.45 * Math.sin(Math.PI / 4) : v)) as V3, size: 0.4 })
    return { pots, plants, hanging }
  }, [apothem])

  return (
    <group position={[at[0], 0, at[1]]}>
      {/* floor: oak herringbone with a marble circle under the desk */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 8} position-y={0.035} receiveShadow>
        <circleGeometry args={[r - 0.05, 8]} />
        <meshStandardMaterial map={floor} roughness={0.35} envMapIntensity={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, -0.6]} receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color="#D5CCBE" roughness={0.25} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.042, -0.6]}>
        <ringGeometry args={[2.32, 2.42, 64]} />
        <meshStandardMaterial color="#B48A4A" metalness={0.5} roughness={0.35} />
      </mesh>

      <group position={[0, 0, -0.6]}><ReceptionDesk m={m} welcome={welcome} /></group>

      {/* back right: slatted oak wall with the lettering and a screen */}
      {(() => {
        const { pos, ry } = wallAt(7, 0.12)
        return (
          <group position={pos} rotation-y={ry}>
            <SlatWall w={3.6} h={3.4} m={m} />
            <mesh position={[0, 2.85, 0.05]}><planeGeometry args={[2.4, 0.75]} /><meshStandardMaterial map={letters} transparent alphaTest={0.3} /></mesh>
            <BoardScreen m={m} />
          </group>
        )
      })()}
      {/* back left: a carved mirror over a plant shelf */}
      {(() => {
        const { pos, ry } = wallAt(5, 0.1)
        return (
          <group position={pos} rotation-y={ry}>
            <mesh position={[0, 1.65, 0]} material={m.gilt} castShadow><boxGeometry args={[1.0, 1.45, 0.06]} /></mesh>
            <mesh position={[0, 1.65, 0.035]}><planeGeometry args={[0.82, 1.27]} /><meshStandardMaterial color="#CFDCE0" metalness={1} roughness={0.05} /></mesh>
            <mesh position={[0, 1.2 - 0.02, 0.16]} material={m.panel} castShadow><boxGeometry args={[1.6, 0.05, 0.32]} /></mesh>
          </group>
        )
      })()}

      {/* signs over the three ways on */}
      {signOver(4, signs.left)}
      {signOver(0, signs.right)}
      {signOver(6, signs.back)}

      {/* the new-friends board near the front right */}
      <group position={[3.2, 0, 2.2]} rotation-y={-0.75}>
        <NewPetsBoard m={m} />
      </group>

      {/* lounge, front left: armchairs round a coffee table on a rug */}
      <group position={[-3.3, 0, 3.0]} rotation-y={0.75} scale={0.85}>
        <Rug at={[0, 0.045, 0]} size={[2.4, 2.0]} tex={rugA} />
        <Armchair at={[-0.7, 0, -0.35]} ry={1.2} m={m} />
        <Armchair at={[0.0, 0, -0.85]} ry={0.2} m={m} fabric={sage} />
        <Armchair at={[0.75, 0, -0.3]} ry={-1.0} m={m} />
        <SideTable at={[0, 0, 0.1]} m={m} />
      </group>
      {/* lounge, back left by the gallery opening (kept clear of the doorway): a sofa and a side table */}
      <group position={[-3.3, 0, -2.4]} rotation-y={0.9}>
        <mesh position={[0, 0.25, 0]} material={sage} castShadow><boxGeometry args={[1.8, 0.4, 0.75]} /></mesh>
        <mesh position={[0, 0.65, -0.3]} material={sage} castShadow><boxGeometry args={[1.8, 0.55, 0.16]} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * 0.85, 0.52, 0]} material={sage}><boxGeometry args={[0.14, 0.3, 0.75]} /></mesh>)}
        {[-0.45, 0.45].map(x => <mesh key={x} position={[x, 0.5, 0.02]} material={m.cushion}><boxGeometry args={[0.75, 0.1, 0.6]} /></mesh>)}
        <SideTable at={[0, 0, 0.75]} m={m} withFlowers={false} />
      </group>

      {/* plants */}
      <Ferns plants={ferns.plants} hanging={ferns.hanging} />
      {ferns.pots.map((p, i) => <FernPot key={i} at={p} m={m} />)}
      {ferns.hanging.map((p, i) => <FernPot key={i} at={p.at} m={m} hanging />)}

      <WoodChandelier at={[0, 3.7, 0]} drop={4.4 + r - 3.7 - 0.3} m={m} />
    </group>
  )
}
