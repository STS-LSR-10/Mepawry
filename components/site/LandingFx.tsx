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
    let stars: { x: number; y: number; r: number; p: number; v: number }[] = []
    let raf = 0
    const size = () => {
      const d = window.devicePixelRatio
      cv.width = cv.offsetWidth * d
      cv.height = cv.offsetHeight * d
      stars = Array.from({ length: Math.min(220, cv.width / 6) }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height * 0.75,
        r: Math.random() * 1.4 * d + 0.2, p: Math.random() * 6.28, v: 0.005 + Math.random() * 0.02,
      }))
    }
    const still = reducedMotion()
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.fillStyle = '#FFF4DE'
      for (const s of stars) {
        s.p += s.v
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.p))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill()
      }
      if (!still) raf = requestAnimationFrame(draw)
    }
    size(); draw()
    window.addEventListener('resize', size)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
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
