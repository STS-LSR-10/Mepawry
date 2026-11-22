// components/3d/textures.ts — Canvas-drawn textures: pet portraits, signs, floor tiles (no image files needed)

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { SPECIES_LOOK } from '@/lib/utils'
import type { Pet } from '@/types'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return { c, g: c.getContext('2d')! }
}

function finish(c: HTMLCanvasElement) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/**
 * Portrait card: species gradient + emoji, or the pet's photo once it loads.
 * withName adds a little name plate under the picture (for shelf cubbies).
 */
export function petTexture(pet: Pet, withName: boolean) {
  const W = 256, H = withName ? 330 : 300
  const { c, g } = canvas(W, H)
  const t = finish(c)
  const look = SPECIES_LOOK[pet.species]
  const pic = { x: 16, y: 16, w: W - 32, h: 268 - 32 }

  const draw = (img?: HTMLImageElement) => {
    g.fillStyle = '#FBF6EC'
    g.fillRect(0, 0, W, H)
    if (img) {
      // Cover-fit the photo into the picture area
      const s = Math.max(pic.w / img.width, pic.h / img.height)
      const w = img.width * s, h = img.height * s
      g.save(); g.beginPath(); g.rect(pic.x, pic.y, pic.w, pic.h); g.clip()
      g.drawImage(img, pic.x + (pic.w - w) / 2, pic.y + (pic.h - h) / 2, w, h)
      g.restore()
    } else {
      if (pet.species === 'other') {
        const grad = g.createLinearGradient(pic.x, pic.y, pic.x + pic.w, pic.y + pic.h)
        grad.addColorStop(0, look.from); grad.addColorStop(1, look.to)
        g.fillStyle = grad
        g.fillRect(pic.x, pic.y, pic.w, pic.h)
        g.font = '110px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillText(look.emoji, W / 2, pic.y + pic.h / 2 + 6)
      } else {
        drawIllustration(g, pet.species, pic)
      }
    }
    if (withName) {
      g.fillStyle = '#C9A227'
      g.fillRect(40, 272, W - 80, 44)
      g.fillStyle = '#3A2A12'
      g.font = '600 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(pet.name.length > 14 ? pet.name.slice(0, 13) + '…' : pet.name, W / 2, 295, W - 90)
    }
    t.needsUpdate = true
  }

  draw()
  if (pet.primary_photo_url) {
    const img = new Image()
    img.crossOrigin = 'anonymous' // photos live on Supabase Storage; without this WebGL refuses the canvas
    img.onload = () => draw(img)
    img.src = pet.primary_photo_url
  }
  return t
}

/** Rounded sign with centred text, e.g. aisle names and the reception plate. */
export function signTexture(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string } = {}) {
  const { w = 512, h = 112, bg = '#F4ECDD', fg = '#5A3A22', font = 'italic 600 52px Georgia, serif' } = opts
  const { c, g } = canvas(w, h)
  g.fillStyle = bg
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, h / 2 - 4); g.fill()
  g.fillStyle = fg
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 2, w - 40)
  return finish(c)
}

/** Repeating floor pattern: warm stone tiles (lobby) or wooden planks (library). */
export function floorTexture(kind: 'tiles' | 'planks', repeat: [number, number]) {
  const { c, g } = canvas(256, 256)
  if (kind === 'tiles') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#E9E1D3' : '#DED5C5' // ivory stone tiles
      g.fillRect(i * 128, j * 128, 128, 128)
    }
    g.strokeStyle = '#C6BCAB'; g.lineWidth = 3
    g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128)
  } else {
    const tones = ['#DCCFB9', '#D4C6AE', '#E2D6C2', '#CFC1A8'] // light ash planks
    for (let i = 0; i < 8; i++) {
      g.fillStyle = tones[i % tones.length]
      g.fillRect(0, i * 32, 256, 32)
      g.fillStyle = 'rgba(80,60,40,.18)'
      g.fillRect(0, i * 32 + 30, 256, 2)
      g.fillRect(((i * 97) % 256), i * 32, 2, 32)
    }
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  return t
}

