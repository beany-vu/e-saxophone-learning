'use client'

import { useCallback, useRef, useState } from 'react'

export type NoteEventLog = {
  kind: 'on' | 'off'
  note: number
  velocity: number
  at: number
}

/**
 * Everything we know about the current practice session: which notes are down,
 * how many times each has been played, and the recent event log.
 *
 * This deliberately knows nothing about where the notes came from. The MIDI
 * cable and the microphone both push into it, so switching input source keeps
 * one set of counters instead of two that disagree.
 */
export function useNoteStore() {
  const [activeNotes, setActiveNotes] = useState<number[]>([])
  const [lastNote, setLastNote] = useState<number | null>(null)
  const [lastVelocity, setLastVelocity] = useState(0)
  const [breath, setBreath] = useState(0)
  const [noteCounts, setNoteCounts] = useState<Record<number, number>>({})
  const [totalNotes, setTotalNotes] = useState(0)
  const [log, setLog] = useState<NoteEventLog[]>([])

  // Subscribers that want every note-on as it happens (the scale trainer).
  const noteOnHandlers = useRef<Set<(note: number, velocity: number) => void>>(new Set())

  const noteOn = useCallback((note: number, velocity: number) => {
    setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]))
    setLastNote(note)
    setLastVelocity(velocity)
    setNoteCounts((prev) => ({ ...prev, [note]: (prev[note] || 0) + 1 }))
    setTotalNotes((n) => n + 1)
    setLog((prev) => [{ kind: 'on' as const, note, velocity, at: Date.now() }, ...prev].slice(0, 40))
    noteOnHandlers.current.forEach((fn) => fn(note, velocity))
  }, [])

  const noteOff = useCallback((note: number, velocity = 0) => {
    setActiveNotes((prev) => prev.filter((n) => n !== note))
    setLog((prev) => [{ kind: 'off' as const, note, velocity, at: Date.now() }, ...prev].slice(0, 40))
  }, [])

  const reset = useCallback(() => {
    setNoteCounts({})
    setTotalNotes(0)
    setLog([])
    setActiveNotes([])
  }, [])

  const onNoteOn = useCallback((fn: (note: number, velocity: number) => void) => {
    noteOnHandlers.current.add(fn)
    return () => {
      noteOnHandlers.current.delete(fn)
    }
  }, [])

  return {
    activeNotes,
    lastNote,
    lastVelocity,
    breath,
    noteCounts,
    totalNotes,
    log,
    noteOn,
    noteOff,
    setBreath,
    reset,
    onNoteOn,
  }
}
