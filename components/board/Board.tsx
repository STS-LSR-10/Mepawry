'use client'
// components/board/Board.tsx — The community board: share stories about your pet (photo + words), others heart and
// comment; "Today" — who to remember today; "Kind words" — notes pinned for anyone who is hurting.
// Guests can take part too (a guest session starts when they first post).

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAccount } from '@/lib/account'
import { getVisitor } from '@/lib/visitor'
import { photoToDataUrl } from '@/lib/photo'
import { cn, flagEmoji, SPECIES_LOOK, timeAgo } from '@/lib/utils'
import type { Pet } from '@/types'
import type { Comment, Post, Sort } from '@/lib/board'

type Tab = 'stories' | 'today' | 'notes'
const NOTE_COLORS = ['#FFF4C2', '#FFD9E2', '#D8EEFF', '#DDF5D8', '#FFE2C2', '#E8DDFF']
const cork: React.CSSProperties = {
  backgroundColor: '#B98A5E',
  backgroundImage: 'radial-gradient(rgba(60,35,15,.22) 1px, transparent 1.4px), radial-gradient(rgba(255,240,220,.12) 1px, transparent 1.4px)',
  backgroundSize: '9px 9px, 13px 13px',
  backgroundPosition: '0 0, 4px 6px',
}

export function Board({ onClose, initialTab = 'stories' }: { onClose?: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [stats, setStats] = useState<{ pets: number; stories: number } | null>(null)
  useEffect(() => {
    fetch('/api/board/posts?kind=story&stats=1').then(r => r.json()).then(d => setStats(d.stats ?? null)).catch(() => {})
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col" style={cork}>
      <div className="flex items-center gap-2 px-4 pt-4">
        <div role="tablist" aria-label="Board sections" className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none">
          {([['stories', '📖', 'Stories'], ['today', '🌅', 'Today'], ['notes', '💌', 'Kind words']] as const).map(([id, emoji, label]) => (
            <button
              key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition',
                tab === id ? 'bg-[#FFF8EE] text-[#2A1E17] shadow' : 'bg-[#FFF8EE]/30 text-[#FFF8EE] hover:bg-[#FFF8EE]/45')}
            >
              <span aria-hidden>{emoji}</span> {label}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close the board" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFF8EE] text-[#5C5046] shadow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {tab === 'stories' && (
          <>
            {stats && (
              <p className="mb-3 rounded-2xl bg-[#FFF8EE] px-4 py-2.5 text-center text-sm text-[#5C5046] shadow-sm">
                🐾 <b className="font-serif text-lg text-[#C67129]">{stats.pets.toLocaleString('en-US')}</b> pets remembered ·{' '}
                <b className="font-serif text-lg text-[#C67129]">{stats.stories.toLocaleString('en-US')}</b> stories shared
              </p>
            )}
            <Stories />
          </>
        )}
        {tab === 'today' && <Today />}
        {tab === 'notes' && <Notes />}
      </div>
    </div>
  )
}

// ── Shared ──

function useLikes() {
  const liker = useRef('')
  useEffect(() => { liker.current = getVisitor().id }, [])
  const toggle = async (id: string) => {
    const r = await fetch(`/api/board/posts/${id}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liker: liker.current }) }).catch(() => null)
    return r?.ok ? (await r.json()) as { liked: boolean; count: number } : null
  }
  return { liker, toggle }
}

/** Loads a list of posts page by page, with sorting. */
function usePosts(kind: 'story' | 'note', sort: Sort) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const load = useCallback(async (p: number) => {
    const liker = getVisitor().id
    const d = await fetch(`/api/board/posts?kind=${kind}&sort=${sort}&page=${p}&liker=${encodeURIComponent(liker)}`).then(r => r.json()).catch(() => null)
    if (!d) return
    setPosts(prev => (p === 1 ? d.posts : [...(prev ?? []), ...d.posts]))
    setMore(p * d.pageSize < d.total)
    setPage(p)
  }, [kind, sort])
  useEffect(() => { setPosts(null); load(1) }, [load])
  return { posts, setPosts, more, loadMore: () => load(page + 1) }
}

async function postJSON(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  const d = await r?.json().catch(() => null)
  return { ok: !!r?.ok, data: d }
}

// ── Stories ──

function Stories() {
  const [sort, setSort] = useState<Sort>('latest')
  const { posts, setPosts, more, loadMore } = usePosts('story', sort)
  return (
    <div className="space-y-3">
      <StoryComposer onPosted={p => setPosts(prev => [p, ...(prev ?? [])])} />
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {([['latest', '🆕 Latest'], ['loved', '🤍 Most loved'], ['talked', '💬 Most talked about']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSort(id)} aria-pressed={sort === id}
            className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', sort === id ? 'bg-[#2A1E17] text-[#FFF8EE]' : 'bg-[#FFF8EE]/80 text-[#5C5046]')}>
            {label}
          </button>
        ))}
      </div>
      {posts === null ? <Empty text="Loading stories…" /> : posts.length === 0 ? <Empty text="No stories yet. Be the first to share one." /> : (
        posts.map(p => <StoryCard key={p.id} post={p} onDeleted={() => setPosts(prev => prev?.filter(x => x.id !== p.id) ?? null)} />)
      )}
      {more && <button onClick={loadMore} className="w-full rounded-2xl bg-[#FFF8EE]/80 py-2.5 text-sm font-semibold text-[#5C5046]">Show more stories</button>}
    </div>
  )
}

function StoryComposer({ onPosted }: { onPosted: (p: Post) => void }) {
  const { user, ensureSession } = useAccount()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [petId, setPetId] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)

  // Your own pets, to tag the story with (signed in or a guest who has added pets)
  useEffect(() => {
    if (!open || !user) return
    fetch('/api/me/pets').then(r => r.json()).then(d => setPets(d.pets ?? [])).catch(() => {})
  }, [open, user])

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { setPhoto(await photoToDataUrl(f)) } catch { setError("We couldn't read that photo. Try a JPG or PNG.") }
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true); setError('')
    const err = await ensureSession()
    if (err) { setBusy(false); return setError(err) }
    const { ok, data } = await postJSON('/api/board/posts', { kind: 'story', body, photo, petId: petId || undefined, authorName: getVisitor().name })
    setBusy(false)
    if (!ok) return setError(data?.error ?? 'That didn’t post. Please try again.')
    onPosted(data.post); setBody(''); setPhoto(null); setPetId(''); setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-3xl bg-[#FFF8EE] px-4 py-3.5 text-left shadow-sm">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FDF0E5] text-xl" aria-hidden>✍️</span>
        <span className="text-sm text-[#8E8278]">Share a story, a photo or a little news about your pet…</span>
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-[#FFF8EE] p-4 shadow-sm">
      <label htmlFor="story-body" className="sr-only">Your story</label>
      <textarea id="story-body" autoFocus rows={5} maxLength={3000} value={body} onChange={e => setBody(e.target.value)}
        placeholder="What were they like? A funny habit, a favourite spot, the day they came home…"
        className="w-full resize-none rounded-2xl border border-[#E8DFD6] bg-white px-3.5 py-3 text-[15px] leading-relaxed text-[#2A1E17] placeholder:text-[#B5A99F] focus:outline-none focus:ring-2 focus:ring-[#D9823B]" />
      {photo && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Photo to share" className="max-h-64 w-full rounded-2xl object-cover" />
          <button type="button" onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">Remove</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => file.current?.click()} className="rounded-full border border-[#E8DFD6] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C5046]">📷 {photo ? 'Change photo' : 'Add a photo'}</button>
        <input ref={file} type="file" accept="image/*" className="sr-only" onChange={pick} aria-label="Choose a photo" />
        {pets.length > 0 && (
          <select value={petId} onChange={e => setPetId(e.target.value)} aria-label="About which pet"
            className="rounded-full border border-[#E8DFD6] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C5046]">
            <option value="">About… (optional)</option>
            {pets.map(p => <option key={p.id} value={p.id}>{SPECIES_LOOK[p.species].emoji} {p.name}</option>)}
          </select>
        )}
        <span className="ml-auto text-xs text-[#B5A99F]">{body.length}/3000</span>
      </div>
      {error && <p role="alert" className="text-sm text-[#C0392B]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-2xl border border-[#D4C9BF] py-2.5 text-sm font-semibold text-[#5C5046]">Cancel</button>
        <button disabled={busy || !body.trim()} className="flex-[2] rounded-2xl bg-[#D9823B] py-2.5 text-sm font-semibold text-white hover:bg-[#C67129] disabled:opacity-60">{busy ? 'Posting…' : 'Share on the board'}</button>
      </div>
    </form>
  )
}

function StoryCard({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const { user } = useAccount()
  const { toggle } = useLikes()
  const [liked, setLiked] = useState(!!post.liked)
  const [likes, setLikes] = useState(post.like_count)
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [count, setCount] = useState(post.comment_count)
  const [copied, setCopied] = useState(false)
  const long = post.body.length > 420
  const mine = user?.id === post.author_id
  const title = post.pet?.name ?? post.author_name

  const heart = async () => {
    setLiked(l => !l); setLikes(n => n + (liked ? -1 : 1)) // show it straight away
    const r = await toggle(post.id)
    if (r) { setLiked(r.liked); setLikes(r.count) }
  }
  const share = async () => {
    const url = `${window.location.origin}/board#post-${post.id}`
    try { if (navigator.share) return await navigator.share({ title: `${title} on Mepawry`, url }) } catch { return }
    await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const remove = async () => {
    if (!confirm('Delete this story? Its comments and hearts go too. This can’t be undone.')) return
    const r = await fetch(`/api/board/posts/${post.id}`, { method: 'DELETE' }).catch(() => null)
    if (r?.ok) onDeleted()
  }

  return (
    <article id={`post-${post.id}`} className="rounded-3xl bg-[#FFF8EE] p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-xl" style={{ background: post.pet ? SPECIES_LOOK[post.pet.species].from : '#FDF0E5' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {post.pet?.primary_photo_url ? <img src={post.pet.primary_photo_url} alt="" className="h-full w-full object-cover" /> : post.pet ? SPECIES_LOOK[post.pet.species].emoji : '🐾'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#2A1E17]">{title} <span aria-label={`From ${post.author_country}`}>{flagEmoji(post.author_country)}</span></p>
          <p className="truncate text-xs text-[#8E8278]">{post.pet ? <>by {post.author_name} · </> : null}{timeAgo(post.created_at)}</p>
        </div>
        {post.pet && <Link href={`/${post.pet.slug}`} className="shrink-0 rounded-full bg-[#F4EBDD] px-3 py-1.5 text-xs font-semibold text-[#5C5046]">Visit {post.pet.name}</Link>}
      </header>

      {post.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.photo_url} alt={`Photo shared about ${title}`} loading="lazy" className="mt-3 max-h-[420px] w-full rounded-2xl object-cover" />
      )}
      <p className={cn('mt-3 whitespace-pre-line font-serif text-[16px] leading-relaxed text-[#2A1E17]', long && !expanded && 'line-clamp-6')}>{post.body}</p>
      {long && <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-semibold text-[#C67129]">{expanded ? 'Show less' : 'Read more'}</button>}

      <footer className="mt-3 flex items-center gap-2 border-t border-[#EFE4D4] pt-3">
        <button onClick={heart} aria-pressed={liked} aria-label={liked ? 'Remove your heart' : 'Leave a heart'}
          className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', liked ? 'border-[#E86F8A] bg-[#FFE8EE] text-[#C2405E]' : 'border-[#E8DFD6] text-[#5C5046]')}>
          {liked ? '❤️' : '🤍'} {likes}
        </button>
        <button onClick={() => setShowComments(s => !s)} aria-expanded={showComments} className="flex items-center gap-1.5 rounded-full border border-[#E8DFD6] px-3 py-1.5 text-sm text-[#5C5046]">
          💬 {count}
        </button>
        {mine && <button onClick={remove} className="text-xs text-[#C0392B] underline">Delete</button>}
        <button onClick={share} className="ml-auto rounded-full border border-[#E8DFD6] px-3 py-1.5 text-sm text-[#5C5046]">{copied ? 'Link copied' : '↗ Share'}</button>
      </footer>
      {showComments && <Comments postId={post.id} onCount={setCount} />}
    </article>
  )
}

function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { user, ensureSession } = useAccount()
  const [list, setList] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch(`/api/board/posts/${postId}/comments`).then(r => r.json()).then(d => setList(d.comments ?? [])).catch(() => setList([]))
  }, [postId])
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    if (await ensureSession()) { setBusy(false); return }
    const { ok, data } = await postJSON(`/api/board/posts/${postId}/comments`, { body: text, authorName: getVisitor().name })
    setBusy(false)
    if (!ok) return
    setList(l => { const next = [...(l ?? []), data.comment]; onCount(next.length); return next })
    setText('')
  }
  const remove = async (id: string) => {
    const r = await fetch(`/api/board/comments/${id}`, { method: 'DELETE' }).catch(() => null)
    if (r?.ok) setList(l => { const next = (l ?? []).filter(c => c.id !== id); onCount(next.length); return next })
  }
  return (
    <div className="mt-3 space-y-2">
      {list === null ? <p className="text-xs text-[#8E8278]">Loading…</p> : list.map(c => (
        <div key={c.id} className="rounded-2xl bg-[#F4EBDD]/70 px-3 py-2">
          <p className="text-xs font-semibold text-[#2A1E17]">{c.author_name} {flagEmoji(c.author_country)} <span className="font-normal text-[#8E8278]">· {timeAgo(c.created_at)}</span>
            {user?.id === c.author_id && <button onClick={() => remove(c.id)} className="ml-2 font-normal text-[#C0392B] underline">delete</button>}
          </p>
          <p className="whitespace-pre-line text-sm text-[#3A2E26]">{c.body}</p>
        </div>
      ))}
      <form onSubmit={send} className="flex gap-2">
        <label htmlFor={`c-${postId}`} className="sr-only">Write a comment</label>
        <input id={`c-${postId}`} maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="Write something kind…"
          className="min-w-0 flex-1 rounded-full border border-[#E8DFD6] bg-white px-3.5 py-2 text-sm text-[#2A1E17] focus:outline-none focus:ring-2 focus:ring-[#D9823B]" />
        <button disabled={busy || !text.trim()} className="rounded-full bg-[#D9823B] px-4 text-sm font-semibold text-white disabled:opacity-50">Send</button>
      </form>
    </div>
  )
}

// ── Today ──

function Today() {
  const [items, setItems] = useState<{ pet: Pet; reason: 'anniversary' | 'new'; years?: number }[] | null>(null)
  const [lit, setLit] = useState<Set<string>>(new Set())
  useEffect(() => { fetch('/api/board/today').then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => setItems([])) }, [])
  const light = async (pet: Pet) => {
    setLit(s => new Set(s).add(pet.id))
    const v = getVisitor() // one candle a day: a repeat comes back 429, which still reads as lit
    await postJSON('/api/tributes', { petId: pet.id, type: 'candle', visitorId: v.id, visitorName: v.name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  }
  if (items === null) return <Empty text="Loading…" />
  if (!items.length) return <Empty text="No anniversaries or new arrivals today. Every shrine in the hall is still waiting for a candle." />
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#FFF8EE]">🕯️ Today we remember</h3>
      {items.map(({ pet, reason, years }) => (
        <div key={pet.id + reason} className="flex items-center gap-3 rounded-2xl bg-[#FFF8EE] p-2.5 shadow-sm">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl text-2xl" style={{ background: SPECIES_LOOK[pet.species].from }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {pet.primary_photo_url ? <img src={pet.primary_photo_url} alt="" className="h-full w-full object-cover" /> : SPECIES_LOOK[pet.species].emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#2A1E17]">{pet.name} {pet.show_flag !== false && flagEmoji(pet.country_code)}</p>
            <p className="text-xs text-[#8E8278]">{reason === 'anniversary' ? `🕯️ ${years} ${years === 1 ? 'year' : 'years'} in the hall today` : '🌱 New in the hall this week'}</p>
          </div>
          <button onClick={() => light(pet)} disabled={lit.has(pet.id)}
            className="shrink-0 rounded-full bg-[#F4E3CF] px-3 py-1.5 text-xs font-semibold text-[#5C3A1E] disabled:bg-[#E9F5E9] disabled:text-[#2E7D4F]">
            {lit.has(pet.id) ? '✓ Lit' : '🕯️ Light a candle'}
          </button>
          <Link href={`/${pet.slug}`} className="shrink-0 text-xs text-[#8E8278] underline">Visit</Link>
        </div>
      ))}
    </div>
  )
}

// ── Kind words (sticky notes) ──

function Notes() {
  const { user, ensureSession } = useAccount()
  const { posts, setPosts, more, loadMore } = usePosts('note', 'latest')
  const { toggle } = useLikes()
  const [text, setText] = useState('')
  const [color, setColor] = useState(NOTE_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setError('')
    const err = await ensureSession()
    if (err) { setBusy(false); return setError(err) }
    const { ok, data } = await postJSON('/api/board/posts', { kind: 'note', body: text, color, authorName: getVisitor().name })
    setBusy(false)
    if (!ok) return setError(data?.error ?? 'That didn’t pin. Please try again.')
    setPosts(p => [data.post, ...(p ?? [])]); setText('')
  }
  const thank = async (p: Post) => {
    const r = await toggle(p.id)
    if (r) setPosts(list => list?.map(x => (x.id === p.id ? { ...x, liked: r.liked, like_count: r.count } : x)) ?? null)
  }
  const remove = async (p: Post) => {
    if (!confirm('Take this note down?')) return
    const r = await fetch(`/api/board/posts/${p.id}`, { method: 'DELETE' }).catch(() => null)
    if (r?.ok) setPosts(list => list?.filter(x => x.id !== p.id) ?? null)
  }

  return (
    <div>
      <p className="mb-3 px-1 text-sm text-[#FFF8EE]">Notes left for anyone who is hurting. Read one, or pin one for a stranger.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <form onSubmit={pin} className="relative flex flex-col gap-2 rounded-sm p-3 pt-5 shadow-md" style={{ background: color }}>
          <Pin />
          <label htmlFor="note-text" className="sr-only">Your note</label>
          <textarea id="note-text" rows={5} maxLength={280} value={text} onChange={e => setText(e.target.value)}
            placeholder="You are not alone. They knew they were loved."
            className="flex-1 resize-none bg-transparent font-serif text-[15px] leading-snug text-[#2A1E17] placeholder:text-[#8E8278] focus:outline-none" />
          <div className="flex gap-1.5" role="radiogroup" aria-label="Note colour">
            {NOTE_COLORS.map(c => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label="Note colour" onClick={() => setColor(c)}
                className={cn('h-5 w-5 rounded-full border', color === c ? 'border-[#2A1E17] ring-2 ring-[#2A1E17]/30' : 'border-black/15')} style={{ background: c }} />
            ))}
          </div>
          {error && <p className="text-xs text-[#C0392B]">{error}</p>}
          <button disabled={busy || !text.trim()} className="rounded-full bg-[#D9823B] py-2 text-sm font-semibold text-white disabled:opacity-60">📌 {busy ? 'Pinning…' : 'Pin my note'}</button>
        </form>
        {posts?.map((p, i) => (
          <figure key={p.id} className="relative flex flex-col rounded-sm p-3 pt-5 shadow-md" style={{ background: p.note_color ?? NOTE_COLORS[0], transform: `rotate(${((i * 37) % 7) - 3}deg)` }}>
            <Pin />
            <blockquote className="flex-1 whitespace-pre-line font-serif text-[15px] leading-snug text-[#2A1E17]">{p.body}</blockquote>
            <figcaption className="mt-2 text-xs font-semibold text-[#5C5046]">— {p.author_name} {flagEmoji(p.author_country)}</figcaption>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => thank(p)} aria-pressed={!!p.liked}
                className={cn('rounded-full border px-2.5 py-1 text-xs', p.liked ? 'border-[#E86F8A] bg-white/70 text-[#C2405E]' : 'border-black/10 bg-white/60 text-[#5C5046]')}>
                {p.liked ? '❤️' : '🤍'} Thank you {p.like_count || ''}
              </button>
              {user?.id === p.author_id && <button onClick={() => remove(p)} className="text-[11px] text-[#C0392B] underline">remove</button>}
            </div>
          </figure>
        ))}
      </div>
      {posts === null && <Empty text="Loading notes…" />}
      {more && <button onClick={loadMore} className="mt-3 w-full rounded-2xl bg-[#FFF8EE]/80 py-2.5 text-sm font-semibold text-[#5C5046]">Show more notes</button>}
    </div>
  )
}

const Pin = () => <span aria-hidden className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-[#D9534F] shadow-[0_1px_2px_rgba(0,0,0,.4)]" />
const Empty = ({ text }: { text: string }) => <p className="rounded-2xl bg-[#FFF8EE]/85 px-4 py-6 text-center text-sm text-[#5C5046]">{text}</p>

/** The board as a full-height sheet over the 3D hall. */
export function BoardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/45 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Community board" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-hidden sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <Board onClose={onClose} />
      </div>
    </div>
  )
}
