// app/layout.tsx — Root Layout

import type { Metadata } from 'next'
import { Lora, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AccountProvider } from '@/lib/account'
import { I18nProvider } from '@/lib/i18n'
import { SettingsSheet } from '@/components/site/SettingsSheet'
import { SITE } from '@/lib/utils'

const serif = Lora({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif' })
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: 'Mepawry',
  title: 'Mepawry — A place that never forgets',
  description: 'A quiet, candlelit memorial hall for pets from every corner of the world. Light a candle, leave a flower, write in their guestbook.',
  keywords: ['pet memorial', 'pet loss', 'rainbow bridge', 'memorial candle'],
  openGraph: {
    title: 'Mepawry',
    siteName: 'Mepawry',
    description: 'A candlelit memorial hall for pets from every corner of the world.',
    type: 'website',
    url: SITE,
  },
}

// Tells Google the site's name (shown above results when someone searches "mepawry")
const SITE_JSON = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Mepawry', alternateName: ['mepawry.com'], url: `${SITE}/` })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_JSON }} /></head>
      <body className="antialiased"><I18nProvider><AccountProvider>{children}</AccountProvider><SettingsSheet /></I18nProvider></body>
    </html>
  )
}
