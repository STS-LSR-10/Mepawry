// lib/decor.ts — Frames and backdrops a shrine can be given. They stay for good (the newest one shows).
// Shared by the gift picker (client), the cabinet (3D) and the API (server). Prices are THB; payment isn't connected
// yet, so for now only admins can apply them (POST /api/pets/:id/decor).

export type FrameGroup = 'classic' | 'plain' | 'pattern'
export type FramePattern = 'paws' | 'dots' | 'stripes' | 'hearts' | 'stars' | 'gingham' | 'daisy' | 'thai' | 'marble' | 'oak' | 'rainbow' | 'pearl'

export interface FrameStyle {
  id: string
  name: string
  price: number
  group: FrameGroup
  /** The solid colour (patterned frames: their base colour, used for the inner lip) */
  color: string
  metalness: number
  roughness: number
  /** Patterned frames: the tile the cabinet paints on the frame (components/3d/frameTextures.ts) */
  pattern?: FramePattern
  /** CSS background for the picker swatch */
  swatch: string
}

export type BackdropGroup = 'festival' | 'season' | 'always'

export interface Backdrop {
  id: string
  name: string
  price: number
  group: BackdropGroup
  /** Festivals and seasons: on offer only when this is true for the date (month 1–12, day of month) */
  on?: (m: number, d: number) => boolean
}

export const DEFAULT_FRAME = 'gold'
export const DEFAULT_BACKDROP = 'midnight'
export const FRAME_PRICE = 49
export const PATTERN_FRAME_PRICE = 59
export const BACKDROP_PRICE = 59

const frame = (group: FrameGroup, id: string, name: string, color: string, metalness: number, roughness: number, swatch: string, pattern?: FramePattern): FrameStyle =>
  ({ id, name, price: pattern ? PATTERN_FRAME_PRICE : FRAME_PRICE, group, color, metalness, roughness, pattern, swatch })
const svg = (w: number, body: string) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${w}'%3E${body}%3C/svg%3E")`
const plain = (id: string, name: string, color: string, a: string, b: string, metal = 0) =>
  frame('plain', id, name, color, metal, metal ? 0.3 : 0.45, metal ? `linear-gradient(135deg,${a},${color} 55%,${b})` : `linear-gradient(135deg,${a},${b})`)

