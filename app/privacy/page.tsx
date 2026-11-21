// app/privacy/page.tsx — Privacy policy: what Mepawry keeps, why, who helps run it, and how to remove things.

import Link from 'next/link'
import { LegalPage } from '@/components/site/LegalPage'

export const metadata = {
  title: 'Privacy Policy — Mepawry',
  description: 'What Mepawry keeps about you and your pets, why, and how to remove it.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="21 November 2026">
      <p>Mepawry (mepawry.com) is a place to remember pets. This page explains what we keep, why, and how you can remove it. We keep as little as we can, and we never sell your information.</p>

      <h2>What we keep</h2>
      <ul>
        <li><b>Your Google account basics</b>, when you sign in with Google: your name, email address and profile picture. We use them only to recognise you, so your memorials follow you to any device.</li>
        <li><b>Your profile</b>: the name you choose to show, your character’s look, and your country (worked out from your connection; it’s shown as a flag).</li>
        <li><b>Memorials you create</b>: your pet’s name, photos, dates, words and where their shrine stands. These are public, so anyone visiting can see them.</li>
        <li><b>What you leave for others</b>: candles, flowers, gifts, guestbook messages and Board posts, shown with the name you gave.</li>
        <li><b>On your own device</b>: your settings (sound, quality, language), where you were in the 3D hall, and the private keys that let a guest edit the memorials they made. These stay in your browser.</li>
        <li><b>Visit counts</b>: how many people are in the hall right now and how often a memorial is visited, counted without identifying you.</li>
      </ul>

      <h2>Why we keep it</h2>
      <p>Only to run Mepawry: to show memorials, let you edit your own, show who left a candle or a message, and keep the site safe from abuse. We don’t use your information for advertising.</p>

      <h2>Who helps us run Mepawry</h2>
      <ul>
        <li><b>Google</b>, for signing in.</li>
        <li><b>Supabase</b>, which stores our database, accounts and photos.</li>
        <li><b>Cloudflare</b>, which hosts and delivers the site.</li>
        <li><b>Stripe</b>, once paid gifts open, to take payments. We never see or keep card numbers.</li>
      </ul>
      <p>They handle information only to provide their service to us.</p>

      <h2>Cookies</h2>
      <p>We use a sign-in cookie to keep you signed in, and your browser’s storage for the settings above. We don’t use advertising or tracking cookies.</p>

      <h2>Removing your information</h2>
      <p>You can edit or delete any memorial you made from <Link href="/me">My memorials</Link>. To delete your account and everything linked to it, or for any other privacy question, write to us through the <Link href="/report">Report page</Link> and we’ll take care of it.</p>

      <h2>Children</h2>
      <p>Mepawry is for everyone who has loved an animal. Children under 13 should use it with a parent or guardian.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we’ll update this page and the date at the top.</p>
    </LegalPage>
  )
}
