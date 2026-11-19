// scripts/check-locales.ts — Every locale must have one text per key, in order, with the same {placeholders}.
// Run: npx tsx scripts/check-locales.ts  (exits 1 and lists problems if any)

import fs from 'node:fs'
import path from 'node:path'
import { KEYS } from '../lib/locales/keys'

const dir = path.join(__dirname, '../lib/locales')
const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
let bad = 0
for (const file of fs.readdirSync(dir).filter(f => f !== 'keys.ts' && f.endsWith('.ts'))) {
  const list: string[] = require(path.join(dir, file)).default
  if (list.length !== KEYS.length) { console.log(`${file}: ${list.length} texts, expected ${KEYS.length}`); bad++; continue }
  KEYS.forEach((k, i) => {
    if (!list[i]?.trim()) { console.log(`${file} #${i + 1}: empty`); bad++ }
    else if (holes(k) !== holes(list[i])) { console.log(`${file} #${i + 1}: placeholders ${holes(list[i]) || '-'} vs ${holes(k)} ("${k}")`); bad++ }
  })
}
console.log(bad ? `${bad} problem(s)` : 'all locales ok')
process.exit(bad ? 1 : 0)
