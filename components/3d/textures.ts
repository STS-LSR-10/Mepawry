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
      g.fillStyle = (i + j) % 2 ? '#B9875E' : '#C4936A'
      g.fillRect(i * 128, j * 128, 128, 128)
    }
    g.strokeStyle = '#8E6440'; g.lineWidth = 3
    g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128)
  } else {
    const tones = ['#7A5236', '#835A3C', '#6F4A30', '#8A6042']
    for (let i = 0; i < 8; i++) {
      g.fillStyle = tones[i % tones.length]
      g.fillRect(0, i * 32, 256, 32)
      g.fillStyle = 'rgba(0,0,0,.25)'
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
export function plaqueTexture(text: string, kind: 'wood' | 'stone', w = 640, h = 160) {
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
    g.font = `600 ${Math.round(h * 0.42)}px Georgia, serif`
  } else {
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#E4DED4'); bg.addColorStop(1, '#C9C1B4')
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? 90 : 255},${i % 2 ? 80 : 250},${i % 2 ? 70 : 240},.18)`; g.fillRect((i * 73.1) % w, (i * 37.9) % h, 1.6, 1.6) }
    g.fillStyle = '#4A4036'; g.shadowColor = 'rgba(255,255,255,.6)'; g.shadowOffsetY = 1.5
    g.font = `500 ${Math.round(h * 0.3)}px Georgia, serif`
  }
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 3, w - 90)
  return finish(c)
}

/** Golden pastel name tag (✦ Name) for the avatar. */
export function nameTagTexture(text: string) {
  const w = 512, h = 112
  const { c, g } = canvas(w, h)
  g.font = '700 50px system-ui, sans-serif'
  const tw = Math.min(w - 20, g.measureText(text).width + 70)
  const x0 = (w - tw) / 2
  const grad = g.createLinearGradient(0, 8, 0, h - 8)
  grad.addColorStop(0, '#F3D99B'); grad.addColorStop(1, '#D9B26A')
  g.shadowColor = 'rgba(80,50,10,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3
  g.fillStyle = grad
  g.beginPath(); g.roundRect(x0, 10, tw, h - 24, (h - 24) / 2); g.fill()
  g.shadowColor = 'transparent'
  g.strokeStyle = 'rgba(255,248,225,.85)'; g.lineWidth = 3
  g.beginPath(); g.roundRect(x0 + 4, 14, tw - 8, h - 32, (h - 32) / 2); g.stroke()
  g.fillStyle = '#FFFDF6'; g.shadowColor = 'rgba(120,80,20,.45)'; g.shadowBlur = 3; g.shadowOffsetY = 2
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 - 1, tw - 30)
  return finish(c)
}

/** Knitted hoodie front: soft ribbing with little bones and paw prints raised in a lighter shade. */
export function hoodieTexture(base: string, accent: string) {
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
  g.save(); g.translate(128, 0); g.scale(1.35, 1.35); g.translate(-128, 0)
  bone(108, 78, -0.5); bone(150, 92, 0.4); bone(124, 112, -0.15)
  paw(104, 140); paw(152, 132)
  g.restore()
  return finish(c)
}
