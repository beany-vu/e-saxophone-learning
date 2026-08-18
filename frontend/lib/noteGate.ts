// Turns a stream of pitch readings into note on and note off events.
//
// MIDI hands you the events already: the instrument says exactly when a note
// starts and stops. A microphone gives you a fresh guess roughly every 20 ms,
// and those guesses flicker. A single frame is never trusted here. A pitch has
// to hold to start a note, and silence has to hold to end one, which is what
// separates "played a note" from "the detector wobbled for one frame".

export type GateFrame = {
  /** Detected note this frame, or null when nothing was heard. */
  note: number | null
  /** Loudness this frame, 0 to 1. */
  level: number
}

export type GateEvent =
  | { kind: 'on'; note: number; level: number }
  | { kind: 'off'; note: number }

export type GateState = {
  /** The note currently sounding, as far as the gate is concerned. */
  note: number | null
  /** A different note that is trying to take over. */
  candidate: number | null
  /** How many frames in a row the candidate has appeared. */
  candidateFrames: number
  /** How many frames in a row nothing has been heard. */
  quietFrames: number
  /** Loudest frame seen while the candidate was building, used as velocity. */
  candidateLevel: number
}

export type GateOptions = {
  /** Frames a new pitch must hold before it counts as a note. */
  attackFrames?: number
  /** Frames of silence before the sounding note is released. */
  releaseFrames?: number
}

const DEFAULTS: Required<GateOptions> = { attackFrames: 3, releaseFrames: 4 }

export function initialGate(): GateState {
  return { note: null, candidate: null, candidateFrames: 0, quietFrames: 0, candidateLevel: 0 }
}

/**
 * One frame in, the next state and any events out. Pure, so the whole timing
 * behaviour can be tested by feeding it a list of numbers.
 */
export function stepGate(
  state: GateState,
  frame: GateFrame,
  options: GateOptions = {},
): { state: GateState; events: GateEvent[] } {
  const { attackFrames, releaseFrames } = { ...DEFAULTS, ...options }
  const events: GateEvent[] = []

  // Nothing heard this frame.
  if (frame.note === null) {
    const quietFrames = state.quietFrames + 1
    // A gap also kills whatever was trying to start, so a blip either side of
    // silence does not accumulate into a note.
    const next: GateState = { ...state, quietFrames, candidate: null, candidateFrames: 0, candidateLevel: 0 }
    if (state.note !== null && quietFrames >= releaseFrames) {
      events.push({ kind: 'off', note: state.note })
      next.note = null
    }
    return { state: next, events }
  }

  // The note already sounding, still sounding: nothing to report.
  if (frame.note === state.note) {
    return {
      state: { ...state, quietFrames: 0, candidate: null, candidateFrames: 0, candidateLevel: 0 },
      events,
    }
  }

  // Something other than the sounding note. Let it prove itself first.
  const sameCandidate = frame.note === state.candidate
  const candidateFrames = sameCandidate ? state.candidateFrames + 1 : 1
  const candidateLevel = sameCandidate ? Math.max(state.candidateLevel, frame.level) : frame.level

  if (candidateFrames < attackFrames) {
    return {
      state: { ...state, quietFrames: 0, candidate: frame.note, candidateFrames, candidateLevel },
      events,
    }
  }

  // Held long enough. Slurring from one note to another gives no silence in
  // between, so the old note has to be ended here or it would stay stuck down.
  if (state.note !== null) events.push({ kind: 'off', note: state.note })
  events.push({ kind: 'on', note: frame.note, level: candidateLevel })

  return {
    state: { note: frame.note, candidate: null, candidateFrames: 0, quietFrames: 0, candidateLevel: 0 },
    events,
  }
}
