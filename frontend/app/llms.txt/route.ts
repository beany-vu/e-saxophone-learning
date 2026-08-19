import { PUBLIC_PAGES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * llms.txt: a plain reading of what this site is, for an assistant that has
 * landed here and has to decide what it is looking at.
 *
 * It deliberately points at the two machine surfaces that already exist rather
 * than describing them twice: the OpenAPI document, and the MCP server that an
 * assistant can run to read somebody's practice with their permission.
 */
export function GET() {
  const pages = PUBLIC_PAGES.filter((p) => p.path !== '/')
    .map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`)
    .join('\n')

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

The instrument sends MIDI over USB, or is heard through the computer's
microphone. The browser turns that into live feedback, scores each exercise,
and saves a practice history per account. Not affiliated with Yamaha; the
instrument is named to say what the app works with.

## Pages

${pages}

## For machines

- [OpenAPI description](${SITE_URL}/api/openapi.json): every endpoint, including
  what needs a session. Practice data belongs to whoever practised it, so it is
  readable outside this app.
- MCP server: four read-only tools (practice summary, recent sessions, weak
  notes, course status), so an assistant can see how practice is going and give
  feedback on it. It ships in the repository and runs alongside the API.

## Source

- [Repository](https://github.com/beany-vu/e-saxophone-learning): MIT licensed.
  A clone boots with no admin account and no analytics until whoever runs it
  says otherwise.
`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
