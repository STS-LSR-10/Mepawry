// lib/data.ts — Real data layer: pets, candles/flowers, guestbook and visits, saved to data/store.json.
// Every number on the site is counted from here. Server-only (uses the file system).
// shortcut: one JSON file on one server; move to Postgres (DATABASE_URL in .env.example) before running more than one instance

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Floor, GlobalStats, GuestbookEntry, Pet, Species, Tribute, TributeType } from '@/types'
import { FLOOR_CAPACITY, FLOOR_COUNT } from '@/components/3d/layout'
import { generateSlug, getFloorName } from '@/lib/utils'

interface Store {
  pets: Pet[]
  tributes: Tribute[]
  guestbook: GuestbookEntry[]
  editTokens: Record<string, string>
}

const FILE = path.join(process.cwd(), 'data', 'store.json')

// Next loads separate copies of this module for API routes and pages; keep one store per process
const g = globalThis as typeof globalThis & { __pmStore?: Promise<Store>; __pmWrite?: Promise<void> }

function load(): Promise<Store> {
  g.__pmStore ??= fs.readFile(FILE, 'utf8')
    .then(text => JSON.parse(text) as Store)
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return { pets: [], tributes: [], guestbook: [], editTokens: {} }
      throw err // a corrupt file must not be silently replaced with an empty one
    })
  return g.__pmStore
}

