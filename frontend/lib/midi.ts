// Pure decoding of raw MIDI bytes. Kept free of React so it can be tested
// directly, and so the hook only deals with state.
//
// A MIDI message is a status byte followed by up to two data bytes:
//   status = command (high nibble) | channel (low nibble)
//   0x90 note on, 0x80 note off, 0xB0 control change

export type MidiMessage =
  | { kind: 'noteOn'; note: number; velocity: number; channel: number }
  | { kind: 'noteOff'; note: number; velocity: number; channel: number }
  | { kind: 'breath'; value: number; channel: number }

export const CC_BREATH = 2
// What the YDS-120 actually sends while you blow. Its MIDI implementation
// chart transmits CC 1, 5, 6, 11, 38, 65, 100 and 101, and no CC2 at all, so
// a breath meter listening only to CC2 never moves on this instrument.
export const CC_EXPRESSION = 11

// The DOM types allow a null payload on MIDIMessageEvent, so accept it here
// rather than making every caller guard.
export function parseMidiMessage(data: Uint8Array | null): MidiMessage | null {
  if (!data || data.length < 3) return null

  const status = data[0]
  const command = status & 0xf0
  const channel = status & 0x0f
  const data1 = data[1]
  const data2 = data[2]

  if (command === 0x90 && data2 > 0) {
    return { kind: 'noteOn', note: data1, velocity: data2, channel }
  }

  // An instrument may signal note off either way. Treating only 0x80 as note
  // off would leave keys stuck down.
  if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    return { kind: 'noteOff', note: data1, velocity: data2, channel }
  }

  if (command === 0xb0 && (data1 === CC_BREATH || data1 === CC_EXPRESSION)) {
    return { kind: 'breath', value: data2, channel }
  }

  return null
}

export type MidiDevice = { id: string; name: string; manufacturer: string }

type MidiInputLike = { id: string; name?: string | null; manufacturer?: string | null }
type MidiAccessLike = { inputs: { forEach(cb: (input: MidiInputLike) => void): void } }

/**
 * Snapshot of the currently attached MIDI inputs.
 *
 * Windows drivers sometimes report a port with null name or manufacturer, so
 * both are defaulted rather than rendered as "null".
 */
export function listInputs(access: MidiAccessLike): MidiDevice[] {
  const devices: MidiDevice[] = []
  access.inputs.forEach((input) => {
    devices.push({
      id: input.id,
      name: input.name || 'unnamed device',
      manufacturer: input.manufacturer || '',
    })
  })
  return devices
}
