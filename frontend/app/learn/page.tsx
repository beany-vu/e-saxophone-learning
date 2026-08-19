'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Fingering from '@/components/Fingering'
import Staff from '@/components/Staff'
import { useInputContext } from '@/lib/input-context'
import { useMelodyPlayer } from '@/hooks/useMelodyPlayer'
import { useAuth } from '@/lib/auth-context'
import { api, type ItemStat } from '@/lib/api'
import {
  ALL_ITEMS,
  SONGS,
  WARMUPS,
  formatMelody,
  itemRange,
  parseMelody,
  parseMelodyScript,
  phraseNotes,
  fitToRange,
  type Phrase,
  type PracticeItem,
} from '@/lib/curriculum'
import {
  FINGERING_HIGH,
  FINGERING_LOW,
  SAX_KEYS,
  fingeringFor,
  noteForKeys,
  type SaxKeyId,
} from '@/lib/fingerings'
import { formatDuration, toConcert, yamahaName } from '@/lib/notes'
import { describeOffset } from '@/lib/calibration'
import { useI18n } from '@/lib/i18n-context'
import type { Lang, StringKey } from '@/lib/i18n'
import { localiseItem } from '@/lib/curriculum-i18n'
import { localiseWeek, localisePhase } from '@/lib/course-i18n'
import {
  COURSE,
  PHASES,
  DEFAULT_START as COURSE_DEFAULT_START,
  weekDates,
  weekFor,
  weekStatus,
} from '@/lib/course'
import { START_KEY, TARGET_KEY, resolveDates } from '@/lib/course-dates'
import {
  completion,
  isDone,
  nextUnfinished,
  parseDone,
  serialiseDone,
  toggleDone,
} from '@/lib/course-progress'

const CUSTOM_STORAGE_KEY = 'yds120.customMelodies'
const WEEK_STORAGE_KEY = 'yds120.courseWeek'
const DONE_STORAGE_KEY = 'yds120.courseDone'

type CustomMelody = { id: string; title: string; notes: number[]; phrases?: Phrase[] }

