// Turning a melody into something you can hear.
//
// The timing lives here as a plain list of numbers so it can be tested without
// Web Audio, which cannot be run in a test environment. The hook that owns the
// audio does nothing but read this plan.

export type ScheduledNote = {
  midi: number
  /** Seconds from the start of the melody. */
  start: number
  /** Seconds of sound, shorter than the beat so repeated notes separate. */
  duration: number
}

export type ScheduleOptions = {
  bpm?: number
  /** Semitones to shift by, for playing the sounding pitch of a written note. */
  transpose?: number
}

// A note stops slightly before the next one begins. Without this, two of the
// same note in a row run together and sound like one long note.
const SUSTAIN = 0.85

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * When each note of a melody starts and how long it lasts.
 *
 * `beats` is optional and is ignored unless it lines up with the notes, since
 * a mismatched rhythm would silently distort the tune.
 */
export function scheduleMelody(
  notes: number[],
  beats: number[] | undefined,
  { bpm = 90, transpose = 0 }: ScheduleOptions = {},
): ScheduledNote[] {
  const secondsPerBeat = 60 / bpm
  const useBeats = beats && beats.length === notes.length ? beats : null

  let start = 0
  return notes.map((midi, i) => {
    const beat = useBeats ? useBeats[i] : 1
    const length = beat * secondsPerBeat
    const scheduled: ScheduledNote = {
      midi: midi + transpose,
      start,
      duration: length * SUSTAIN,
    }
    start += length
    return scheduled
  })
}
