// A twenty week course, dated from whenever each learner starts.
//
// The target is specific: read notation well enough to work out a pop ballad,
// and play one. Everything here is ordered so that each week only needs what
// the weeks before it built. Research says an adult beginner practising 20 to
// 30 minutes most days plays simple tunes inside two months, so this plan
// spends the first two on sound and the last two on the song itself.
//
// Days off are assumed. The weeks are containers, not deadlines: fall behind
// and you repeat a week, which is what a teacher would do anyway.

export type CourseWeek = {
  week: number
  title: string
  /** What this week is actually about. */
  focus: string
  /** How you know the week worked, checkable without a teacher. */
  goal: string
  /** Practice item ids from lib/curriculum.ts. */
  items: string[]
  /** The one thing most likely to go wrong this week. */
  watch?: string
}

export type CoursePhase = {
  id: string
  title: string
  about: string
  weeks: number[]
}

/**
 * Where the course starts for someone who has not said. It was a constant
 * once, which was fine for one learner and wrong the moment there were two:
 * everybody would have been marched through the same calendar regardless of
 * when they picked up the instrument.
 */
export const DEFAULT_START = '2026-08-19'

const DAY = 24 * 60 * 60 * 1000

/** Parses a yyyy-mm-dd date as a local calendar date, never as UTC. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Adds calendar days, not milliseconds.
 *
 * Adding `days * 86400000` looks equivalent and is not: in a timezone that
 * puts its clocks back, the sum lands an hour earlier and can fall on the
 * previous date. The server runs in UTC and has no such change, so the two
 * disagreed by a day and React reported a hydration error. Passing an
 * overflowing day number to the Date constructor keeps it on local midnight
 * whatever the clocks do in between.
 */
function addDays(iso: string, days: number): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, (d || 1) + days)
}

/**
 * Whole days between two calendar dates. Compared as UTC instants built from
 * local calendar parts, because UTC has no daylight saving and the difference
 * is therefore an exact number of days.
 */
function daysBetween(fromISO: string, to: Date): number {
  const [y, m, d] = fromISO.split('-').map(Number)
  const from = Date.UTC(y, (m || 1) - 1, d || 1)
  const until = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((until - from) / DAY)
}

/** The dates week `n` covers for a learner who began on `startDate`. */
export function weekDates(
  week: number,
  startDate: string = DEFAULT_START,
): { start: string; end: string } {
  const offset = (week - 1) * 7
  return { start: toISO(addDays(startDate, offset)), end: toISO(addDays(startDate, offset + 6)) }
}

/** The day after the last week ends, which is when the course is finished. */
export function finishDate(startDate: string = DEFAULT_START): string {
  return weekDates(COURSE.length, startDate).end
}

export type Pace = {
  /** How many weeks of material each calendar week has to carry. */
  weeksPerWeek: number
  verdict: 'relaxed' | 'steady' | 'rushed'
}

/**
 * Whether a chosen finish date leaves enough room for the material. The course
 * is twenty weeks of content; a learner is free to want it sooner, and should
 * be told what that means rather than quietly given an impossible plan.
 */
export function pace(startDate: string, targetEnd: string): Pace {
  const days = daysBetween(startDate, parseDate(targetEnd))
  if (days <= 0) return { weeksPerWeek: 1, verdict: 'steady' }
  const availableWeeks = days / 7
  const weeksPerWeek = COURSE.length / availableWeeks
  if (weeksPerWeek > 1.25) return { weeksPerWeek, verdict: 'rushed' }
  if (weeksPerWeek < 0.75) return { weeksPerWeek, verdict: 'relaxed' }
  return { weeksPerWeek, verdict: 'steady' }
}

/**
 * Which week a date falls in, or null when it is outside the course.
 *
 * Compared as calendar dates in the learner's own timezone. Using UTC meant
 * that for anyone east of it, the early hours of each day belonged to
 * yesterday, and on day one that made the whole course look unstarted.
 */
export function weekFor(date: Date, startDate: string = DEFAULT_START): CourseWeek | null {
  const days = daysBetween(startDate, date)
  if (days < 0) return null
  const week = Math.floor(days / 7) + 1
  return COURSE.find((w) => w.week === week) ?? null
}

