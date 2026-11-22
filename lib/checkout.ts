// lib/checkout.ts — Sends the browser to Stripe to pay for something (see /api/checkout). Returns an error key on failure.

export async function startCheckout(body: { kind: 'vip' | 'frame' | 'backdrop' | 'gift'; petId: string; item?: string; name?: string } | { kind: 'niche'; floor: number; position: number }): Promise<string> {
  const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  const d = await r?.json().catch(() => null)
  if (r?.ok && d?.url) { window.location.href = d.url; return '' }
  return d?.error ?? 'That didn’t go through. Please try again.'
}
