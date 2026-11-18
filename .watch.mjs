// Read-only: listen to floors 1–3 for 10 minutes and log whenever the set of people present changes.
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
for (const f of [1, 2, 3]) {
  const ch = sb.channel(`hall-floor-${f}`, { config: { presence: { key: 'watch-' + f } } })
  let last = ''
  ch.on('presence', { event: 'sync' }, () => {
    const now = Object.entries(ch.presenceState()).map(([k, v]) => `${k.slice(0, 8)}…/${k.split(':')[1] ?? '-'} ${v.at(-1)?.name}`).sort().join(' | ')
    if (now !== last) { last = now; console.log(new Date().toISOString().slice(11, 19), `floor ${f}:`, now || '(nobody)') }
  })
  ch.subscribe()
}
setTimeout(() => process.exit(0), 600000)
