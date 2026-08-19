import type { Metadata } from 'next'

/**
 * Where this copy of the app is served from. Configurable because the project
 * is open source: nobody else's clone lives at the same address, and a
 * canonical URL pointing at somebody else's domain is worse than none.
 *
 * Read at build time like every NEXT_PUBLIC_ value, so production passes it as
 * a build argument.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export const SITE_NAME = 'e-Saxophone Learning'

export const SITE_DESCRIPTION =
  'Practice tracking for electronic saxophones such as the Yamaha YDS-120 and YDS-150. A 20 week course, a fingering chart and a listener that hears what you play. Free and open source.'

/** The pages worth putting in front of a stranger, in the order they matter. */
export const PUBLIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '/',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  {
    path: '/learn',
    title: 'Learn: a 20 week saxophone course',
    description:
      'Twenty weeks from first steady note to a song you can play through: long tones, the octave key, reading the staff, scales, articulation and phrasing. The app listens and scores each line, in time if you ask it to.',
  },
  {
    path: '/monitor',
    title: 'Monitor: connect your instrument',
    description:
      'Connect a Yamaha YDS-120 over USB MIDI, or use the microphone and no cable at all. See every note as you play it, with its fingering, its pitch and how the instrument transposes.',
  },
  {
    path: '/exercises',
    title: 'Scale trainer',
    description:
      'Scales and arpeggios that listen back. Pick a key, play it up and down, and see which notes you fluff before they become a habit.',
  },
  {
    path: '/compose',
    title: 'Write a tune',
    description:
      'Click notes to write a melody in 2/4, 3/4 or 4/4, with dotted lengths and bar lines, then practise it like any other exercise, with the fingering shown under every note.',
  },
  {
    path: '/progress',
    title: 'Your practice history',
    description:
      'Every session you have saved: time spent, accuracy, which notes you play least, and how far through the course you are.',
  },
  {
    path: '/api-docs',
    title: 'API',
    description:
      'The whole API, described in OpenAPI and readable in the browser. Practice data belongs to whoever practised, including outside this app.',
  },
]

/**
 * One page's metadata. Every page gets its own title, description and canonical
 * URL, so a search result or a pasted link says which page it is rather than
 * repeating the site name six times.
 */
export function pageMetadata(path: string, overrides?: Partial<Metadata>): Metadata {
  const page = PUBLIC_PAGES.find((p) => p.path === path)
  const title = page?.title ?? SITE_NAME
  const description = page?.description ?? SITE_DESCRIPTION
  const url = `${SITE_URL}${path === '/' ? '' : path}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
    twitter: { card: 'summary_large_image', title, description },
    ...overrides,
  }
}

/**
 * A page that belongs to one person, not to a search engine: the login form,
 * somebody's settings, the user list. Indexing these gains nothing and puts a
 * signed-out shell in the results.
 */
export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  }
}