/** Night sky with a moon and stars, for the back of a shrine cabinet. */
export function nightTexture() {
  const { c, g } = canvas(256, 256)
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#1B1F45'); grad.addColorStop(1, '#4A4A7A')
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#FFF4D6'
  for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + ((i * 37) % 60) / 100; g.fillRect((i * 73) % 256, (i * 151) % 200, 2, 2) }
  g.globalAlpha = 1
  g.beginPath(); g.arc(70, 60, 22, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#1F2350'; g.beginPath(); g.arc(80, 54, 20, 0, Math.PI * 2); g.fill()
  return finish(c)
}


/** A soft-shaded happy puppy or kitten, for pets without a photo yet. */
function drawIllustration(g: CanvasRenderingContext2D, species: 'dog' | 'cat', r: { x: number; y: number; w: number; h: number }) {
  const cx = r.x + r.w / 2, u = r.w / 224 // drawn for a 224px-wide picture, scaled to fit
  const bg = g.createLinearGradient(0, r.y, 0, r.y + r.h)
  bg.addColorStop(0, '#E8C9E6'); bg.addColorStop(1, '#F6DCC8')
  g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip()
  g.fillStyle = bg; g.fillRect(r.x, r.y, r.w, r.h)
  const halo = g.createRadialGradient(cx, r.y + r.h * 0.45, 10, cx, r.y + r.h * 0.45, r.w * 0.6)
  halo.addColorStop(0, 'rgba(255,240,220,.7)'); halo.addColorStop(1, 'rgba(255,240,220,0)')
  g.fillStyle = halo; g.fillRect(r.x, r.y, r.w, r.h)

  const dog = species === 'dog'
  const fur = dog ? ['#F2C27E', '#D9984A', '#B8762F'] : ['#F4D7B0', '#E3A962', '#C98A45']
  const shade = (x: number, y: number, rad: number) => {
    const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.35, rad * 0.1, x, y, rad)
    gr.addColorStop(0, fur[0]); gr.addColorStop(0.7, fur[1]); gr.addColorStop(1, fur[2])
    return gr
  }
  const ell = (x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx * u, ry * u, rot, 0, Math.PI * 2) }
  const hy = r.y + r.h * 0.42

  // Body and chest fluff
  g.fillStyle = shade(cx, r.y + r.h * 0.86, 90 * u); ell(cx, r.y + r.h * 0.9, 72, 58); g.fill()
  g.fillStyle = '#FFF1DC'; ell(cx, r.y + r.h * 0.86, 34, 30); g.fill()

  // Ears behind the head
  g.fillStyle = fur[2]
  if (dog) {
    ell(cx - 50 * u, hy + 8 * u, 22, 44, 0.35); g.fill()
    ell(cx + 50 * u, hy + 8 * u, 22, 44, -0.35); g.fill()
  } else {
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + s * 52 * u, hy - 20 * u); g.lineTo(cx + s * 40 * u, hy - 72 * u); g.lineTo(cx + s * 12 * u, hy - 42 * u); g.closePath(); g.fill()
      g.fillStyle = '#F2A7A0'; g.beginPath(); g.moveTo(cx + s * 44 * u, hy - 30 * u); g.lineTo(cx + s * 39 * u, hy - 60 * u); g.lineTo(cx + s * 22 * u, hy - 42 * u); g.closePath(); g.fill()
      g.fillStyle = fur[2]
    }
  }
  // Head
  g.fillStyle = shade(cx, hy, 64 * u); ell(cx, hy, 58, 52); g.fill()
  // Muzzle
  g.fillStyle = '#FFF0D8'; ell(cx, hy + 20 * u, dog ? 30 : 24, dog ? 22 : 17); g.fill()
  // Eyes with a glint
  for (const s of [-1, 1]) {
    g.fillStyle = '#2B1A12'; ell(cx + s * 22 * u, hy - 6 * u, 7, 8); g.fill()
    g.fillStyle = '#FFFFFF'; ell(cx + s * 22 * u + 2.5 * u, hy - 9 * u, 2.4, 2.4); g.fill()
    g.fillStyle = 'rgba(240,120,120,.35)'; ell(cx + s * 36 * u, hy + 12 * u, 9, 5); g.fill()
  }
  // Nose and smile
  g.fillStyle = '#3A2418'; ell(cx, hy + 10 * u, dog ? 9 : 5, dog ? 6.5 : 4); g.fill()
  g.strokeStyle = '#3A2418'; g.lineWidth = 2.2 * u; g.lineCap = 'round'
  g.beginPath(); g.moveTo(cx, hy + 15 * u); g.quadraticCurveTo(cx - 9 * u, hy + 26 * u, cx - 16 * u, hy + 20 * u); g.stroke()
  g.beginPath(); g.moveTo(cx, hy + 15 * u); g.quadraticCurveTo(cx + 9 * u, hy + 26 * u, cx + 16 * u, hy + 20 * u); g.stroke()
  if (dog) {
    g.fillStyle = '#EE7F86'; ell(cx, hy + 30 * u, 8, 10); g.fill()
    g.strokeStyle = '#D0606A'; g.lineWidth = 1.2 * u; g.beginPath(); g.moveTo(cx, hy + 24 * u); g.lineTo(cx, hy + 36 * u); g.stroke()
  } else {
    g.strokeStyle = 'rgba(80,50,30,.5)'; g.lineWidth = 1.2 * u
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
      g.beginPath(); g.moveTo(cx + s * 18 * u, hy + 18 * u + k * 4 * u); g.lineTo(cx + s * 46 * u, hy + 14 * u + k * 8 * u); g.stroke()
    }
  }
  g.restore()
}

