import { describe, it, expect } from 'vitest'
import { PUBLIC_PAGES, SITE_URL, pageMetadata, privatePageMetadata } from '@/lib/seo'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

describe('page metadata', () => {
  // The whole point of the exercise: six routes used to share one title, which
  // told a search result nothing about which page it had found.
  it('gives every page a title of its own', () => {
    const titles = PUBLIC_PAGES.map((p) => pageMetadata(p.path).title)
    expect(new Set(titles).size).toBe(PUBLIC_PAGES.length)
  })

  it('describes every page in a sentence worth reading, not a slogan', () => {
    PUBLIC_PAGES.forEach((p) => {
      expect(p.description.length, p.path).toBeGreaterThan(60)
      expect(p.description.length, `${p.path} is too long for a search result`).toBeLessThan(320)
    })
  })

  it('points each page at its own canonical url', () => {
    expect(pageMetadata('/').alternates?.canonical).toBe(SITE_URL)
    expect(pageMetadata('/learn').alternates?.canonical).toBe(`${SITE_URL}/learn`)
  })

  it('carries the same title into the share card, so a pasted link says what it is', () => {
    const meta = pageMetadata('/compose')
    expect(meta.openGraph?.title).toBe(meta.title)
    expect(meta.twitter?.title).toBe(meta.title)
  })

  it('keeps somebody’s own pages out of the index', () => {
    const meta = privatePageMetadata('Log in')
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
})

describe('robots.txt', () => {
  it('welcomes crawlers to the pages that are for readers', () => {
    const rules = robots().rules
    expect(Array.isArray(rules) ? rules[0].allow : rules.allow).toBe('/')
  })

  it('keeps them off the API and off one person’s pages', () => {
    const rules = robots().rules
    const disallow = (Array.isArray(rules) ? rules[0].disallow : rules.disallow) as string[]
    expect(disallow).toContain('/api/')
    expect(disallow).toContain('/admin')
  })

  it('names the sitemap, since a robots file is where crawlers look for it', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})

describe('the sitemap', () => {
  // Built from the same list, so a page cannot be given a description and then
  // quietly left out of the sitemap.
  it('lists every public page and nothing private', () => {
    const urls = sitemap().map((e) => e.url)
    expect(urls).toHaveLength(PUBLIC_PAGES.length)
    expect(urls).toContain(SITE_URL)
    expect(urls.some((u) => u.includes('/admin'))).toBe(false)
    expect(urls.some((u) => u.includes('/login'))).toBe(false)
  })

  it('puts the homepage first in priority', () => {
    const home = sitemap().find((e) => e.url === SITE_URL)
    expect(home?.priority).toBe(1)
  })
})
