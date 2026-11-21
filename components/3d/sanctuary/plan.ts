// components/3d/sanctuary/plan.ts — The Mepawry Sanctuary's floor plan, in metres on the ground (y = 0).
// One place for every dimension, shared by the 3D scene, the walking map and the shrine numbering, so they can't
// drift apart. Angles go round from +x towards +z; the front of the site (the entrance path) is +z.
//
// Plan: a glass-domed reception at the front; two ring galleries (outer and inner) lined on both sides with oak
// cabinets of cubbies, one pet per cubby; a garden in the middle; at the back of the garden, on a raised terrace,
// the VIP pavilion (domed hall + two wings) with arched niches.

export type P = { x: number; z: number }

export const FRONT = Math.PI / 2
export const W = 6                 // gallery width
export const H = 3.2               // gallery wall height (the glass vault sits on top)
export const SILL = 0.62           // stone base wall + wooden sill under the glass
export const PLINTH = 0.5
export const BAY = 3.4             // target bay width along a gallery

export const RINGS = [
  { r: 33, from: FRONT + 0.15, to: FRONT - 0.15 + Math.PI * 2 },  // outer: a full ring, the reception dome closes it at the front
  { r: 21, from: FRONT + 0.42, to: FRONT - 0.42 + Math.PI * 2 },  // inner: open at the front, you walk in from the garden
] as const
export const DOME = { x: 0, z: 33, r: 5.6, wall: 4.4 }             // reception, door facing the front
export const SIDE_DOORS = [FRONT + 0.5, FRONT - 0.5]               // extra doors in the outer gallery's outer wall
export const DOOR_HALF = 0.95                                       // half-width of a doorway (m)
export const VIP = { z: -9, y: 1.3 }                               // the raised terrace (centre, height)
export const VIP_BACK = 0.8                                         // the VIP hall sits this far behind the terrace centre
export const VIP_DOME = { r: 5.3, wall: 4.6 }
export const VIP_WING = { w: 5.2, d: 4.4, x: 7.7 }
export const VIP_CENTER: P = { x: 0, z: VIP.z - VIP_BACK }
export const VIP_PLANTER_R = 2.05                                  // the ring of planters round the VIP fountain (0.9 m deep)
export const TERRACE = { x0: -11.2, x1: 11.2, z0: VIP.z - 0.8 - 6, z1: VIP.z - 0.8 + 6 }   // its footprint
export const STAIRS = { x0: -1.8, x1: 1.8, z0: TERRACE.z1, z1: TERRACE.z1 + 2.2 }            // down to the garden
export const FOUNTAIN = { x: 0, z: 5, r: 3.4 }                                               // the garden fountain

// Cabinets (gallery interior)
export const CAB_H = 3.0
export const CAB_D = 0.55
export const BASE_H = 0.78
export const ROWS = 5
export const COLS = 6
export const ROW_H = (CAB_H - 0.2 - BASE_H) / ROWS

/** A gallery's bays: evenly spaced post angles from `from` to `to`. */
export function bays(ring: { r: number; from: number; to: number }) {
  const len = ring.to - ring.from
  const n = Math.ceil((len * ring.r) / BAY)
  const step = len / n
  return { step, angles: Array.from({ length: n + 1 }, (_, i) => ring.from + i * step) }
}

/** The two cabinet walls of a gallery: the outer one faces in, the inner one faces out. */
export const cabinetWalls = (r: number) => [
  { rr: r + W / 2 - 0.12 - CAB_D / 2, facing: -1 as const },
  { rr: r - W / 2 + 0.12 + CAB_D / 2, facing: 1 as const },
]

/** A bay has no cabinet where an outer door opens. */
export const isDoorBay = (r: number, a: number, step: number) =>
  r > 30 && SIDE_DOORS.some(d => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < step / 2)

/** Local frame of a cabinet at angle a: `at(x, y, z)` with x across the cabinet, z out of its face; `ry` its yaw. */
export function cabinetFrame(a: number, rr: number, facing: 1 | -1) {
  const nx = Math.cos(a) * facing, nz = Math.sin(a) * facing
  const ry = Math.atan2(nx, nz)
  const xx = Math.cos(ry), xz = -Math.sin(ry)
  const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr
  return { ry, at: (x: number, y: number, z: number) => ({ x: bx + xx * x + nx * z, y, z: bz + xz * x + nz * z }) }
}

/** Width of a cabinet in a bay at radius rr (leaving room for the pilasters). */
export const cabinetWidth = (rr: number, step: number) => 2 * rr * Math.sin(step / 2) - 0.34

// ── Shrines ──

