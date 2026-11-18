// components/3d/layout.ts — Floor plan of the memorial building (same on every floor):
// a central lobby with stairs and an elevator, corridors to three library-style galleries.
// The 3D scene draws from this, walk.ts builds its obstacles from it, and the server uses
// FLOOR_CAPACITY to decide which floor and shelf a new pet goes to.

export type P = { x: number; z: number }
export type Rect = { x0: number; z0: number; x1: number; z1: number }

export const FLOOR_COUNT = 33
export const LEVEL_HEIGHT = 5.5 // how far apart floors are, for the view down from upper floors
export const WALL_T = 0.4

const r = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 })
export const rectAt = (cx: number, cz: number, w: number, d: number): Rect => r(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2)
export const inRect = (p: P, a: Rect, m = 0) => p.x > a.x0 - m && p.x < a.x1 + m && p.z > a.z0 - m && p.z < a.z1 + m

// ── Rooms and corridors ──

type Side = 'N' | 'S' | 'E' | 'W'
export interface Door { side: Side; from: number; to: number; groundOnly?: boolean }
export interface Room { id: 'hub' | 'west' | 'east' | 'north' | 'vip'; name: string; rect: Rect; doors: Door[]; floor: 'tiles' | 'planks' }
export interface Corridor { id: string; rect: Rect; axis: 'x' | 'z' }

export const ROOMS: Room[] = [
  {
    id: 'hub', name: 'Lobby', rect: r(-9, -24, 9, -6), floor: 'tiles',
    doors: [
      { side: 'W', from: -16.5, to: -13.5 }, { side: 'E', from: -16.5, to: -13.5 },
      { side: 'N', from: -1.5, to: 1.5 },
      { side: 'S', from: -1.75, to: 1.75, groundOnly: true }, // main entrance, ground floor only
    ],
  },
  { id: 'west', name: 'West Gallery', rect: r(-29, -24, -15, -6), floor: 'planks', doors: [{ side: 'E', from: -16.5, to: -13.5 }] },
  { id: 'east', name: 'East Gallery', rect: r(15, -24, 29, -6), floor: 'planks', doors: [{ side: 'W', from: -16.5, to: -13.5 }, { side: 'N', from: 20.6, to: 23.4 }] },
  { id: 'north', name: 'North Library', rect: r(-12, -51, 12, -31), floor: 'planks', doors: [{ side: 'S', from: -1.5, to: 1.5 }] },
  // VIP Garden: big arched niches under flowers and fairy lights, through the East Gallery's north door
  { id: 'vip', name: 'VIP Garden', rect: r(15, -50, 29, -29), floor: 'planks', doors: [{ side: 'S', from: 20.6, to: 23.4 }] },
]

export const CORRIDORS: Corridor[] = [
  { id: 'cw', rect: r(-15, -16.5, -9, -13.5), axis: 'x' },
  { id: 'ce', rect: r(9, -16.5, 15, -13.5), axis: 'x' },
  { id: 'cn', rect: r(-1.5, -31, 1.5, -24), axis: 'z' },
  { id: 'cv', rect: r(20.6, -29, 23.4, -24), axis: 'z' },
]

export const HUB = ROOMS[0].rect
/** The whole building's outline (outside it, on the ground floor, is the garden). */
export const BBOX = r(-29, -51, 29, -6)
export const ENTRANCE: P = { x: 0, z: -6 }

export const isInside = (p: P) => ROOMS.some(rm => inRect(p, rm.rect)) || CORRIDORS.some(c => inRect(p, c.rect))
export const isInBuilding = (p: P) => inRect(p, BBOX)

