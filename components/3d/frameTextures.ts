// components/3d/frameTextures.ts — The repeating tiles painted on patterned portrait frames (lib/decor.ts FRAMES).

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { FramePattern } from '@/lib/decor'

const N = 128

/** How wide one tile is on the frame, in world units (the frame bars are 0.085 wide). */
export const FRAME_TILE: Partial<Record<FramePattern, number>> = { rainbow: 1.2, marble: 0.6, oak: 0.22, pearl: 0.07 }
export const DEFAULT_FRAME_TILE = 0.09

const paws = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) => {
  g.fillStyle = col
  g.beginPath(); g.ellipse(x, y + s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2); g.fill()
  for (const [dx, dy] of [[-0.48, -0.22], [-0.17, -0.45], [0.17, -0.45], [0.48, -0.22]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, s * 0.16, s * 0.2, 0, 0, Math.PI * 2); g.fill()
  }
}
const heart = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.beginPath(); g.moveTo(x, y + s * 0.45)
  g.bezierCurveTo(x - s, y - s * 0.1, x - s * 0.45, y - s * 0.75, x, y - s * 0.3)
  g.bezierCurveTo(x + s * 0.45, y - s * 0.75, x + s, y - s * 0.1, x, y + s * 0.45); g.fill()
}
const star = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  g.beginPath()
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
  g.closePath(); g.fill()
}

const PAINT: Record<FramePattern, (g: CanvasRenderingContext2D) => void> = {
  paws: g => { g.fillStyle = '#F6E2C8'; g.fillRect(0, 0, N, N); paws(g, 32, 34, 22, '#B07A4A'); paws(g, 96, 98, 22, '#B07A4A') },
  dots: g => {
    g.fillStyle = '#F4A9BC'; g.fillRect(0, 0, N, N); g.fillStyle = '#FFFFFF'
    for (const [x, y] of [[32, 32], [96, 96], [96, 32], [32, 96]]) { g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill() }
  },
  stripes: g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, N, N); g.fillStyle = '#E2453C'
    for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + 32, 0); g.lineTo(k * 64 + 32 + N, N); g.lineTo(k * 64 + N, N); g.fill() }
  },
  hearts: g => { g.fillStyle = '#FFE3EA'; g.fillRect(0, 0, N, N); g.fillStyle = '#E2577A'; heart(g, 32, 36, 24); heart(g, 96, 100, 24) },
  stars: g => {
    g.fillStyle = '#24305A'; g.fillRect(0, 0, N, N); g.fillStyle = '#F2D07A'
    star(g, 34, 34, 18); star(g, 100, 18, 7); star(g, 20, 104, 6)
    g.beginPath(); g.arc(92, 90, 22, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#24305A'; g.beginPath(); g.arc(102, 82, 20, 0, Math.PI * 2); g.fill()
  },
  gingham: g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, N, N); g.fillStyle = 'rgba(110,155,210,0.5)'
    g.fillRect(0, 0, 64, N); g.fillRect(0, 0, N, 64)
  },
  daisy: g => {
    g.fillStyle = '#DDEBCF'; g.fillRect(0, 0, N, N)
    for (const [x, y] of [[34, 34], [98, 96]]) {
      g.fillStyle = '#FFFFFF'
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 9, 5, a, 0, Math.PI * 2); g.fill() }
      g.fillStyle = '#EDBB3A'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill()
    }
  },
  thai: g => {
    // a gold kranok-style diamond with flame tips on lacquer red
    g.fillStyle = '#8E1F22'; g.fillRect(0, 0, N, N)
    g.strokeStyle = '#E8C25A'; g.fillStyle = '#E8C25A'; g.lineWidth = 5
    const c = 64
    g.beginPath(); g.moveTo(c, 6); g.bezierCurveTo(c + 22, 34, c + 36, 50, 122, c); g.bezierCurveTo(c + 36, 78, c + 22, 94, c, 122)
    g.bezierCurveTo(c - 22, 94, c - 36, 78, 6, c); g.bezierCurveTo(c - 36, 50, c - 22, 34, c, 6); g.stroke()
    g.beginPath(); g.moveTo(c, 32); g.quadraticCurveTo(c + 12, c - 8, c + 32, c); g.quadraticCurveTo(c + 12, c + 8, c, 96)
    g.quadraticCurveTo(c - 12, c + 8, c - 32, c); g.quadraticCurveTo(c - 12, c - 8, c, 32); g.fill()
    g.fillStyle = '#8E1F22'; g.beginPath(); g.arc(c, c, 7, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#E8C25A'
    for (const [x, y] of [[0, 0], [N, 0], [0, N], [N, N]]) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill() }
  },
  marble: g => {
    const gr = g.createLinearGradient(0, 0, N, N); gr.addColorStop(0, '#FAFAF8'); gr.addColorStop(1, '#E2E0DC')
    g.fillStyle = gr; g.fillRect(0, 0, N, N)
    g.strokeStyle = 'rgba(140,140,150,0.45)'; g.lineWidth = 1.6
    for (const [y0, a] of [[20, 0.7], [70, -0.4], [110, 0.3]]) {
      g.beginPath(); g.moveTo(0, y0)
      for (let x = 0; x <= N; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.07 + a * 5) * 9 + x * a * 0.3)
      g.stroke()
    }
  },
  oak: g => {
    g.fillStyle = '#C1915F'; g.fillRect(0, 0, N, N)
    for (let x = 0; x < N; x += 4) {
      g.fillStyle = `rgba(${x % 12 ? '120,78,40' : '225,180,128'},${0.35 + ((x * 37) % 10) / 20})`
      g.fillRect(x, 0, 2 + ((x * 13) % 3), N)
    }
    g.fillStyle = 'rgba(95,60,30,0.6)'; g.beginPath(); g.ellipse(70, 40, 5, 12, 0, 0, Math.PI * 2); g.fill() // a knot
  },
  rainbow: g => {
    const gr = g.createLinearGradient(0, 0, N, N)
    ;['#F28B82', '#FBBC74', '#FDE37A', '#9BD49A', '#8EC5F0', '#B8A2E8', '#F28B82'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c))
    g.fillStyle = gr; g.fillRect(0, 0, N, N)
  },
  pearl: g => {
    g.fillStyle = '#B5A487'; g.fillRect(0, 0, N, N)
    for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) {
      const gr = g.createRadialGradient(x - 9, y - 9, 2, x, y, 28)
      gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.55, '#EFE6D8'); gr.addColorStop(1, '#BBA98C')
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 27, 0, Math.PI * 2); g.fill()
    }
  },
}

/** A fresh repeating tile for a patterned frame; the caller sets its repeat and disposes it. */
export function framePatternTexture(p: FramePattern) {
  const c = document.createElement('canvas')
  c.width = c.height = N
  PAINT[p](c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  return t
}
