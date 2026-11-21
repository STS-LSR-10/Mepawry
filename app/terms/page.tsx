// app/terms/page.tsx — Terms of service: the few rules for using Mepawry.

import Link from 'next/link'
import { LegalPage } from '@/components/site/LegalPage'

export const metadata = {
  title: 'Terms of Service — Mepawry',
  description: 'The few rules for using Mepawry, a place to remember pets.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="21 November 2026">
      <p>Welcome to Mepawry (mepawry.com), a place to remember pets. By using it you agree to these terms. They’re short, because the idea is simple: be kind.</p>

      <h2>Your memorials and posts</h2>
      <ul>
        <li>What you add (photos, words, messages) stays yours. You let us show it on Mepawry so others can visit and remember with you.</li>
        <li>Only add photos and words you have the right to share.</li>
        <li>Memorials and posts are public. Please don’t share anyone’s private details.</li>
      </ul>

      <h2>Be kind</h2>
      <p>Mepawry is a place of remembrance. Don’t post anything hateful, violent, sexual, misleading or unlawful, and don’t harass anyone. We may remove content or accounts that break these rules, and you can tell us about anything wrong through the <Link href="/report">Report page</Link>.</p>

      <h2>Your account</h2>
      <p>You sign in with Google and are responsible for what’s done with your account. You can delete your memorials anytime from <Link href="/me">My memorials</Link>, or ask us to delete your account.</p>

      <h2>Paid gifts</h2>
      <p>Most of Mepawry is free. When paid gifts open, their price and how long they stay will be shown before you pay.</p>

      <h2>The service</h2>
      <p>We work hard to keep Mepawry running and your memorials safe, but it’s provided as it is, and we can’t promise it will never be interrupted. We may improve or change features over time.</p>

      <h2>Changes</h2>
      <p>If we change these terms, we’ll update this page and the date at the top. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </LegalPage>
  )
}