/** Dark walnut with long wavy grain and the odd knot. Repeats. */
export function woodTexture() {
  const { c, g } = canvas(512, 512)
  const base = g.createLinearGradient(0, 0, 512, 0)
  base.addColorStop(0, '#4A2C1A'); base.addColorStop(0.5, '#5C3822'); base.addColorStop(1, '#4A2C1A')
  g.fillStyle = base; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 90; i++) {
    const y0 = (i * 5.7) % 512, a = 2 + ((i * 13) % 7), f = 0.008 + ((i * 7) % 5) * 0.002
    g.strokeStyle = i % 3 ? `rgba(30,15,8,${0.12 + (i % 5) * 0.04})` : `rgba(140,90,55,${0.08 + (i % 4) * 0.03})`
    g.lineWidth = 0.6 + (i % 4) * 0.5
    g.beginPath()
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, y0 + Math.sin(x * f + i) * a + Math.sin(x * 0.003 + i * 0.7) * 6)
    g.stroke()
  }
  for (const [x, y] of [[140, 180], [390, 400]]) {
    for (let k = 6; k > 0; k--) { g.strokeStyle = `rgba(25,12,6,${0.08 * k})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, k * 7, k * 2.6, 0, 0, Math.PI * 2); g.stroke() }
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Deep midnight-blue sky full of soft stars (for the back of the shrine). */
export function midnightTexture() {
  const { c, g } = canvas(512, 512)
  const grad = g.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#0D1033'); grad.addColorStop(0.6, '#1E1F52'); grad.addColorStop(1, '#2E2A62')
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 140; i++) {
    const x = (i * 97.3) % 512, y = (i * 61.7 + (i % 7) * 31) % 512, r = 0.6 + ((i * 17) % 10) / 9
    const s = g.createRadialGradient(x, y, 0, x, y, r * 3.5)
    s.addColorStop(0, 'rgba(255,244,214,.95)'); s.addColorStop(1, 'rgba(255,244,214,0)')
    g.fillStyle = s; g.beginPath(); g.arc(x, y, r * 3.5, 0, Math.PI * 2); g.fill()
  }
  return finish(c)
}

/** A glowing crescent moon on a transparent background. */
export function moonTexture() {
  const { c, g } = canvas(256, 256)
  const halo = g.createRadialGradient(128, 128, 40, 128, 128, 126)
  halo.addColorStop(0, 'rgba(255,236,190,.55)'); halo.addColorStop(1, 'rgba(255,236,190,0)')
  g.fillStyle = halo; g.fillRect(0, 0, 256, 256)
  g.save()
  g.beginPath(); g.arc(128, 128, 62, 0, Math.PI * 2); g.clip()
  const body = g.createRadialGradient(100, 110, 10, 128, 128, 62)
  body.addColorStop(0, '#FFFBEA'); body.addColorStop(1, '#F6DFA0')
  g.fillStyle = body; g.fillRect(0, 0, 256, 256)
  g.globalCompositeOperation = 'destination-out'
  g.beginPath(); g.arc(160, 108, 58, 0, Math.PI * 2); g.fill()
  g.restore()
  return finish(c)
}

/** Soft round glow: halos around flames and bulbs, and the out-of-focus bokeh. */
export function glowTexture() {
  const { c, g } = canvas(128, 128)
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return finish(c)
}

/** Name plaques: walnut with a gold inlay border and gold letters, or pale carved stone. */
export function plaqueTexture(text: string, kind: 'wood' | 'stone', w = 640, h = 160, size = kind === 'stone' ? 0.3 : 0.42) {
  const { c, g } = canvas(w, h)
  const rad = kind === 'stone' ? h / 2 - 6 : 18
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, rad); g.clip()
  if (kind === 'wood') {
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#6A4128'); bg.addColorStop(1, '#4A2A18')
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(25,12,6,${0.12 + (i % 4) * 0.05})`; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= w; x += 10) g.lineTo(x, i * (h / 26) + Math.sin(x * 0.02 + i) * 2); g.stroke() }
    g.strokeStyle = '#D9B04A'; g.lineWidth = 5
    g.beginPath(); g.roundRect(18, 18, w - 36, h - 36, 12); g.stroke()
    g.lineWidth = 1.5; g.beginPath(); g.roundRect(28, 28, w - 56, h - 56, 8); g.stroke()
    g.fillStyle = '#E8C365'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 4; g.shadowOffsetY = 2
    g.font = `600 ${Math.round(h * size)}px Georgia, serif`
  } else {
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#E4DED4'); bg.addColorStop(1, '#C9C1B4')
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? 90 : 255},${i % 2 ? 80 : 250},${i % 2 ? 70 : 240},.18)`; g.fillRect((i * 73.1) % w, (i * 37.9) % h, 1.6, 1.6) }
    g.fillStyle = '#4A4036'; g.shadowColor = 'rgba(255,255,255,.6)'; g.shadowOffsetY = 1.5
    g.font = `600 ${Math.round(h * size)}px Georgia, serif`
  }
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 3, w - 90)
  return finish(c)
}

/** The shrine's brass nameplate: the name large, and a second line (flag and years) smaller beneath. */
export function nameplateTexture(name: string, sub: string) {
  const w = 900, h = 280
  const { c, g } = canvas(w, h)
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.clip()
  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#D9B866'); bg.addColorStop(0.45, '#B98E3E'); bg.addColorStop(0.55, '#C9A352'); bg.addColorStop(1, '#9A7028')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(255,255,255,${0.03 + (i % 5) * 0.012})`; g.lineWidth = 1; g.beginPath(); g.moveTo(0, i * 2); g.lineTo(w, i * 2 + 6); g.stroke() } // brushed
  g.strokeStyle = 'rgba(110,70,20,.55)'; g.lineWidth = 4; g.beginPath(); g.roundRect(22, 22, w - 44, h - 44, 14); g.stroke()
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillStyle = '#3E2508'; g.shadowColor = 'rgba(255,236,190,.55)'; g.shadowOffsetY = 2
  g.font = `600 ${sub ? 104 : 120}px Georgia, serif`
  g.fillText(name, w / 2, sub ? h * 0.42 : h / 2 + 4, w - 120)
  if (sub) { g.font = '500 50px Georgia, "Apple Color Emoji", "Segoe UI Emoji", serif'; g.fillStyle = '#4A2E0E'; g.fillText(sub, w / 2, h * 0.75, w - 140) }
  return finish(c)
}