export default function LearnPage() {
  const input = useInputContext()
  const { lang, t, n } = useI18n()
  const player = useMelodyPlayer()
  const { user } = useAuth()
  const [tempo, setTempo] = useState(90)
  const [showStaff, setShowStaff] = useState(true)

  // Which week you are working on. Starts at 1 so the server and the first
  // client render agree, then the effect moves it to where you actually are.
  // You can also move it yourself, because the plan says to repeat a week when
  // one goes badly, and the app has to let you.
  const [workingWeek, setWorkingWeek] = useState(1)
  const [calendarWeek, setCalendarWeek] = useState<number | null>(null)
  const [weeksDone, setWeeksDone] = useState<number[]>([])
  // The learner's own dates. The course used to hold one hard-coded start,
  // which marched every account through the same calendar.
  const [startDate, setStartDate] = useState(COURSE_DEFAULT_START)
  const [targetEnd, setTargetEnd] = useState('')


  // Dates resolve from the account first, then this browser, then the default.
  useEffect(() => {
    const resolved = resolveDates(user, {
      start: localStorage.getItem(START_KEY),
      target: localStorage.getItem(TARGET_KEY),
    })
    setStartDate(resolved.start)
    setTargetEnd(resolved.target)
  }, [user])

  useEffect(() => {
    const onCalendar = weekFor(new Date(), startDate)?.week ?? null
    setCalendarWeek(onCalendar)
    // The account wins over the browser: it is the copy that follows you.
    const stored = parseDone(localStorage.getItem(DONE_STORAGE_KEY))
    const finished = user?.courseWeeksDone?.length ? user.courseWeeksDone : stored
    setWeeksDone(finished)
    const saved = Number(localStorage.getItem(WEEK_STORAGE_KEY))
    if (saved >= 1 && saved <= COURSE.length) setWorkingWeek(saved)
    else if (finished.length) setWorkingWeek(nextUnfinished(finished, COURSE.length))
    else setWorkingWeek(onCalendar ?? 1)
  }, [startDate])



  /** Ticking a week moves you on to the next one still outstanding. */
  const toggleWeekDone = useCallback(
    (weekNumber: number) => {
      const updated = toggleDone(weeksDone, weekNumber)
      setWeeksDone(updated)
      localStorage.setItem(DONE_STORAGE_KEY, serialiseDone(updated))
      // Fire and forget: ticking a week must not wait on the network, and a
      // failed sync leaves the browser copy intact.
      if (user) api.setCourseDates(startDate, targetEnd, updated).catch(() => {})
      if (isDone(updated, weekNumber)) {
        const next = nextUnfinished(updated, COURSE.length)
        setWorkingWeek(next)
        localStorage.setItem(WEEK_STORAGE_KEY, String(next))
      }
    },
    [weeksDone, user, startDate, targetEnd],
  )

  const goToWeek = useCallback((next: number) => {
    const clamped = Math.min(COURSE.length, Math.max(1, next))
    setWorkingWeek(clamped)
    localStorage.setItem(WEEK_STORAGE_KEY, String(clamped))
  }, [])

  const week = localiseWeek(COURSE.find((w) => w.week === workingWeek) ?? COURSE[0], lang)
  const rawPhase = PHASES.find((p) => p.weeks.includes(week.week))
  const phase = rawPhase ? localisePhase(rawPhase, lang) : undefined
  const status = calendarWeek === null ? null : weekStatus(week.week, calendarWeek)
  const progress = completion(weeksDone, COURSE.length)
  const weekDone = isDone(weeksDone, week.week)

  // ---- Fingering explorer -------------------------------------------------
  const [lookupNote, setLookupNote] = useState(73) // open C#5, the no-keys note
  const [pressed, setPressed] = useState<SaxKeyId[]>([])
  const guess = useMemo(() => noteForKeys(pressed), [pressed])

  const togglePressed = useCallback((key: SaxKeyId) => {
    setPressed((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }, [])

  // Playing a note fills the explorer in, so the instrument can drive it.
  useEffect(
    () =>
      input.onNoteOn((note) => {
        if (note >= FINGERING_LOW && note <= FINGERING_HIGH) setLookupNote(note)
      }),
    [input],
  )

  const lookupFingering = fingeringFor(lookupNote)

  // ---- Custom melodies ----------------------------------------------------
  const [customs, setCustoms] = useState<CustomMelody[]>([])
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  // Sheet music for piano, voice or guitar is in concert pitch, and an alto
  // fingers it nine semitones higher. Doing that conversion by hand for a
  // whole song is where people give up.
  const [draftConcert, setDraftConcert] = useState(false)
  // Piano parts often sit an octave or two below a saxophone. Shifting the
  // whole melody keeps the tune and makes it playable.
  const [draftFit, setDraftFit] = useState(true)
  // Kalimba and jianpu tabs are written as scale degrees, not note names.
  const [draftNumbers, setDraftNumbers] = useState(false)
  const [draftTonic, setDraftTonic] = useState(72) // C5

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
      if (raw) setCustoms(JSON.parse(raw))
    } catch {
      // A corrupt entry should not take the page down with it.
    }
  }, [])

  const saveCustoms = useCallback((next: CustomMelody[]) => {
    setCustoms(next)
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next))
  }, [])

  const draftTranspose = draftConcert ? -input.voice.semitones : 0
  const draftParsed = useMemo(() => {
    const parsed = parseMelodyScript(
      draftNotes,
      draftTranspose,
      draftNumbers ? { numbers: true, tonic: draftTonic } : undefined,
    )
    if (!draftFit) return { ...parsed, octaves: 0 }
    const fitted = fitToRange(parsed.notes)
    return { ...parsed, notes: fitted.notes, octaves: fitted.octaves }
  }, [draftNotes, draftTranspose, draftFit, draftNumbers, draftTonic])

  function addCustom() {
    if (!draftTitle.trim()) return setDraftError(t('learn.nameFirst'))
    if (draftParsed.errors.length) {
      return setDraftError(
        t('learn.couldNotRead', {
          tokens: draftParsed.errors.join(', '),
          low: n(FINGERING_LOW),
          high: n(FINGERING_HIGH),
        }),
      )
    }
    if (draftParsed.notes.length < 2) return setDraftError(t('learn.notEnoughNotes'))
    saveCustoms([
      ...customs,
      {
        id: `custom-${Date.now()}`,
        title: draftTitle.trim(),
        notes: draftParsed.notes,
        phrases: draftParsed.phrases,
      },
    ])
    setDraftTitle('')
    setDraftNotes('')
    setDraftError(null)
  }

  const customItems: PracticeItem[] = customs.map((c) => ({
    id: c.id,
    title: c.title,
    kind: 'song',
    level: 2,
    about: t('learn.yourMelodies'),
    notes: c.notes,
    phrases: c.phrases?.length
      ? c.phrases
      : [{ label: t('learn.allOfIt'), start: 0, end: c.notes.length }],
  }))

  // ---- Practice runner ----------------------------------------------------
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = useMemo(() => {
    const found = [...ALL_ITEMS, ...customItems].find((i) => i.id === activeId)
    return found ? localiseItem(found, lang) : null
  }, [activeId, customItems, lang])
  const [phraseIndex, setPhraseIndex] = useState<number | null>(null)
  const segment = useMemo(
    () => (active ? phraseNotes(active, phraseIndex) : null),
    [active, phraseIndex],
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [lastHeard, setLastHeard] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // The note callback must see current values without resubscribing mid-run.
  const runRef = useRef({ running: false, index: 0, notes: [] as number[] })
  runRef.current = { running, index, notes: segment?.notes ?? [] }

  useEffect(() => {
    if (!running || startedAt === null) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [running, startedAt])

  const playingRef = useRef(false)
  playingRef.current = player.playing
  // The note callback must not be rebuilt when the language changes, or it
  // would resubscribe mid-run, so it reads the translator through a ref.
  const tRef = useRef(t)
  tRef.current = t

  const handleNote = useCallback((note: number) => {
    // The demo plays through the speakers, and in microphone mode the app is
    // listening to those same speakers. Without this it would mark its own
    // playback as your playing.
    if (playingRef.current) return
    setLastHeard(note)
    const { running: isRunning, index: at, notes } = runRef.current
    if (!isRunning || notes.length === 0) return
    const target = notes[at]

    if (note === target) {
      setCorrect((c) => c + 1)
      setHint(null)
      setIndex((i) => {
        const next = i + 1
        if (next >= notes.length) {
          setRunning(false)
          setDone(true)
          return i
        }
        return next
      })
      return
    }

    setWrong((w) => w + 1)
    setHint(
      note % 12 === target % 12
        ? tRef.current('learn.rightNoteWrongOctave', {
            played: n(note),
            target: n(target),
          })
        : tRef.current('learn.wrongNote', { played: n(note), target: n(target) }),
    )
  }, [])

  useEffect(() => input.onNoteOn(handleNote), [input, handleNote])

  /** Switching phrase resets the attempt, since the target sequence changed. */
  function selectPhrase(next: number | null) {
    player.stop()
    setPhraseIndex(next)
    setRunning(false)
    setIndex(0)
    setCorrect(0)
    setWrong(0)
    setHint(null)
    setDone(false)
  }

  function start(item: PracticeItem) {
    player.stop()
    if (item.id !== activeId) setPhraseIndex(null)
    setActiveId(item.id)
    if (input.status !== 'ready') {
      setRunning(false)
      setSaveMsg(null)
      return
    }
    setIndex(0)
    setCorrect(0)
    setWrong(0)
    setHint(null)
    setDone(false)
    setSaveMsg(null)
    setElapsed(0)
    setStartedAt(Date.now())
    setRunning(true)
    input.reset()
  }

  async function save() {
    if (!active) return
    try {
      const counts: Record<string, number> = {}
      Object.entries(input.noteCounts).forEach(([n, c]) => (counts[n] = c))
      await api.saveSession({
        source: active.kind,
        item: active.id,
        durationSeconds: elapsed,
        notesPlayed: correct + wrong,
        correctNotes: correct,
        wrongNotes: wrong,
        noteCounts: counts,
      })
      setSaveMsg(t('learn.savedToProgress'))
      loadStats()
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'save failed')
    }
  }

  // ---- Per item history ---------------------------------------------------
  const [stats, setStats] = useState<Record<string, ItemStat>>({})
  const loadStats = useCallback(() => {
    if (!user) return
    api
      .summary()
      .then((s) => {
        const byItem: Record<string, ItemStat> = {}
        ;(s.itemStats || []).forEach((st) => (byItem[st.item] = st))
        setStats(byItem)
      })
      .catch(() => {
        // Not being logged in is not an error worth shouting about here.
      })
  }, [user])
  useEffect(loadStats, [loadStats])

  const attempts = correct + wrong
  const accuracy = attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
  const target = segment && running ? segment.notes[index] : null
  const targetFingering = target === null ? null : fingeringFor(target)

  return (
    <>
      <h1>{t('learn.title')}</h1>
      <p className="muted">{t('learn.intro')}</p>

      {input.status !== 'ready' && (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>
              {t('learn.notConnected')}
            </p>
            <div className="row">
              <button onClick={input.connect}>
                {input.mode === 'mic' ? t('learn.startListening') : t('learn.connectMidi')}
              </button>
              <Link href="/monitor">
                <button className="ghost">{t('learn.inputSettings')}</button>
              </Link>
            </div>
          </div>
          {input.error && <p className="error">{input.error}</p>}
        </div>
      )}

      {/* ---------------- The course ---------------- */}
      <div className="panel" style={{ borderColor: 'var(--accent)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ marginBottom: 0 }}>
              {t('course.weekOf', { week: week.week, total: COURSE.length })}: {week.title}
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {weekDates(week.week, startDate).start} to {weekDates(week.week, startDate).end}
              {phase ? ` · ${phase.title}` : ''} ·{' '}
              {t('course.completion', { done: progress.done, total: progress.total })}
            </span>
          </div>

          <div className="row" style={{ gap: 8, alignItems: 'center', margin: '8px 0 12px' }}>
            <button
              className="ghost"
              onClick={() => goToWeek(week.week - 1)}
              disabled={week.week === 1}
            >
              {t('common.previous')}
            </button>
            <button
              className="ghost"
              onClick={() => goToWeek(week.week + 1)}
              disabled={week.week === COURSE.length}
            >
              {t('common.next')}
            </button>
            <button
              className={weekDone ? 'ghost' : ''}
              onClick={() => toggleWeekDone(week.week)}
            >
              {weekDone
                ? `✓ ${t('course.markNotDone', { week: week.week })} · ${t('course.undo')}`
                : t('course.markDone', { week: week.week })}
            </button>
            {calendarWeek !== null && (
              <>
                <span
                  className="badge"
                  style={{ color: status === 'on track' ? 'var(--good)' : 'var(--warn)' }}
                >
                  {status === 'behind'
                    ? t('course.behind')
                    : status === 'ahead'
                      ? t('course.ahead')
                      : t('course.onTrack')}
                </span>
                {week.week !== calendarWeek && (
                  <button className="ghost" onClick={() => goToWeek(calendarWeek)}>
                    {t('course.jumpToToday', { week: calendarWeek })}
                  </button>
                )}
              </>
            )}
            {calendarWeek === null && (
              <span className="muted" style={{ fontSize: 13 }}>
                {t('course.outsideDates')}
              </span>
            )}
            <Link href="/settings" className="muted" style={{ fontSize: 13 }}>
              {t('course.dates')}
            </Link>
          </div>

          <div className="meter" style={{ margin: '0 0 12px' }}>
            <div style={{ width: `${progress.percent}%` }} />
          </div>

          <p style={{ marginBottom: 8 }}>{week.focus}</p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>{t('common.goal')}:</strong> {week.goal}
          </p>
          {week.watch && (
            <p style={{ margin: '0 0 8px', color: 'var(--warn)' }}>
              <strong>{t('common.watchOut')}:</strong> {week.watch}
            </p>
          )}
          {week.items.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <span className="label" style={{ margin: 0 }}>
                {t('course.thisWeek')}
              </span>
              {week.items.map((id) => {
                const found = ALL_ITEMS.find((i) => i.id === id)
                if (!found) return null
                const item = localiseItem(found, lang)
                return (
                  <button key={id} onClick={() => start(item)}>
                    {item.title}
                  </button>
                )
              })}
            </div>
          )}
                    <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: 'pointer', fontSize: 13 }}>
              {t('course.wholePlan', { total: COURSE.length })}
            </summary>
            <div style={{ marginTop: 10 }}>
              {PHASES.map((phase) => (
                <div key={phase.id} style={{ marginBottom: 12 }}>
                  <strong>{localisePhase(phase, lang).title}</strong>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
                    {localisePhase(phase, lang).about}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {phase.weeks.map((n) => {
                      const w = localiseWeek(COURSE.find((c) => c.week === n)!, lang)
                      return (
                        <li
                          key={n}
                          style={{
                            color: n === week.week ? 'var(--accent)' : undefined,
                            fontWeight: n === week.week ? 700 : undefined,
                            cursor: 'pointer',
                            opacity: isDone(weeksDone, n) && n !== week.week ? 0.65 : 1,
                          }}
                          onClick={() => goToWeek(n)}
                        >
                          <span
                            style={{ color: isDone(weeksDone, n) ? 'var(--good)' : 'var(--muted)' }}
                          >
                            {isDone(weeksDone, n) ? '✓' : '○'}
                          </span>{' '}
                          {t('course.weekOf', { week: n, total: COURSE.length })} (
                          {weekDates(n, startDate).start}): {w.title}. {w.goal}
                          {n === week.week ? ` · ${t('course.currentWeek')}` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </details>

          {week.items.length === 0 && (
            <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
              {t('course.ownSong')}
            </p>
          )}
        </div>

      {/* ---------------- Fingering explorer ---------------- */}
      <div className="panel">
        <h2>{t('learn.fingeringChart')}</h2>
        <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
          <div style={{ minWidth: 240 }}>
            <div className="label">{t('learn.whichKeys')}</div>
            <select
              value={lookupNote}
              onChange={(e) => setLookupNote(Number(e.target.value))}
              style={{ marginBottom: 10 }}
            >
              {Array.from({ length: FINGERING_HIGH - FINGERING_LOW + 1 }, (_, i) => {
                const midi = FINGERING_LOW + i
                return (
                  <option key={midi} value={midi}>
                    {n(midi)} / Yamaha {yamahaName(midi)} (sounds{' '}
                    {n(toConcert(midi, input.voice.semitones))})
                  </option>
                )
              })}
            </select>
            <Fingering keys={lookupFingering?.keys || []} size={150} />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="label">{t('learn.keysToPress')}</div>
            {lookupFingering && lookupFingering.keys.length === 0 ? (
              <p style={{ marginTop: 4 }}>
                <strong>{t('learn.noKeysAtAll')}</strong> {t('learn.openCsharp')}
              </p>
            ) : (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {lookupFingering?.keys.map((k) => {
                  const info = SAX_KEYS.find((s) => s.id === k)
                  return (
                    <li key={k}>
                      <strong>{info?.label}</strong>{' '}
                      <span className="muted" style={{ fontSize: 13 }}>
                        {info?.finger}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {lookupFingering?.alternates?.length ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                {t('learn.alsoPlayable', {
                  list: lookupFingering.alternates.map((a) => a.label).join(', '),
                })}
              </p>
            ) : null}
          </div>

          <div style={{ minWidth: 240 }}>
            <div className="label">{t('learn.pressKeysSeeNote')}</div>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
              {t('learn.clickKeys')}
            </p>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Fingering keys={pressed} onToggle={togglePressed} size={130} />
              <div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>
                  {guess ? n(guess.written) : '?'}
                </div>
                <div className="muted" style={{ fontSize: 13, maxWidth: 170 }}>
                  {guess ? (
                    <>
                      sounds {n(toConcert(guess.written, input.voice.semitones))} concert
                      {guess.via ? ` (${guess.via} fingering)` : ''}
                    </>
                  ) : pressed.length === 0 ? (
                    t('learn.noKeysPressed')
                  ) : (
                    t('learn.notStandard')
                  )}
                </div>
                {pressed.length > 0 && (
                  <button className="ghost" onClick={() => setPressed([])} style={{ marginTop: 8 }}>
                    {t('common.clear')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          {t('learn.coverage', {
            low: n(FINGERING_LOW),
            high: n(FINGERING_HIGH),
          })}
        </p>
      </div>

      {/* ---------------- The runner ---------------- */}
      {active && (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ marginBottom: 0 }}>{active.title}</h2>
            <button className="ghost" onClick={() => setActiveId(null)}>
              {t('common.close')}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>{active.about}</p>
          {active.tip && (
            <p style={{ fontSize: 14, marginTop: -6 }}>
              <strong>{t('common.tip')}:</strong> {active.tip}
            </p>
          )}

          <div className="row" style={{ alignItems: 'flex-start', gap: 28, marginTop: 8 }}>
            <div style={{ minWidth: 160 }}>
              <div className="label">
                {player.playing
                  ? t('learn.listening')
                  : running
                    ? t('learn.playThisNote')
                    : t('learn.ready')}
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>
                {player.index !== null && segment
                  ? n(segment.notes[player.index])
                  : target !== null
                    ? n(target)
                    : n(segment?.notes[0] ?? 60)}
              </div>
              {segment?.lyrics && (
                <div style={{ fontSize: 18, color: 'var(--accent)' }}>
                  {segment.lyrics[player.index ?? (running ? index : 0)]}
                </div>
              )}
              <div className="muted" style={{ fontSize: 13 }}>
                {t('learn.soundsConcert', {
                  note: n(toConcert(target ?? segment?.notes[0] ?? 60, input.voice.semitones)),
                })}
              </div>
              <div style={{ marginTop: 10 }}>
                <Fingering
                  keys={
                    (player.index !== null && segment
                      ? fingeringFor(segment.notes[player.index])
                      : targetFingering || fingeringFor(segment?.notes[0] ?? 60)
                    )?.keys || []
                  }
                  size={130}
                />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              {active.phrases && active.phrases.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="label">{t('learn.practiseWhichLine')}</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    <button
                      className={phraseIndex === null ? '' : 'ghost'}
                      onClick={() => selectPhrase(null)}
                    >
                      {t('learn.wholeThing')}
                    </button>
                    {active.phrases.map((p: Phrase, i: number) => (
                      <button
                        key={i}
                        className={phraseIndex === i ? '' : 'ghost'}
                        onClick={() => selectPhrase(i)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showStaff && (
                <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                  <Staff
                    notes={segment!.notes}
                    current={player.index ?? (running ? index : null)}
                    lyrics={segment!.lyrics}
                  />
                </div>
              )}

              <div className="seq">
                {segment!.notes.map((midi, i) => (
                  <div
                    key={i}
                    className={`step${i < index && !player.playing ? ' done' : ''}${
                      (running && i === index) || player.index === i ? ' current' : ''
                    }`}
                  >
                    <div>{n(midi)}</div>
                    {segment!.lyrics && (
                      <div style={{ fontSize: 11, opacity: 0.75 }}>{segment!.lyrics[i]}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="stat-grid" style={{ marginTop: 14 }}>
                <div className="stat">
                  <div className="value">
                    {index}
                    <span style={{ fontSize: 16, color: 'var(--muted)' }}>
                      /{segment!.notes.length}
                    </span>
                  </div>
                  <div className="label">{t('learn.progress')}</div>
                </div>
                <div className="stat">
                  <div className="value">{accuracy}%</div>
                  <div className="label">{t('learn.accuracy')}</div>
                </div>
                <div className="stat">
                  <div className="value">{wrong}</div>
                  <div className="label">{t('learn.wrongNotes')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatDuration(elapsed)}</div>
                  <div className="label">{t('learn.time')}</div>
                </div>
              </div>

              <div className="row" style={{ marginTop: 12, alignItems: 'center', gap: 10 }}>
                <span className="label" style={{ margin: 0 }}>
                  {t('learn.heard')}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {lastHeard === null ? t('learn.nothingYet') : n(lastHeard)}
                </span>
                {input.offset !== 0 && (
                  <span className="badge">
                    {t('learn.correctionBadge', { amount: describeOffset(input.offset) })}
                  </span>
                )}
              </div>

              {running && lastHeard !== null && target !== null && lastHeard !== target && (
                <div
                  className="panel"
                  style={{ margin: '10px 0 0', padding: 12, background: 'var(--panel-2)' }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: 14 }}>
                    {t('learn.notPassing', {
                      heard: n(lastHeard),
                      target: n(target),
                    })}
                  </p>
                  <div className="row">
                    <button onClick={() => input.calibrate(target, lastHeard)}>
                      {t('learn.correctBy', {
                        amount: `${target - lastHeard > 0 ? '+' : ''}${target - lastHeard}`,
                      })}
                    </button>
                    {input.offset !== 0 && (
                      <button className="ghost" onClick={() => input.setOffset(0)}>
                        {t('learn.clearCorrection')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hint && (
                <p style={{ color: 'var(--warn)', marginTop: 10, marginBottom: 0 }}>{hint}</p>
              )}
              {done && (
                <p style={{ color: 'var(--good)', marginTop: 10, marginBottom: 0 }}>
                  {t('learn.finished', { correct, wrong, accuracy })}
                </p>
              )}

              <div className="row" style={{ marginTop: 14, alignItems: 'center' }}>
                <button onClick={() => start(active)} disabled={input.status !== 'ready'}>
                  {running ? t('common.restart') : t('common.start')}
                </button>
                {player.playing ? (
                  <button className="ghost" onClick={player.stop}>
                    {t('learn.stopDemo')}
                  </button>
                ) : (
                  <button
                    className="ghost"
                    onClick={() =>
                      player.play(segment!.notes, segment!.beats, {
                        bpm: tempo,
                        // Play what the instrument would sound, not what you
                        // finger, so the demo and your playing match.
                        transpose: input.voice.semitones,
                      })
                    }
                  >
                    {t('learn.listenFirst')}
                  </button>
                )}
                <label className="row" style={{ gap: 6, alignItems: 'center', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showStaff}
                    onChange={(e) => setShowStaff(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span style={{ fontSize: 13 }}>{t('learn.showMusic')}</span>
                </label>
                <label htmlFor="tempo" className="label" style={{ margin: 0 }}>
                  {tempo} bpm
                </label>
                <input
                  id="tempo"
                  type="range"
                  min={40}
                  max={160}
                  step={5}
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  style={{ width: 120 }}
                />
                {user ? (
                  <button className="ghost" onClick={save} disabled={attempts === 0}>
                    {t('learn.saveAttempt')}
                  </button>
                ) : (
                  <Link href="/login">
                    <button className="ghost">{t('learn.logInToTrack')}</button>
                  </Link>
                )}
                {saveMsg && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    {saveMsg}
                  </span>
                )}
              </div>
              {input.status !== 'ready' && (
                <p className="error" style={{ marginTop: 8, marginBottom: 0 }}>
                  {t('learn.notConnectedScore')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- The material ---------------- */}
      <ItemList
        title={t('learn.warmups')}
        items={WARMUPS}
        stats={stats}
        onStart={start}
        onListen={(item) =>
          player.play(item.notes, item.beats, { bpm: tempo, transpose: input.voice.semitones })
        }
        lang={lang}
        t={t}
        n={n}
      />
      <ItemList
        title={t('learn.songs')}
        items={SONGS}
        stats={stats}
        onStart={start}
        onListen={(item) =>
          player.play(item.notes, item.beats, { bpm: tempo, transpose: input.voice.semitones })
        }
        lang={lang}
        t={t}
        n={n}
      />

      <div className="panel">
        <h2>{t('learn.yourMelodies')}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {t('learn.melodyIntro')}
        </p>
        <pre
          className="mono"
          style={{
            background: 'var(--panel-2)',
            padding: 10,
            borderRadius: 8,
            fontSize: 13,
            overflowX: 'auto',
          }}
        >
          {draftNumbers
            ? `Intro: 3 3 4 5 5 4 3 2\nMain: 1 1 2 3 3' 2 1`
            : `Verse: G G A G C B\nChorus: C D E F G`}
        </pre>

        <div className="row" style={{ gap: 16, alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ minWidth: 220 }}>
            <label htmlFor="notation">{t('learn.writtenAs')}</label>
            <select
              id="notation"
              value={draftNumbers ? 'numbers' : 'letters'}
              onChange={(e) => setDraftNumbers(e.target.value === 'numbers')}
            >
              <option value="letters">{t('learn.noteLetters')}</option>
              <option value="numbers">{t('learn.numbersNotation')}</option>
            </select>
          </div>
          {draftNumbers && (
            <div style={{ minWidth: 160 }}>
              <label htmlFor="tonic">{t('learn.keyMeans')}</label>
              <select
                id="tonic"
                value={draftTonic}
                onChange={(e) => setDraftTonic(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => 72 + i).map((midi) => (
                  <option key={midi} value={midi}>
                    {n(midi)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {draftNumbers && (
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            {t('learn.numbersHelp')}
          </p>
        )}

        {customItems.length > 0 && (
          <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {customItems.map((c) => (
              <div key={c.id} className="panel" style={{ margin: 0, padding: 12, minWidth: 240 }}>
                <strong>{c.title}</strong>
                <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                  {c.notes.length} notes, {n(itemRange(c).low)} to{' '}
                  {n(itemRange(c).high)}
                  {stats[c.id] ? ` · best ${stats[c.id].bestAccuracy}%` : ''}
                </div>
                <div className="row">
                  <button onClick={() => start(c)}>{t('common.practise')}</button>
                  <button
                    className="ghost"
                    onClick={() =>
                      player.play(c.notes, c.beats, {
                        bpm: tempo,
                        transpose: input.voice.semitones,
                      })
                    }
                  >
                    {t('common.listen')}
                  </button>
                  <button
                    className="ghost"
                    onClick={() => saveCustoms(customs.filter((x) => x.id !== c.id))}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 200 }}>
            <label htmlFor="mel-title">{t('common.name')}</label>
            <input
              id="mel-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t('learn.melodyNamePlaceholder')}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label htmlFor="mel-notes">{t('learn.notesOneLine')}</label>
            <textarea
              id="mel-notes"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder={'Verse: G4 G4 A4 G4 C5 B4\nChorus: C5 D5 E5 F5 G5'}
              rows={4}
              style={{
                width: '100%',
                background: 'var(--panel-2)',
                color: 'var(--text)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 8,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          </div>
          <div style={{ paddingTop: 22 }}>
            <button onClick={addCustom}>{t('common.add')}</button>
          </div>
        </div>

        <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input
            type="checkbox"
            checked={draftConcert}
            onChange={(e) => setDraftConcert(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span style={{ fontSize: 14 }}>
            {t('learn.concertPitchLabel')}
          </span>
        </label>
        <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 4 }}>
          <input
            type="checkbox"
            checked={draftFit}
            onChange={(e) => setDraftFit(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span style={{ fontSize: 14 }}>
            {t('learn.fitRangeLabel')}
          </span>
        </label>

        {draftError && <p className="error">{draftError}</p>}
        {draftNotes.trim() !== '' && !draftError && (
          <p className="muted" style={{ fontSize: 13 }}>
            {t('learn.readsAs', {
              count: draftParsed.notes.length,
              phrases: draftParsed.phrases.length,
              preview: formatMelody(draftParsed.notes.slice(0, 12)) || t('learn.nothingYet'),
            })}
            {draftParsed.notes.length > 12 ? ' ...' : ''}
            {draftConcert && draftParsed.notes.length > 0 && t('learn.converted')}
            {draftParsed.octaves !== 0 &&
              t('learn.movedOctaves', {
                direction: draftParsed.octaves > 0 ? t('learn.up') : t('learn.down'),
                count: Math.abs(draftParsed.octaves),
              })}
          </p>
        )}
      </div>
    </>
  )
}

function ItemList({
  title,
  items,
  stats,
  onStart,
  onListen,
  lang,
  t,
  n,
}: {
  title: string
  items: PracticeItem[]
  stats: Record<string, ItemStat>
  onStart: (item: PracticeItem) => void
  onListen: (item: PracticeItem) => void
  lang: Lang
  t: (key: StringKey, values?: Record<string, string | number>) => string
  n: (midi: number) => string
}) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
        {items.map((raw) => {
          const item = localiseItem(raw, lang)
          const range = itemRange(item)
          const stat = stats[item.id]
          return (
            <div
              key={item.id}
              className="panel"
              style={{ margin: 0, padding: 14, minWidth: 260, flex: '1 1 260px' }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{item.title}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {'●'.repeat(item.level)}
                  {'○'.repeat(3 - item.level)}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: '6px 0 8px' }}>
                {item.about}
              </p>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                {t('learn.notesFromTo', {
                  count: item.notes.length,
                  low: n(range.low),
                  high: n(range.high),
                })}
                {stat
                  ? ` · ${t('learn.playedTimes', {
                      times: stat.timesPlayed,
                      best: stat.bestAccuracy,
                    })}`
                  : ` · ${t('learn.notPlayedYet')}`}
              </div>
              <div className="row">
                <button onClick={() => onStart(item)}>{t('common.practise')}</button>
                <button className="ghost" onClick={() => onListen(item)}>
                  {t('common.listen')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
