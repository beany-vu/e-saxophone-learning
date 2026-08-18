// Pitch detection from raw microphone audio. Pure maths, no Web Audio and no
// React, so every rule below is testable without a browser or a saxophone.
//
// The method is the normalised square difference function (NSDF), the core of
// the McLeod pitch method. Plain autocorrelation is easy to write but octave
// errors are its whole reputation, and a saxophone is exactly the harmonic-rich
// signal that triggers them. NSDF normalises each lag by the energy actually
// compared at that lag, which keeps the peaks comparable.

export type PitchOptions = {
  /** Lowest pitch we will report. Below the sax range, deliberately. */
  minFreq?: number
  /** Highest pitch we will report. Above it we assume a harmonic or noise. */
  maxFreq?: number
  /** Loudness below this counts as silence and is never analysed. */
  levelGate?: number
  /** How periodic the window must be, 0 to 1. Rejects breath and room noise. */
  clarity?: number
}

const DEFAULTS: Required<PitchOptions> = {
  minFreq: 65,
  maxFreq: 1600,
  levelGate: 0.01,
  clarity: 0.55,
}

/** Loudness of a window, 0 for silence and 1 for a full-scale square wave. */
export function rms(buffer: Float32Array): number {
  if (buffer.length === 0) return 0
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

/** 440 Hz -> 69. Rounded, so a note a little flat still gets the right name. */
export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440))
}

/** How far off the nearest semitone, in cents. 100 cents is one semitone. */
export function centsOff(freq: number, midi: number): number {
  const exact = 440 * Math.pow(2, (midi - 69) / 12)
  return Math.round(1200 * Math.log2(freq / exact))
}

/** Loudness to a MIDI velocity. Square root, because loudness is not linear. */
export function levelToVelocity(level: number): number {
  return Math.round(127 * Math.min(1, Math.sqrt(Math.max(0, level))))
}

/**
 * The fundamental frequency of a window of audio, or null when there is no
 * note: too quiet, or too noisy to be a pitch at all.
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  options: PitchOptions = {},
): number | null {
  const { minFreq, maxFreq, levelGate, clarity } = { ...DEFAULTS, ...options }

  if (rms(buffer) < levelGate) return null

  const n = buffer.length
  // Remove the DC offset first. Some capture chains add one, and it would sit
  // in every lag of the correlation as a constant, flattening the peaks.
  let mean = 0
  for (let i = 0; i < n; i++) mean += buffer[i]
  mean /= n
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = buffer[i] - mean

  const maxLag = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2))
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq))
  if (maxLag <= minLag) return null

  // nsdf[lag] is 1 when the window repeats itself exactly after that many
  // samples, and 0 or negative when it does not.
  const nsdf = new Float32Array(maxLag + 1)
  for (let lag = 0; lag <= maxLag; lag++) {
    let correlation = 0
    let energy = 0
    for (let i = 0; i + lag < n; i++) {
      correlation += x[i] * x[i + lag]
      energy += x[i] * x[i] + x[i + lag] * x[i + lag]
    }
    nsdf[lag] = energy > 0 ? (2 * correlation) / energy : 0
  }

  // Every window correlates with itself at lag 0, so skip that first hump
  // entirely and only start looking once the curve has gone negative.
  let i = 1
  while (i <= maxLag && nsdf[i] > 0) i++

  // The highest point of each positive region is a period candidate.
  const peaks: { lag: number; value: number }[] = []
  while (i <= maxLag) {
    if (nsdf[i] <= 0) {
      i++
      continue
    }
    let best = i
    while (i <= maxLag && nsdf[i] > 0) {
      if (nsdf[i] > nsdf[best]) best = i
      i++
    }
    if (best >= minLag) peaks.push({ lag: best, value: nsdf[best] })
  }
  if (peaks.length === 0) return null

  // Take the EARLIEST peak that is nearly as tall as the tallest, not the
  // tallest itself. A periodic signal repeats at twice its period too, so the
  // tallest peak is often at 2T, which would report an octave too low.
  const tallest = peaks.reduce((a, b) => (b.value > a.value ? b : a))
  const threshold = 0.9 * tallest.value
  const chosen = peaks.find((p) => p.value >= threshold) || tallest
  if (chosen.value < clarity) return null

  // The true peak sits between samples. Fit a parabola through the three
  // points around it, otherwise the pitch quantises into steps that get
  // coarse at the top of the range.
  let lag = chosen.lag
  const y0 = nsdf[lag - 1] ?? 0
  const y1 = nsdf[lag]
  const y2 = nsdf[lag + 1] ?? 0
  const denominator = y0 - 2 * y1 + y2
  if (denominator !== 0) lag += (0.5 * (y0 - y2)) / denominator

  const freq = sampleRate / lag
  if (freq < minFreq || freq > maxFreq) return null
  return freq
}
