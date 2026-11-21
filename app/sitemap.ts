// app/sitemap.ts — Every page search engines should know about: the main pages and each pet's shrine.

import type { MetadataRoute } from 'next'
import { db } from '@/lib/data'
import { SITE } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/memorials', '/hall', '/board', '/guides', '/about', '/privacy', '/terms']
    .map(p => ({ url: `${SITE}${p}`, changeFrequency: 'daily' as const, priority: p ? 0.7 : 1 }))
  // shortcut: one query up to 50k shrines (a sitemap's limit); split into several sitemaps beyond that
  const { data } = await db().from('pets').select('slug, updated_at').order('created_at', { ascending: false }).limit(50000)
  const pets = (data ?? []).map(p => ({ url: `${SITE}/${p.slug}`, lastModified: p.updated_at, changeFrequency: 'weekly' as const, priority: 0.5 }))
  return [...pages, ...pets]
}
