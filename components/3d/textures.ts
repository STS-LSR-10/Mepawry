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
      const grad = g.createLinearGradient(pic.x, pic.y, pic.x + pic.w, pic.y + pic.h)
      grad.addColorStop(0, look.from); grad.addColorStop(1, look.to)
      g.fillStyle = grad
      g.fillRect(pic.x, pic.y, pic.w, pic.h)
      g.font = '110px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(look.emoji, W / 2, pic.y + pic.h / 2 + 6)
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
