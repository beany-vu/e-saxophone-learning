import { describe, it, expect } from 'vitest'
import { rms, detectPitch, freqToMidi, centsOff, levelToVelocity } from '@/lib/pitch'

const SAMPLE_RATE = 44100

/** A pure tone, optionally with harmonics, the way a reed instrument sounds. */
function tone(freq: number, opts: { harmonics?: number[]; amp?: number; length?: number } = {}) {
  const { harmonics = [1], amp = 0.5, length = 2048 } = opts
  const buf = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let v = 0
    harmonics.forEach((h, n) => {
      v += h * Math.sin((2 * Math.PI * freq * (n + 1) * i) / SAMPLE_RATE)
    })
    buf[i] = amp * v
  }
  return buf
}

describe('rms', () => {
  it('is zero for silence', () => {
    expect(rms(new Float32Array(512))).toBe(0)
  })

  it('grows with amplitude', () => {
    expect(rms(tone(440, { amp: 0.5 }))).toBeGreaterThan(rms(tone(440, { amp: 0.1 })))
  })
})

describe('freqToMidi', () => {
  it('maps A440 to MIDI 69', () => {
    expect(freqToMidi(440)).toBe(69)
  })

  it('maps an octave up to 12 semitones up', () => {
    expect(freqToMidi(880)).toBe(81)
  })

  it('rounds to the nearest semitone, so a slightly flat note still names right', () => {
    expect(freqToMidi(437)).toBe(69)
  })
})

describe('centsOff', () => {
  it('is zero when perfectly in tune', () => {
    expect(centsOff(440, 69)).toBe(0)
  })

  it('is negative when flat and positive when sharp', () => {
    expect(centsOff(437, 69)).toBeLessThan(0)
    expect(centsOff(443, 69)).toBeGreaterThan(0)
  })
})

describe('detectPitch', () => {
  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(2048), SAMPLE_RATE)).toBeNull()
  })

  it('returns null for noise with no periodicity', () => {
    const noise = new Float32Array(2048)
    // Deterministic pseudo-noise, so the test cannot flake.
    let seed = 1
    for (let i = 0; i < noise.length; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648
      noise[i] = (seed / 2147483648) * 2 - 1
    }
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull()
  })

  it.each([
    ['A4', 440],
    ['C5', 523.25],
    ['G4', 392],
    ['D5', 587.33],
  ])('finds %s within a few cents', (_name, freq) => {
    const found = detectPitch(tone(freq), SAMPLE_RATE)
    expect(found).not.toBeNull()
    expect(Math.abs((found as number) - freq)).toBeLessThan(freq * 0.01)
  })

  it('does not jump an octave on a harmonic-rich tone, which is how a sax sounds', () => {
    // Strong second and third harmonics: the classic octave-error trap.
    const sax = tone(466.16, { harmonics: [1, 0.8, 0.6, 0.4] }) // Bb4
    const found = detectPitch(sax, SAMPLE_RATE)
    expect(found).not.toBeNull()
    expect(freqToMidi(found as number)).toBe(70)
  })

  it('ignores a tone quieter than the level gate', () => {
    expect(detectPitch(tone(440, { amp: 0.002 }), SAMPLE_RATE)).toBeNull()
  })
})

describe('levelToVelocity', () => {
  it('is 0 at silence and 127 at full scale', () => {
    expect(levelToVelocity(0)).toBe(0)
    expect(levelToVelocity(1)).toBe(127)
  })

  it('never exceeds the MIDI range', () => {
    expect(levelToVelocity(5)).toBe(127)
  })

  it('rises with loudness', () => {
    expect(levelToVelocity(0.3)).toBeGreaterThan(levelToVelocity(0.05))
  })
})
