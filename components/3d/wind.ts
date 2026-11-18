// components/3d/wind.ts — Wind for trees, bushes and grass, done in the vertex shader (costs the CPU nothing,
// works with instancing). One clock drives everything; a slow gust makes the breeze come and go.

import { useFrame } from '@react-three/fiber'
import type { Material, WebGLProgramParametersWithUniforms } from 'three'

/** Shared by every wind material. ground: world height of the ground (lower on upper floors' view). */
export const WIND = { uTime: { value: 0 }, uGround: { value: 0 } }

/**
 * Makes a material sway.
 * - 'tree': bends more the higher above the ground a vertex is (trunks barely move, crowns sway).
 * - 'grass': bends by the vertex's own height in the blade (tips flutter, roots stay put).
 */
export function windify<M extends Material>(mat: M, mode: 'tree' | 'grass', amp = 1): M {
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = WIND.uTime
    shader.uniforms.uGround = WIND.uGround
    shader.uniforms.uAmp = { value: amp }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uGround; uniform float uAmp;')
      .replace('#include <project_vertex>', `
        vec4 wpos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpos = instanceMatrix * wpos;
        #endif
        wpos = modelMatrix * wpos;
        float gust = 0.65 + 0.35 * sin(uTime * 0.37 + wpos.x * 0.02);
        ${mode === 'tree'
          ? `float bend = pow(max(0.0, wpos.y - uGround - 0.6), 1.5) * 0.025 * uAmp * gust;
             wpos.x += (sin(uTime * 1.3 + wpos.x * 0.21 + wpos.z * 0.13) + 0.4) * bend;
             wpos.z += cos(uTime * 1.05 + wpos.x * 0.17) * bend * 0.6;
             wpos.y += sin(uTime * 2.7 + wpos.z * 0.9) * bend * 0.15;`
          : `float bend = position.y * position.y * 2.2 * uAmp * gust;
             wpos.x += (sin(uTime * 2.1 + wpos.x * 0.6 + wpos.z * 0.35) + 0.5) * bend;
             wpos.z += cos(uTime * 1.7 + wpos.x * 0.4) * bend * 0.5;`}
        vec4 mvPosition = viewMatrix * wpos;
        gl_Position = projectionMatrix * mvPosition;`)
  }
  mat.customProgramCacheKey = () => `wind-${mode}-${amp}`
  return mat
}

/** Ticks the wind clock; put one inside the Canvas. */
export function WindClock({ ground }: { ground: number }) {
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useFrame(({ clock }) => {
    WIND.uTime.value = still ? 0 : clock.elapsedTime
    WIND.uGround.value = ground
  })
  return null
}
