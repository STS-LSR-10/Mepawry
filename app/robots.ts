// app/robots.ts — Let search engines in, keep them out of the API and private pages, and point them at the sitemap.

import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/utils'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/me', '/preview/'] },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