/**
 * How the week you are working on compares with the calendar. One week either
 * side counts as on track: the plan has days off in it by design, and a course
 * that calls you behind for taking a Sunday off is a course you stop opening.
 */
export function weekStatus(working: number, calendar: number): 'ahead' | 'on track' | 'behind' {
  const diff = working - calendar
  if (diff > 1) return 'ahead'
  if (diff < -1) return 'behind'
  return 'on track'
}

export const COURSE: CourseWeek[] = [
  {
    week: 1,
    title: 'Making a steady sound',
    focus:
      'Getting a note to come out the same way twice. Mouthpiece in about a centimetre, lower lip cushioning your teeth, and steady air. Nothing else matters yet.',
    goal: 'Hold G, A, B, C and D for eight slow counts each with the loudness meter staying flat.',
    items: ['long-tones', 'first-five'],
    watch: 'Biting the mouthpiece. If your bottom lip hurts, you are pressing, not blowing.',
  },
  {
    week: 2,
    title: 'Five notes under the fingers',
    focus:
      'The five notes that need no little finger and no octave key, until they need no thinking. Then a tune made only of them.',
    goal: 'Play First five notes at 90 bpm without looking at the fingering chart.',
    items: ['first-five', 'long-tones', 'twinkle'],
  },
  {
    week: 3,
    title: 'The octave key',
    focus:
      'The same fingerings an octave up. Your left thumb does the work and nothing else moves.',
    goal: 'Octave slurs clean in both directions, no cracked notes, and Ode to Joy start to finish.',
    items: ['octave-jumps', 'ode-to-joy', 'long-tones'],
    watch: 'The thumb must arrive with the air, not after it. Late thumb is what cracks a note.',
  },
  {
    week: 4,
    title: 'Down to the bottom',
    focus:
      'The low register, which needs slower, warmer air and a relaxed throat. This is where tension shows up first.',
    goal: 'Low D, C, B and Bb all speak on the first attempt, three times out of four.',
    items: ['low-register', 'long-tones', 'twinkle'],
    watch: 'Blowing harder makes low notes worse. Blow warmer and slower instead.',
  },
  {
    week: 5,
    title: 'Reading the staff',
    focus:
      'Where notes live on the page. Turn on Show music and read the note before you play it, rather than reading the letter name.',
    goal: 'Name any note on the staff between low C and high C in under three seconds.',
    items: ['reading-five', 'happy-birthday', 'octave-jumps'],
  },
  {
    week: 6,
    title: 'A scale worth having',
    focus:
      'C major across two octaves, up and down, evenly. This is the skeleton every other key hangs on.',
    goal: 'Two octaves of C major at 80 bpm, even notes, no hesitation at the octave key.',
    items: ['c-major-two-octaves', 'happy-birthday'],
  },
  {
    week: 7,
    title: 'Rhythm you can count',
    focus:
      'Counting out loud while you play. Listen first to each tune at a slow tempo, clap the rhythm, then play it.',
    goal: 'Play Happy Birthday with the long notes actually held long, against a metronome at 80.',
    items: ['rhythm-basics', 'happy-birthday', 'twinkle'],
    watch: 'The app scores which note, never when. Rhythm is on you, so count out loud.',
  },
  {
    week: 8,
    title: 'Bb and the bis key',
    focus:
      'The first accidental you will meet everywhere, and the three ways to play it. Bis for scales, side Bb for leaps.',
    goal: 'F major up and down at 80 bpm, and Bb reachable without stopping to think which fingering.',
    items: ['f-major', 'chromatic-crawl'],
  },
  {
    week: 9,
    title: 'F# and the second key',
    focus:
      'The other accidental that turns up constantly. Same idea: one main fingering, one alternate for awkward corners.',
    goal: 'G major and D major up and down, without hesitating on F# or C#.',
    items: ['g-major', 'd-major', 'saints'],
  },
  {
    week: 10,
    title: 'Tonguing',
    focus:
      'Separating notes with the tongue instead of the breath. Say "tu" against the reed tip. Then play the same tune slurred and tongued.',
    goal: 'When the Saints, once fully slurred and once fully tongued, and they sound different.',
    items: ['tonguing', 'saints'],
    watch: 'The air never stops while you tongue. The tongue interrupts it, the lungs do not.',
  },
  {
    week: 11,
    title: 'Longer lines, one phrase at a time',
    focus:
      'Using the phrase buttons: learn one line, then the next, then join them. This is how every long piece gets learned.',
    goal: 'Frere Jacques whole, from notation rather than from letter names.',
    items: ['frere-jacques', 'arpeggios'],
  },
  {
    week: 12,
    title: 'Breath control and long phrases',
    focus:
      'Where to breathe, and holding a line steady to its end. Amazing Grace exists for this.',
    goal: 'Play Amazing Grace with breaths planned in the same places every time.',
    items: ['long-phrase', 'amazing-grace'],
  },
  {
    week: 13,
    title: 'Your song, typed in',
    focus:
      'Find sheet music for the song you want. Type it into Your own melodies, one line per phrase. Tick concert pitch if it is a piano or vocal part.',
    goal: 'The song is in the app, split into phrases, and the Listen button plays something recognisable.',
    items: ['amazing-grace'],
    watch: 'If it sounds wrong by a fixed amount, the concert pitch box is the reason.',
  },
  {
    week: 14,
    title: 'The first half',
    focus:
      'Verse and pre-chorus, phrase by phrase, slowly. Listen first, play it, repeat the phrase until it is boring.',
    goal: 'The first half at half speed with no wrong notes.',
    items: ['long-tones', 'f-major'],
  },
  {
    week: 15,
    title: 'The second half',
    focus: 'The chorus, the same way. Then join it to the first half.',
    goal: 'The whole song at half speed, start to finish, without stopping.',
    items: ['long-tones', 'g-major'],
  },
  {
    week: 16,
    title: 'Up to tempo',
    focus:
      'Raise the tempo five bpm at a time. The moment mistakes appear, drop back ten and stay there.',
    goal: 'The whole song at something close to the real tempo.',
    items: ['long-tones', 'arpeggios'],
    watch: 'Practising it fast and wrong teaches it wrong. Slow and right is faster in the end.',
  },
  {
    week: 17,
    title: 'Making it sound like music',
    focus:
      'Dynamics and shape. Louder into the top of a phrase, softer at the end. Long notes get vibrato only if you want it.',
    goal: 'Two different takes that clearly sound different from each other.',
    items: ['dynamics', 'long-tones'],
  },
  {
    week: 18,
    title: 'Weak spots',
    focus:
      'Look at the Progress heatmap for the notes you avoid and drill those specifically. Record yourself and listen back, which is unpleasant and effective.',
    goal: 'The three worst bars are no longer the three worst bars.',
    items: ['awkward-corners', 'arpeggios', 'c-major-two-octaves'],
  },
  {
    week: 19,
    title: 'Spare week',
    focus:
      'Deliberately empty. Days off happen, and a plan with no slack in it is a plan you abandon in November. Use it to repeat whichever week went worst, or to rest.',
    goal: 'Back on the week you should be on, or genuinely rested. Both count.',
    items: [],
  },
  {
    week: 20,
    title: 'Play it for someone',
    focus:
      'Play it start to finish, for a person, on purpose. Then start the other song, which will take days now rather than weeks.',
    goal: 'One complete performance, on or before 31 December, of the song you set out to play on 19 August.',
    items: ['long-tones'],
  },
]

export const PHASES: CoursePhase[] = [
  {
    id: 'sound',
    title: 'Phase 1: sound',
    about: 'Getting a reliable note out of the instrument. No music yet, and that is fine.',
    weeks: [1, 2, 3, 4],
  },
  {
    id: 'reading',
    title: 'Phase 2: reading and range',
    about: 'The staff, the full range, and the scale everything else is built on.',
    weeks: [5, 6, 7],
  },
  {
    id: 'technique',
    title: 'Phase 3: the awkward bits',
    about: 'Accidentals, tonguing and phrases. This is the part that makes real music playable.',
    weeks: [8, 9, 10, 11, 12],
  },
  {
    id: 'song',
    title: 'Phase 4: your song',
    about: 'Getting the song you actually want into your fingers, half at a time.',
    weeks: [13, 14, 15, 16],
  },
  {
    id: 'polish',
    title: 'Phase 5: polish',
    about: 'The difference between playing the notes and playing the tune.',
    weeks: [17, 18, 19, 20],
  },
]
