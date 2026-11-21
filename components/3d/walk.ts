// components/3d/walk.ts — Tap-to-walk in the Mepawry Sanctuary: where you can stand, how high the ground is there,
// and a route to a tapped point (A* on a grid, then straightened into a few waypoints).
// Everything is worked out from the floor plan (sanctuary/plan.ts): the ring galleries (walls and cabinets on both
// sides), the reception dome and its four doorways, the garden, and the VIP terrace you climb by its stairs.

import {
  CAB_D, DOME, DOOR_HALF, PATH_END, FOUNTAIN, RINGS, SIDE_DOORS, STAIRS, TERRACE, VIP, VIP_CENTER, VIP_DOME, VIP_WING, W, type P,
} from './sanctuary/plan'

export type { P }

const RADIUS = 0.35     // avatar's half-width; obstacles grow by this much
const PARK = 44         // how far out you can wander (the forest starts beyond)
const CELL = 0.5
const X0 = -46, Z0 = -46, X1 = 46, Z1 = 57
const NX = Math.round((X1 - X0) / CELL), NZ = Math.round((Z1 - Z0) / CELL)
const TAU = Math.PI * 2

const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
const inArc = (a: number, from: number, to: number) => (((a - from) % TAU) + TAU) % TAU <= to - from
const near = (p: P, x: number, z: number, r: number) => Math.hypot(p.x - x, p.z - z) < r + RADIUS

// ── The pieces of the plan ──

/** Walls and cabinets of the ring galleries: two solid bands per ring, along its arc (side doors open the outer wall). */
function ringBlocked(p: P): boolean {
  const rad = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x)
  for (const g of RINGS) {
    if (!inArc(a, g.from, g.to)) continue
    const ri = g.r - W / 2, ro = g.r + W / 2, depth = 0.12 + CAB_D
    if (rad > ri - 0.15 - RADIUS && rad < ri + depth + RADIUS) return true
    if (rad > ro - depth - RADIUS && rad < ro + 0.15 + RADIUS) {
      const door = g.r > 30 && SIDE_DOORS.some(d => angDiff(a, d) * rad < DOOR_HALF - RADIUS)
      if (!door) return true
    }
  }
  return false
}

/** True inside a gallery corridor (between its two cabinet walls). */
export function inGallery(p: P): boolean {
  const rad = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x)
  return RINGS.some(g => inArc(a, g.from, g.to) && Math.abs(rad - g.r) < W / 2 - 0.12 - CAB_D)
}

/** An octagonal domed hall, its walls as a ring band with gaps for doorways at the given angles. */
function domeBlocked(p: P, cx: number, cz: number, r: number, doors: { at: number; half: number }[]): boolean {
  const d = Math.hypot(p.x - cx, p.z - cz)
  const inner = r * Math.cos(Math.PI / 8) - 0.2, outer = r + 0.1
  if (d < inner - RADIUS || d > outer + RADIUS) return false
  const la = Math.atan2(p.z - cz, p.x - cx)
  return !doors.some(dr => angDiff(la, dr.at) * d < dr.half - RADIUS)
}

const Q = Math.PI / 2
/** Reception: four doorways (front to the path, back to the garden, left and right into the outer gallery). */
const receptionBlocked = (p: P) =>
  domeBlocked(p, DOME.x, DOME.z, DOME.r, [0, Q, Math.PI, -Q].map(at => ({ at, half: 1.05 }))) ||
  near(p, DOME.x, DOME.z - 0.6, 1.75) ||               // the curved desk
  near(p, -3.3, DOME.z + 3.0, 1.0) ||                  // lounge: armchairs round a coffee table (in the front-left corner, clear of the doorway and the desk)
  near(p, -3.3, DOME.z - 2.4, 0.95) ||                 // the sofa
  near(p, 3.2, DOME.z + 2.2, 0.55)                     // the directory board

const inRect = (p: P, r: { x0: number; x1: number; z0: number; z1: number }, m = 0) =>
  p.x > r.x0 - m && p.x < r.x1 + m && p.z > r.z0 - m && p.z < r.z1 + m

