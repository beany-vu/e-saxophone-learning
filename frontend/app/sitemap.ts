import type { MetadataRoute } from 'next'
import { PUBLIC_PAGES, SITE_URL } from '@/lib/seo'

// Built from the same list that gives each page its title, so a page cannot be
// described and then left out of the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path === '/' ? '' : page.path}`,
    changeFrequency: 'weekly',
    priority: page.path === '/' ? 1 : 0.7,
  }))
}
