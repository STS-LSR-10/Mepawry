// lib/data.ts — Real data layer on Supabase: pets, candles/flowers, guestbook, visits, photos and who's online.
// Every number on the site is counted from here. Server-only: it uses the service role key,
// which bypasses Row Level Security, so it must never be imported into a client component.
// Tables and SQL functions live in supabase/ (000_full_schema.sql has them all; numbered files are the changes in order).

import { k } from './tkey'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BACKDROPS, FRAMES } from '@/lib/decor'
import type { Floor, GlobalStats, GuestbookEntry, Pet, Profile, Species, TributeType } from '@/types'
import { FLOOR_CAPACITY, OPEN_NEXT_AT_FREE, VIP_CAPACITY } from '@/components/3d/sanctuary/plan'
import { generateSlug, getFloorName } from '@/lib/utils'
import { FREE_GIFT_COOLDOWN_DAYS, FREE_GIFT_SHOWS_DAYS, SPECIAL_GIFT_SHOWS_DAYS, giftById, type LeftGift } from '@/lib/gifts'

const g = globalThis as typeof globalThis & { __pmDb?: SupabaseClient }

/** Created on first use, so builds without keys still compile. */
export function db(): SupabaseClient {
  if (!g.__pmDb) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    g.__pmDb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return g.__pmDb
}

/** Unwraps a Supabase reply, turning its error into a thrown one. */
export function must<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

// ── Photos (Supabase Storage, public bucket "pet-photos") ──