/** Name tag (✦ Name): cream letters on a dark chocolate pill with a thin gold rim, readable on any background. */
export function nameTagTexture(text: string) {
  const w = 512, h = 112
  const { c, g } = canvas(w, h)
  g.font = '700 46px system-ui, sans-serif'
  const tw = Math.min(w - 16, g.measureText(text).width + 64)
  const x0 = (w - tw) / 2
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3
  g.fillStyle = 'rgba(42,26,16,.9)'
  g.beginPath(); g.roundRect(x0, 12, tw, h - 26, (h - 26) / 2); g.fill()
  g.shadowColor = 'transparent'
  g.strokeStyle = '#E8C365'; g.lineWidth = 3
  g.beginPath(); g.roundRect(x0 + 2, 14, tw - 4, h - 30, (h - 30) / 2); g.stroke()
  g.fillStyle = '#FFF6E2'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 - 1, tw - 28)
  return finish(c)
}

/** Knitted hoodie front: soft ribbing with little bones and paw prints raised in a lighter shade. */
export function hoodieTexture(base: string, accent: string, motifs = true) {
  const { c, g } = canvas(256, 256)
  g.fillStyle = base; g.fillRect(0, 0, 256, 256)
  for (let x = 0; x < 256; x += 5) { g.fillStyle = x % 10 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.06)'; g.fillRect(x, 0, 2, 256) }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${i % 2 ? '255,255,255' : '0,0,0'},.04)`; g.fillRect((i * 53.3) % 256, (i * 29.7) % 256, 2, 1) }
  g.fillStyle = accent
  g.shadowColor = 'rgba(0,0,0,.12)'; g.shadowBlur = 2; g.shadowOffsetY = 1.5
  // The front of the body is the middle of the texture (the mesh is turned so the seam sits at the back)
  const bone = (x: number, y: number, a: number) => {
    g.save(); g.translate(x, y); g.rotate(a)
    g.fillRect(-9, -2.5, 18, 5)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * 10, sy * 3, 3.4, 0, Math.PI * 2); g.fill() }
    g.restore()
  }
  const paw = (x: number, y: number) => {
    g.beginPath(); g.ellipse(x, y + 3, 6, 5, 0, 0, Math.PI * 2); g.fill()
    for (const [dx, dy] of [[-7, -4], [-2.5, -8], [2.5, -8], [7, -4]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); g.fill() }
  }
  if (!motifs) return finish(c) // plain knit (sweater)
  g.save(); g.translate(128, 0); g.scale(1.35, 1.35); g.translate(-128, 0)
  bone(108, 78, -0.5); bone(150, 92, 0.4); bone(124, 112, -0.15)
  paw(104, 140); paw(152, 132)
  g.restore()
  return finish(c)
}