export const FRAMES: FrameStyle[] = [
  frame('classic', 'gold', 'Classic gold', '#E2B64C', 0.85, 0.3, 'linear-gradient(135deg,#F7DE8E,#C9932A 55%,#F2D07A)'),
  frame('classic', 'silver', 'Moon silver', '#D9DDE3', 0.9, 0.25, 'linear-gradient(135deg,#FFFFFF,#AEB4BD 55%,#E9ECF0)'),
  frame('classic', 'rose', 'Rose gold', '#E7A98F', 0.85, 0.3, 'linear-gradient(135deg,#FBD3C2,#C9806A 55%,#F4C2AE)'),
  frame('classic', 'ivory', 'Ivory wood', '#F3EBDD', 0, 0.6, 'linear-gradient(135deg,#FFFDF7,#E6DAC4)'),
  frame('classic', 'walnut', 'Dark walnut', '#6B4430', 0, 0.55, 'linear-gradient(135deg,#8A5A3E,#4A2C1C)'),
  frame('classic', 'ebony', 'Black lacquer', '#1E1B1A', 0.2, 0.25, 'linear-gradient(135deg,#3A3533,#0E0C0B)'),
  frame('classic', 'blush', 'Blush pink', '#F6B4C6', 0, 0.45, 'linear-gradient(135deg,#FFD6E2,#EE9BB2)'),
  frame('classic', 'mint', 'Soft mint', '#B9DFC6', 0, 0.45, 'linear-gradient(135deg,#DDF4E4,#93C9A6)'),
  frame('classic', 'sky', 'Sky blue', '#A9D3F2', 0, 0.45, 'linear-gradient(135deg,#DCEEFC,#7FB6E3)'),
  plain('lavender', 'Lavender', '#C9B6EE', '#E3D7F7', '#B7A1E3'),
  plain('peach', 'Peach', '#F8C1A2', '#FFE0CC', '#F3A982'),
  plain('butter', 'Butter yellow', '#F6DE86', '#FFF1B8', '#EDCC5E'),
  plain('sage', 'Sage green', '#AFC2A2', '#C9D8BE', '#8EA77F'),
  plain('teal', 'Teal', '#5FB8B0', '#9FE0DA', '#3E9E97'),
  plain('coral', 'Coral', '#F08A72', '#FFB8A6', '#E5624A'),
  plain('burgundy', 'Burgundy', '#8A2D31', '#B5413F', '#6E1E24'),
  plain('navy', 'Navy', '#2B4170', '#3C5A8C', '#1C2C4E'),
  plain('charcoal', 'Charcoal', '#57575D', '#7A7A80', '#3E3E44'),
  plain('white', 'Pure white', '#F7F7F5', '#FFFFFF', '#E6E6E6'),
  plain('copper', 'Copper', '#C47A45', '#F0B07A', '#E59A63', 0.8),
  plain('champagne', 'Champagne', '#E8D8B4', '#FBF0D9', '#F5E8CB', 0.7),
  frame('pattern', 'paws', 'Paw prints', '#F6E2C8', 0, 0.6, `#F6E2C8 ${svg(22, "%3Cg fill='%23B07A4A'%3E%3Cellipse cx='11' cy='13' rx='3.4' ry='2.8'/%3E%3Ccircle cx='7' cy='9' r='1.4'/%3E%3Ccircle cx='10' cy='7.4' r='1.4'/%3E%3Ccircle cx='13' cy='7.4' r='1.4'/%3E%3Ccircle cx='15.6' cy='9.4' r='1.4'/%3E%3C/g%3E")}`, 'paws'),
  frame('pattern', 'dots', 'Polka dots', '#F4A9BC', 0, 0.45, '#F4A9BC radial-gradient(#FFFFFF 2.2px,transparent 2.6px) 0 0/10px 10px', 'dots'),
  frame('pattern', 'stripes', 'Candy stripes', '#E2453C', 0, 0.35, 'repeating-linear-gradient(45deg,#E2453C 0 5px,#FFFFFF 5px 10px)', 'stripes'),
  frame('pattern', 'hearts', 'Little hearts', '#FFE3EA', 0, 0.5, `#FFE3EA ${svg(16, "%3Cpath d='M8 13 C2 9 3 4 6 4 C7 4 8 5 8 6 C8 5 9 4 10 4 C13 4 14 9 8 13 Z' fill='%23E2577A'/%3E")}`, 'hearts'),
  frame('pattern', 'stars', 'Stars and moon', '#24305A', 0.1, 0.45, `#24305A ${svg(22, "%3Cpath d='M6 3 l1.2 2.6 2.8.3 -2.1 1.9.6 2.8 -2.5-1.5 -2.5 1.5.6-2.8 -2.1-1.9 2.8-.3z' fill='%23F2D07A'/%3E%3Cpath d='M17 13 a4 4 0 1 0 3 6 a3 3 0 1 1 -3 -6z' fill='%23F2D07A'/%3E")}`, 'stars'),
  frame('pattern', 'gingham', 'Gingham', '#9DBBE0', 0, 0.6, 'repeating-linear-gradient(0deg,rgba(120,160,210,.55) 0 5px,transparent 5px 10px),repeating-linear-gradient(90deg,rgba(120,160,210,.55) 0 5px,#FFFFFF 5px 10px)', 'gingham'),
  frame('pattern', 'daisy', 'Daisy meadow', '#DDEBCF', 0, 0.55, `#DDEBCF ${svg(20, "%3Cg fill='%23FFFFFF'%3E%3Ccircle cx='10' cy='6.5' r='2.3'/%3E%3Ccircle cx='13.5' cy='10' r='2.3'/%3E%3Ccircle cx='10' cy='13.5' r='2.3'/%3E%3Ccircle cx='6.5' cy='10' r='2.3'/%3E%3C/g%3E%3Ccircle cx='10' cy='10' r='1.8' fill='%23EDBB3A'/%3E")}`, 'daisy'),
  frame('pattern', 'thai', 'Thai gold lai', '#8E1F22', 0.35, 0.4, `#8E1F22 ${svg(18, "%3Cpath d='M9 1 C12 5 14 7 17 9 C14 11 12 13 9 17 C6 13 4 11 1 9 C4 7 6 5 9 1 Z' fill='none' stroke='%23E8C25A' stroke-width='1.4'/%3E%3Cpath d='M9 5 C10.5 7 11 8 13 9 C11 10 10.5 11 9 13 C7.5 11 7 10 5 9 C7 8 7.5 7 9 5 Z' fill='%23E8C25A'/%3E")}`, 'thai'),
  frame('pattern', 'marble', 'White marble', '#EEECE8', 0.05, 0.2, 'linear-gradient(115deg,transparent 40%,rgba(150,150,160,.35) 42%,transparent 46%),linear-gradient(60deg,transparent 60%,rgba(150,150,160,.3) 62%,transparent 65%),linear-gradient(135deg,#FAFAF8,#E4E2DE)', 'marble'),
  frame('pattern', 'oak', 'Rustic oak', '#C1915F', 0, 0.7, 'repeating-linear-gradient(90deg,#C89A68 0 3px,#B9875A 3px 5px,#D3A877 5px 9px,#A8794C 9px 10px)', 'oak'),
  frame('pattern', 'rainbow', 'Rainbow', '#FBBC74', 0, 0.4, 'linear-gradient(135deg,#F28B82,#FBBC74,#FDE37A,#9BD49A,#8EC5F0,#B8A2E8)', 'rainbow'),
  frame('pattern', 'pearl', 'Pearl beads', '#EFE7DA', 0.25, 0.3, '#EFE7DA radial-gradient(circle at 35% 35%,#FFFFFF 1px,#E8DDCB 3.4px,#CDBFA8 4.2px,transparent 4.6px) 0 0/9px 9px', 'pearl'),
]

