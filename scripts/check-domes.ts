// scripts/check-domes.ts — The dome rule: domes fill one at a time, the next opens when the newest has fewer than
// OPEN_NEXT_AT_FREE shelves left, there's no last dome, and names repeat with a numeral past 100.
// Run: npx tsx scripts/check-domes.ts

import assert from 'node:assert'
import { openFloorsFrom } from '../lib/data'
import { getFloorName } from '../lib/utils'
import { FLOOR_CAPACITY as C, OPEN_NEXT_AT_FREE as N } from '../components/3d/sanctuary/plan'

assert.deepEqual(openFloorsFrom([]), [1], 'empty: only dome 1')
assert.deepEqual(openFloorsFrom([0, C - N]), [1], `exactly ${N} left: not yet`)
assert.deepEqual(openFloorsFrom([0, C - N + 1]), [1, 2], `fewer than ${N} left: dome 2 opens`)
const full = Array(41).fill(C); full[0] = 0
assert.deepEqual(openFloorsFrom(full), [41], '40 full domes: dome 41 is next, no cap')
full[41] = C - 1
assert.deepEqual(openFloorsFrom(full), [41, 42])
assert.equal(getFloorName(1), 'First Light')
assert.equal(getFloorName(100), 'Forever Home')
assert.equal(getFloorName(101), 'First Light II')
assert.equal(getFloorName(201), 'First Light III')
console.log('domes ok')
