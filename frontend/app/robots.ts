import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Cloudflare serves a managed robots.txt of its own when the origin has none.
// This one replaces it, and unlike that file it actually says something.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here is secret, it is simply nobody's search result: the API
      // answers JSON, and the rest belongs to one signed-in person.
      disallow: ['/api/', '/admin', '/login', '/settings'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