/** Writes go one at a time, to a temp file renamed into place, so a crash never leaves half a file. */
function save(store: Store): Promise<void> {
  const write = async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    const tmp = `${FILE}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(store))
    await fs.rename(tmp, FILE)
  }
  g.__pmWrite = (g.__pmWrite ?? Promise.resolve()).then(write, write)
  return g.__pmWrite
}

// ── Pets ──

export async function getPetBySlug(slug: string): Promise<Pet | null> {
  return (await load()).pets.find(p => p.slug === slug) ?? null
}

export async function getPetsOnFloor(floor: number): Promise<Pet[]> {
  return (await load()).pets.filter(p => p.floor_id === floor).sort((a, b) => a.shrine_position - b.shrine_position)
}

export async function getMemorials(opts: { species?: string; waitingOnly?: boolean; search?: string; page?: number; limit?: number }) {
  let results = [...(await load()).pets].reverse() // newest first
  if (opts.species && opts.species !== 'all') results = results.filter(p => p.species === opts.species)
  if (opts.waitingOnly) results = results.filter(p => p.candle_count === 0)
  if (opts.search) {
    const q = opts.search.toLowerCase()
    results = results.filter(p => p.name.toLowerCase().includes(q))
  }
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, opts.limit ?? 24)
  return { pets: results.slice((page - 1) * limit, page * limit), total: results.length }
}

/** Neighbours in the building, for the ‹ › arrows on a shrine page. */
export async function getNeighbours(pet: Pet): Promise<{ prev: Pet | null; next: Pet | null }> {
  const pets = (await load()).pets
  const i = pets.findIndex(p => p.id === pet.id)
  if (pets.length < 2) return { prev: null, next: null }
  return { prev: pets[(i - 1 + pets.length) % pets.length], next: pets[(i + 1) % pets.length] }
}

const SPECIES: Species[] = ['dog', 'cat', 'other']
const year = (v: unknown) => (typeof v === 'number' && v >= 1900 && v <= new Date().getFullYear() ? Math.floor(v) : null)

/** Adds a pet to the next free shelf: floor 1 fills first, then floor 2, and so on. */
export async function createPet(data: Partial<Pet>): Promise<{ pet: Pet; editToken: string }> {
  const store = await load()
  const n = store.pets.length
  if (n >= FLOOR_CAPACITY * FLOOR_COUNT) throw new Error('The memorial building is full')
  const floor = Math.floor(n / FLOOR_CAPACITY) + 1
  const position = n % FLOOR_CAPACITY
  const name = String(data.name ?? '').trim().slice(0, 80)
  const now = new Date().toISOString()
  const pet: Pet = {
    id: randomUUID(),
    slug: generateSlug(name || 'pet', floor, position),
    name,
    species: SPECIES.includes(data.species as Species) ? (data.species as Species) : 'other',
    country_code: /^[A-Z]{2}$/.test(String(data.country_code)) ? String(data.country_code) : 'XX',
    primary_photo_url: data.primary_photo_url ?? null,
    gallery_urls: [],
    birth_year: year(data.birth_year),
    death_year: year(data.death_year),
    epitaph: data.epitaph ? String(data.epitaph).slice(0, 500) : null,
    epitaph_translations: {},
    floor_id: floor,
    shrine_position: position,
    candle_count: 0,
    flower_count: 0,
    visit_count: 0,
    created_at: now,
    updated_at: now,
  }
  const editToken = randomUUID()
  store.pets.push(pet)
  store.editTokens[pet.id] = editToken
  await save(store)
  return { pet, editToken }
}

export async function updatePetPhoto(petId: string, token: string, photoUrl: string): Promise<Pet | null> {
  const store = await load()
  const pet = store.pets.find(p => p.id === petId)
  if (!pet || !token || store.editTokens[petId] !== token) return null
  pet.primary_photo_url = photoUrl
  pet.updated_at = new Date().toISOString()
  await save(store)
  return pet
}

export async function recordVisit(petId: string): Promise<void> {
  const store = await load()
  const pet = store.pets.find(p => p.id === petId)
  if (!pet) return
  pet.visit_count++
  await save(store)
}

// ── Tributes and guestbook ──

const TRIBUTES: TributeType[] = ['candle', 'flower', 'treat_bone', 'treat_icecream', 'treat_ball']
const cleanName = (v: unknown) => String(v ?? '').trim().slice(0, 40) || 'A visitor'

export async function addTribute(petId: string, type: string, visitorName: unknown): Promise<Pet | null> {
  if (!TRIBUTES.includes(type as TributeType)) return null
  const store = await load()
  const pet = store.pets.find(p => p.id === petId)
  if (!pet) return null
  if (type === 'candle') pet.candle_count++
  if (type === 'flower') pet.flower_count++
  store.tributes.push({ id: randomUUID(), pet_id: petId, visitor_id: null, visitor_name: cleanName(visitorName), type: type as TributeType, created_at: new Date().toISOString() })
  await save(store)
  return pet
}

export async function getGuestbook(petId: string): Promise<GuestbookEntry[]> {
  return (await load()).guestbook.filter(e => e.pet_id === petId && !e.is_hidden).reverse()
}

export async function signGuestbook(petId: string, visitorName: unknown, message: unknown): Promise<GuestbookEntry | null> {
  const text = String(message ?? '').trim().slice(0, 500)
  const store = await load()
  if (!text || !store.pets.some(p => p.id === petId)) return null
  const entry: GuestbookEntry = { id: randomUUID(), pet_id: petId, visitor_name: cleanName(visitorName), message: text, is_hidden: false, created_at: new Date().toISOString() }
  store.guestbook.push(entry)
  await save(store)
  return entry
}

// ── Counts ──

export async function getStats(): Promise<GlobalStats & { candles_today: number; countries_today: number }> {
  const { pets, tributes } = await load()
  const ages = pets.filter(p => p.birth_year && p.death_year).map(p => p.death_year! - p.birth_year!)
  const since = Date.now() - 24 * 3600 * 1000
  const today = tributes.filter(t => t.type === 'candle' && Date.parse(t.created_at) > since)
  const byId = new Map(pets.map(p => [p.id, p]))
  return {
    total_pets: pets.length,
    total_dogs: pets.filter(p => p.species === 'dog').length,
    total_cats: pets.filter(p => p.species === 'cat').length,
    total_others: pets.filter(p => p.species === 'other').length,
    total_countries: new Set(pets.map(p => p.country_code).filter(c => c !== 'XX')).size,
    total_candles: pets.reduce((s, p) => s + p.candle_count, 0),
    total_flowers: pets.reduce((s, p) => s + p.flower_count, 0),
    avg_age: ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : null,
    refreshed_at: new Date().toISOString(),
    candles_today: today.length,
    countries_today: new Set(today.map(t => byId.get(t.pet_id)?.country_code).filter(Boolean)).size,
  }
}

/** Most common pet names, for the report page. */
export async function getTopNames(limit = 10): Promise<{ name: string; count: number }[]> {
  const counts = new Map<string, number>()
  for (const p of (await load()).pets) counts.set(p.name, (counts.get(p.name) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit)
}

export async function getFloors(): Promise<Floor[]> {
  const { pets } = await load()
  const counts = new Array(FLOOR_COUNT + 1).fill(0)
  for (const p of pets) counts[p.floor_id]++
  return Array.from({ length: FLOOR_COUNT }, (_, i) => ({
    id: i + 1, name: getFloorName(i + 1), capacity: FLOOR_CAPACITY, current_count: counts[i + 1],
    is_open: counts[i + 1] < FLOOR_CAPACITY, opened_at: null, created_at: '',
  }))
}

/** The floor new shrines go to now. */
export async function getOpenFloor(): Promise<number> {
  return Math.min(FLOOR_COUNT, Math.floor((await load()).pets.length / FLOOR_CAPACITY) + 1)
}

/** Latest real happenings: candles, flowers, guestbook messages and new shrines. */
export async function getActivity(limit = 20): Promise<{ who: string; act: string; pet: string; slug: string; cc: string; at: string }[]> {
  const { pets, tributes, guestbook } = await load()
  const byId = new Map(pets.map(p => [p.id, p]))
  const verb: Record<string, string> = { candle: 'lit a candle for', flower: 'left a flower for', treat_bone: 'left a treat for', treat_icecream: 'left a treat for', treat_ball: 'left a toy for' }
  const items = [
    ...tributes.map(t => ({ who: t.visitor_name, act: verb[t.type], petId: t.pet_id, at: t.created_at })),
    ...guestbook.filter(e => !e.is_hidden).map(e => ({ who: e.visitor_name, act: 'wrote in the guestbook of', petId: e.pet_id, at: e.created_at })),
    ...pets.map(p => ({ who: '', act: 'was given a place in the hall', petId: p.id, at: p.created_at })),
  ]
  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .flatMap(it => { const p = byId.get(it.petId); return p ? [{ who: it.who, act: it.act, pet: p.name, slug: p.slug, cc: p.country_code, at: it.at }] : [] })
}

// ── Who's here now (in memory; a visitor counts while their page checks in every ~25s) ──

const presence = ((globalThis as typeof globalThis & { __pmPresence?: Map<string, number> }).__pmPresence ??= new Map())

export function heartbeat(id: string | null): number {
  const now = Date.now()
  if (id && /^[\w-]{8,64}$/.test(id)) presence.set(id, now)
  for (const [k, t] of presence) if (now - t > 60_000) presence.delete(k)
  return presence.size
}
