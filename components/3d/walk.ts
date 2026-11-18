// components/3d/walk.ts — Tap-to-walk routing: A* on a grid over one floor, then straightened into a few waypoints.
// You can stand in any room or corridor, plus the garden on the ground floor; walls, shelves,
// furniture, stairs and the elevator get in the way.

import {
  BBOX, BOOKCASES, CORRIDORS, ROOMS, STAIRS_DOWN, STAIRS_UP, VIP_ARCADES, bookcaseRect, footprint, furniture, inRect, parkObstacles, vipArcadeRect, wallRects,
  type P, type Rect,
} from './layout'

export { isInside, type P } from './layout'

const RADIUS = 0.35   // avatar's half-width; obstacles grow by this much
const GARDEN = 38     // how far from the entrance you can wander outside
const CELL = 0.5
const X0 = -34, Z0 = -56, X1 = 34, Z1 = 16
const NX = Math.round((X1 - X0) / CELL), NZ = Math.round((Z1 - Z0) / CELL)

const grow = (a: Rect): Rect => ({ x0: a.x0 - RADIUS, z0: a.z0 - RADIUS, x1: a.x1 + RADIUS, z1: a.z1 + RADIUS })
const AREAS: Rect[] = [...ROOMS.map(rm => rm.rect), ...CORRIDORS.map(c => c.rect)]

const obstacles = (ground: boolean): Rect[] => [
  ...wallRects(ground),
  ...BOOKCASES.map(bookcaseRect),
  ...VIP_ARCADES.map(vipArcadeRect),
  ...furniture(ground).filter(it => it.solid).map(footprint),
  STAIRS_UP, STAIRS_DOWN,
  ...(ground ? parkObstacles() : []),
].map(grow)

const OBSTACLES = { ground: obstacles(true), upper: obstacles(false) }

/** Exact test against the real shapes (used for straight-line checks). Upper floors have no garden. */
export function isFree(p: P, ground = true): boolean {
  // A hair of overlap so the seam where a corridor meets a room counts as floor
  const walkable = AREAS.some(a => inRect(p, a, 0.01)) || (ground && !inRect(p, BBOX) && Math.hypot(p.x, p.z) < GARDEN)
  if (!walkable) return false
  return !OBSTACLES[ground ? 'ground' : 'upper'].some(o => inRect(p, o))
}

const toI = (x: number) => Math.min(NX - 1, Math.max(0, Math.floor((x - X0) / CELL)))
const toJ = (z: number) => Math.min(NZ - 1, Math.max(0, Math.floor((z - Z0) / CELL)))
const cx = (i: number) => X0 + (i + 0.5) * CELL
const cz = (j: number) => Z0 + (j + 0.5) * CELL

const grids: { ground?: Uint8Array; upper?: Uint8Array } = {}
function grid(ground: boolean): Uint8Array {
  const key = ground ? 'ground' : 'upper'
  if (grids[key]) return grids[key]!
  const g = new Uint8Array(NX * NZ)
  // A cell is open only if its centre and all four corners are, so steps between open cells never clip an obstacle
  const h = CELL / 2
  const open = (x: number, z: number) =>
    isFree({ x, z }, ground) && isFree({ x: x - h, z: z - h }, ground) && isFree({ x: x + h, z: z - h }, ground) &&
    isFree({ x: x - h, z: z + h }, ground) && isFree({ x: x + h, z: z + h }, ground)
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) g[j * NX + i] = open(cx(i), cz(j)) ? 0 : 1
  return (grids[key] = g)
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
  const cost = new Float32Array(NX * NZ).fill(Infinity)
  const from = new Int32Array(NX * NZ).fill(-1)
  const gi = goal % NX, gj = Math.floor(goal / NX)
  const h = (c: number) => { const dx = Math.abs((c % NX) - gi), dz = Math.abs(Math.floor(c / NX) - gj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) }
  // Binary heap of [priority, cell]
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

/** Does the segment a→b pass through rectangle o? (slab test, exact) */
function hits(a: P, b: P, o: Rect): boolean {
  let t0 = 0, t1 = 1
  const dx = b.x - a.x, dz = b.z - a.z
  for (const [d, p, lo, hi] of [[dx, a.x, o.x0, o.x1], [dz, a.z, o.z0, o.z1]]) {
    if (Math.abs(d) < 1e-9) { if (p <= lo || p >= hi) return false; continue }
    let u = (lo - p) / d, v = (hi - p) / d
    if (u > v) [u, v] = [v, u]
    t0 = Math.max(t0, u); t1 = Math.min(t1, v)
    if (t0 >= t1) return false
  }
  return true
}

function clearLine(a: P, b: P, ground: boolean): boolean {
  if (OBSTACLES[ground ? 'ground' : 'upper'].some(o => hits(a, b, o))) return false
  // Obstacles are exact; staying on walkable floor is checked by sampling (it only matters at the garden's edge)
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2)
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    if (!isFree({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }, ground)) return false
  }
  return true
}

/** Waypoints from where the avatar stands to the tapped point (or the nearest reachable spot to it). */
export function planRoute(from: P, to: P, ground = true): P[] {
  const g = grid(ground)
  const start = nearestOpen(g, toI(from.x), toJ(from.z))
  const goal = nearestOpen(g, toI(to.x), toJ(to.z))
  const cells = astar(g, start, goal)
  if (!cells.length) return []
  const pts = cells.map(c => ({ x: cx(c % NX), z: cz(Math.floor(c / NX)) }))
  pts[pts.length - 1] = isFree(to, ground) ? to : pts[pts.length - 1]

  // Straighten: from each anchor, jump to the farthest point still in plain sight
  const out: P[] = []
  let anchor = from
  let i = 0
  while (i < pts.length) {
    let far = i
    for (let k = pts.length - 1; k > i; k--) if (clearLine(anchor, pts[k], ground)) { far = k; break }
    out.push(pts[far])
    anchor = pts[far]
    i = far + 1
  }
  return out
}
