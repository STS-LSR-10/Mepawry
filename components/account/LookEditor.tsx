'use client'
// components/account/LookEditor.tsx — Dress your character: gender, skin tone, hair colour, top and bottom with colours.
// In the hall the changes show live on your avatar (live); elsewhere a small 3D preview shows them.

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAccount } from '@/lib/account'
import { BOTTOMS, CLOTHES, HAIRS, SKINS, TOPS, previewLook, saveLook, useMyLook, type AvatarLook } from '@/lib/look'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

const LookPreview = dynamic(() => import('./LookPreview'), { ssr: false, loading: () => <div className="h-56" /> })

export function LookEditor({ onDone, live = false }: { onDone: () => void; live?: boolean }) {
  const account = useAccount()
  const t = useT(), tr = t // `t` is also the loop name for a top below
  const saved = useMyLook()
  const [draft, setDraft] = useState<AvatarLook>(saved)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<AvatarLook>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (live) previewLook(next)
  }
  const cancel = () => { if (live) previewLook(saved); onDone() }
  const save = async () => { setBusy(true); await saveLook(draft, account); setBusy(false); onDone() }

  return (
    <div className="space-y-4">
      {!live && <LookPreview look={draft} />}
      <Row label={t('Your character')}>
        {([['male', '👦', 'Male'], ['female', '👧', 'Female']] as const).map(([g, e, l]) => (
          <Chip key={g} on={draft.gender === g} onClick={() => set({ gender: g })}>{e} {t(l)}</Chip>
        ))}
      </Row>
      <Row label={t('Skin')}><Swatches list={SKINS} value={draft.skin} onPick={skin => set({ skin })} /></Row>
      <Row label={t('Hair')}><Swatches list={HAIRS} value={draft.hair} onPick={hair => set({ hair })} /></Row>
      <Row label={t('Top')}>
        {TOPS.map(t => <Chip key={t.id} on={draft.top === t.id} onClick={() => set({ top: t.id })}>{t.emoji} {tr(t.label)}</Chip>)}
      </Row>
      <Swatches list={CLOTHES} value={draft.topColor} onPick={topColor => set({ topColor })} label={t('Top colour')} />
      <Row label={t('Bottom')}>
        {BOTTOMS.map(b => <Chip key={b.id} on={draft.bottom === b.id} onClick={() => set({ bottom: b.id })}>{b.emoji} {t(b.label)}</Chip>)}
      </Row>
      <Swatches list={CLOTHES} value={draft.bottomColor} onPick={bottomColor => set({ bottomColor })} label={t('Bottom colour')} />
      <div className="flex gap-2 pt-1">
        <button onClick={cancel} className="flex-1 rounded-2xl border border-[#D4C9BF] py-2.5 text-sm font-semibold text-[#5C5046]">{t('Cancel')}</button>
        <button onClick={save} disabled={busy} className="flex-[2] rounded-2xl bg-[#D9823B] py-2.5 text-sm font-semibold text-white hover:bg-[#C67129] disabled:opacity-60">
          {busy ? t('Saving…') : t('Save my look')}
        </button>
      </div>
      <p className="text-center text-[11px] text-[#8E8278]">{t('Other visitors in the hall see your look too.')}</p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-[#5C5046]">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('rounded-full border px-3 py-1.5 text-sm font-medium transition', on ? 'border-[#D9823B] bg-[#FDF0E5] text-[#2A1E17]' : 'border-[#E8DFD6] bg-white text-[#5C5046] hover:border-[#D9823B]/50')}>
      {children}
    </button>
  )
}

function Swatches({ list, value, onPick, label }: { list: string[]; value: string; onPick: (c: string) => void; label?: string }) {
  return (
    <div>
      {label && <span className="mb-1.5 block text-xs font-semibold text-[#5C5046]">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {list.map(c => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onPick(c)}
            className={cn('h-8 w-8 rounded-full border-2 transition', value === c ? 'scale-110 border-[#2A1E17] shadow' : 'border-white shadow-sm')}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}
