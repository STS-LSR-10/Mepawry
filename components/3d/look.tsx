'use client'
// components/3d/look.tsx — Look-dev helpers shared by every scene: procedural micro-surface maps, a Fresnel rim light,
// soft contact shadows, and the post-processing stack (AO, bloom, ACES tone mapping) for capable devices.

import { CanvasTexture, Color, RepeatWrapping, type Material, type WebGLProgramParametersWithUniforms } from 'three'
import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// ── Procedural micro-texture (tiling value noise, several octaves) ──

function valueNoise(size: number, octaves: [number, number][], seed = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const img = g.createImageData(size, size)
  const field = new Float32Array(size * size)
  for (const [cells, weight] of octaves) {
    // random lattice that wraps, so the texture tiles
    const lat = new Float32Array(cells * cells)
    for (let i = 0; i < lat.length; i++) { seed = (seed * 16807) % 2147483647; lat[i] = seed / 2147483647 }
    const at = (x: number, y: number) => lat[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)]
    const smooth = (t: number) => t * t * (3 - 2 * t)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0)
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
      const bot = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx
      field[y * size + x] += (top * (1 - ty) + bot * ty) * weight
    }
  }
  const total = octaves.reduce((s, [, w]) => s + w, 0)
  for (let i = 0; i < field.length; i++) {
    const v = Math.round((field[i] / total) * 255)
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

const cache: Partial<Record<'fuzz' | 'stone' | 'grain', CanvasTexture>> = {}
/**
 * Shared bump/roughness maps (made once):
 * - fuzz: fine fabric/skin fibre noise
 * - stone: blotchy weathering with pits
 * - grain: long streaks for wood
 */
export function microMap(kind: 'fuzz' | 'stone' | 'grain'): CanvasTexture {
  if (cache[kind]) return cache[kind]!
  let t: CanvasTexture
  if (kind === 'fuzz') t = valueNoise(128, [[64, 1], [32, 0.5], [128, 0.6]], 3)
  else if (kind === 'stone') t = valueNoise(128, [[4, 1], [16, 0.6], [64, 0.35]], 7)
  else {
    t = valueNoise(128, [[8, 1], [32, 0.4]], 11)
    t.repeat.set(1, 8) // stretched along one axis: reads as grain
  }
  return (cache[kind] = t)
}

// ── Fresnel rim light ──

/** Colour of the rim; the scene sets it to match the sky (warm by day, cool at night). */
export const RIM = { color: { value: new Color('#CFE0FF') }, strength: { value: 0.35 } }

function injectRim(shader: WebGLProgramParametersWithUniforms, strength: { value: number }) {
  shader.uniforms.uRimColor = RIM.color
  shader.uniforms.uRimStrength = strength
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor; uniform float uRimStrength;')
    .replace('#include <opaque_fragment>', `#include <opaque_fragment>
      float rimF = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      gl_FragColor.rgb += uRimColor * rimF * uRimStrength;`)
}

/**
 * Adds a soft Fresnel rim so silhouettes catch the ambient light and separate from the background.
 * Chains onto any existing onBeforeCompile (e.g. wind).
 */
export function withRim<M extends Material>(mat: M, strength = 1): M {
  const prev = mat.onBeforeCompile
  const k = { value: RIM.strength.value * strength }
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, r) => { prev?.call(mat, shader, r); injectRim(shader, k) }
  const key = mat.customProgramCacheKey.bind(mat)
  mat.customProgramCacheKey = () => key() + `|rim${strength}`
  return mat
}

/**
 * Light that falls on the characters where they stand: warm lamplight indoors, a little moonlight outside at
 * night. The interior's own glow lives on its surfaces, so without this the avatars looked dark inside.
 * Set by the hall each frame-ish (a uniform, so changing it costs nothing).
 */
export const AVATAR_FILL = { value: new Color(0, 0, 0) }
/** Scales the avatars' own lit colour: in full sun the cream and white clothes washed out, so they're toned down by day. */
export const AVATAR_EXPOSURE = { value: 1 }

/** Rim light + the avatar fill, for character materials (your avatar and other visitors'). */
export const avatarShade = (shader: WebGLProgramParametersWithUniforms) => {
  injectRim(shader, RIM.strength)
  shader.uniforms.uAvatarFill = AVATAR_FILL
  shader.uniforms.uAvatarExposure = AVATAR_EXPOSURE
  shader.fragmentShader = shader.fragmentShader
    .replace('uniform vec3 uRimColor;', 'uniform vec3 uRimColor; uniform vec3 uAvatarFill; uniform float uAvatarExposure;')
    .replace('gl_FragColor.rgb += uRimColor * rimF * uRimStrength;', 'gl_FragColor.rgb = gl_FragColor.rgb * uAvatarExposure + uRimColor * rimF * uRimStrength + diffuseColor.rgb * uAvatarFill;')
}

/** For JSX materials: <meshStandardMaterial onBeforeCompile={rim} />. */
export const rim = (shader: WebGLProgramParametersWithUniforms) => injectRim(shader, RIM.strength)

// ── Soft contact shadow (a dark radial falloff laid on the ground) ──

let blob: CanvasTexture | null = null
export function contactShadowMap() {
  if (blob) return blob
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(0.45, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return (blob = new CanvasTexture(c))
}

/** Soft dark pool on the ground under an object, so it sits on the ground instead of floating. */
export function ContactShadow({ at, size, opacity = 0.55 }: { at: [number, number, number]; size: [number, number]; opacity?: number }) {
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={contactShadowMap()} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ── Post-processing (desktop / capable devices only) ──

/**
 * Screen-space ambient occlusion where parts meet, bloom only on things brighter than white (flames, lamps,
 * fairy lights — high threshold), and ACES filmic tone mapping at the end. Put the Canvas in `flat` mode with this.
 */
export function Polish({ bloom = 0.7 }: { bloom?: number }) {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={1.1} intensity={2.2} distanceFalloff={0.8} halfRes quality="performance" />
      <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.25} intensity={bloom} radius={0.65} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/** Light vignette as a CSS overlay: free on every device, draws the eye to the middle. */
export function Vignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,6,4,.38) 100%)' }}
    />
  )
}
