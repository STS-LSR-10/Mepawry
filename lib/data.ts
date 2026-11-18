// lib/data.ts — Real data layer on Supabase: pets, candles/flowers, guestbook, visits, photos and who's online.
// Every number on the site is counted from here. Server-only: it uses the service role key,
// which bypasses Row Level Security, so it must never be imported into a client component.
// Tables and SQL functions live in supabase/schema.sql.

import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Floor, GlobalStats, GuestbookEntry, Pet, Species, TributeType } from '@/types'
import { FLOOR_CAPACITY, FLOOR_COUNT } from '@/components/3d/layout'
import { generateSlug, getFloorName } from '@/lib/utils'

const g = globalThis as typeof globalThis & { __pmDb?: SupabaseClient }

/** Created on first use, so builds without keys still compile. */
function db(): SupabaseClient {
  if (!g.__pmDb) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    g.__pmDb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return g.__pmDb
}

/** Unwraps a Supabase reply, turning its error into a thrown one. */
function must<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

// ── Photos (Supabase Storage, public bucket "pet-photos") ──

/** Uploads a validated data: URL and returns its public URL. */
async function storePhoto(petId: string, dataUrl: string): Promise<string> {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('Photo must be a JPG, PNG or WebP')
  const path = `${petId}/${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
  const bucket = db().storage.from('pet-photos')
  must(await bucket.upload(path, Buffer.from(m[2], 'base64'), { contentType: `image/${m[1]}` }))
  return bucket.getPublicUrl(path).data.publicUrl
}

// ── Pets ──

export async function getPetBySlug(slug: string): Promise<Pet | null> {
  return must(await db().from('pets').select('*').eq('slug', slug).maybeSingle())
}

export async function getPetsOnFloor(floor: number): Promise<Pet[]> {
  return (must(await db().from('pets').select('*').eq('floor_id', floor).order('shrine_position'))) ?? []
}

export async function getMemorials(opts: { species?: string; waitingOnly?: boolean; search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, opts.limit ?? 24)
  let q = db().from('pets').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (opts.species && opts.species !== 'all') q = q.eq('species', opts.species)
  if (opts.waitingOnly) q = q.eq('candle_count', 0)
  if (opts.search) q = q.ilike('name', `%${opts.search.replace(/[\\%_]/g, '\\$&')}%`)
  const { data, count, error } = await q.range((page - 1) * limit, page * limit - 1)
  if (error) throw new Error(error.message)
  return { pets: data as Pet[], total: count ?? 0 }
}

/** Neighbours on the shelves, for the ‹ › arrows on a shrine page (wraps around at the ends). */
export async function getNeighbours(pet: Pet): Promise<{ prev: Pet | null; next: Pet | null }> {
  const { floor_id: f, shrine_position: s } = pet
  const one = async (cmp: 'lt' | 'gt', wrap: boolean) => {
    let q = db().from('pets').select('*').neq('id', pet.id)
    if (!wrap) q = q.or(`floor_id.${cmp}.${f},and(floor_id.eq.${f},shrine_position.${cmp}.${s})`)
    const asc = cmp === 'gt' ? !wrap : wrap
    return must(await q.order('floor_id', { ascending: asc }).order('shrine_position', { ascending: asc }).limit(1).maybeSingle()) as Pet | null
  }
  const [prev, next] = await Promise.all([one('lt', false), one('gt', false)])
  return {
    prev: prev ?? await one('lt', true),
    next: next ?? await one('gt', true),
  }
}

const SPECIES: Species[] = ['dog', 'cat', 'other']
const year = (v: unknown) => (typeof v === 'number' && v >= 1900 && v <= new Date().getFullYear() ? Math.floor(v) : null)

/** Adds a pet to the next free shelf: floor 1 fills first, then floor 2, and so on. */
export async function createPet(data: Partial<Pet>): Promise<{ pet: Pet; editToken: string }> {
  const id = randomUUID()
  const name = String(data.name ?? '').trim().slice(0, 80)
  const photo = data.primary_photo_url ? await storePhoto(id, data.primary_photo_url) : null
  // Two people adding at once can pick the same shelf; the unique (floor, position) rule rejects one, which retries
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = must(await db().from('pets').select('floor_id, shrine_position')
      .order('floor_id', { ascending: false }).order('shrine_position', { ascending: false }).limit(1).maybeSingle())
    const n = last ? (last.floor_id - 1) * FLOOR_CAPACITY + last.shrine_position + 1 : 0
    if (n >= FLOOR_CAPACITY * FLOOR_COUNT) throw new Error('The memorial building is full')
    const floor = Math.floor(n / FLOOR_CAPACITY) + 1
    const position = n % FLOOR_CAPACITY
    const { data: pet, error } = await db().from('pets').insert({
      id,
      slug: generateSlug(name || 'pet', floor, position),
      name,
      species: SPECIES.includes(data.species as Species) ? data.species : 'other',
      country_code: /^[A-Z]{2}$/.test(String(data.country_code)) ? String(data.country_code) : 'XX',
      primary_photo_url: photo,
      birth_year: year(data.birth_year),
      death_year: year(data.death_year),
      epitaph: data.epitaph ? String(data.epitaph).slice(0, 500) : null,
      floor_id: floor,
      shrine_position: position,
    }).select().single()
    if (error?.code === '23505') continue // shelf (or slug) just taken
    if (error) throw new Error(error.message)
    const editToken = randomUUID()
    must(await db().from('edit_tokens').insert({ pet_id: id, token: editToken }))
    return { pet: pet as Pet, editToken }
  }
  throw new Error('The hall is busy, please try again')
}

export async function updatePetPhoto(petId: string, token: string, photoDataUrl: string): Promise<Pet | null> {
  if (!token) return null
  const row = must(await db().from('edit_tokens').select('token').eq('pet_id', petId).maybeSingle())
  if (!row || row.token !== token) return null
  // shortcut: the old photo file stays in the bucket; add a cleanup if storage costs ever matter
  const url = await storePhoto(petId, photoDataUrl)
  return must(await db().from('pets').update({ primary_photo_url: url, updated_at: new Date().toISOString() })
    .eq('id', petId).select().maybeSingle())
}

export async function recordVisit(petId: string): Promise<void> {
  must(await db().rpc('record_visit', { p_pet: petId }))
}

// ── Tributes and guestbook ──

const TRIBUTES: TributeType[] = ['candle', 'flower', 'treat_bone', 'treat_icecream', 'treat_ball']
const cleanName = (v: unknown) => String(v ?? '').trim().slice(0, 40) || 'A visitor'
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

export async function addTribute(petId: string, type: string, visitorName: unknown): Promise<Pet | null> {
  if (!TRIBUTES.includes(type as TributeType) || !isUuid(petId)) return null
  const { data, error } = await db().rpc('add_tribute', { p_pet: petId, p_type: type, p_name: cleanName(visitorName) })
  if (error?.code === '23503') return null // no such pet
  if (error) throw new Error(error.message)
  return (data as Pet[])[0] ?? null
}

export async function getGuestbook(petId: string): Promise<GuestbookEntry[]> {
  if (!isUuid(petId)) return []
  return (must(await db().from('guestbook').select('*').eq('pet_id', petId).eq('is_hidden', false).order('created_at', { ascending: false }))) ?? []
}

export async function signGuestbook(petId: string, visitorName: unknown, message: unknown): Promise<GuestbookEntry | null> {
  const text = String(message ?? '').trim().slice(0, 500)
  if (!text || !isUuid(petId)) return null
  const { data, error } = await db().from('guestbook').insert({ pet_id: petId, visitor_name: cleanName(visitorName), message: text }).select().single()
  if (error?.code === '23503') return null
  if (error) throw new Error(error.message)
  return data
}

// ── Counts ──

export async function getStats(): Promise<GlobalStats & { candles_today: number; countries_today: number }> {
  const s = must(await db().rpc('get_stats'))
  return { ...s, avg_age: s.avg_age === null ? null : Number(s.avg_age), refreshed_at: new Date().toISOString() }
}

/** Most common pet names, for the report page. */
export async function getTopNames(limit = 10): Promise<{ name: string; count: number }[]> {
  const rows: { name: string; count: number }[] = must(await db().rpc('top_names', { p_limit: limit }))
  return rows.map(r => ({ name: r.name, count: Number(r.count) }))
}

export async function getFloors(): Promise<Floor[]> {
  const counts = new Array(FLOOR_COUNT + 1).fill(0)
  for (const r of must(await db().rpc('floor_counts')) as { floor_id: number; n: number }[]) counts[r.floor_id] = Number(r.n)
  return Array.from({ length: FLOOR_COUNT }, (_, i) => ({
    id: i + 1, name: getFloorName(i + 1), capacity: FLOOR_CAPACITY, current_count: counts[i + 1],
    is_open: counts[i + 1] < FLOOR_CAPACITY, opened_at: null, created_at: '',
  }))
}

/** The floor new shrines go to now. */
export async function getOpenFloor(): Promise<number> {
  const floors = await getFloors()
  return floors.find(f => f.is_open)?.id ?? FLOOR_COUNT
}

/** Latest real happenings: candles, flowers, guestbook messages and new shrines. */
export async function getActivity(limit = 20): Promise<{ who: string; act: string; pet: string; slug: string; cc: string; at: string }[]> {
  type P = { name: string; slug: string; country_code: string }
  const pet = 'pets(name, slug, country_code)'
  const [tributes, guestbook, pets] = await Promise.all([
    db().from('tributes').select(`visitor_name, type, created_at, ${pet}`).order('created_at', { ascending: false }).limit(limit),
    db().from('guestbook').select(`visitor_name, created_at, ${pet}`).eq('is_hidden', false).order('created_at', { ascending: false }).limit(limit),
    db().from('pets').select('name, slug, country_code, created_at').order('created_at', { ascending: false }).limit(limit),
  ]).then(rs => rs.map(r => must<unknown>(r) ?? [])) as [
    { visitor_name: string; type: string; created_at: string; pets: P }[],
    { visitor_name: string; created_at: string; pets: P }[],
    (P & { created_at: string })[],
  ]
  const verb: Record<string, string> = { candle: 'lit a candle for', flower: 'left a flower for', treat_bone: 'left a treat for', treat_icecream: 'left a treat for', treat_ball: 'left a toy for' }
  const row = (who: string, act: string, p: P, at: string) => ({ who, act, pet: p.name, slug: p.slug, cc: p.country_code, at })
  return [
    ...tributes.map(t => row(t.visitor_name, verb[t.type], t.pets, t.created_at)),
    ...guestbook.map(e => row(e.visitor_name, 'wrote in the guestbook of', e.pets, e.created_at)),
    ...pets.map(p => row('', 'was given a place in the hall', p, p.created_at)),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit)
}

// ── Who's here now (a visitor counts while their page checks in every ~25s) ──

export async function heartbeat(id: string | null): Promise<number> {
  return must(await db().rpc('heartbeat', { p_id: id && /^[\w-]{8,64}$/.test(id) ? id : null }))
}