const bd = (id: string, name: string, group: BackdropGroup = 'always', on?: Backdrop['on']): Backdrop => ({ id, name, price: BACKDROP_PRICE, group, on })
const months = (...ms: number[]) => (m: number) => ms.includes(m)

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
  bd('mountainlake', 'Mountain lake at dawn'),
  bd('milkyway', 'Milky Way'),
  bd('riceterraces', 'Rice terraces'),
  bd('fireflies', 'Firefly forest'),
  bd('mistymountains', 'Misty mountains'),
  bd('waterfall', 'Jungle waterfall'),
  bd('wildflowers', 'Wildflower hills'),
  bd('lotussunset', 'Lotus pond at sunset'),
  bd('festive', 'Festive garland', 'festival', months(11, 12, 1)),
  bd('songkran', 'Songkran splash', 'festival', months(4)),
  bd('loykrathong', 'Loy Krathong night', 'festival', months(11)),
  bd('lunarnewyear', 'Lunar New Year lanterns', 'festival', (m, d) => (m === 1 && d >= 15) || m === 2),
  bd('midautumn', 'Mid-Autumn moon', 'festival', months(9)),
  bd('halloween', 'Gentle Halloween', 'festival', months(10)),
  bd('nyfireworks', 'New Year fireworks', 'festival', (m, d) => (m === 12 && d >= 26) || (m === 1 && d <= 15)),
  bd('rosepetals', 'Rose petals', 'festival', (m, d) => m === 2 && d <= 14),
  bd('snownight', 'Snowy night', 'season', months(11, 12, 1)),
  bd('spring', 'Spring blossoms', 'season', months(3, 4, 5)),
  bd('summer', 'Summer sunflowers', 'season', months(6, 7, 8)),
  bd('rainy', 'Rainy season lotus pond', 'season', months(7, 8, 9, 10)),
  bd('winterforest', 'Winter forest', 'season', months(12, 1, 2)),
]

export const frameById = (id?: string | null) => FRAMES.find(f => f.id === id) ?? FRAMES[0]
export const backdropById = (id?: string | null) => BACKDROPS.find(b => b.id === id) ?? BACKDROPS[0]

/** Backdrops on offer on this date (the free default isn't sold; festivals and seasons come and go). */
export const backdropsFor = (date = new Date()) =>
  BACKDROPS.filter(b => b.id !== DEFAULT_BACKDROP && (!b.on || b.on(date.getMonth() + 1, date.getDate())))
