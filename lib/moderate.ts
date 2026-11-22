// lib/moderate.ts — Checks an uploaded photo with Cloudflare Workers AI before it's saved: it must show an animal and
// nothing sexual. Returns an error key (shown to the uploader, translated) or null when the photo is fine.

import { getCloudflareContext } from '@opennextjs/cloudflare'

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'
// two plain yes/no questions: a single 'which one is it' prompt let a shirtless man and a screenshot through as pets
const HAS_ANIMAL = 'Is there a real or drawn animal (such as a dog or cat) visible in this image? Answer only yes or no.'
const HAS_NUDITY = 'Does this image show a person who is shirtless, naked or in underwear? Answer only yes or no.'

type Ai = { run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }> }

export const NOT_A_PET = 'This photo doesn’t seem to show a pet. Please choose a photo of your pet.'
export const NOT_ALLOWED = 'This photo can’t be used here. Please choose a photo of your pet.'

/** `animal: false` only screens for nudity (Board photos can be candles, flowers, places…). */
export async function checkPetPhoto(dataUrl: string, { animal: needAnimal = true } = {}): Promise<string | null> {
  let ai: Ai | undefined
  try { ai = (getCloudflareContext().env as { AI?: Ai }).AI } catch { /* not running on Cloudflare (local dev without bindings) */ }
  // shortcut: with no AI binding (local `next dev`) photos aren't checked; the live site always has it
  if (!ai) return null

  const image = [...Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')]
  const ask = async (prompt: string) => /^\W*yes/i.test((await ai!.run(MODEL, { image, prompt, max_tokens: 5, temperature: 0 })).response ?? '')
  let animal: boolean, nudity: boolean
  try {
    try {
      [animal, nudity] = await Promise.all([ask(HAS_ANIMAL), ask(HAS_NUDITY)])
    } catch (e) {
      // Meta's licence must be accepted once per account before the model answers
      if (!/agree/i.test(String(e))) throw e
      await ai.run(MODEL, { prompt: 'agree', max_tokens: 5 }).catch(() => {}) // answers with a 'thank you for agreeing' error
      ;[animal, nudity] = await Promise.all([ask(HAS_ANIMAL), ask(HAS_NUDITY)])
    }
  } catch (e) {
    // shortcut: if Workers AI is down the photo goes through unchecked (logged) rather than blocking every upload
    console.error('[moderate] photo check failed:', e)
    return null
  }
  if (nudity) return NOT_ALLOWED
  if (needAnimal && !animal) return NOT_A_PET
  return null
}
