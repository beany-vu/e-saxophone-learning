import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Staff from '@/components/Staff'

describe('Staff', () => {
  it('draws the five staff lines', () => {
    const { container } = render(<Staff notes={[]} />)
    // Five staff lines and nothing else when there are no notes.
    expect(container.querySelectorAll('line')).toHaveLength(5)
  })

  it('draws one note head per note', () => {
    const { container } = render(<Staff notes={[64, 67, 71]} />)
    expect(container.querySelectorAll('ellipse')).toHaveLength(3)
  })

  it('adds ledger lines only for notes outside the staff', () => {
    const inside = render(<Staff notes={[67]} />).container.querySelectorAll('line').length
    const outside = render(<Staff notes={[60]} />).container.querySelectorAll('line').length
    // Middle C adds its ledger line on top of the staff lines and the stem.
    expect(outside).toBeGreaterThan(inside)
  })

  it('shows an accidental for a black note and none for a white one', () => {
    const sharp = render(<Staff notes={[66]} />).container.textContent
    const natural = render(<Staff notes={[65]} />).container.textContent
    expect(sharp).toContain('♯')
    expect(natural).not.toContain('♯')
  })

  it('renders no title element, which React would hoist out of the SVG', () => {
    const { container } = render(<Staff notes={[64, 67]} />)
    expect(container.querySelectorAll('title')).toHaveLength(0)
  })

  it('puts the words under the notes when it has them', () => {
    const { container } = render(<Staff notes={[64, 67]} lyrics={['Twin', 'kle']} />)
    expect(container.textContent).toContain('Twin')
  })
})