/** Wall pieces as solid rectangles (outside each room's edge), with gaps for doors. */
export function wallRects(ground: boolean): Rect[] {
  const T = WALL_T
  const out: Rect[] = []
  const split = (a: number, b: number, gaps: Door[], make: (s: number, e: number) => Rect) => {
    const cuts = gaps.filter(g => ground || !g.groundOnly).sort((x, y) => x.from - y.from)
    let s = a
    for (const g of cuts) { if (g.from > s) out.push(make(s, g.from)); s = g.to }
    if (b > s) out.push(make(s, b))
  }
  for (const rm of ROOMS) {
    const { x0, z0, x1, z1 } = rm.rect
    const on = (side: Side) => rm.doors.filter(d => d.side === side)
    split(x0 - T, x1 + T, on('N'), (s, e) => r(s, z0 - T, e, z0))
    split(x0 - T, x1 + T, on('S'), (s, e) => r(s, z1, e, z1 + T))
    split(z0, z1, on('W'), (s, e) => r(x0 - T, s, x0, e))
    split(z0, z1, on('E'), (s, e) => r(x1, s, x1 + T, e))
  }
  for (const c of CORRIDORS) {
    const { x0, z0, x1, z1 } = c.rect
    if (c.axis === 'x') out.push(r(x0, z0 - T, x1, z0), r(x0, z1, x1, z1 + T))
    else out.push(r(x0 - T, z0, x0, z1), r(x1, z0, x1 + T, z1))
  }
  return out
}

// ── Getting between floors ──

export const STAIRS_UP = r(6.6, -24, 8.8, -18.5)     // a flight rising toward the north wall
export const STAIRS_DOWN = r(4.2, -24, 6.4, -18.5)   // an opening with steps going down
export const UP_FOOT: P = { x: 7.7, z: -17.6 }
export const DOWN_FOOT: P = { x: 5.3, z: -17.6 }
export const ELEVATOR_X = -5.5
export const ELEVATOR_FRONT: P = { x: ELEVATOR_X, z: -22.6 }

// ── Lobby furniture. rot is the y-rotation; 0 means the front faces +z (south, toward the entrance). ──

export type FurnitureKind = 'reception' | 'sofa' | 'armchair' | 'coffeeTable' | 'sideTable' | 'rug' | 'plant' | 'floorLamp' | 'noticeBoard' | 'easel' | 'candleTable' | 'bench'
export interface Furniture { kind: FurnitureKind; x: number; z: number; rot: number; w: number; d: number; solid: boolean }
const f = (kind: FurnitureKind, x: number, z: number, rot: number, w: number, d: number, solid = true): Furniture => ({ kind, x, z, rot, w, d, solid })

const lounge = (cx: number): Furniture[] => [
  f('rug', cx, -10.5, 0, 6, 5, false),
  f('sofa', cx, -8.6, Math.PI, 3, 1),
  f('sofa', cx, -12.4, 0, 3, 1),
  f('coffeeTable', cx, -10.5, 0, 1.6, 0.9),
]

const COMMON: Furniture[] = [
  ...lounge(-4.8),
  f('armchair', -8.2, -10.5, Math.PI / 2, 1.1, 1.1),
  // Remembrance corner beside the elevator
  f('easel', -8.3, -19.5, Math.PI / 2, 1.2, 0.6),
  f('candleTable', -7.2, -19.5, Math.PI / 2, 1.4, 0.7),
  f('plant', 2.6, -23.2, 0, 0.7, 0.7), f('plant', -2.6, -23.2, 0, 0.7, 0.7),
  f('bench', -2.5, -18.8, 0, 2, 0.6),
]

export function furniture(ground: boolean): Furniture[] {
  return ground
    ? [
      ...COMMON,
      f('reception', 5.2, -9.5, 0, 4.2, 1.2),
      f('armchair', 3.8, -13.2, 0, 1.1, 1.1), f('sideTable', 5, -13.2, 0, 0.7, 0.7), f('armchair', 6.2, -13.2, 0, 1.1, 1.1),
      f('plant', -2.8, -6.8, 0, 0.7, 0.7), f('plant', 2.8, -6.8, 0, 0.7, 0.7),
      f('floorLamp', -4.5, -6.8, 0, 0.4, 0.4), f('floorLamp', 4.5, -6.8, 0, 0.4, 0.4),
    ]
    : [
      ...COMMON,
      ...lounge(4.8),
      f('noticeBoard', 4.8, -6.6, Math.PI, 1.8, 0.4),
      f('plant', 8.2, -6.8, 0, 0.7, 0.7), f('plant', -8.2, -6.8, 0, 0.7, 0.7),
    ]
}

