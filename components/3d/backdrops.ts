// components/3d/backdrops.ts — Paints each shrine backdrop on a canvas: used as the cabinet's back wall (3D) and,
// scaled down, as the picker's thumbnails. Everything is drawn in code (no image downloads), with a seeded random
// so a backdrop looks the same every time.

import { CanvasTexture, SRGBColorSpace } from 'three'

type G = CanvasRenderingContext2D
const W = 640, H = 512
const TAU = Math.PI * 2

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function sky(g: G, stops: [number, string][], y0 = 0, y1 = H) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  stops.forEach(([o, c]) => gr.addColorStop(o, c))
  g.fillStyle = gr; g.fillRect(0, 0, W, H)
}
/** Soft round light. color is 'r,g,b'; it fades to the same colour, transparent (fading to black looks grey). */
function glow(g: G, x: number, y: number, r: number, color: string, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, `rgba(${color},${a})`); gr.addColorStop(1, `rgba(${color},0)`)
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
}
function stars(g: G, n: number, seed: number, maxY = H, color = '255,244,214') {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * maxY, s = 0.6 + r() * 1.6
    glow(g, x, y, s * 3.5, color, 0.95)
  }
}
function cloud(g: G, x: number, y: number, s: number, color: string) {
  g.fillStyle = color
  for (const [dx, dy, rr] of [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [-0.9, 0.1, 0.7], [0.9, 0.25, 0.9]]) {
    g.beginPath(); g.arc(x + dx * 30 * s, y + dy * 30 * s, rr * 32 * s, 0, TAU); g.fill()
  }
}
function hills(g: G, base: number, amp: number, color: string, seed: number) {
  const r = rng(seed), k = 1.5 + r() * 2, p = r() * TAU
  g.fillStyle = color; g.beginPath(); g.moveTo(0, H)
  for (let x = 0; x <= W; x += 8) g.lineTo(x, base - Math.sin(x / W * Math.PI * k + p) * amp - Math.sin(x / 37 + p) * amp * 0.12)
  g.lineTo(W, H); g.closePath(); g.fill()
}
function water(g: G, top: number, a: string, b: string) {
  const gr = g.createLinearGradient(0, top, 0, H)
  gr.addColorStop(0, a); gr.addColorStop(1, b)
  g.fillStyle = gr; g.fillRect(0, top, W, H - top)
}
function shimmer(g: G, x: number, top: number, color: string, seed: number) {
  const r = rng(seed)
  g.fillStyle = color
  for (let y = top + 6; y < H; y += 9) {
    const w = (20 + r() * 50) * (1 + (y - top) / 160)
    g.globalAlpha = 0.25 + r() * 0.5; g.fillRect(x - w / 2 + (r() - 0.5) * 30, y, w, 2)
  }
  g.globalAlpha = 1
}
function rays(g: G, x: number, y: number, n: number, color: string, spread = 1.4, from = Math.PI / 2) {
  g.save(); g.globalAlpha = 0.16
  for (let i = 0; i < n; i++) {
    const a = from - spread / 2 + (spread * i) / (n - 1)
    g.fillStyle = color; g.beginPath(); g.moveTo(x, y)
    g.lineTo(x + Math.cos(a - 0.05) * 900, y + Math.sin(a - 0.05) * 900)
    g.lineTo(x + Math.cos(a + 0.05) * 900, y + Math.sin(a + 0.05) * 900); g.fill()
  }
  g.restore()
}
function heart(g: G, x: number, y: number, s: number) {
  g.beginPath(); g.moveTo(x, y + s * 0.35)
  g.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s * 1.05, x, y - s * 0.45)
  g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s, y - s * 0.4, x, y + s * 0.35); g.fill()
}
function paw(g: G, x: number, y: number, s: number, a: number) {
  g.save(); g.translate(x, y); g.rotate(a)
  g.beginPath(); g.ellipse(0, s * 0.35, s * 0.55, s * 0.45, 0, 0, TAU); g.fill()
  for (const [dx, dy] of [[-0.55, -0.25], [-0.2, -0.6], [0.2, -0.6], [0.55, -0.25]]) { g.beginPath(); g.ellipse(dx * s, dy * s, s * 0.2, s * 0.26, 0, 0, TAU); g.fill() }
  g.restore()
}
function petal(g: G, x: number, y: number, s: number, a: number, color: string) {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = color
  g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); g.fill(); g.restore()
}
function leaf(g: G, x: number, y: number, s: number, a: number, color: string) {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = color
  g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, 0, 0, s); g.quadraticCurveTo(-s * 0.8, 0, 0, -s); g.fill()
  g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s); g.stroke(); g.restore()
}
function pine(g: G, x: number, base: number, h: number, color: string) {
  g.fillStyle = color
  for (let i = 0; i < 3; i++) {
    const t = base - h * (0.25 + i * 0.28), w = h * (0.32 - i * 0.07)
    g.beginPath(); g.moveTo(x, t - h * 0.32); g.lineTo(x - w, t + h * 0.12); g.lineTo(x + w, t + h * 0.12); g.fill()
  }
  g.fillRect(x - h * 0.03, base - h * 0.15, h * 0.06, h * 0.15)
}

