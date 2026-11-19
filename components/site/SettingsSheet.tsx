'use client'
// components/site/SettingsSheet.tsx — Settings: language and display. Mounted once in the root layout and opened
// from the ⚙️ buttons (openSettings()). Choices apply at once and are saved in this browser.

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { LANGS, useLang, useT } from '@/lib/i18n'
import { setPref, usePref, type CrowdPref, type GraphicsPref } from '@/lib/settings'

type Tab = 'language' | 'display'

export function SettingsSheet() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('language')
  const t = useT()
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener('mepawry:settings', on)
    return () => window.removeEventListener('mepawry:settings', on)
  }, [])

  return (
    <Modal open={open} onClose={() => setOpen(false)} className="bg-[#FFFBF5] sm:max-w-[520px]">
      <div className="p-5 sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E8DFD6] sm:hidden" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 id="modal-title" className="font-serif text-2xl font-bold text-[#2A1E17]">{t('Settings')}</h2>
          <button onClick={() => setOpen(false)} aria-label={t('Close')} className="grid h-9 w-9 place-items-center rounded-full bg-[#F4EBDD] text-[#8E8278] hover:text-[#2A1E17]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div role="tablist" aria-label={t('Settings')} className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#F4EBDD] p-1">
          {([['language', '🌐', 'Language'], ['display', '🖥️', 'Display']] as const).map(([id, icon, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition',
                tab === id ? 'bg-white text-[#2A1E17] shadow-sm' : 'text-[#8E8278] hover:text-[#2A1E17]')}>
              <span aria-hidden>{icon}</span>{t(label)}
            </button>
          ))}
        </div>

        {/* p-1 leaves room for the selected ring, which the scroll edge would otherwise cut off */}
        <div className="-mx-1 mt-3 max-h-[58dvh] overflow-y-auto p-1">
          {tab === 'language' ? <LanguagePanel /> : <DisplayPanel />}
        </div>

        <button onClick={() => setOpen(false)} className="mt-4 w-full rounded-2xl bg-[#2A1E17] py-3 text-sm font-semibold text-[#FFF6EA] hover:bg-[#3B2B21]">
          {t('Done')}
        </button>
      </div>
    </Modal>
  )
}

function LanguagePanel() {
  const { lang, setLang } = useLang()
  return (
    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Language">
      {LANGS.map(l => {
        const on = l.code === lang
        return (
          <button key={l.code} role="radio" aria-checked={on} lang={l.code} onClick={() => setLang(l.code)}
            className={cn('flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition active:scale-[.98]',
              on ? 'bg-[#FDF0E5] ring-2 ring-[#D9823B]' : 'bg-white ring-1 ring-[#EFE4D4] hover:ring-[#D9823B]/50')}>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight text-[#2A1E17]">{l.name}</span>
              <span className="block text-[10px] text-[#8E8278]">{l.english}</span>
            </span>
            <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px]',
              on ? 'bg-[#D9823B] text-white' : 'ring-1 ring-[#E8DFD6]')} aria-hidden>{on ? '✓' : ''}</span>
          </button>
        )
      })}
    </div>
  )
}

function DisplayPanel() {
  const t = useT()
  const graphics = usePref<GraphicsPref>('pm-graphics')
  const crowd = usePref<CrowdPref>('pm-crowd')
  return (
    <div className="space-y-5">
      <Choice
        title={t('Graphics quality')} hint={t('Auto picks what your device can handle. High has soft shadows and glow; Low runs smoother on phones.')}
        value={graphics} onPick={v => setPref('pm-graphics', v)}
        options={[['auto', '🪄', t('Auto')], ['high', '✨', t('High')], ['low', '🍃', t('Low')]]}
      />
      <Choice
        title={t('Visitors shown in the hall')} hint={t('Fewer people means a lighter load on slower phones.')}
        value={crowd} onPick={v => setPref('pm-crowd', v)}
        options={[['auto', '🪄', t('Auto')], ['few', '🧍', t('Few')], ['many', '👨‍👩‍👧‍👦', t('Many')]]}
      />
    </div>
  )
}

function Choice({ title, hint, value, onPick, options }: {
  title: string; hint: string; value: string; onPick: (v: string) => void; options: [string, string, string][]
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#2A1E17]">{title}</h3>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={title}>
        {options.map(([id, icon, label]) => {
          const on = value === id
          return (
            <button key={id} role="radio" aria-checked={on} onClick={() => onPick(id)}
              className={cn('flex flex-col items-center gap-1 rounded-xl py-2.5 transition active:scale-[.98]',
                on ? 'bg-[#FDF0E5] ring-2 ring-[#D9823B]' : 'bg-white ring-1 ring-[#EFE4D4] hover:ring-[#D9823B]/50')}>
              <span className="text-xl leading-none" aria-hidden>{icon}</span>
              <span className={cn('text-xs font-semibold', on ? 'text-[#C67129]' : 'text-[#5C5046]')}>{label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#8E8278]">{hint}</p>
    </section>
  )
}
