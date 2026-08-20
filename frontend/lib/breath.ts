// Judging the air behind a note, not just which note it was.
//
// You can finger a whole scale correctly on feeble air and the note scoring
// will give you full marks, which is exactly the habit a beginner needs
// breaking. This module looks at what happened *during* each note and says
// whether it was properly supported.
//
// The hard part is that loudness on its own means nothing. Leaning closer to
// the laptop doubles the level without you blowing any harder, so an absolute
// "too quiet" threshold would nag the wrong people. Everything below is
// therefore measured against the note itself: how much of its own opening
// level it kept, how much it wandered, and whether its pitch sagged. Those are
// unaffected by where you are sitting. The one absolute test needs a baseline
// recorded from your own playing, and stays switched off until it has one.

export type BreathFrame = {
  /** Loudness this frame, 0 to 1. */
  level: number
  /** Cents from the nearest semitone, or null when no pitch was found. */
  cents: number | null
  /** How periodic the waveform was, 0 to 1, when the detector reported it. */
  clarity?: number
}

export type BreathVerdict =
  | 'unknown' // too short to have an opinion about
  | 'steady' // supported all the way through
  | 'fading' // ran out towards the end, but stayed in tune
  | 'unsteady' // the air stream jitters
  | 'weak' // not enough air behind it

export type BreathReport = {
  verdict: BreathVerdict
  /** Mean loudness across the note. */
  level: number
  /** Share of the opening level still there at the end. 1 is no sag at all. */
  sustain: number
  /** Frame to frame jitter, as a share of the mean level. 0 is rock steady. */
  wobble: number
  /** Cents moved from the start of the note to the end. Negative is flatter. */
  drift: number | null
  /** Mean clarity, when the detector supplied it. */
  clarity: number | null
  /** How many frames the note lasted. */
  frames: number
}

export type BreathOptions = {
  /** Frames a note must last before it is worth judging. */
  minFrames?: number
  /** Below this share of the opening level, the note is sagging. */
  sustainFloor?: number
  /** Above this much jitter, the air stream is unsteady. */
  wobbleCeiling?: number
  /** Cents of flattening that turns a sag into a support problem. */
  flatBy?: number
  /** Your usual level, from `breathBaseline`. Omit to skip the absolute test. */
  reference?: number
  /** Share of the baseline below which a note counts as under-blown. */
  quietBelow?: number
}

// Starting points, not laws. They are options so a player whose setup reads
// differently can tighten or loosen them without touching this file.
const DEFAULTS: Required<Omit<BreathOptions, 'reference'>> = {
  // Six frames is roughly a tenth of a second. Shorter than that is a grace
  // note or a squeak, and its shape says nothing about breath support.
  minFrames: 6,
  // Losing a third of the level over a long tone is audible; losing a fifth
  // is not worth a message.
  sustainFloor: 0.6,
  wobbleCeiling: 0.15,
  // Under-supported playing goes flat. An eighth of a semitone is past what
  // a listener would forgive.
  flatBy: -12,
  quietBelow: 0.45,
}

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

/**
 * What the air did during one note.
 *
 * Feed it every frame between the note starting and stopping. Pure, so the
 * whole judgement can be tested by handing it a list of numbers.
 */
export function analyseBreath(frames: BreathFrame[], options: BreathOptions = {}): BreathReport {
  const { minFrames, sustainFloor, wobbleCeiling, flatBy, quietBelow, reference } = {
    ...DEFAULTS,
    ...options,
  }

  const levels = frames.map((f) => f.level)
  const level = mean(levels)
  const clarities = frames.map((f) => f.clarity).filter((c): c is number => typeof c === 'number')

  const empty: BreathReport = {
    verdict: 'unknown',
    level,
    sustain: 1,
    wobble: 0,
    drift: null,
    clarity: clarities.length ? mean(clarities) : null,
    frames: frames.length,
  }
  if (frames.length < minFrames) return empty

  // The opening and closing thirds. Comparing thirds rather than single frames
  // means one loud attack transient cannot decide the whole verdict.
  const third = Math.max(1, Math.floor(frames.length / 3))
  const head = frames.slice(0, third)
  const tail = frames.slice(-third)

  const headLevel = mean(head.map((f) => f.level))
  const sustain = headLevel > 0 ? mean(tail.map((f) => f.level)) / headLevel : 1

  // Jitter is measured frame to frame, not as a spread around the average. A
  // smooth diminuendo has a wide spread but tiny steps, and calling that
  // unsteady would be wrong. A wobbling air stream has large steps.
  let steps = 0
  for (let i = 1; i < levels.length; i++) steps += Math.abs(levels[i] - levels[i - 1])
  const wobble = level > 0 ? steps / (levels.length - 1) / level : 0

  const headCents = head.map((f) => f.cents).filter((c): c is number => c !== null)
  const tailCents = tail.map((f) => f.cents).filter((c): c is number => c !== null)
  const drift =
    headCents.length && tailCents.length ? mean(tailCents) - mean(headCents) : null

  const report: BreathReport = {
    ...empty,
    sustain,
    wobble,
    drift,
    frames: frames.length,
    verdict: 'steady',
  }

  // Quiet all the way through, compared with how you normally play. Only ever
  // reached once a baseline exists.
  if (reference !== undefined && reference > 0 && level < reference * quietBelow) {
    return { ...report, verdict: 'weak' }
  }
  // Quieter *and* flatter is the signature of running out of air. Quieter on
  // its own is a diminuendo, which is a thing people do on purpose.
  if (sustain < sustainFloor && drift !== null && drift <= flatBy) {
    return { ...report, verdict: 'weak' }
  }
  if (sustain < sustainFloor) return { ...report, verdict: 'fading' }
  if (wobble > wobbleCeiling) return { ...report, verdict: 'unsteady' }
  return report
}

/**
 * Your usual playing level, from the notes of a session.
 *
 * The middle value rather than the average, so one accidental blast or one
 * note that barely spoke cannot drag the baseline everything else is judged
 * against. Silence is not a note and is dropped first.
 */
export function breathBaseline(levels: number[]): number | null {
  const played = levels.filter((l) => l > 0).sort((a, b) => a - b)
  if (played.length === 0) return null
  const middle = Math.floor(played.length / 2)
  return played.length % 2 === 1 ? played[middle] : (played[middle - 1] + played[middle]) / 2
}
