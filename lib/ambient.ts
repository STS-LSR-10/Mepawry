'use client'
// lib/ambient.ts — Soft background music for the hall, made in the browser (no audio files): slow warm chords
// with a gentle swell, and now and then a few music-box notes, all through a soft reverb.
// Browsers only let sound start after the visitor touches the page, so start() is called from a tap or key.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let volume = 0.5
const gainOf = (v: number) => v * v // ears hear loudness roughly this way, so the slider feels even

// C major 7 → A minor 9 → F major 7 → G6 (sus), in Hz, low to high
const CHORDS = [
  [130.81, 196.0, 246.94, 329.63],
  [110.0, 164.81, 246.94, 261.63],
  [87.31, 174.61, 220.0, 329.63],
  [98.0, 146.83, 220.0, 293.66],
]
const BELLS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5] // C major pentatonic, an octave up
const BAR = 8 // seconds per chord

function reverb(c: AudioContext) {
  // a short, dark tail made from fading noise
  const len = c.sampleRate * 3.5, buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  const r = c.createConvolver(); r.buffer = buf
  return r
}

function chord(c: AudioContext, out: AudioNode, notes: number[], at: number) {
  for (const f of notes) {
    for (const detune of [-4, 4]) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = detune
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.065, at + 2.5)      // slow swell in
      g.gain.setValueAtTime(0.065, at + BAR - 1)
      g.gain.linearRampToValueAtTime(0, at + BAR + 2.5)    // and out, overlapping the next chord
      o.connect(g).connect(out)
      o.start(at); o.stop(at + BAR + 2.6)
    }
  }
}

function bell(c: AudioContext, out: AudioNode, f: number, at: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'sine'; o.frequency.value = f
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(0.07, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2)
  o.connect(g).connect(out)
  o.start(at); o.stop(at + 2.3)
}

function schedule(c: AudioContext, out: AudioNode, bar: number) {
  const at = c.currentTime + 0.1
  chord(c, out, CHORDS[bar % CHORDS.length], at)
  // a few music-box notes in about half the bars
  if (Math.random() < 0.55) {
    const n = 2 + Math.floor(Math.random() * 3)
    for (let k = 0; k < n; k++) bell(c, out, BELLS[Math.floor(Math.random() * BELLS.length)], at + 1 + k * (0.6 + Math.random() * 0.9))
  }
  timer = setTimeout(() => schedule(c, out, bar + 1), BAR * 1000)
}

/** Start the music (call from a tap or key press). Safe to call again; it only starts once. */
export function startAmbient() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  const c = new AC()
  ctx = c
  master = c.createGain()
  master.gain.setValueAtTime(0, c.currentTime)
  master.gain.linearRampToValueAtTime(gainOf(volume), c.currentTime + 3)
  const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400
  const wet = c.createGain(); wet.gain.value = 0.55
  const bus = c.createGain()
  bus.connect(tone)
  bus.connect(reverb(c)).connect(wet).connect(tone)
  tone.connect(master).connect(c.destination)
  schedule(c, bus, 0)
}

/** Stop the music altogether (fades out, then frees the audio). */
export function stopAmbient() {
  if (!ctx || !master) return
  const c = ctx, m = master
  ctx = null; master = null
  if (timer) clearTimeout(timer)
  timer = null
  m.gain.cancelScheduledValues(c.currentTime)
  m.gain.setTargetAtTime(0, c.currentTime, 0.3)
  setTimeout(() => c.close().catch(() => {}), 1500)
}

/** 0…1 */
export function setAmbientVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  if (ctx && master) master.gain.setTargetAtTime(gainOf(volume), ctx.currentTime, 0.15)
}