/** The terrace: walkable on top, its edge is a balustrade except where the stairs come up at the front. */
function terraceBlocked(p: P): boolean {
  if (!inRect(p, TERRACE, RADIUS) || inRect(p, TERRACE, -RADIUS)) return false
  const atStairs = p.x > STAIRS.x0 + RADIUS && p.x < STAIRS.x1 - RADIUS && p.z > TERRACE.z1 - RADIUS * 2
  return !atStairs
}

/** Beside the stairs (below the terrace front) there's a drop: you can only come up the steps themselves. */
const stairSides = (p: P) => p.z > STAIRS.z0 && p.z < STAIRS.z1 && Math.abs(p.x) > STAIRS.x1 - RADIUS && Math.abs(p.x) < STAIRS.x1 + RADIUS

/** The VIP hall (domed) and its two wings. */
function vipBlocked(p: P): boolean {
  const { x: cx, z: cz } = VIP_CENTER
  // hall walls: the door at the front, arched doorways into the wings left and right
  if (domeBlocked(p, cx, cz, VIP_DOME.r, [{ at: Q, half: 1.05 }, { at: 0, half: 1.05 }, { at: Math.PI, half: 1.05 }])) return true
  if ([-1, 1].some(s => near(p, s * 1.25, cz + VIP_DOME.r * 0.86, 0.3))) return true // urns by the door
  for (const s of [-1, 1]) {
    const wx = s * VIP_WING.x, hw = VIP_WING.w / 2, hd = VIP_WING.d / 2
    const local = { x: (p.x - wx) * s, z: p.z - cz } // x grows away from the hall
    const inWing = local.x > -hw - RADIUS && local.x < hw + RADIUS && local.z > -hd - RADIUS && local.z < hd + RADIUS
    if (!inWing) continue
    // the wing's own walls: back, front (glass) and the far end; its near end has a doorway into the hall
    if (local.z < -hd + 0.25 + RADIUS || local.z > hd - 0.25 - RADIUS || local.x > hw - 0.25 - RADIUS) return true // walls and the alcoves along them
    if (Math.abs(local.x + hw) < 0.1 + RADIUS && Math.abs(local.z) > 1.05 - RADIUS) return true
  }
  return false
}

// ── Public ──

/** Can the avatar stand here? */
export function isFree(p: P): boolean {
  // beyond the park edge only the entrance path (and the round bay at its end) is walkable
  if (Math.hypot(p.x, p.z) > PARK && !(Math.abs(p.x) < 2 - RADIUS && p.z < PATH_END) && Math.hypot(p.x, p.z - PATH_END) > 2.4 - RADIUS) return false
  if (ringBlocked(p) || receptionBlocked(p)) return false
  if (near(p, FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.r)) return false
  if (near(p, -11, 1, 0.5) || near(p, 12, -1, 0.5)) return false       // the willows' trunks
  if (terraceBlocked(p) || stairSides(p)) return false
  if (inRect(p, TERRACE, -RADIUS) && vipBlocked(p)) return false
  return true
}

/** Indoors (the reception, a gallery, the VIP hall or wings): for the lighting and the camera. */
export function isInside(p: P): boolean {
  if (Math.hypot(p.x - DOME.x, p.z - DOME.z) < DOME.r - 0.3) return true
  if (inGallery(p)) return true
  if (Math.hypot(p.x - VIP_CENTER.x, p.z - VIP_CENTER.z) < VIP_DOME.r - 0.3) return true
  return [-1, 1].some(s => Math.abs(p.x - s * VIP_WING.x) < VIP_WING.w / 2 && Math.abs(p.z - VIP_CENTER.z) < VIP_WING.d / 2)
}

/** Ground height: the terrace is raised; the stairs ramp up to it. */
export function heightAt(p: P): number {
  if (inRect(p, TERRACE)) return VIP.y
  if (p.x > STAIRS.x0 && p.x < STAIRS.x1 && p.z >= STAIRS.z0 && p.z < STAIRS.z1) return VIP.y * (1 - (p.z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0))
  return 0
}

// ── Routing ──

