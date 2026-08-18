import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Fingering from '@/components/Fingering'
import { fingeringFor } from '@/lib/fingerings'

describe('Fingering', () => {
  // React 19 hoists <title> to the document head as page metadata. An SVG
  // <title> child therefore renders differently on the server and on the
  // client, which is a hydration error, and it also fights the real page
  // title. The accessible name goes in attributes instead.
  it('renders no title element, which would be hoisted out of the SVG', () => {
    const { container } = render(<Fingering keys={fingeringFor(67)!.keys} />)
    expect(container.querySelectorAll('title')).toHaveLength(0)
  })

  it('still names itself and every key for a screen reader', () => {
    const { container } = render(<Fingering keys={fingeringFor(67)!.keys} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toContain('1')
    const labelled = container.querySelectorAll('g[aria-label]')
    expect(labelled.length).toBeGreaterThan(10)
  })

  it('marks exactly the pressed keys, and no others', () => {
    const { container } = render(<Fingering keys={['lh1', 'lh2', 'lh3']} />)
    const pressed = container.querySelectorAll('g[data-pressed="true"]')
    expect(pressed).toHaveLength(3)
  })

  it('says so when nothing is pressed, rather than looking broken', () => {
    const { container } = render(<Fingering keys={[]} />)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('No keys pressed')
    expect(container.querySelectorAll('g[data-pressed="true"]')).toHaveLength(0)
  })
})
