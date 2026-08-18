import { describe, it, expect } from 'vitest'
import { nextOffset, describeOffset } from '@/lib/calibration'

describe('nextOffset', () => {
  it('changes nothing when the app already hears what you played', () => {
    expect(nextOffset(0, 72, 72)).toBe(0)
    expect(nextOffset(5, 72, 72)).toBe(5)
  })

  it('corrects the alto gap when the instrument reports the sounding note', () => {
    // You finger C5 (72), the app hears Eb4 (63): nine semitones flat.
    expect(nextOffset(0, 72, 63)).toBe(9)
  })

  it('adds to an offset already in effect rather than replacing it', () => {
    expect(nextOffset(9, 72, 71)).toBe(10)
  })

  it('corrects a plain octave error', () => {
    expect(nextOffset(0, 72, 84)).toBe(-12)
  })

  it('refuses corrections too large to be a real transposition', () => {
    expect(nextOffset(0, 72, 20)).toBe(0)
    expect(nextOffset(0, 72, 120)).toBe(0)
  })

  it('describes itself in words a player can check', () => {
    expect(describeOffset(0)).toBe('no correction')
    expect(describeOffset(9)).toBe('up 9 semitones')
    expect(describeOffset(-12)).toBe('down 1 octave')
    expect(describeOffset(12)).toBe('up 1 octave')
    expect(describeOffset(-2)).toBe('down 2 semitones')
  })
})
