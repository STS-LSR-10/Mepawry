'use client'
// components/site/LandingFx.tsx — Small client-only effects for the landing page

import { useEffect, useRef, useState } from 'react'
import { flagEmoji, timeAgo } from '@/lib/utils'
import { splitIcon, useActivity, useOnlineCount } from '@/lib/visitor'
import { useT } from '@/lib/i18n'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Twinkling starfield painted on a canvas that fills its parent. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    type Star = { x: number; y: number; r: number; p: number; v: number; dx: number; c: string }
    type Meteor = { x: number; y: number; vx: number; vy: number; life: number; len: number }
    let stars: Star[] = [], meteors: Meteor[] = []
    let raf = 0, d = 1, nextMeteor = 0
    const COLORS = ['#FFFFFF', '#FFF4DE', '#DCE8FF', '#FFE2C0']
    const size = () => {
      d = window.devicePixelRatio || 1
      cv.width = cv.offsetWidth * d
      cv.height = cv.offsetHeight * d
      stars = Array.from({ length: Math.min(420, (cv.width * cv.height) / (2600 * d * d)) }, (_, i) => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        r: (Math.random() ** 3 * 1.6 + 0.3) * d, p: Math.random() * 6.28, v: 0.004 + Math.random() * 0.03,
        dx: i % 7 === 0 ? (0.04 + Math.random() * 0.1) * d : 0, // one in seven drifts slowly across
        c: COLORS[i % COLORS.length],
      }))
    }
    const meteor = (now: number) => {
      if (now < nextMeteor) return
      nextMeteor = now + 3500 + Math.random() * 6000 // one every few seconds
      const a = Math.PI * (0.15 + Math.random() * 0.15), sp = (9 + Math.random() * 6) * d
      meteors.push({ x: Math.random() * cv.width * 0.8, y: Math.random() * cv.height * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, len: (90 + Math.random() * 120) * d })
    }
    const still = reducedMotion()
    const draw = (now = 0) => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      for (const s of stars) {
        s.p += s.v
        if (s.dx) { s.x += s.dx; if (s.x > cv.width + 4) s.x = -4 }
        ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(s.p))
        ctx.fillStyle = s.c
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill()
        if (s.r > 1.3 * d) { // a soft glow round the bright ones
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4)
          g.addColorStop(0, 'rgba(255,248,230,.35)'); g.addColorStop(1, 'rgba(255,248,230,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, 6.28); ctx.fill()
        }
      }
      if (!still) {
        meteor(now)
        meteors = meteors.filter(m => m.life > 0)
        for (const m of meteors) {
          m.x += m.vx; m.y += m.vy; m.life -= 0.012
          const sp = Math.hypot(m.vx, m.vy), tx = m.x - (m.vx / sp) * m.len, ty = m.y - (m.vy / sp) * m.len
          const g = ctx.createLinearGradient(m.x, m.y, tx, ty)
          g.addColorStop(0, `rgba(255,250,235,${m.life})`); g.addColorStop(1, 'rgba(255,250,235,0)')
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6 * d; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke()
        }
        raf = requestAnimationFrame(draw)
      }
      ctx.globalAlpha = 1
    }
    size(); draw()
    window.addEventListener('resize', size)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" aria-hidden="true" />
}

/** Real number of people on the site right now. */
export function OnlineCount() {
  const n = useOnlineCount()
  return <>{n ?? '…'}</>
}

/** Rotating line of real recent activity; a gentle invitation when nothing has happened yet. */
export function Ticker() {
  const items = useActivity()
  const t = useT()
  const [i, setI] = useState(0)
  const [show, setShow] = useState(true)
  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => { setShow(false); setTimeout(() => { setI(k => (k + 1) % items.length); setShow(true) }, 400) }, 4200)
    return () => clearInterval(id)
  }, [items.length])
  const it = items[i % Math.max(1, items.length)]
  return (
    <span className="min-w-0 flex-1 truncate transition-opacity duration-300" style={{ opacity: show ? 1 : 0 }}>
      {it ? (
        <a href={`/${it.slug}`} className="hover:underline">
          {(() => { // the sentence in the visitor's language, names in bold where that language puts them
            const [lead, key] = splitIcon(it.act)
            return <>{lead}{t(key).split(/(\{who\}|\{pet\})/).map((part, k) =>
              part === '{who}' ? <b key={k} className="font-semibold text-[#2A1E17]">{it.who}</b>
                : part === '{pet}' ? <b key={k} className="font-semibold text-[#2A1E17]">{it.pet}</b> : part)}</>
          })()}
          {' '}{flagEmoji(it.cc)} · {timeAgo(it.at, t)}
        </a>
      ) : t('The hall is quiet tonight. Be the first to light a candle.')}
    </span>
  )
}

/** Fades children in when scrolled into view; also starts any <CountUp> inside. */
export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} data-in={inView} className={`reveal ${inView ? 'in' : ''} ${className}`}>{children}</div>
}

/** Number that counts up from 0 once its <Reveal> parent is visible. */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const host = ref.current!.closest('[data-in]')
    let raf = 0
    const run = () => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600)
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    if (!host || host.getAttribute('data-in') === 'true') { run(); return () => cancelAnimationFrame(raf) }
    const mo = new MutationObserver(() => { if (host.getAttribute('data-in') === 'true') { mo.disconnect(); run() } })
    mo.observe(host, { attributes: true })
    return () => { mo.disconnect(); cancelAnimationFrame(raf) }
  }, [to])
  return <span ref={ref}>{n.toLocaleString('en-US')}</span>
}
