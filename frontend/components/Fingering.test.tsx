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

describe('the compact fingering under a note', () => {
  it('drops the labels, which are unreadable at thumbnail size', () => {
    const { container } = render(<Fingering keys={fingeringFor(67)!.keys} size={40} compact />)
    expect(container.querySelectorAll('text')).toHaveLength(0)
  })

  it('still draws every key, so the shape is the same one you learned', () => {
    const full = render(<Fingering keys={fingeringFor(67)!.keys} />).container
    const small = render(<Fingering keys={fingeringFor(67)!.keys} compact />).container
    expect(small.querySelectorAll('circle')).toHaveLength(full.querySelectorAll('circle').length)
    expect(small.querySelectorAll('g[data-pressed="true"]')).toHaveLength(3)
  })

  it('keeps its accessible name, since the labels are gone', () => {
    const { container } = render(<Fingering keys={fingeringFor(67)!.keys} compact />)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('1')
  })
})
