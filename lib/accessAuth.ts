// lib/accessAuth.ts — Who came in through Cloudflare Access (Zero Trust), for the admin page: Access signs a token
// (the Cf-Access-Jwt-Assertion header) for each request it lets through. We check its signature with the team's
// public keys, rather than trusting the email header: requests that skip Access (e.g. the workers.dev address)
// could set that header to anything.
//
// Settings: CF_ACCESS_TEAM (e.g. "patient-sky-98cd.cloudflareaccess.com"); CF_ACCESS_AUD, the Access application's
// "Application Audience (AUD) Tag" (optional but recommended: without it, a token for any app of the team passes).

import { headers } from 'next/headers'

type Jwk = JsonWebKey & { kid?: string }
let cache: { team: string; keys: Jwk[]; at: number } | null = null

async function teamKeys(team: string): Promise<Jwk[]> {
  if (cache?.team === team && Date.now() - cache.at < 3_600_000) return cache.keys
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error(`Access certs ${res.status}`)
  const keys = ((await res.json()) as { keys?: Jwk[] }).keys ?? []
  cache = { team, keys, at: Date.now() }
  return keys
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0))
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)))

/** The email in a valid Access token for `team` (and `aud` when given), or null. Pure: keys are passed in (testable). */
export async function verifyAccessJwt(jwt: string, keys: Jwk[], team: string, aud?: string, now = Date.now()): Promise<string | null> {
  try {
    const [h, p, s] = jwt.split('.')
    if (!h || !p || !s) return null
    const header = json(h), payload = json(p)
    if (header.alg !== 'RS256') return null
    const jwk = keys.find(k => k.kid === header.kid)
    if (!jwk) return null
    const key = await crypto.subtle.importKey('jwk', { ...jwk, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`))) return null
    if (payload.iss !== `https://${team}`) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < now) return null
    if (aud && !(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(aud)) return null
    return typeof payload.email === 'string' ? payload.email : null
  } catch { return null }
}

/** The email Cloudflare Access signed this request in with, or null (no Access in front, or a bad token). */
export async function accessEmail(): Promise<string | null> {
  const team = process.env.CF_ACCESS_TEAM ?? ''
  const jwt = (await headers()).get('cf-access-jwt-assertion')
  if (!team || !jwt) return null
  try { return await verifyAccessJwt(jwt, await teamKeys(team), team, process.env.CF_ACCESS_AUD || undefined) } catch (e) {
    console.error('[access] could not check the token:', e)
    return null
  }
}
