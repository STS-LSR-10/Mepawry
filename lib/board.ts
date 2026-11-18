// lib/board.ts — The community board: stories (with an optional photo and pet), kind-word notes, comments, hearts,
// and who to remember today. Server-only (service role via lib/data).

import { randomUUID } from 'node:crypto'
import { db, must, storePhoto } from '@/lib/data'
import type { Pet } from '@/types'

export type PostKind = 'story' | 'note'
export type Sort = 'latest' | 'loved' | 'talked'

export interface Post {
  id: string
  author_id: string
  author_name: string
  author_country: string
  pet_id: string | null
  kind: PostKind
  body: string
  photo_url: string | null
  note_color: string | null
  like_count: number
  comment_count: number
  created_at: string
  pet: { name: string; slug: string; primary_photo_url: string | null; species: Pet['species'] } | null
  liked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  author_country: string
  body: string
  created_at: string
}

export const NOTE_COLORS = ['#FFF4C2', '#FFD9E2', '#D8EEFF', '#DDF5D8', '#FFE2C2', '#E8DDFF']
const LIMITS = { story: 3000, note: 280 }
const PAGE = 10
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max)
const ORDER: Record<Sort, string> = { latest: 'created_at', loved: 'like_count', talked: 'comment_count' }

export async function listPosts(opts: { kind: PostKind; sort: Sort; page: number; liker?: string }) {
  const page = Math.max(1, opts.page)
  let q = db().from('posts').select('*, pet:pets(name, slug, primary_photo_url, species)', { count: 'exact' })
    .eq('kind', opts.kind).eq('is_hidden', false)
    .order(ORDER[opts.sort] ?? 'created_at', { ascending: false })
  if (opts.sort !== 'latest') q = q.order('created_at', { ascending: false })
  const { data, count, error } = await q.range((page - 1) * PAGE, page * PAGE - 1)
  if (error) throw new Error(error.message)
  const posts = (data ?? []) as Post[]
  // Which of these the viewer has already hearted
  if (opts.liker && posts.length) {
    const rows = must(await db().from('post_likes').select('post_id').eq('liker', opts.liker).in('post_id', posts.map(p => p.id))) ?? []
    const liked = new Set(rows.map((r: { post_id: string }) => r.post_id))
    posts.forEach(p => { p.liked = liked.has(p.id) })
  }
  return { posts, total: count ?? 0, pageSize: PAGE }
}

export async function createPost(
  author: { id: string; name: string; country: string },
  input: { kind: unknown; body: unknown; photo?: unknown; petId?: unknown; color?: unknown },
): Promise<Post | { error: string }> {
  const kind: PostKind = input.kind === 'note' ? 'note' : 'story'
  const body = clean(input.body, LIMITS[kind])
  if (!body) return { error: kind === 'note' ? 'Write a few kind words first' : 'Write something to share first' }
  // A story may be about one of your own pets
  let petId: string | null = null
  if (kind === 'story' && isUuid(input.petId)) {
    const pet = must(await db().from('pets').select('id').eq('id', input.petId).eq('owner_id', author.id).maybeSingle())
    if (pet) petId = pet.id
  }
  const id = randomUUID()
  const photo = kind === 'story' && typeof input.photo === 'string' && input.photo ? await storePhoto(`posts/${id}`, input.photo) : null
  const color = kind === 'note' && NOTE_COLORS.includes(String(input.color)) ? String(input.color) : kind === 'note' ? NOTE_COLORS[0] : null
  const { data, error } = await db().from('posts').insert({
    id, author_id: author.id, author_name: author.name, author_country: author.country,
    pet_id: petId, kind, body, photo_url: photo, note_color: color,
  }).select('*, pet:pets(name, slug, primary_photo_url, species)').single()
  if (error) throw new Error(error.message)
  return data as Post
}

/** Authors remove their own posts (comments, hearts and the photo go with it). */
export async function deletePost(id: string, userId: string): Promise<boolean> {
  if (!isUuid(id)) return false
  const row = must(await db().from('posts').select('id, photo_url').eq('id', id).eq('author_id', userId).maybeSingle())
  if (!row) return false
  if (row.photo_url) {
    const bucket = db().storage.from('pet-photos')
    const { data: files } = await bucket.list(`posts/${id}`)
    if (files?.length) await bucket.remove(files.map(f => `posts/${id}/${f.name}`))
  }
  must(await db().from('posts').delete().eq('id', id).eq('author_id', userId))
  return true
}

export async function listComments(postId: string): Promise<Comment[]> {
  if (!isUuid(postId)) return []
  return (must(await db().from('post_comments').select('*').eq('post_id', postId).order('created_at').limit(200))) ?? []
}

export async function addComment(postId: string, author: { id: string; name: string; country: string }, body: unknown): Promise<Comment | null> {
  const text = clean(body, 1000)
  if (!text || !isUuid(postId)) return null
  const { data, error } = await db().rpc('add_comment', { p_post: postId, p_author: author.id, p_name: author.name, p_country: author.country, p_body: text })
  if (error?.code === '23503') return null // post gone
  if (error) throw new Error(error.message)
  return data as Comment
}

export async function deleteComment(id: string, userId: string): Promise<boolean> {
  if (!isUuid(id)) return false
  return !!must(await db().rpc('delete_comment', { p_comment: id, p_author: userId }))
}

export async function toggleLike(postId: string, liker: unknown): Promise<{ liked: boolean; count: number } | null> {
  const who = String(liker ?? '')
  if (!isUuid(postId) || !/^[\w-]{8,64}$/.test(who)) return null
  const { data, error } = await db().rpc('toggle_like', { p_post: postId, p_liker: who })
  if (error?.code === '23503') return null
  if (error) throw new Error(error.message)
  return data
}

/** Who to remember today: shrines placed on this day in an earlier year, and the newest arrivals this week. */
export async function todayPets(): Promise<{ pet: Pet; reason: 'anniversary' | 'new'; years?: number }[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [anniv, fresh] = await Promise.all([
    db().rpc('anniversary_pets'),
    db().from('pets').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
  ])
  const now = new Date().getFullYear()
  return [
    ...((must(anniv) ?? []) as Pet[]).map(pet => ({ pet, reason: 'anniversary' as const, years: now - new Date(pet.created_at).getFullYear() })),
    ...((must(fresh) ?? []) as Pet[]).map(pet => ({ pet, reason: 'new' as const })),
  ]
}

export async function boardStats() {
  const [pets, stories] = await Promise.all([
    db().from('pets').select('id', { count: 'exact', head: true }),
    db().from('posts').select('id', { count: 'exact', head: true }).eq('kind', 'story').eq('is_hidden', false),
  ])
  return { pets: pets.count ?? 0, stories: stories.count ?? 0 }
}
