'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMidi } from '@/hooks/useMidi'
import { useMic } from '@/hooks/useMic'
import { useNoteStore } from '@/hooks/useNoteStore'
import { VOICES } from '@/lib/notes'
import { nextOffset } from '@/lib/calibration'

export type InputMode = 'midi' | 'mic'

const OFFSET_STORAGE_KEY = 'yds120.inputOffset'

/**
 * One instrument input, from either the USB cable or the microphone.
 *
 * Both sources write into the same note store, and only the selected one is
 * listening, so the counters, the keyboard and the scale trainer work the same
 * way whichever is in use. Pages read `status`, `connect` and the note state
 * without caring which source is behind them.
 */
export function useInput() {
  const store = useNoteStore()
  const [mode, setModeState] = useState<InputMode>('midi')
  // Which voice is selected on the instrument. It decides how far the sounding
  // pitch sits from the fingered one, so the microphone needs it to convert
  // back, and both modes need it to say what a note sounds as. The YDS-120
  // powers up on A.01 Alto Sax 1.
  const [voiceId, setVoiceId] = useState('alto')
  const voice = VOICES.find((v) => v.id === voiceId) || VOICES[0]

  // A fixed correction per source, for when every note comes in the same
  // distance from what was actually played. Remembered, because an instrument
  // that reports the sounding note will do it again tomorrow.
  const [offsets, setOffsets] = useState<Record<InputMode, number>>({ midi: 0, mic: 0 })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFSET_STORAGE_KEY)
      if (raw) setOffsets((prev) => ({ ...prev, ...JSON.parse(raw) }))
    } catch {
      // A corrupt entry just means starting from no correction.
    }
  }, [])

  const midi = useMidi(store, { enabled: mode === 'midi', offset: offsets.midi })
  const mic = useMic(store, {
    enabled: mode === 'mic',
    semitones: voice.semitones,
    offset: offsets.mic,
  })

  const setOffset = useCallback(
    (next: number) => {
      // Written outside the state updater on purpose: an updater has to be
      // pure, and React may run it more than once.
      const updated = { ...offsets, [mode]: next }
      setOffsets(updated)
      localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(updated))
      // The correction changes what a held note is called, so let go of
      // anything currently down rather than leaving it stuck.
      store.activeNotes.forEach((n) => store.noteOff(n))
    },
    [mode, offsets, store],
  )

  /** "I played `expected`, the app heard `heard`": correct by the difference. */
  const calibrate = useCallback(
    (expected: number, heard: number) => setOffset(nextOffset(offsets[mode], expected, heard)),
    [mode, offsets, setOffset],
  )

  const setMode = useCallback(
    (next: InputMode) => {
      // A held note belongs to the source that started it. Switching away
      // would leave it stuck down, since its note-off is never coming.
      store.activeNotes.forEach((n) => store.noteOff(n))
      store.setBreath(0)
      setModeState(next)
    },
    [store],
  )

  const active = mode === 'midi' ? midi : mic

  return {
    ...store,
    mode,
    setMode,
    voice,
    setVoiceId,
    offset: offsets[mode],
    setOffset,
    calibrate,
    midi,
    mic,
    status: active.status,
    error: active.error,
    connect: active.connect,
  }
}
