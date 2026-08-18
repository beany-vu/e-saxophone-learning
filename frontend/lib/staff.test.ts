import { describe, it, expect } from 'vitest'
import { staffNote, STAFF_TOP, STAFF_BOTTOM } from '@/lib/staff'

describe('staffNote', () => {
  it('puts E4 on the bottom line of the treble staff', () => {
    expect(staffNote(64).step).toBe(0)
  })

  it('puts F5 on the top line', () => {
    expect(staffNote(77).step).toBe(8)
  })

  it('puts G4 on the second line, the one the clef curls around', () => {
    expect(staffNote(67).step).toBe(2)
  })

  it('puts B4 on the middle line', () => {
    expect(staffNote(71).step).toBe(4)
  })

  it('counts by letter, not by semitone, so a sharp sits on its natural line', () => {
    expect(staffNote(66).step).toBe(staffNote(65).step) // F#4 sits where F4 sits
    expect(staffNote(66).accidental).toBe('#')
    expect(staffNote(65).accidental).toBeNull()
  })

  it('spells the black notes the way the instrument labels its keys', () => {
    expect(staffNote(70).accidental).toBe('b') // Bb4, not A#4
    expect(staffNote(63).accidental).toBe('b') // Eb4
    expect(staffNote(61).accidental).toBe('#') // C#4
  })

  it('gives middle C its ledger line below the staff', () => {
    const c4 = staffNote(60)
    expect(c4.step).toBe(-2)
    expect(c4.ledgerLines).toEqual([-2])
  })

  it('stacks ledger lines down to the low notes', () => {
    expect(staffNote(57).ledgerLines).toEqual([-2, -4]) // A3
    expect(staffNote(58).ledgerLines).toEqual([-2]) // Bb3 hangs below the first
  })

  it('stacks ledger lines above the staff too', () => {
    expect(staffNote(84).ledgerLines).toEqual([10, 12]) // C6
    expect(staffNote(81).ledgerLines).toEqual([10]) // A5
  })

  it('needs no ledger lines inside the staff', () => {
    for (let midi = 64; midi <= 77; midi++) {
      expect(staffNote(midi).ledgerLines, `${midi}`).toEqual([])
    }
  })

  it('knows the staff bounds so a drawing can size itself', () => {
    expect(STAFF_BOTTOM).toBe(0)
    expect(STAFF_TOP).toBe(8)
  })
})
