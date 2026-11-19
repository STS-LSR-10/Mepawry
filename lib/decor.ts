// lib/decor.ts — Frames and backdrops a shrine can be given. They stay for good (the newest one shows).
// Shared by the gift picker (client), the cabinet (3D) and the API (server). Prices are THB; payment isn't connected
// yet, so for now only admins can apply them (POST /api/pets/:id/decor).

export interface FrameStyle {
  id: string
  name: string
  price: number
  color: string
  metalness: number
  roughness: number
  /** CSS background for the picker swatch */
  swatch: string
}

export interface Backdrop {
  id: string
  name: string
  price: number
  /** Only on offer in these months (1–12) */
  months?: number[]
}

export const DEFAULT_FRAME = 'gold'
export const DEFAULT_BACKDROP = 'midnight'
export const FRAME_PRICE = 49
export const BACKDROP_PRICE = 59

const frame = (id: string, name: string, color: string, metalness: number, roughness: number, swatch: string): FrameStyle =>
  ({ id, name, price: FRAME_PRICE, color, metalness, roughness, swatch })

export const FRAMES: FrameStyle[] = [
  frame('gold', 'Classic gold', '#E2B64C', 0.85, 0.3, 'linear-gradient(135deg,#F7DE8E,#C9932A 55%,#F2D07A)'),
  frame('silver', 'Moon silver', '#D9DDE3', 0.9, 0.25, 'linear-gradient(135deg,#FFFFFF,#AEB4BD 55%,#E9ECF0)'),
  frame('rose', 'Rose gold', '#E7A98F', 0.85, 0.3, 'linear-gradient(135deg,#FBD3C2,#C9806A 55%,#F4C2AE)'),
  frame('ivory', 'Ivory wood', '#F3EBDD', 0, 0.6, 'linear-gradient(135deg,#FFFDF7,#E6DAC4)'),
  frame('walnut', 'Dark walnut', '#6B4430', 0, 0.55, 'linear-gradient(135deg,#8A5A3E,#4A2C1C)'),
  frame('ebony', 'Black lacquer', '#1E1B1A', 0.2, 0.25, 'linear-gradient(135deg,#3A3533,#0E0C0B)'),
  frame('blush', 'Blush pink', '#F6B4C6', 0, 0.45, 'linear-gradient(135deg,#FFD6E2,#EE9BB2)'),
  frame('mint', 'Soft mint', '#B9DFC6', 0, 0.45, 'linear-gradient(135deg,#DDF4E4,#93C9A6)'),
  frame('sky', 'Sky blue', '#A9D3F2', 0, 0.45, 'linear-gradient(135deg,#DCEEFC,#7FB6E3)'),
]

const WINTER = [11, 12, 1]
const bd = (id: string, name: string, months?: number[]): Backdrop => ({ id, name, price: BACKDROP_PRICE, months })

/** The first one is the free default every shrine starts with. */
export const BACKDROPS: Backdrop[] = [
  bd('midnight', 'Midnight sky'),
  bd('peach', 'Peach dawn'),
  bd('meadow', 'Meadow at dusk'),
  bd('moonwater', 'Moon on the water'),
  bd('afterrain', 'After the rain'),
  bd('seasunset', 'Sea at sunset'),
  bd('pines', 'Light through pines'),
  bd('heaven', 'Warm heaven light'),
  bd('cloudy', 'Cotton clouds'),
  bd('aurora', 'Dancing aurora'),
  bd('galaxy', 'Swirl of stars'),
  bd('sakura', 'Sakura breeze'),
  bd('lavender', 'Lavender haze'),
  bd('autumn', 'Autumn leaves'),
  bd('deepsea', 'Deep blue sea'),
  bd('hearts', 'Paper hearts'),
  bd('paws', 'Paw print paper'),
  bd('bamboo', 'Bamboo mist'),
  bd('snownight', 'Snowy night', WINTER),
  bd('festive', 'Festive garland', WINTER),
]

export const frameById = (id?: string | null) => FRAMES.find(f => f.id === id) ?? FRAMES[0]
export const backdropById = (id?: string | null) => BACKDROPS.find(b => b.id === id) ?? BACKDROPS[0]

/** Backdrops on offer this month (the free default isn't sold). */
export const backdropsFor = (month = new Date().getMonth() + 1) =>
  BACKDROPS.filter(b => b.id !== DEFAULT_BACKDROP && (!b.months || b.months.includes(month)))