const toI = (x: number) => Math.min(NX - 1, Math.max(0, Math.floor((x - X0) / CELL)))
const toJ = (z: number) => Math.min(NZ - 1, Math.max(0, Math.floor((z - Z0) / CELL)))
const cx = (i: number) => X0 + (i + 0.5) * CELL
const cz = (j: number) => Z0 + (j + 0.5) * CELL

let cached: Uint8Array | null = null
function grid(): Uint8Array {
  if (cached) return cached
  const g = new Uint8Array(NX * NZ)
  // A cell is open only if its centre and all four corners are, so steps between open cells never clip an obstacle
  const h = CELL / 2
  const open = (x: number, z: number) =>
    isFree({ x, z }) && isFree({ x: x - h, z: z - h }) && isFree({ x: x + h, z: z - h }) && isFree({ x: x - h, z: z + h }) && isFree({ x: x + h, z: z + h })
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) g[j * NX + i] = open(cx(i), cz(j)) ? 0 : 1
  return (cached = g)
}

/** Nearest open cell to (i, j), searching outward in rings. */
function nearestOpen(g: Uint8Array, i: number, j: number): number {
  for (let rad = 0; rad < Math.max(NX, NZ); rad++) {
    for (let di = -rad; di <= rad; di++) for (let dj = -rad; dj <= rad; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue
      const a = i + di, b = j + dj
      if (a >= 0 && b >= 0 && a < NX && b < NZ && !g[b * NX + a]) return b * NX + a
    }
  }
  return j * NX + i
}

/** A* over the grid, 8 directions, no cutting corners. Returns cell indices from start to goal. */
function astar(g: Uint8Array, start: number, goal: number): number[] {
  // Float64: a float32 cost can round up, making the same step look cheaper every time and looping forever
  const cost = new Float64Array(NX * NZ).fill(Infinity)
  const from = new Int32Array(NX * NZ).fill(-1)
  const gi = goal % NX, gj = Math.floor(goal / NX)
  const h = (c: number) => { const dx = Math.abs((c % NX) - gi), dz = Math.abs(Math.floor(c / NX) - gj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) }
  const heap: [number, number][] = []
  const push = (item: [number, number]) => {
    heap.push(item)
    for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      for (let k = 0; ;) {
        const l = 2 * k + 1, rr = l + 1
        let m = k
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr
        if (m === k) break
        ;[heap[m], heap[k]] = [heap[k], heap[m]]; k = m
      }
    }
    return top
  }
  cost[start] = 0
  push([h(start), start])
  while (heap.length) {
    const [, c] = pop()
    if (c === goal) break
    const ci = c % NX, cj = Math.floor(c / NX)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue
      const ni = ci + di, nj = cj + dj
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue
      const n = nj * NX + ni
      if (g[n]) continue
      if (di && dj && (g[cj * NX + ni] || g[nj * NX + ci])) continue
      const nc = cost[c] + (di && dj ? 1.414 : 1)
      if (nc < cost[n]) { cost[n] = nc; from[n] = c; push([nc + h(n), n]) }
    }
  }
  if (from[goal] === -1 && goal !== start) return []
  const path = [goal]
  while (path[0] !== start) path.unshift(from[path[0]])
  return path
}

/** Every point along a→b is free (sampled every 0.2 m). */
function clearLine(a: P, b: P): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2)
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    if (!isFree({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k })) return false
  }
  return true
}

/** Waypoints from where the avatar stands to the tapped point (or the nearest reachable spot to it). */
export function planRoute(from: P, to: P): P[] {
  const g = grid()
  const start = nearestOpen(g, toI(from.x), toJ(from.z))
  const goal = nearestOpen(g, toI(to.x), toJ(to.z))
  const cells = astar(g, start, goal)
  if (!cells.length) return []
  const pts = cells.map(c => ({ x: cx(c % NX), z: cz(Math.floor(c / NX)) }))
  pts[pts.length - 1] = isFree(to) ? to : pts[pts.length - 1]

  // Straighten: from each anchor, walk forward while the next point is still in plain sight
  const out: P[] = []
  let anchor = from
  let i = 0
  while (i < pts.length) {
    let far = i
    while (far + 1 < pts.length && clearLine(anchor, pts[far + 1])) far++
    out.push(pts[far])
    anchor = pts[far]
    i = far + 1
  }
  return out
}
