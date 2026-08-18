import { describe, expect, it } from 'vitest'
import { listInputs, parseMidiMessage } from './midi'

/** Helper so the tests read like MIDI rather than like byte arrays. */
const bytes = (...b: number[]) => new Uint8Array(b)

describe('parseMidiMessage', () => {
  it('reads a note on', () => {
    expect(parseMidiMessage(bytes(0x90, 60, 100))).toEqual({
      kind: 'noteOn',
      note: 60,
      velocity: 100,
      channel: 0,
    })
  })

  it('reads a note off', () => {
    expect(parseMidiMessage(bytes(0x80, 60, 0))).toEqual({
      kind: 'noteOff',
      note: 60,
      velocity: 0,
      channel: 0,
    })
  })

  it('treats note on with velocity 0 as a note off', () => {
    // Many instruments never send 0x80 at all, they send 0x90 with velocity 0.
    // Getting this wrong leaves keys stuck down forever.
    expect(parseMidiMessage(bytes(0x90, 60, 0))).toMatchObject({
      kind: 'noteOff',
      note: 60,
    })
  })

  it('keeps the channel from the low nibble of the status byte', () => {
    expect(parseMidiMessage(bytes(0x93, 64, 80))).toMatchObject({ kind: 'noteOn', channel: 3 })
    expect(parseMidiMessage(bytes(0x8f, 64, 0))).toMatchObject({ kind: 'noteOff', channel: 15 })
  })

  it('reads breath control as CC2', () => {
    expect(parseMidiMessage(bytes(0xb0, 2, 90))).toEqual({
      kind: 'breath',
      value: 90,
      channel: 0,
    })
  })

  it('ignores controllers that are not breath', () => {
    expect(parseMidiMessage(bytes(0xb0, 7, 90))).toBeNull()
  })

  it('ignores messages it does not handle', () => {
    expect(parseMidiMessage(bytes(0xe0, 0, 64))).toBeNull() // pitch bend
    expect(parseMidiMessage(bytes(0xf8))).toBeNull() // clock tick
  })

  it('ignores a null payload, which the DOM type allows', () => {
    expect(parseMidiMessage(null)).toBeNull()
  })

  it('ignores short or empty messages instead of throwing', () => {
    expect(parseMidiMessage(bytes())).toBeNull()
    expect(parseMidiMessage(bytes(0x90))).toBeNull()
    expect(parseMidiMessage(bytes(0x90, 60))).toBeNull()
  })
})

describe('listInputs', () => {
  const fakeAccess = (inputs: unknown[]) => ({
    inputs: { forEach: (cb: (i: never) => void) => inputs.forEach(cb as never) },
  })

  it('returns nothing when no device is attached', () => {
    expect(listInputs(fakeAccess([]))).toEqual([])
  })

  it('maps a device to id, name and manufacturer', () => {
    const got = listInputs(
      fakeAccess([{ id: 'in-1', name: 'Digital Saxophone', manufacturer: 'Yamaha' }]),
    )
    expect(got).toEqual([{ id: 'in-1', name: 'Digital Saxophone', manufacturer: 'Yamaha' }])
  })

  it('falls back when the driver reports no name', () => {
    // Windows MIDI drivers sometimes expose a port with null metadata.
    const got = listInputs(fakeAccess([{ id: 'in-2', name: null, manufacturer: null }]))
    expect(got).toEqual([{ id: 'in-2', name: 'unnamed device', manufacturer: '' }])
  })

  it('lists every attached device', () => {
    const got = listInputs(
      fakeAccess([
        { id: 'a', name: 'A', manufacturer: 'x' },
        { id: 'b', name: 'B', manufacturer: 'y' },
      ]),
    )
    expect(got.map((d) => d.id)).toEqual(['a', 'b'])
  })
})

describe('breath and expression', () => {
  // The YDS-120 MIDI implementation chart lists the control changes it
  // transmits: 1, 5, 6, 11, 38, 65, 100 and 101. CC2 is NOT among them, so
  // treating CC2 as the only breath source leaves the meter dead forever.
  // CC11 (expression) is what the instrument sends while you blow.
  it('reads CC11 expression as breath', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 11, 90]))).toEqual({
      kind: 'breath',
      value: 90,
      channel: 0,
    })
  })

  it('still reads CC2 breath, which other wind controllers do send', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 2, 64]))).toEqual({
      kind: 'breath',
      value: 64,
      channel: 0,
    })
  })

  it('ignores control changes we have no use for', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 1, 40]))).toBeNull() // modulation
    expect(parseMidiMessage(new Uint8Array([0xb0, 65, 127]))).toBeNull() // portamento
  })
})
