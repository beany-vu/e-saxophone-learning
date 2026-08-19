import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Analytics from '@/components/Analytics'

describe('Google Analytics', () => {
  it('loads the tag when a measurement id is configured', () => {
    const { container } = render(<Analytics id="G-ABC123XYZ" />)
    // React 19 hoists a <script src> into the head and loads it once, which is
    // the whole reason this component does not need next/script.
    const loader = document.querySelector('head script[src*="googletagmanager"]')
    expect(loader?.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ',
    )
    // The inline configuration stays where it was written.
    expect(container.innerHTML).toContain("'config', 'G-ABC123XYZ'")
  })

  // Local development and anyone running their own copy have no measurement
  // id. That has to mean no tag at all, not a broken one that 404s on every
  // page load.
  it('renders nothing at all when there is no id', () => {
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove())
    const { container } = render(<Analytics id="" />)
    expect(container.innerHTML).toBe('')
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
  })

  it('renders nothing when the id is only whitespace', () => {
    const { container } = render(<Analytics id="   " />)
    expect(container.innerHTML).toBe('')
  })

  // The id lands inside an inline script, so anything that is not a real
  // measurement id is refused rather than pasted into executable source.
  it('refuses an id that is not a GA4 measurement id', () => {
    const nasty = render(<Analytics id="G-X'); alert(1); //" />)
    expect(nasty.container.innerHTML).toBe('')

    const wrongShape = render(<Analytics id="UA-12345-1" />)
    expect(wrongShape.container.innerHTML).toBe('')
  })
})
