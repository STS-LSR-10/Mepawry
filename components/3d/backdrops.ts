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

function lantern(g: G, x: number, y: number, s: number, body: string, trim: string) {
  g.strokeStyle = trim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x, 0); g.stroke()
  glow(g, x, y, s * 2.6, '255,170,90', 0.45)
  g.fillStyle = body; g.beginPath(); g.ellipse(x, y, s, s * 1.2, 0, 0, TAU); g.fill()
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1
  for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(x, y, s * Math.abs(k) + 0.5, s * 1.2, 0, 0, TAU); g.stroke() }
  g.fillStyle = trim; g.fillRect(x - s * 0.45, y - s * 1.35, s * 0.9, s * 0.3); g.fillRect(x - s * 0.45, y + s * 1.08, s * 0.9, s * 0.3)
  g.fillRect(x - 1.5, y + s * 1.38, 3, s * 0.7)
}
function burst(g: G, x: number, y: number, r: number, color: string, seed: number) {
  const rr = rng(seed)
  glow(g, x, y, r * 1.3, color, 0.25)
  g.strokeStyle = `rgba(${color},.9)`; g.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rr() * 0.1, l = r * (0.7 + rr() * 0.3)
    g.lineWidth = 2; g.beginPath(); g.moveTo(x + Math.cos(a) * l * 0.25, y + Math.sin(a) * l * 0.25); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
    g.fillStyle = `rgba(${color},1)`; g.beginPath(); g.arc(x + Math.cos(a) * l, y + Math.sin(a) * l, 2.2, 0, TAU); g.fill()
  }
}
function flower(g: G, x: number, y: number, s: number, petals: string, mid: string, n = 6) {
  for (let i = 0; i < n; i++) petal(g, x + Math.cos(i / n * TAU) * s, y + Math.sin(i / n * TAU) * s, s * 0.9, i / n * TAU, petals)
  g.fillStyle = mid; g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.fill()
}
function lotus(g: G, x: number, y: number, s: number) {
  g.fillStyle = '#4F8A5C'; g.beginPath(); g.ellipse(x, y + s * 0.3, s * 1.6, s * 0.4, 0, 0, TAU); g.fill()
  for (const [a, c] of [[-0.6, '#F7B3C8'], [0.6, '#F7B3C8'], [-0.25, '#F28DAA'], [0.25, '#F28DAA'], [0, '#FBD0DD']] as [number, string][]) {
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.7, 0, -s * 1.3); g.quadraticCurveTo(-s * 0.5, -s * 0.7, 0, 0); g.fill(); g.restore()
  }
}
function krathong(g: G, x: number, y: number, s: number) {
  glow(g, x, y - s * 1.4, s * 3, '255,210,120', 0.55)
  g.fillStyle = '#5E9A4A'; g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.45, 0, 0, TAU); g.fill()
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; g.fillStyle = '#7DBB5E'; g.beginPath(); g.moveTo(x + Math.cos(a) * s * 1.2, y + Math.sin(a) * s * 0.2); g.lineTo(x + Math.cos(a) * s * 0.8, y - s * 0.7); g.lineTo(x + Math.cos(a) * s * 0.5, y); g.fill() }
  ;['#F7E2A0', '#F29BB7', '#FFFFFF'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + (i - 1) * s * 0.45, y - s * 0.55, s * 0.32, 0, TAU); g.fill() })
  g.fillStyle = '#F4EBD0'; g.fillRect(x - 1.5, y - s * 1.6, 3, s * 1.1)
  g.fillStyle = '#FFD36B'; g.beginPath(); g.ellipse(x, y - s * 1.75, 2.6, 5, 0, 0, TAU); g.fill()
  shimmer(g, x, y + s * 0.4, 'rgba(255,214,140,.8)', x | 0)
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
  songkran: g => {
    sky(g, [[0, '#7CC8F2'], [0.6, '#BDE5FA'], [1, '#E6F5FD']])
    glow(g, W * 0.8, H * 0.12, 160, '255,250,215', .9)
    cloud(g, 110, 90, 0.8, 'rgba(255,255,255,.85)'); cloud(g, W - 200, 150, 0.6, 'rgba(255,255,255,.7)')
    water(g, H * 0.7, '#4FA9DC', '#2A78B0')
    const r = rng(201)
    // jasmine garland strung across the top
    g.strokeStyle = '#3F7A2E'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 40)
    for (let x = 0; x <= W; x += 16) g.lineTo(x, 40 + Math.sin(x / W * Math.PI) * 60); g.stroke()
    for (let x = 8; x < W; x += 16) { const y = 40 + Math.sin(x / W * Math.PI) * 60; g.fillStyle = x % 96 < 16 ? '#F4C542' : '#FFFFFF'; g.beginPath(); g.arc(x, y + 4, 5, 0, TAU); g.fill() }
    // splashes and droplets
    for (let i = 0; i < 6; i++) {
      const x = 60 + r() * (W - 120), y = H * 0.7 + r() * 40
      g.fillStyle = 'rgba(255,255,255,.85)'
      for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; g.beginPath(); g.ellipse(x + Math.cos(a) * 26, y + Math.sin(a) * 34, 4, 9, a + Math.PI / 2, 0, TAU); g.fill() }
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(r() * W, r() * H * 0.75, 2, 3.5, 0, 0, TAU); g.fill() }
    shimmer(g, W * 0.5, H * 0.7, 'rgba(255,255,255,.7)', 202)
  },
  loykrathong: g => {
    sky(g, [[0, '#0B1634'], [0.6, '#16295A'], [1, '#1B3466']])
    stars(g, 70, 211, H * 0.55)
    glow(g, W * 0.72, H * 0.2, 160, '255,242,200', .55)
    g.fillStyle = '#FFF2C4'; g.beginPath(); g.arc(W * 0.72, H * 0.2, 44, 0, TAU); g.fill()
    const r = rng(212)
    for (let i = 0; i < 14; i++) { const x = r() * W, y = 40 + r() * H * 0.45, s = 4 + r() * 5; glow(g, x, y, s * 4, '255,170,80', .6); g.fillStyle = '#F7B267'; g.fillRect(x - s / 2, y - s * 0.7, s, s * 1.4) }
    hills(g, H * 0.6, 10, '#0B1A36', 213)
    water(g, H * 0.6, '#1C3B6E', '#0C1C3A'); shimmer(g, W * 0.72, H * 0.6, '#FFE7A8', 214)
    for (const [x, y, s] of [[110, H * 0.76, 16], [300, H * 0.88, 20], [480, H * 0.72, 13], [560, H * 0.92, 18]] as [number, number, number][]) krathong(g, x, y, s)
  },
  lunarnewyear: g => {
    sky(g, [[0, '#8E1A22'], [1, '#5A0D14']])
    g.fillStyle = 'rgba(255,200,120,.07)'
    for (let x = 0; x < W; x += 48) for (let y = 0; y < H; y += 48) { g.beginPath(); g.arc(x + ((y / 48) % 2) * 24, y, 12, 0, TAU); g.fill() }
    for (const [x, y, s] of [[110, 120, 34], [W / 2, 160, 42], [W - 110, 120, 34], [220, 70, 20], [W - 220, 70, 20]] as [number, number, number][]) lantern(g, x, y, s, '#E03A2F', '#F2C14E')
    // plum blossom branch along the bottom
    g.strokeStyle = '#3B1A10'; g.lineWidth = 7; g.lineCap = 'round'
    g.beginPath(); g.moveTo(-10, H - 20); g.quadraticCurveTo(200, H - 110, 380, H - 90); g.stroke()
    g.lineWidth = 4; g.beginPath(); g.moveTo(200, H - 78); g.quadraticCurveTo(240, H - 160, 300, H - 170); g.stroke()
    const r = rng(221)
    for (let i = 0; i < 24; i++) { const t = r(); const x = t * 380, y = H - 20 - Math.sin(t * Math.PI * 0.9) * 90 + (r() - 0.5) * 30; flower(g, x, y, 6 + r() * 3, '#F7B6C8', '#F2C14E', 5) }
  },
  midautumn: g => {
    sky(g, [[0, '#14204A'], [1, '#2A3C78']])
    stars(g, 60, 231, H * 0.6)
    glow(g, W / 2, H * 0.34, 220, '255,230,170', .6)
    g.fillStyle = '#FFE7A6'; g.beginPath(); g.arc(W / 2, H * 0.34, 92, 0, TAU); g.fill()
    g.fillStyle = 'rgba(214,180,110,.35)'; for (const [dx, dy, rr] of [[-30, -20, 18], [25, 10, 24], [-10, 35, 12]]) { g.beginPath(); g.arc(W / 2 + dx, H * 0.34 + dy, rr, 0, TAU); g.fill() }
    // a little rabbit silhouette on the moon
    g.fillStyle = 'rgba(190,150,80,.55)'; g.beginPath(); g.ellipse(W / 2 + 20, H * 0.34 + 30, 22, 16, 0, 0, TAU); g.fill()
    g.beginPath(); g.ellipse(W / 2 + 36, H * 0.34 + 12, 6, 18, 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(W / 2 + 26, H * 0.34 + 10, 6, 18, -0.1, 0, TAU); g.fill()
    hills(g, H * 0.84, 14, '#0E1838', 232)
    for (const [x, y] of [[80, H * 0.6], [W - 80, H * 0.56], [170, H * 0.7], [W - 170, H * 0.68]] as [number, number][]) lantern(g, x, y, 22, '#E6513C', '#F2C14E')
  },
  halloween: g => {
    sky(g, [[0, '#2E2150'], [1, '#5A3B78']])
    stars(g, 50, 241, H * 0.5)
    glow(g, W * 0.78, H * 0.18, 120, '255,246,214', .5)
    g.fillStyle = '#F6EFD2'; g.beginPath(); g.arc(W * 0.78, H * 0.18, 40, 0, TAU); g.fill()
    hills(g, H * 0.78, 20, '#241838', 242)
    const r = rng(243)
    // gentle pumpkins, smiling softly
    for (const [x, y, s] of [[150, H * 0.82, 44], [300, H * 0.88, 30], [460, H * 0.84, 38]] as [number, number, number][]) {
      glow(g, x, y, s * 2.2, '255,170,70', .35)
      for (const dx of [-0.45, 0.45, 0]) { g.fillStyle = dx ? '#E07A24' : '#F08A2E'; g.beginPath(); g.ellipse(x + dx * s, y, s * 0.6, s * 0.75, 0, 0, TAU); g.fill() }
      g.fillStyle = '#3F7A2E'; g.fillRect(x - 3, y - s * 0.9, 6, s * 0.25)
      g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(x - s * 0.25, y - s * 0.1, s * 0.09, 0, TAU); g.arc(x + s * 0.25, y - s * 0.1, s * 0.09, 0, TAU); g.fill()
      g.strokeStyle = '#FFE08A'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y + s * 0.05, s * 0.28, 0.2, Math.PI - 0.2); g.stroke()
    }
    for (let i = 0; i < 20; i++) glow(g, r() * W, H * 0.35 + r() * H * 0.4, 5, '255,240,150', .9) // fireflies
  },
  nyfireworks: g => {
    sky(g, [[0, '#070C24'], [1, '#1A2350']])
    stars(g, 50, 251, H * 0.6)
    burst(g, 160, 140, 70, '247,192,74', 252); burst(g, W - 170, 110, 80, '238,106,167', 253)
    burst(g, W / 2, 220, 56, '127,211,242', 254); burst(g, 90, 280, 40, '160,240,170', 255); burst(g, W - 90, 260, 46, '255,150,90', 256)
    const r = rng(257)
    g.fillStyle = '#141A3A'
    for (let x = 0; x < W; x += 34 + r() * 20) { const h = 40 + r() * 90; g.fillRect(x, H - h, 26 + r() * 18, h) }
    g.fillStyle = 'rgba(255,214,140,.8)'
    for (let i = 0; i < 60; i++) g.fillRect(r() * W, H - r() * 110, 3, 4)
  },
  rosepetals: g => {
    sky(g, [[0, '#FFF1F4'], [1, '#FBD9E2']])
    glow(g, W / 2, H * 0.45, 260, '255,255,255', .7)
    const r = rng(261)
    for (let i = 0; i < 80; i++) petal(g, r() * W, r() * H, 7 + r() * 9, r() * TAU, ['#E8577D', '#F27C9B', '#C9304F', '#F7A8BC'][i % 4])
    for (const [x, y, s] of [[W * 0.5, H * 0.55, 46], [W * 0.18, H * 0.82, 30], [W * 0.84, H * 0.2, 26]] as [number, number, number][]) {
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#A3203D', '#C9304F', '#E04A67', '#B8274A', '#D63B5A'][k]; g.beginPath(); g.arc(x + Math.cos(k * 1.3) * s * 0.25, y + Math.sin(k * 1.3) * s * 0.25, s * (0.55 - k * 0.07), 0, TAU); g.fill() }
    }
  },
  spring: g => {
    sky(g, [[0, '#BFE3F7'], [1, '#EAF6FB']])
    glow(g, W * 0.2, H * 0.15, 200, '255,250,220', .8)
    cloud(g, W * 0.6, 80, 0.8, 'rgba(255,255,255,.85)')
    hills(g, H * 0.66, 26, '#B5DB8C', 301); hills(g, H * 0.78, 16, '#9ACD72', 302)
    const r = rng(303)
    // a blossom tree on the right
    g.strokeStyle = '#6B4A32'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(W * 0.78, H * 0.8); g.quadraticCurveTo(W * 0.8, H * 0.5, W * 0.74, H * 0.36); g.stroke()
    for (let i = 0; i < 60; i++) { g.fillStyle = ['rgba(249,201,215,.8)', 'rgba(244,170,195,.75)', 'rgba(255,230,238,.85)'][i % 3]; g.beginPath(); g.arc(W * 0.76 + (r() - 0.5) * 220, H * 0.3 + (r() - 0.5) * 140, 14 + r() * 18, 0, TAU); g.fill() }
    // rows of tulips
    for (let row = 0; row < 4; row++) for (let x = 10 + row * 8; x < W; x += 26) {
      const y = H * 0.82 + row * 26, c = ['#F56E8C', '#F7C846', '#B57AE0', '#FF8A5C'][(row + (x / 26 | 0)) % 4]
      g.strokeStyle = '#4F8A2E'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.stroke()
      g.fillStyle = c; g.beginPath(); g.ellipse(x, y - 22, 6, 8, 0, 0, TAU); g.fill()
    }
    for (let i = 0; i < 25; i++) petal(g, r() * W, r() * H * 0.7, 4 + r() * 3, r() * TAU, '#F7B8CC')
  },
  summer: g => {
    sky(g, [[0, '#5DB6EE'], [1, '#C9ECFB']])
    glow(g, W * 0.82, H * 0.14, 180, '255,236,150', .95)
    g.fillStyle = '#FFE07A'; g.beginPath(); g.arc(W * 0.82, H * 0.14, 40, 0, TAU); g.fill()
    cloud(g, 120, 100, 0.9, '#FFFFFF')
    hills(g, H * 0.6, 14, '#9CC85A', 311)
    // sunflowers, small and far to big and near
    const r = rng(312)
    for (let row = 0; row < 5; row++) {
      const t = row / 4, y = H * 0.62 + Math.pow(t, 1.5) * H * 0.42, s = 6 + t * 26
      g.fillStyle = '#7FB84E'; g.fillRect(0, y, W, H - y)
      for (let x = (row % 2) * s; x < W + s; x += s * 2.4) {
        const xx = x + (r() - 0.5) * s
        g.strokeStyle = '#4F8A2E'; g.lineWidth = 1 + t * 3; g.beginPath(); g.moveTo(xx, y + s * 2); g.lineTo(xx, y); g.stroke()
        flower(g, xx, y, s * 0.55, '#F5C518', '#6B3F1F', 10)
      }
    }
  },
  rainy: g => {
    sky(g, [[0, '#6E8296'], [1, '#A3B4C4']])
    const r = rng(321)
    for (let i = 0; i < 5; i++) cloud(g, r() * W, 40 + r() * 80, 1.2 + r() * 0.6, 'rgba(90,106,124,.7)')
    water(g, H * 0.62, '#5C7E86', '#3E5C66')
    for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(220,232,240,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(r() * W, H * 0.64 + r() * H * 0.36, 6 + r() * 10, 2 + r() * 3, 0, 0, TAU); g.stroke() }
    for (let i = 0; i < 9; i++) { const x = r() * W, y = H * 0.68 + r() * H * 0.3; g.fillStyle = '#5E9A5A'; g.beginPath(); g.ellipse(x, y, 30, 9, 0, 0, TAU); g.fill() }
    for (const [x, y, s] of [[140, H * 0.78, 22], [430, H * 0.86, 28], [560, H * 0.72, 16]] as [number, number, number][]) lotus(g, x, y, s)
    g.strokeStyle = 'rgba(225,235,245,.55)'; g.lineWidth = 1.2
    for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke() }
  },
  winterforest: g => {
    sky(g, [[0, '#A9C3DD'], [1, '#E3EDF6']])
    glow(g, W * 0.3, H * 0.25, 220, '255,255,250', .7)
    const r = rng(331)
    for (let i = 0; i < 12; i++) pine(g, (i / 11) * W + (r() - 0.5) * 40, H * 0.78, 120 + r() * 70, 'rgba(90,120,130,.45)')
    hills(g, H * 0.78, 10, '#F4F8FB', 332)
    for (let i = 0; i < 7; i++) { const x = (i / 6) * W + (r() - 0.5) * 60, h = 220 + r() * 80; pine(g, x, H + 10, h, '#2F5A4A'); g.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 3; k++) { const t = H + 10 - h * (0.25 + k * 0.28); g.beginPath(); g.ellipse(x, t - h * 0.28, h * 0.05, h * 0.03, 0, 0, TAU); g.fill() } }
    g.fillStyle = 'rgba(255,255,255,.95)'
    for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(r() * W, r() * H, 1 + r() * 2.2, 0, TAU); g.fill() }
  },
  mountainlake: g => {
    sky(g, [[0, '#F6C6A8'], [0.5, '#FBE2C4'], [1, '#FFF3E0']])
    glow(g, W * 0.5, H * 0.45, 200, '255,240,210', .8)
    const peaks = (col: string, base: number, pts: [number, number][]) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, base); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(W, base); g.closePath(); g.fill() }
    peaks('#A7AFCF', H * 0.58, [[60, H * 0.36], [160, H * 0.46], [280, H * 0.22], [400, H * 0.42], [520, H * 0.3], [620, H * 0.48]])
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(280, H * 0.22); g.lineTo(255, H * 0.29); g.lineTo(305, H * 0.29); g.fill()
    peaks('#7D8FB3', H * 0.6, [[0, H * 0.48], [120, H * 0.4], [220, H * 0.52], [340, H * 0.44], [460, H * 0.54], [W, H * 0.44]])
    water(g, H * 0.6, '#9DC3DE', '#5E8FB8')
    g.save(); g.globalAlpha = 0.35; g.translate(0, H * 1.2); g.scale(1, -1)
    peaks('#7D8FB3', H * 0.6, [[0, H * 0.48], [120, H * 0.4], [220, H * 0.52], [340, H * 0.44], [460, H * 0.54], [W, H * 0.44]])
    g.restore(); shimmer(g, W * 0.5, H * 0.6, 'rgba(255,240,210,.7)', 341)
  },
  milkyway: g => {
    sky(g, [[0, '#060820'], [1, '#14163A']])
    stars(g, 220, 351)
    const r = rng(352)
    for (let i = 0; i < 1800; i++) { const t = r(), off = (r() - 0.5) * (60 + r() * 60); g.fillStyle = `rgba(${210 + r() * 45 | 0},${190 + r() * 50 | 0},255,${0.15 + r() * 0.45})`; g.fillRect(t * W, H * 0.85 - t * H * 0.75 + off, 1.5, 1.5) }
    for (let i = 0; i < 6; i++) glow(g, i / 5 * W, H * 0.85 - i / 5 * H * 0.75, 90, '170,140,230', .18)
    hills(g, H * 0.86, 22, '#100C1E', 353)
  },
  riceterraces: g => {
    sky(g, [[0, '#CFE7F2'], [1, '#EAF4E6']])
    hills(g, H * 0.32, 18, '#9BB8A8', 361)
    const cols = ['#9CCB66', '#86BC55', '#A8D372', '#78B04F', '#93C55E', '#6AA344']
    for (let i = 0; i < 9; i++) {
      const y = H * 0.36 + i * 38, amp = 14 + i * 2
      g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 120 + i * 0.7) * amp); g.lineTo(W, H); g.closePath(); g.fill()
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath()
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 120 + i * 0.7) * amp); g.stroke()
    }
    glow(g, W * 0.7, H * 0.1, 180, '255,250,220', .6)
  },
  fireflies: g => {
    sky(g, [[0, '#0E2A1E'], [1, '#081A12']])
    const r = rng(371)
    for (let i = 0; i < 14; i++) { const x = r() * W, w = 8 + r() * 22; g.fillStyle = `rgba(6,${20 + r() * 14 | 0},12,${0.6 + r() * 0.4})`; g.fillRect(x, 0, w, H) }
    hills(g, H * 0.88, 10, '#0A1E14', 372)
    for (let i = 0; i < 70; i++) { const x = r() * W, y = H * 0.15 + r() * H * 0.75; glow(g, x, y, 7 + r() * 8, '230,247,122', .8); g.fillStyle = '#F4FFB0'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill() }
  },
  mistymountains: g => {
    sky(g, [[0, '#DCE6EA'], [1, '#F3F6F7']])
    glow(g, W * 0.65, H * 0.25, 180, '255,250,235', .8)
    ;[['#B7C6CC', H * 0.5, 40], ['#97ABB3', H * 0.6, 34], ['#7690A0', H * 0.7, 28], ['#56707B', H * 0.82, 24]].forEach(([c, b, a], i) => {
      hills(g, b as number, a as number, c as string, 381 + i)
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, (b as number) - 4, W, 24)
    })
  },
  waterfall: g => {
    sky(g, [[0, '#BFE6D4'], [1, '#5E9E6E']])
    g.fillStyle = '#3F7A4E'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#2E5D3A'; g.beginPath(); g.moveTo(W * 0.32, 0); g.lineTo(W * 0.68, 0); g.lineTo(W * 0.72, H); g.lineTo(W * 0.28, H); g.fill()
    const fall = g.createLinearGradient(0, 0, 0, H * 0.8); fall.addColorStop(0, '#EAF7FB'); fall.addColorStop(1, '#BFE3EE')
    g.fillStyle = fall; g.fillRect(W * 0.42, 30, W * 0.16, H * 0.75)
    const r = rng(391)
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5
    for (let i = 0; i < 30; i++) { const x = W * 0.42 + r() * W * 0.16; g.beginPath(); g.moveTo(x, 30 + r() * 40); g.lineTo(x, H * 0.5 + r() * H * 0.3); g.stroke() }
    water(g, H * 0.8, '#8ECFE2', '#4F9AB2')
    glow(g, W / 2, H * 0.8, 120, '255,255,255', .7)
    for (let i = 0; i < 40; i++) leaf(g, r() < 0.5 ? r() * W * 0.3 : W * 0.7 + r() * W * 0.3, r() * H, 14 + r() * 16, r() * TAU, ['#4F8A5C', '#5E9E6E', '#3F7A4E'][i % 3])
  },
  wildflowers: g => {
    sky(g, [[0, '#9FD4F2'], [1, '#E2F3FB']])
    cloud(g, 160, 80, 0.9, '#FFFFFF'); cloud(g, W - 150, 120, 0.7, 'rgba(255,255,255,.9)')
    hills(g, H * 0.58, 30, '#B5DB8C', 401); hills(g, H * 0.72, 24, '#9ACD72', 402); hills(g, H * 0.86, 18, '#86BC5F', 403)
    const r = rng(404)
    for (let i = 0; i < 360; i++) { const y = H * 0.6 + r() * H * 0.4, s = 1.5 + (y - H * 0.6) / (H * 0.4) * 4; g.fillStyle = ['#FFFFFF', '#F56E8C', '#F7C846', '#9C7AE0', '#FF8A5C'][i % 5]; g.beginPath(); g.arc(r() * W, y, s, 0, TAU); g.fill() }
  },
  lotussunset: g => {
    sky(g, [[0, '#F3A982'], [0.55, '#FBD3A8'], [1, '#F9D6B0']])
    glow(g, W / 2, H * 0.48, 200, '255,236,190', .9)
    g.fillStyle = '#FFF0C9'; g.beginPath(); g.arc(W / 2, H * 0.48, 50, Math.PI, TAU); g.fill()
    water(g, H * 0.48, '#C9A48E', '#7E9C98'); shimmer(g, W / 2, H * 0.48, '#FFE2B0', 411)
    const r = rng(412)
    for (let i = 0; i < 12; i++) { g.fillStyle = '#4F8A5C'; g.beginPath(); g.ellipse(r() * W, H * 0.6 + r() * H * 0.38, 30 + r() * 20, 8 + r() * 4, 0, 0, TAU); g.fill() }
    for (const [x, y, s] of [[110, H * 0.74, 22], [250, H * 0.9, 30], [470, H * 0.8, 26], [580, H * 0.66, 16]] as [number, number, number][]) lotus(g, x, y, s)
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
