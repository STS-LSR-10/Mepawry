// app/layout.tsx — Root Layout

import type { Metadata } from 'next'
import { Lora, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const serif = Lora({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif' })
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Mepawry — A place that never forgets',
  description: 'A quiet, candlelit memorial hall for pets from every corner of the world. Light a candle, leave a flower, write in their guestbook.',
  keywords: ['pet memorial', 'pet loss', 'rainbow bridge', 'memorial candle'],
  openGraph: {
    title: 'Mepawry',
    description: 'A candlelit memorial hall for pets from every corner of the world.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