/** Uploads a validated data: URL and returns its public URL. */
export async function storePhoto(petId: string, dataUrl: string): Promise<string> {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('Photo must be a JPG, PNG or WebP')
  const path = `${petId}/${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
  const bucket = db().storage.from('pet-photos')
  must(await bucket.upload(path, Buffer.from(m[2], 'base64'), { contentType: `image/${m[1]}` }))
  return bucket.getPublicUrl(path).data.publicUrl
}

/** Deletes every photo stored under a pet's folder. */
async function removeFolder(petId: string) {
  const bucket = db().storage.from('pet-photos')
  const { data: files } = await bucket.list(petId)
  if (files?.length) await bucket.remove(files.map(f => `${petId}/${f.name}`))
}

// ── Pets ──

export async function getPetBySlug(slug: string): Promise<Pet | null> {
  return must(await db().from('pets').select('*').eq('slug', slug).maybeSingle())
}

export async function getPetById(id: string): Promise<Pet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  return must(await db().from('pets').select('*').eq('id', id).maybeSingle())
}

export async function getPetsOnFloor(floor: number): Promise<Pet[]> {
  return (must(await db().from('pets').select('*').eq('floor_id', floor).order('shrine_position'))) ?? []
}

export async function getMemorials(opts: { species?: string; waitingOnly?: boolean; search?: string; page?: number; limit?: number; since?: string }) {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, opts.limit ?? 24)
  let q = db().from('pets').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (opts.species && opts.species !== 'all') q = q.eq('species', opts.species)
  if (opts.waitingOnly) q = q.eq('candle_count', 0)
  if (opts.since) q = q.gte('created_at', opts.since)
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

/** The floors taking new shrines and which shelves are taken on one of them (the lowest, unless another open one is asked for). */
export async function getOpenSlots(want?: number): Promise<{ floor: number; openFloors: number[]; taken: number[]; vipTaken: number[] }> {
  const openFloors = await getOpenFloors()
  const floor = want && openFloors.includes(want) ? want : openFloors[0]
  const rows = (must(await db().from('pets').select('shrine_position, vip_position').eq('floor_id', floor))) ?? []
  return {
    floor,
    openFloors,
    taken: rows.map((r: { shrine_position: number }) => r.shrine_position),
    vipTaken: rows.filter((r: { vip_position: number | null }) => r.vip_position != null).map((r: { vip_position: number }) => r.vip_position),
  }
}

export class SlotTakenError extends Error {}

/** The pet fields an owner may set (on create and edit). */
function petFields(data: Partial<Pet>) {
  return {
    name: String(data.name ?? '').trim().slice(0, 80),
    species: SPECIES.includes(data.species as Species) ? data.species : 'other',
    birth_year: year(data.birth_year),
    death_year: year(data.death_year),
    epitaph: data.epitaph ? String(data.epitaph).trim().slice(0, 500) || null : null,
    ...(/^[A-Z]{2}$/.test(String(data.country_code)) ? { country_code: String(data.country_code) } : {}),
    ...(typeof data.show_flag === 'boolean' ? { show_flag: data.show_flag } : {}),
  }
}

/**
 * Gives a pet a shelf on the open floor (floors fill one at a time). The owner may pick the shelf;
 * otherwise the first free one is used. Two people picking the same shelf at once: the unique
 * (floor, position) rule lets only one in, and the other is told it was just taken.
 */
export async function createPet(
  data: Partial<Pet>,
  owner: { id: string; country: string },
  pick?: { floor: number; position: number },
): Promise<{ pet: Pet; editToken: string }> {
  const id = randomUUID()
  const fields = petFields(data)
  const photo = data.primary_photo_url ? await storePhoto(id, data.primary_photo_url) : null
  let made = false
  try {
    let suffix = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const { floor, openFloors, taken } = await getOpenSlots(pick?.floor)
      if (taken.length >= FLOOR_CAPACITY) throw new Error('The memorial building is full')
      let position: number
      if (pick) {
        if (!openFloors.includes(pick.floor)) throw new SlotTakenError('That dome just filled up. Please pick a shelf again.')
        if (!Number.isInteger(pick.position) || pick.position < 0 || pick.position >= FLOOR_CAPACITY) throw new SlotTakenError('Please pick a shelf.')
        if (taken.includes(pick.position)) throw new SlotTakenError('Someone just took that shelf. Please pick another.')
        position = pick.position
      } else {
        const used = new Set(taken)
        position = 0
        while (used.has(position)) position++
      }
      const { data: pet, error } = await db().from('pets').insert({
        id,
        country_code: /^[A-Z]{2}$/.test(owner.country) ? owner.country : 'XX', // the form's choice (in fields) wins
        ...fields,
        slug: generateSlug(fields.name, floor, position) + suffix,
        primary_photo_url: photo,
        floor_id: floor,
        shrine_position: position,
        owner_id: owner.id,
      }).select().single()
      if (error?.code === '23505') {
        if (error.message.includes('slug')) { suffix = '-' + id.slice(0, 4); continue } // a past pet had this address
        if (pick) throw new SlotTakenError('Someone just took that shelf. Please pick another.')
        continue
      }
      if (error) throw new Error(error.message)
      made = true
      const editToken = randomUUID()
      must(await db().from('edit_tokens').insert({ pet_id: id, token: editToken }))
      return { pet: pet as Pet, editToken }
    }
    throw new Error('The hall is busy, please try again')
  } catch (err) {
    // no pet was made: don't leave its photo behind in storage
    if (photo && !made) await removeFolder(id).catch(() => {})
    throw err
  }
}

/** Old memorials made before accounts: the browser's edit token proves who made them. */
export async function petTokenMatches(petId: string, token: string): Promise<boolean> {
  if (!token || !isUuid(petId)) return false
  const row = must(await db().from('edit_tokens').select('token').eq('pet_id', petId).maybeSingle())
  return !!row && row.token === token
}

export async function updatePetPhoto(petId: string, photoDataUrl: string): Promise<Pet | null> {
  // shortcut: the old photo file stays in the bucket; add a cleanup if storage costs ever matter
  const url = await storePhoto(petId, photoDataUrl)
  return must(await db().from('pets').update({ primary_photo_url: url, updated_at: new Date().toISOString() })
    .eq('id', petId).select().maybeSingle())
}

/** Owner edits name, species, years and words (and optionally the photo). Null if not theirs. */
export async function updatePet(petId: string, ownerId: string, data: Partial<Pet>, photoDataUrl?: string): Promise<Pet | null> {
  if (!isUuid(petId)) return null
  const fields = petFields(data)
  if (!fields.name) return null
  // check ownership before uploading, so nobody can put files in someone else's pet folder
  if (!must(await db().from('pets').select('id').eq('id', petId).eq('owner_id', ownerId).maybeSingle())) return null
  const photo = photoDataUrl ? { primary_photo_url: await storePhoto(petId, photoDataUrl) } : {}
  return must(await db().from('pets').update({ ...fields, ...photo, updated_at: new Date().toISOString() })
    .eq('id', petId).eq('owner_id', ownerId).select().maybeSingle())
}

/** Owner deletes a memorial: its candles, gifts, guestbook and photos go with it; the shelf frees up. */
export async function deletePet(petId: string, ownerId: string): Promise<boolean> {
  if (!isUuid(petId)) return false
  const pet = must(await db().from('pets').select('id').eq('id', petId).eq('owner_id', ownerId).maybeSingle())
  if (!pet) return false
  await removeFolder(petId)
  must(await db().from('pets').delete().eq('id', petId).eq('owner_id', ownerId))
  return true
}

export async function getMyPets(ownerId: string): Promise<Pet[]> {
  return (must(await db().from('pets').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }))) ?? []
}

/** Attach memorials this browser made before signing in (it still holds their edit tokens). */
export async function claimPets(ownerId: string, tokens: Record<string, string>): Promise<number> {
  const ids = Object.keys(tokens).filter(isUuid).slice(0, 50)
  if (!ids.length) return 0
  const rows = (must(await db().from('edit_tokens').select('pet_id, token').in('pet_id', ids))) ?? []
  const mine = rows.filter((r: { pet_id: string; token: string }) => tokens[r.pet_id] === r.token).map((r: { pet_id: string }) => r.pet_id)
  if (!mine.length) return 0
  // Free to claim: no owner yet, or a guest (anonymous) owner — the same person before they signed in
  const rowsNow = (must(await db().from('pets').select('id, owner_id').in('id', mine))) ?? []
  const guests = new Set<string>()
  for (const o of new Set(rowsNow.map((r: { owner_id: string | null }) => r.owner_id).filter(Boolean) as string[])) {
    const { data } = await db().auth.admin.getUserById(o)
    if (data.user?.is_anonymous) guests.add(o)
  }
  const ids2 = rowsNow.filter((r: { owner_id: string | null }) => r.owner_id !== ownerId && (!r.owner_id || guests.has(r.owner_id))).map((r: { id: string }) => r.id)
  if (!ids2.length) return 0
  const claimed = (must(await db().from('pets').update({ owner_id: ownerId }).in('id', ids2).select('id'))) ?? []
  return claimed.length
}

// ── Profiles ──

export async function getProfile(userId: string): Promise<Profile | null> {
  return must(await db().from('profiles').select('*').eq('id', userId).maybeSingle())
}

/** Creates the profile on first sign-in (country set then and locked), or updates name and gender later. */
export async function saveProfile(userId: string, data: { display_name: unknown; gender: unknown }, countryIfNew: string): Promise<Profile | null> {
  const display_name = String(data.display_name ?? '').trim().slice(0, 40)
  const gender = data.gender === 'male' || data.gender === 'female' ? data.gender : null
  if (!display_name || !gender) return null
  const existing = await getProfile(userId)
  if (existing) {
    return must(await db().from('profiles').update({ display_name, gender }).eq('id', userId).select().single())
  }
  return must(await db().from('profiles').insert({
    id: userId, display_name, gender, country_code: /^[A-Z]{2}$/.test(countryIfNew) ? countryIfNew : 'XX',
  }).select().single())
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

/**
 * Lights a candle: one per visitor per pet per day, resetting at the visitor's local midnight (tz from their browser).
 * shortcut: the visitor is the random id saved in their browser, like gifts; clearing site data lets them light again.
 */
export async function lightCandle(petId: string, visitorId: unknown, visitorName: unknown, tz: unknown):
  Promise<{ ok: boolean; candle_count: number; flower_count: number; candles_today: number; next_at: string } | null> {
  const vid = String(visitorId ?? '')
  if (!isUuid(petId) || !/^[\w-]{8,64}$/.test(vid)) return null
  const { data, error } = await db().rpc('light_candle', {
    p_pet: petId, p_visitor: vid, p_name: cleanName(visitorName), p_tz: String(tz ?? 'UTC').slice(0, 64),
  })
  if (error?.code === '23503') return null // no such pet
  if (error) throw new Error(error.message)
  return data
}

/** Candles lit for this pet in the last 24 hours (how tall its candle stands). */
export async function getCandlesToday(petId: string): Promise<number> {
  if (!isUuid(petId)) return 0
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await db().from('tributes').select('id', { count: 'exact', head: true })
    .eq('pet_id', petId).eq('type', 'candle').gte('created_at', since)
  return count ?? 0
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

// ── Gifts ──

/** Every gift ever left at a shrine (the count on the gift button). */
export async function countGifts(petId: string): Promise<number> {
  if (!isUuid(petId)) return 0
  const { count } = await db().from('gifts').select('id', { count: 'exact', head: true }).eq('pet_id', petId)
  return count ?? 0
}

/** Gifts still showing at a shrine, newest first: free ones for a week, paid (special) ones for two months. */
export async function getGifts(petId: string): Promise<LeftGift[]> {
  if (!isUuid(petId)) return []
  const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const freeSince = since(FREE_GIFT_SHOWS_DAYS)
  const rows: LeftGift[] = (must(await db().from('gifts').select('id, item, visitor_name, created_at')
    .eq('pet_id', petId).gte('created_at', since(SPECIAL_GIFT_SHOWS_DAYS)).order('created_at', { ascending: false }).limit(120))) ?? []
  return rows.filter(g => giftById(g.item)?.price || g.created_at >= freeSince).slice(0, 60)
}

/**
 * Leaves a free gift. One per visitor per pet every few days, enforced in the database.
 * shortcut: the visitor is the random id saved in their browser, so clearing site data resets the wait; tie it to accounts if abuse shows up.
 */
export async function leaveGift(petId: string, itemId: string, visitorId: unknown, visitorName: unknown):
  Promise<{ gift: LeftGift } | { nextAt: string } | null> {
  const item = giftById(itemId)
  const vid = String(visitorId ?? '')
  if (!item || item.price || !isUuid(petId) || !/^[\w-]{8,64}$/.test(vid)) return null // special gifts need payment
  const { data, error } = await db().rpc('leave_gift', {
    p_pet: petId, p_item: item.id, p_visitor: vid, p_name: cleanName(visitorName), p_cooldown: `${FREE_GIFT_COOLDOWN_DAYS} days`,
  })
  if (error?.code === '23503') return null // no such pet
  if (error) throw new Error(error.message)
  return data.ok ? { gift: data.gift } : { nextAt: data.next_at }
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


/**
 * Every dome so far: all the opened ones (and any with pets in them), plus one more after them — not open yet,
 * shown greyed out as the next to come. There's no last dome: a new one opens whenever the newest is nearly full.
 */
export async function getFloors(): Promise<Floor[]> {
  const counts: number[] = []
  for (const r of must(await db().rpc('floor_counts')) as { floor_id: number; n: number }[]) counts[r.floor_id] = Number(r.n)
  const open = openFloorsFrom(counts)
  const last = Math.max(open[open.length - 1], counts.length - 1) + 1
  return Array.from({ length: last }, (_, i) => ({
    id: i + 1, name: getFloorName(i + 1), capacity: FLOOR_CAPACITY, current_count: counts[i + 1] ?? 0,
    is_open: open.includes(i + 1), opened_at: null, created_at: '',
  }))
}

/** Domes fill one at a time: the lowest with a free shelf, plus the next one once it has fewer than OPEN_NEXT_AT_FREE left. */
export function openFloorsFrom(counts: number[]): number[] {
  let f = 1
  while ((counts[f] ?? 0) >= FLOOR_CAPACITY) f++
  return FLOOR_CAPACITY - (counts[f] ?? 0) < OPEN_NEXT_AT_FREE ? [f, f + 1] : [f]
}

export async function getOpenFloors(): Promise<number[]> {
  return (await getFloors()).filter(f => f.is_open).map(f => f.id)
}

/** The floor new shrines go to first (the lowest open one). */
export async function getOpenFloor(): Promise<number> {
  return (await getOpenFloors())[0] ?? 1
}

/** Latest real happenings: candles, flowers, guestbook messages and new shrines. */
export async function getActivity(limit = 20): Promise<{ who: string; act: string; pet: string; slug: string; cc: string; at: string }[]> {
  type P = { name: string; slug: string; country_code: string; show_flag?: boolean }
  const pet = 'pets(name, slug, country_code, show_flag)'
  const [tributes, guestbook, pets, gifts] = await Promise.all([
    db().from('tributes').select(`visitor_name, type, created_at, ${pet}`).order('created_at', { ascending: false }).limit(limit),
    db().from('guestbook').select(`visitor_name, created_at, ${pet}`).eq('is_hidden', false).order('created_at', { ascending: false }).limit(limit),
    db().from('pets').select('name, slug, country_code, show_flag, created_at').order('created_at', { ascending: false }).limit(limit),
    db().from('gifts').select(`visitor_name, item, created_at, ${pet}`).order('created_at', { ascending: false }).limit(limit),
  ]).then(rs => rs.map(r => must<unknown>(r) ?? [])) as [
    { visitor_name: string; type: string; created_at: string; pets: P }[],
    { visitor_name: string; created_at: string; pets: P }[],
    (P & { created_at: string })[],
    { visitor_name: string; item: string; created_at: string; pets: P }[],
  ]
  // whole-sentence templates ({who}, {pet}), so each language can put the names where they belong
  const verb: Record<string, string> = { candle: k('{who} lit a candle for {pet}'), flower: k('{who} left a flower for {pet}'), treat_bone: k('{who} left a treat for {pet}'), treat_icecream: k('{who} left a treat for {pet}'), treat_ball: k('{who} left a toy for {pet}') }
  const row = (who: string, act: string, p: P, at: string) => ({ who, act, pet: p.name, slug: p.slug, cc: p.show_flag === false ? 'XX' : p.country_code, at })
  return [
    ...tributes.map(t => row(t.visitor_name, verb[t.type], t.pets, t.created_at)),
    ...guestbook.map(e => row(e.visitor_name, k('{who} wrote in the guestbook of {pet}'), e.pets, e.created_at)),
    ...pets.map(p => row('', k('{pet} was given a place in the hall'), p, p.created_at)),
    ...gifts.map(x => row(x.visitor_name, `${giftById(x.item)?.emoji ?? '🎁'} ${k('{who} left a gift for {pet}')}`, x.pets, x.created_at)),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit)
}

// ── Who's here now (a visitor counts while their page checks in every ~25s) ──

export async function heartbeat(id: string | null): Promise<number> {
  return must(await db().rpc('heartbeat', { p_id: id && /^[\w-]{8,64}$/.test(id) ? id : null }))
}

// ── VIP pavilion ──

/**
 * Gives a pet a VIP niche on its own floor (the first free one, or the one asked for). Returns the pet, or an
 * error message. Two placements racing for one niche: the unique (floor, vip_position) index lets only one in.
 */
export async function placeInVip(petId: string, want?: number): Promise<Pet | { error: string }> {
  const pet = await getPetById(petId)
  if (!pet) return { error: 'Memorial not found' }
  if (pet.vip_position != null) return pet
  const rows = (must(await db().from('pets').select('vip_position').eq('floor_id', pet.floor_id).not('vip_position', 'is', null))) ?? []
  const taken = new Set(rows.map((r: { vip_position: number }) => r.vip_position))
  let pos = Number.isInteger(want) && want! >= 0 && want! < VIP_CAPACITY ? want! : -1
  if (pos >= 0 && taken.has(pos)) return { error: 'That VIP niche is taken' }
  if (pos < 0) { pos = 0; while (taken.has(pos)) pos++ }
  if (pos >= VIP_CAPACITY) return { error: `The VIP pavilion in Dome ${pet.floor_id} is full` }
  const { data, error } = await db().from('pets').update({ vip_position: pos }).eq('id', petId).select().single()
  if (error?.code === '23505') return { error: 'That VIP niche was just taken, please try again' }
  if (error) throw new Error(error.message)
  return data as Pet
}

export async function removeFromVip(petId: string): Promise<Pet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(petId)) return null
  return must(await db().from('pets').update({ vip_position: null }).eq('id', petId).select().maybeSingle())
}

/** Gives a shrine a frame style and/or backdrop (they stay for good). Ids are checked against lib/decor.ts. */
export async function setDecor(petId: string, decor: { frame?: unknown; backdrop?: unknown }): Promise<Pet | null> {
  if (!isUuid(petId)) return null
  const patch: { frame_style?: string; backdrop?: string } = {}
  if (decor.frame !== undefined) { if (!FRAMES.some(f => f.id === decor.frame)) return null; patch.frame_style = String(decor.frame) }
  if (decor.backdrop !== undefined) { if (!BACKDROPS.some(b => b.id === decor.backdrop)) return null; patch.backdrop = String(decor.backdrop) }
  if (!Object.keys(patch).length) return null
  return must(await db().from('pets').update(patch).eq('id', petId).select().maybeSingle())
}