const PAINT: Record<string, (g: G) => void> = {
  midnight: g => {
    sky(g, [[0, '#0D1033'], [0.6, '#1E1F52'], [1, '#2E2A62']])
    stars(g, 140, 7)
  },
  peach: g => {
    sky(g, [[0, '#F9C9D9'], [0.55, '#FFDCC6'], [1, '#FFF1DE']])
    glow(g, W * 0.5, H * 0.72, 260, '255,248,230', .95)
    const r = rng(3)
    for (let i = 0; i < 7; i++) cloud(g, r() * W, 60 + r() * 220, 0.6 + r() * 0.7, 'rgba(255,255,255,.55)')
  },
  meadow: g => {
    sky(g, [[0, '#F6B98A'], [0.5, '#FBD9A4'], [1, '#F2E6C0']])
    glow(g, W * 0.68, H * 0.5, 200, '255,240,190', .95)
    hills(g, H * 0.68, 22, '#C9B86A', 4); hills(g, H * 0.8, 18, '#A9A458', 9)
    const r = rng(12)
    for (let i = 0; i < 160; i++) { g.fillStyle = ['#FFF4D8', '#F7C3D0', '#E8D07A', '#D9B3F0'][i % 4]; g.beginPath(); g.arc(r() * W, H * 0.78 + r() * H * 0.22, 1.5 + r() * 2.5, 0, TAU); g.fill() }
  },
  moonwater: g => {
    sky(g, [[0, '#0B2A3A'], [0.62, '#16495A'], [1, '#0E3442']])
    stars(g, 70, 21, H * 0.55)
    glow(g, W * 0.7, H * 0.25, 120, '255,246,214', .6)
    g.fillStyle = '#FFF6DA'; g.beginPath(); g.arc(W * 0.7, H * 0.25, 34, 0, TAU); g.fill()
    hills(g, H * 0.64, 14, '#0A2430', 5)
    water(g, H * 0.64, '#174E5E', '#0A2833'); shimmer(g, W * 0.7, H * 0.64, '#FFF0C0', 6)
  },
  afterrain: g => {
    sky(g, [[0, '#8EC9F2'], [1, '#D8EEFF']])
    const cx = W / 2, cy = H * 0.95
    ;['#FF8A8A', '#FFC07A', '#FFE680', '#9EE58C', '#7CCBF0', '#A99BFF'].forEach((c, i) => {
      g.strokeStyle = c; g.globalAlpha = 0.75; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, 330 - i * 18, Math.PI, TAU); g.stroke()
    })
    g.globalAlpha = 1
    cloud(g, 90, H * 0.88, 1.6, '#FFFFFF'); cloud(g, W - 130, H * 0.88, 1.6, '#FFFFFF')
    cloud(g, 150, 90, 0.7, 'rgba(255,255,255,.8)')
  },
  seasunset: g => {
    sky(g, [[0, '#6E5BA8'], [0.35, '#E58AA0'], [0.6, '#FFB27A'], [0.62, '#F59A6E'], [1, '#5E4A86']])
    glow(g, W / 2, H * 0.6, 220, '255,214,150', .9)
    g.fillStyle = '#FFE2A8'; g.beginPath(); g.arc(W / 2, H * 0.6, 46, Math.PI, TAU); g.fill()
    water(g, H * 0.6, '#C9708A', '#4E3E78'); shimmer(g, W / 2, H * 0.6, '#FFD49A', 8)
  },
  pines: g => {
    sky(g, [[0, '#EAF2DC'], [1, '#B5CFA3']])
    glow(g, W * 0.35, H * 0.15, 260, '255,250,220', 0.9)
    rays(g, W * 0.35, -20, 9, '#FFF8DC', 1.1, Math.PI * 0.45)
    const r = rng(31)
    for (let i = 0; i < 11; i++) pine(g, (i / 10) * W + (r() - 0.5) * 40, H * 0.9, 170 + r() * 90, 'rgba(96,136,96,.45)')
    hills(g, H * 0.9, 8, '#8FB27C', 32)
    for (let i = 0; i < 7; i++) pine(g, (i / 6) * W + (r() - 0.5) * 60, H + 10, 230 + r() * 70, i % 2 ? '#4E7A57' : '#45704F')
  },
  heaven: g => {
    sky(g, [[0, '#FFF3D6'], [1, '#F7DDB0']])
    rays(g, W / 2, H * 0.2, 16, '#FFFFFF', TAU, 0)
    glow(g, W / 2, H * 0.2, 240, '255,255,240', .95)
    const r = rng(41)
    for (let i = 0; i < 6; i++) cloud(g, r() * W, H * 0.7 + r() * 120, 1 + r() * 0.8, 'rgba(255,250,238,.9)')
  },
  cloudy: g => {
    sky(g, [[0, '#F5E7C8'], [1, '#FCF5E6']])
    const r = rng(51)
    for (let i = 0; i < 14; i++) cloud(g, r() * W, r() * H, 0.8 + r() * 1.1, i % 3 ? 'rgba(255,255,255,.85)' : 'rgba(248,228,190,.8)')
    glow(g, W * 0.5, H * 0.35, 200, '255,240,200', .6)
  },
  aurora: g => {
    sky(g, [[0, '#081430'], [1, '#14244A']])
    stars(g, 90, 61)
    ;[['rgba(110,240,190,.35)', 0.28], ['rgba(160,120,255,.3)', 0.38], ['rgba(90,210,230,.28)', 0.22]].forEach(([c, y], k) => {
      g.strokeStyle = c as string; g.lineWidth = 46; g.lineCap = 'round'; g.beginPath()
      for (let x = -20; x <= W + 20; x += 10) g.lineTo(x, H * (y as number) + Math.sin(x / 90 + k * 2) * 40)
      g.stroke()
    })
    hills(g, H * 0.82, 16, '#E8F0FA', 62)
  },
  galaxy: g => {
    sky(g, [[0, '#1A1240'], [1, '#2C1E5C']])
    const r = rng(71)
    for (let i = 0; i < 1400; i++) {
      const t = r() * 7, arm = i % 2 ? 0 : Math.PI, rr = 18 + t * 42 + r() * 18
      const a = t * 0.9 + arm + (r() - 0.5) * 0.5
      g.fillStyle = `rgba(${200 + r() * 55 | 0},${170 + r() * 70 | 0},255,${0.25 + r() * 0.6})`
      g.fillRect(W / 2 + Math.cos(a) * rr * 1.3, H / 2 + Math.sin(a) * rr * 0.8, 1.6, 1.6)
    }
    glow(g, W / 2, H / 2, 90, '255,230,255', .8)
    stars(g, 50, 72)
  },
  sakura: g => {
    sky(g, [[0, '#DCEBFA'], [1, '#FBE6EE']])
    const r = rng(81)
    g.fillStyle = 'rgba(244,182,204,.55)'
    for (const cx of [0, W]) for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(cx + (r() - 0.5) * 260, r() * H * 0.55, 20 + r() * 34, 0, TAU); g.fill() }
    for (let i = 0; i < 70; i++) petal(g, r() * W, r() * H, 5 + r() * 5, r() * TAU, ['#F7B8CC', '#FBD2DF', '#F29BB6'][i % 3])
  },
  lavender: g => {
    sky(g, [[0, '#E3D6F2'], [0.55, '#FBE3E6'], [1, '#FBE3E6']])
    glow(g, W * 0.5, H * 0.55, 220, '255,226,200', 0.8)
    g.fillStyle = '#C7B4E4'; g.fillRect(0, H * 0.55, W, H * 0.45)
    const r = rng(91)
    // rows of lavender running back to the horizon: small and close far away, big up front
    for (let row = 0; row < 16; row++) {
      const t = row / 15, y = H * 0.56 + Math.pow(t, 1.7) * H * 0.46
      const step = 5 + t * 22, hgt = 3 + t * 26, w = 1.2 + t * 4.5
      for (let x = -step; x < W + step; x += step) {
        g.fillStyle = ['#9A7CCF', '#B096DD', '#8668C2'][(row + Math.round(x / step)) % 3]
        g.beginPath(); g.ellipse(x + (r() - 0.5) * step * 0.4, y - hgt / 2, w, hgt / 2, 0, 0, TAU); g.fill()
      }
    }
  },
  autumn: g => {
    sky(g, [[0, '#F3C98B'], [1, '#C9783E']])
    glow(g, W * 0.4, H * 0.3, 260, '255,236,190', .7)
    const r = rng(101)
    for (let i = 0; i < 60; i++) leaf(g, r() * W, r() * H, 8 + r() * 10, r() * TAU, ['#D9652B', '#E8A43A', '#B8452A', '#C98A2A'][i % 4])
  },
  deepsea: g => {
    sky(g, [[0, '#5FC7D6'], [1, '#14506E']])
    rays(g, W * 0.5, -40, 8, '#FFFFFF', 0.9)
    const r = rng(111)
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5
    for (let i = 0; i < 45; i++) { g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 7, 0, TAU); g.stroke() }
    g.fillStyle = '#1C6B6E'
    for (let i = 0; i < 14; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + 30, H - 100 - r() * 80, x + 10, H - 180 - r() * 60); g.quadraticCurveTo(x + 8, H - 80, x + 16, H); g.fill() }
  },
  hearts: g => {
    sky(g, [[0, '#FFF6EE'], [1, '#FBE9E2']])
    const r = rng(121)
    for (let i = 0; i < 46; i++) { g.fillStyle = ['rgba(240,150,170,.55)', 'rgba(250,190,170,.6)', 'rgba(230,120,140,.45)'][i % 3]; heart(g, r() * W, r() * H, 10 + r() * 16) }
  },
  paws: g => {
    sky(g, [[0, '#FFF9F0'], [1, '#F7EEDF']])
    const r = rng(131)
    for (let i = 0; i < 40; i++) { g.fillStyle = ['rgba(232,170,140,.55)', 'rgba(170,190,225,.55)', 'rgba(200,170,220,.5)', 'rgba(170,210,180,.55)'][i % 4]; paw(g, r() * W, r() * H, 12 + r() * 8, r() * TAU) }
  },
  bamboo: g => {
    sky(g, [[0, '#E6F0DC'], [1, '#B7CFA6']])
    const r = rng(141)
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 12; i++) {
      const x = r() * W, w = layer ? 16 : 10
      g.fillStyle = layer ? '#6E9A5A' : 'rgba(110,154,90,.4)'; g.fillRect(x, 0, w, H)
      g.fillStyle = 'rgba(40,70,30,.35)'
      for (let y = 30 + r() * 60; y < H; y += 70 + r() * 30) g.fillRect(x - 1, y, w + 2, 3)
    }
    glow(g, W / 2, H * 0.4, 260, '255,255,240', .5)
  },
  snownight: g => {
    sky(g, [[0, '#14204A'], [1, '#33477E']])
    stars(g, 50, 151, H * 0.5)
    const r = rng(152)
    for (let i = 0; i < 8; i++) pine(g, (i / 7) * W + (r() - 0.5) * 50, H * 0.86, 160 + r() * 90, '#1F3A4A')
    hills(g, H * 0.86, 10, '#EEF3FB', 153)
    g.fillStyle = 'rgba(255,255,255,.9)'
    for (let i = 0; i < 130; i++) { g.beginPath(); g.arc(r() * W, r() * H, 1 + r() * 2.4, 0, TAU); g.fill() }
  },
  festive: g => {
    sky(g, [[0, '#7A1C24'], [1, '#4E0F16']])
    g.fillStyle = 'rgba(255,215,140,.08)'
    for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) { g.beginPath(); g.arc(x + ((y / 40) % 2) * 20, y, 3, 0, TAU); g.fill() }
    g.strokeStyle = '#2F5A3A'; g.lineWidth = 26; g.beginPath(); g.moveTo(-10, 30)
    for (let x = 0; x <= W + 10; x += 20) g.lineTo(x, 30 + Math.sin(x / W * Math.PI) * 60); g.stroke()
    for (let x = 20; x < W; x += 46) {
      const y = 30 + Math.sin(x / W * Math.PI) * 60
      glow(g, x, y + 8, 20, '255,220,140', .9)
      g.fillStyle = ['#E8C365', '#D9423A', '#F2EDE2'][(x / 46 | 0) % 3]; g.beginPath(); g.arc(x, y + 22, 8, 0, TAU); g.fill()
    }
    glow(g, W / 2, H * 0.6, 280, '255,190,120', .25)
  },
}

/** Paints a backdrop at any size (the picker uses small thumbnails). */
export function paintBackdrop(id: string, canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!
  g.save(); g.scale(canvas.width / W, canvas.height / H)
  ;(PAINT[id] ?? PAINT.midnight)(g)
  g.restore()
}

/** The cabinet's back wall. */
export function backdropTexture(id: string) {
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  paintBackdrop(id, c)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

const thumbs = new Map<string, string>()
/** A small data-URL preview for the picker, cached. */
export function backdropThumb(id: string) {
  let url = thumbs.get(id)
  if (!url) {
    const c = document.createElement('canvas')
    c.width = 200; c.height = 160
    paintBackdrop(id, c)
    url = c.toDataURL('image/jpeg', 0.85)
    thumbs.set(id, url)
  }
  return url
}