export interface Slot { x: number; y: number; z: number; rot: number; room: string; standAt: P }

/**
 * A gallery's eight zones, counted from the reception: A is the first stretch on the left of the reception's left
 * doorway, going round past the back (A–D on the left, E–H on the right) to H beside its right doorway.
 */
export function zoneIndex(a: number, from: number, to: number) {
  const along = (((a - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return Math.min(7, Math.max(0, Math.floor(along / ((to - from) / 8))))
}
const zoneOf = (a: number, ring: { from: number; to: number }) => 'ABCDEFGH'[zoneIndex(a, ring.from, ring.to)]
const ROW_ORDER = [2, 1, 3, 0, 4] // eye level first

/**
 * Every cubby, in the order shrines fill them: the outer gallery first, the bays nearest the reception first,
 * eye-level rows first; then the inner gallery the same way. A slot's point is the portrait's centre.
 */
export const SLOTS: Slot[] = RINGS.flatMap((ring, ri) => {
  const { step, angles } = bays(ring)
  const bayAngles = angles.slice(0, -1).map(a0 => a0 + step / 2).filter(a => !isDoorBay(ring.r, a, step))
  const near = (a: number) => Math.abs(Math.atan2(Math.sin(a - FRONT), Math.cos(a - FRONT)))
  bayAngles.sort((a, b) => near(a) - near(b))
  const out: Slot[] = []
  for (const a of bayAngles) for (const { rr, facing } of cabinetWalls(ring.r)) {
    const w = cabinetWidth(rr, step), cw = w / COLS
    const { ry, at } = cabinetFrame(a, rr, facing)
    const stand = at(0, 0, CAB_D / 2 + 1.1)
    for (const row of ROW_ORDER) for (let col = 0; col < COLS; col++) {
      const p = at(-w / 2 + (col + 0.5) * cw, BASE_H + row * ROW_H + ROW_H / 2, -0.04)
      out.push({ x: p.x, y: p.y, z: p.z, rot: ry, room: `${ri === 0 ? 'Outer' : 'Inner'} gallery · Zone ${zoneOf(a, ring)}`, standAt: { x: stand.x, z: stand.z } })
    }
  }
  return out
})
export const FLOOR_CAPACITY = SLOTS.length
export const FLOOR_COUNT = 33

// ── VIP niches (in the pavilion on the terrace) ──

export interface VipSlot { x: number; y: number; z: number; rot: number; standAt: P; seat: boolean; w: number; h: number }

const domeApothem = VIP_DOME.r * Math.cos(Math.PI / 8)
const domeWall = (i: number, inset: number) => {
  const a = (i * Math.PI) / 4
  return { x: VIP_CENTER.x + Math.cos(a) * (domeApothem - inset), z: VIP_CENTER.z + Math.sin(a) * (domeApothem - inset), rot: Math.atan2(-Math.cos(a), -Math.sin(a)) }
}
const vip = (x: number, z: number, rot: number, seat = false, w = 1.3, h = 2.6): VipSlot => ({
  x, y: VIP.y + (seat ? 2.05 : 1.75), z, rot, seat, w, h,
  standAt: { x: x + Math.sin(rot) * 1.5, z: z + Math.cos(rot) * 1.5 },
})

/** The domed hall's four diagonal alcoves and its window-seat alcove, then each wing's two alcoves and seat alcove. */
export const VIP_SLOTS: VipSlot[] = [
  ...[1, 3, 5, 7].map(i => { const w = domeWall(i, 0.22); return vip(w.x, w.z, w.rot) }),
  (() => { const w = domeWall(6, 0.22); return vip(w.x, w.z, w.rot, true, 1.8) })(),
  ...[-1, 1].flatMap(s => [
    ...[-1.5, 1.5].map(x => vip(s * VIP_WING.x + x, VIP_CENTER.z - VIP_WING.d / 2 + 0.22, 0, false, 1.15, 2.3)),
    vip(s * (VIP_WING.x + VIP_WING.w / 2 - 0.22), VIP_CENTER.z + 0.2, -s * Math.PI / 2, true, 1.3, 2.3),
  ]),
]
export const VIP_CAPACITY = VIP_SLOTS.length

// ── Where people appear ──

export const PATH_END = 54                                     // the entrance path runs out to here, ending in a round bay
export const SPAWN: P = { x: 0, z: 42 }                       // on the path in front of the reception
export const ARRIVAL: P = { x: 0, z: DOME.z + 2.6 }           // inside the reception, in front of the desk (changing floors)
export const VIP_ENTRY: P = { x: 0, z: VIP.z + 4.2 }          // on the terrace, in front of the VIP hall's door