/** Footprint of a piece of furniture, accounting for a quarter turn. */
export function footprint(it: Furniture): Rect {
  const turned = Math.abs(Math.sin(it.rot)) > 0.5
  return rectAt(it.x, it.z, turned ? it.d : it.w, turned ? it.w : it.d)
}

// ── Galleries: bookcases run north–south; each face holds a grid of shrine cubbies. ──

export const SHELF = { height: 3.4, colW: 0.95, rowY: [0.55, 1.35, 2.15, 2.95] }

export interface Bookcase { x: number; z0: number; z1: number; depth: number }
type Face = { b: number; dir: 1 | -1 }
export interface Gallery { room: Room['id']; bookcases: Bookcase[]; aisles: Face[][] }

const bc = (x: number, z0: number, z1: number, depth = 1): Bookcase => ({ x, z0, z1, depth })

export const GALLERIES: Gallery[] = [
  {
    room: 'north',
    bookcases: [bc(-11.65, -48, -35, 0.7), bc(-7.5, -48, -35), bc(-3, -48, -35), bc(3, -48, -35), bc(7.5, -48, -35), bc(11.65, -48, -35, 0.7)],
    // Centre aisle first, then outward
    aisles: [[{ b: 2, dir: 1 }, { b: 3, dir: -1 }], [{ b: 1, dir: 1 }, { b: 2, dir: -1 }], [{ b: 3, dir: 1 }, { b: 4, dir: -1 }], [{ b: 0, dir: 1 }, { b: 1, dir: -1 }], [{ b: 4, dir: 1 }, { b: 5, dir: -1 }]],
  },
  {
    room: 'west',
    bookcases: [bc(-28.65, -21, -9, 0.7), bc(-24, -21, -9), bc(-19.5, -21, -9)],
    aisles: [[{ b: 2, dir: 1 }], [{ b: 1, dir: 1 }, { b: 2, dir: -1 }], [{ b: 0, dir: 1 }, { b: 1, dir: -1 }]],
  },
  {
    room: 'east',
    bookcases: [bc(28.65, -21, -9, 0.7), bc(24, -21, -9), bc(19.5, -21, -9)],
    aisles: [[{ b: 2, dir: -1 }], [{ b: 1, dir: -1 }, { b: 2, dir: 1 }], [{ b: 0, dir: -1 }, { b: 1, dir: 1 }]],
  },
]

export const BOOKCASES: Bookcase[] = GALLERIES.flatMap(g => g.bookcases)

export interface Slot { x: number; y: number; z: number; rot: number; room: Room['id']; standAt: P }

const ROW_ORDER = [1, 2, 0, 3] // eye level first

/** Every cubby on a floor, in fill order: gallery by gallery, aisle by aisle, alternating sides, eye level first. */
export const SLOTS: Slot[] = GALLERIES.flatMap(g => g.aisles.flatMap(faces => {
  const out: Slot[] = []
  const first = g.bookcases[faces[0].b]
  const cols = Math.floor((first.z1 - first.z0) / SHELF.colW)
  for (let c = 0; c < cols; c++) {
    for (const face of faces) {
      const b = g.bookcases[face.b]
      const z = b.z1 - SHELF.colW * (c + 0.5)
      const x = b.x + face.dir * (b.depth / 2 - 0.08)
      for (const row of ROW_ORDER) {
        out.push({ x, y: SHELF.rowY[row], z, rot: face.dir * Math.PI / 2, room: g.room, standAt: { x: b.x + face.dir * (b.depth / 2 + 1.0), z } })
      }
    }
  }
  return out
}))

export const FLOOR_CAPACITY = SLOTS.length

export const bookcaseRect = (b: Bookcase): Rect => r(b.x - b.depth / 2, b.z0, b.x + b.depth / 2, b.z1)

