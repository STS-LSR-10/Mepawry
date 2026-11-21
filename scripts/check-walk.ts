// scripts/check-walk.ts — The sanctuary's walking map: every key place is reachable from the entrance, and walls hold.
// Run: npx tsx scripts/check-walk.ts

import assert from 'node:assert'
import { heightAt, isFree, planRoute, type P } from '../components/3d/walk'
import { ARRIVAL, FRONT, PATH_END, SLOTS, SPAWN, VIP_ENTRY, VIP_SLOTS } from '../components/3d/sanctuary/plan'

const polar = (a: number, r: number): P => ({ x: Math.cos(a) * r, z: Math.sin(a) * r })
const reaches = (to: P, tol = 0.8) => {
  const route = planRoute(SPAWN, to)
  const end = route.at(-1)
  return !!end && Math.hypot(end.x - to.x, end.z - to.z) < tol
}

assert(isFree(SPAWN), 'spawn is free')
for (const [name, p] of Object.entries({
  reception: ARRIVAL, outerGallery: polar(FRONT + 0.6, 33), outerBack: polar(-FRONT, 33), innerGallery: polar(FRONT + 1.2, 21),
  garden: { x: 6, z: 9 }, pathEnd: { x: 0, z: PATH_END }, vipEntry: VIP_ENTRY, vipHall: { x: 0, z: -9.8 + 3.4 }, vipWing: { x: 7.7, z: -10.9 },
})) {
  assert(isFree(p), `${name} is free`)
  assert(reaches(p), `${name} is reachable`)
}
// a sample of cubbies and every VIP niche can be walked up to
for (const s of [SLOTS[0], SLOTS[1000], SLOTS[2500], SLOTS[SLOTS.length - 1]]) assert(reaches(s.standAt, 1.2), `cubby ${SLOTS.indexOf(s)} reachable`)
VIP_SLOTS.forEach((s, i) => assert(reaches(s.standAt, 1.6), `VIP niche ${i} reachable`))
// walls hold: you can't stand inside a wall or a cabinet, nor step from the garden straight into a gallery
assert(!isFree(polar(FRONT + 1, 30)), 'outer gallery inner wall')
assert(!isFree(polar(FRONT + 1, 35.6)), 'outer gallery cabinets')
assert(!isFree(polar(FRONT + 1.2, 18)), 'inner gallery wall')
// heights: ground, the terrace, halfway up the stairs
// Both side doorways of the reception lead straight into the outer gallery (no detour round the furniture)
const pathLen = (r: P[], from: P) => r.reduce((n, q, i) => n + Math.hypot(q.x - (i ? r[i - 1] : from).x, q.z - (i ? r[i - 1] : from).z), 0)
for (const s of [-1, 1]) {
  const to = { x: s * 7.6, z: 33 }, r = planRoute(ARRIVAL, to)
  assert(r.length > 0 && pathLen(r, ARRIVAL) < 11, `reception ${s < 0 ? 'left' : 'right'} doorway is open (${pathLen(r, ARRIVAL).toFixed(1)} m)`)
}
assert(heightAt({ x: 0, z: 20 }) === 0 && heightAt(VIP_ENTRY) > 1.2 && heightAt({ x: 0, z: -2.7 }) > 0.3)
console.log('walk ok:', SLOTS.length, 'cubbies,', VIP_SLOTS.length, 'VIP niches')