/** Lawn: base colour with blades, light and dark patches. Repeats. */
export function lawnTexture(base: string) {
  const { c, g } = canvas(256, 256)
  g.fillStyle = base; g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 60; i++) {
    const x = (i * 97.1) % 256, y = (i * 57.3) % 256, r = 18 + (i % 5) * 9
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, i % 2 ? 'rgba(255,255,200,.06)' : 'rgba(0,30,0,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  for (let i = 0; i < 2600; i++) {
    const x = (i * 73.13) % 256, y = (i * 41.77 + (i % 13) * 7) % 256
    g.strokeStyle = i % 3 ? 'rgba(20,50,10,.22)' : 'rgba(210,235,150,.18)'
    g.lineWidth = 1
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + ((i % 5) - 2) * 0.6, y - 3 - (i % 4)); g.stroke()
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Warm stone pavers in a running bond, with mortar and a little wear. Repeats. */
export function pavingTexture() {
  const { c, g } = canvas(256, 256)
  g.fillStyle = '#8D8070'; g.fillRect(0, 0, 256, 256)
  const tones = ['#C9B79C', '#BFAE92', '#D3C3A8', '#B9A688', '#CDBEA4']
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 32 : 0
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + off + 2, y = row * 32 + 2
      g.fillStyle = tones[(row * 3 + col + 7) % tones.length]
      g.beginPath(); g.roundRect(x, y, 60, 28, 4); g.fill()
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${k % 2 ? '255,255,255' : '60,45,30'},.07)`; g.fillRect(x + ((k * 13.7) % 58), y + ((k * 7.3) % 26), 2, 2) }
    }
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Outside walls: cut stone blocks over a darker plinth line. Repeats. */
export function stoneWallTexture() {
  const { c, g } = canvas(256, 256)
  g.fillStyle = '#6F655A'; g.fillRect(0, 0, 256, 256)
  const tones = ['#B9AE9C', '#AEA391', '#C4BAA8', '#A69B88', '#BDB3A1']
  for (let row = 0; row < 6; row++) {
    const h = 256 / 6, off = row % 2 ? 40 : 0
    for (let col = -1; col < 4; col++) {
      const x = col * 80 + off + 2, y = row * h + 2
      const gr = g.createLinearGradient(0, y, 0, y + h)
      gr.addColorStop(0, tones[(row + col + 5) % tones.length]); gr.addColorStop(1, '#9A8F7D')
      g.fillStyle = gr; g.fillRect(x, y, 76, h - 4)
      for (let k = 0; k < 50; k++) { g.fillStyle = `rgba(${k % 2 ? '255,255,255' : '50,40,30'},.06)`; g.fillRect(x + ((k * 17.3) % 74), y + ((k * 9.1) % (h - 6)), 2, 2) }
    }
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Roof: overlapping clay tiles. Repeats. */
export function roofTileTexture() {
  const { c, g } = canvas(256, 256)
  g.fillStyle = '#4A2A1C'; g.fillRect(0, 0, 256, 256)
  for (let row = 0; row < 10; row++) {
    const y = row * 25.6, off = row % 2 ? 16 : 0
    for (let col = -1; col < 9; col++) {
      const x = col * 32 + off
      const gr = g.createLinearGradient(0, y, 0, y + 26)
      gr.addColorStop(0, '#8A4A32'); gr.addColorStop(1, '#5E2F1F')
      g.fillStyle = gr
      g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 31, y); g.lineTo(x + 31, y + 20); g.quadraticCurveTo(x + 16, y + 28, x + 1, y + 20); g.closePath(); g.fill()
    }
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Rippling water, for the fountain basin. Repeats. */
export function waterTexture() {
  const { c, g } = canvas(128, 128)
  const gr = g.createLinearGradient(0, 0, 128, 128)
  gr.addColorStop(0, '#5FA8C8'); gr.addColorStop(1, '#3E86AA')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5
  for (let i = 0; i < 14; i++) {
    g.beginPath()
    for (let x = 0; x <= 128; x += 4) g.lineTo(x, (i * 9.3 + Math.sin(x * 0.1 + i) * 3) % 128)
    g.stroke()
  }
  const t = finish(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** The lobby notice board: cork with the latest stories (polaroid cards) and kind-word notes pinned on it. */
export interface BoardCard { kind: 'story' | 'note'; title: string; body: string; photo?: string | null; color?: string | null }
export function boardTexture() {
  const W = 1024, H = 640
  const { c, g } = canvas(W, H)
  const t = finish(c)
  const images = new Map<string, HTMLImageElement>()
  let cards: BoardCard[] = []

  const wrap = (text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number) => {
    const words = text.replace(/\s+/g, ' ').split(' ')
    let line = '', n = 0
    for (let i = 0; i < words.length && n < maxLines; i++) {
      const test = line ? line + ' ' + words[i] : words[i]
      if (g.measureText(test).width > maxW && line) {
        g.fillText(n === maxLines - 1 ? line + '…' : line, x, y + n * lineH); n++; line = words[i]
      } else line = test
    }
    if (n < maxLines && line) g.fillText(line, x, y + n * lineH)
  }

  const draw = () => {
    // cork
    g.fillStyle = '#B98A5E'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 5000; i++) { g.fillStyle = i % 3 ? 'rgba(70,40,15,.22)' : 'rgba(255,235,200,.14)'; g.fillRect((i * 97.31) % W, (i * 53.17) % H, 2, 2) }
    // header strip
    g.fillStyle = 'rgba(255,248,238,.92)'; g.beginPath(); g.roundRect(W / 2 - 170, 18, 340, 56, 28); g.fill()
    g.fillStyle = '#5C3A1E'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('📖 Stories & kind words', W / 2, 47)
    const show = cards.length ? cards : [
      { kind: 'note', title: '', body: 'Share a story about your pet. Tap the board.', color: '#FFF4C2' },
      { kind: 'note', title: '', body: 'Leave a few kind words for a stranger.', color: '#FFD9E2' },
    ] as BoardCard[]
    show.slice(0, 6).forEach((card, i) => {
      const col = i % 3, row = Math.floor(i / 3)
      const cw = 290, ch = 250, x = 42 + col * 320, y = 96 + row * 268
      g.save(); g.translate(x + cw / 2, y + ch / 2); g.rotate(((i * 37) % 7 - 3) * 0.012); g.translate(-cw / 2, -ch / 2)
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 4
      g.fillStyle = card.kind === 'note' ? card.color ?? '#FFF4C2' : '#FBF8F2'
      g.fillRect(0, 0, cw, ch)
      g.shadowColor = 'transparent'
      g.textAlign = 'left'; g.textBaseline = 'top'
      if (card.kind === 'story') {
        const img = card.photo ? images.get(card.photo) : undefined
        if (img?.complete && img.naturalWidth) {
          const s = Math.max(270 / img.naturalWidth, 130 / img.naturalHeight)
          g.save(); g.beginPath(); g.rect(10, 10, 270, 130); g.clip()
          g.drawImage(img, 10 + (270 - img.naturalWidth * s) / 2, 10 + (130 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s)
          g.restore()
        } else { g.fillStyle = '#EADFCF'; g.fillRect(10, 10, 270, 130); g.font = '60px serif'; g.textAlign = 'center'; g.fillText('🐾', cw / 2, 45); g.textAlign = 'left' }
        g.fillStyle = '#2A1E17'; g.font = '700 26px Georgia, serif'; wrap('📖 ' + card.title, 14, 150, 262, 30, 1)
        g.fillStyle = '#5C5046'; g.font = 'italic 21px Georgia, serif'; wrap(card.body, 14, 186, 262, 26, 2)
      } else {
        g.fillStyle = '#2A1E17'; g.font = '600 25px Georgia, serif'; wrap(card.body, 18, 34, 254, 31, 6)
        if (card.title) { g.fillStyle = '#5C5046'; g.font = '600 18px system-ui, sans-serif'; wrap('— ' + card.title, 18, ch - 34, 254, 20, 1) }
      }
      // pin
      g.fillStyle = '#C9473F'; g.beginPath(); g.arc(cw / 2, 12, 9, 0, Math.PI * 2); g.fill()
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(cw / 2 - 3, 9, 3, 0, Math.PI * 2); g.fill()
      g.restore()
    })
    t.needsUpdate = true
  }

  const set = (next: BoardCard[]) => {
    cards = next
    for (const card of cards) {
      if (!card.photo || images.has(card.photo)) continue
      const img = new Image()
      img.crossOrigin = 'anonymous' // photos live on Supabase Storage
      img.onload = draw
      img.src = card.photo
      images.set(card.photo, img)
    }
    draw()
  }
  draw()
  return { texture: t, set }
}