// ── The park in front of the entrance (ground floor) ──
// A paved path from the door to a round plaza with a fountain, a cross path to either side,
// benches, lamp posts, flower beds and shade trees. walk.ts walks around the solid bits.

export const PARK = {
  path: r(-1.3, -5.6, 1.3, 15.5),                 // main path, door to the far lawn
  cross: r(-14, 5.1, 14, 6.9),                     // side path through the plaza
  plaza: { x: 0, z: 6, r: 4.2 },
  fountain: { x: 0, z: 6, r: 1.9 },
  benches: [
    { x: -2.35, z: -1.5, rot: Math.PI / 2 }, { x: 2.35, z: -1.5, rot: -Math.PI / 2 },
    { x: -2.35, z: 12.5, rot: Math.PI / 2 }, { x: 2.35, z: 12.5, rot: -Math.PI / 2 },
    { x: -9, z: 4.1, rot: 0 }, { x: 9, z: 4.1, rot: 0 },
  ],
  lamps: [
    { x: -1.9, z: -3.3 }, { x: 1.9, z: -3.3 }, { x: -1.9, z: 1.2 }, { x: 1.9, z: 1.2 },
    { x: -1.9, z: 10.8 }, { x: 1.9, z: 10.8 }, { x: -13, z: 7.6 }, { x: 13, z: 7.6 },
  ],
  beds: [{ x: -6, z: -1.6, r: 1.4 }, { x: 6, z: -1.6, r: 1.4 }, { x: -6, z: 12.4, r: 1.4 }, { x: 6, z: 12.4, r: 1.4 }],
  trees: [[-8.5, -3], [8.5, -3], [-10.5, 10], [10.5, 10], [-5, 15], [5, 15], [-14.5, 1.5], [14.5, 1.5], [-15, 12.5], [15, 12.5], [-12, -2], [12, -2]] as [number, number][],
}

/** Solid park pieces (fountain, benches, lamps, beds, trunks) as rectangles for walking around. */
export function parkObstacles(): Rect[] {
  const f = PARK.fountain
  return [
    rectAt(f.x, f.z, f.r * 2, f.r * 2),
    ...PARK.benches.map(b => (Math.abs(Math.sin(b.rot)) > 0.5 ? rectAt(b.x, b.z, 0.7, 1.7) : rectAt(b.x, b.z, 1.7, 0.7))),
    ...PARK.lamps.map(l => rectAt(l.x, l.z, 0.3, 0.3)),
    ...PARK.beds.map(b => rectAt(b.x, b.z, b.r * 1.7, b.r * 1.7)),
    ...PARK.trees.map(([x, z]) => rectAt(x, z, 0.6, 0.6)),
  ]
}

// ── VIP Garden: two flower-covered arcades running north–south, each with big arched niches on both faces ──

export const VIP_ARCADES = [
  { x: 19.6, z0: -47, z1: -32, depth: 1.3 },
  { x: 25.2, z0: -47, z1: -32, depth: 1.3 },
]
export const VIP_NICHE_W = 2.5
export interface VipSlot { x: number; z: number; rot: number; standAt: P }

/** Every VIP niche on a floor (24): arcade by arcade, west face then east face, south to north. */
export const VIP_SLOTS: VipSlot[] = VIP_ARCADES.flatMap(a => {
  const n = Math.floor((a.z1 - a.z0) / VIP_NICHE_W)
  return ([-1, 1] as const).flatMap(dir => Array.from({ length: n }, (_, i) => {
    const z = a.z1 - VIP_NICHE_W * (i + 0.5)
    const x = a.x + dir * (a.depth / 2)
    return { x, z, rot: dir > 0 ? Math.PI / 2 : -Math.PI / 2, standAt: { x: x + dir * 1.3, z } }
  }))
})
export const VIP_CAPACITY = VIP_SLOTS.length

export const vipArcadeRect = (a: typeof VIP_ARCADES[number]): Rect => r(a.x - a.depth / 2, a.z0, a.x + a.depth / 2, a.z1)
