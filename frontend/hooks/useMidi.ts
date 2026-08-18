'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { listInputs, parseMidiMessage, type MidiDevice } from '@/lib/midi'
import type { useNoteStore } from '@/hooks/useNoteStore'

export type SourceStatus =
  | 'unsupported' // browser has no Web MIDI (Safari, Firefox)
  | 'idle' // supported, not yet asked for permission
  | 'requesting'
  | 'ready'
  | 'denied'

/** Kept for the pages that still import the old name. */
export type MidiStatus = SourceStatus

type Store = ReturnType<typeof useNoteStore>

/**
 * Listens to every MIDI input and pushes what it hears into the shared note
 * store. The YDS-120 speaks plain MIDI over USB: note on/off for the
 * fingering, and continuous controller 2 (breath) for how hard you are blowing.
 *
 * `enabled` is how the input switch works. A device can stay connected while
 * microphone mode is active without its notes being counted twice.
 */
export function useMidi(
  store: Store,
  { enabled = true, offset = 0 }: { enabled?: boolean; offset?: number } = {},
) {
  const [status, setStatus] = useState<SourceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MidiDevice[]>([])

  const accessRef = useRef<MIDIAccess | null>(null)
  // A ref, not a dependency: the message handler must never be rebuilt while
  // notes are arriving, or the listener would be reattached mid-phrase.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  // Calibration, for an instrument that reports the sounding note rather than
  // the fingered one. Read at event time so changing it never rebuilds the
  // listener mid-phrase.
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  const { noteOn, noteOff, setBreath } = store

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.requestMIDIAccess) {
      setStatus('unsupported')
    }
  }, [])

  const handleMessage = useCallback(
    (e: MIDIMessageEvent) => {
      if (!enabledRef.current) return
      const msg = parseMidiMessage(e.data)
      if (!msg) return
      if (msg.kind === 'noteOn') noteOn(msg.note + offsetRef.current, msg.velocity)
      else if (msg.kind === 'noteOff') noteOff(msg.note + offsetRef.current, msg.velocity)
      else if (msg.kind === 'breath') setBreath(msg.value)
    },
    [noteOn, noteOff, setBreath],
  )

  const attach = useCallback(
    (access: MIDIAccess) => {
      access.inputs.forEach((input) => {
        input.onmidimessage = handleMessage
      })
      setDevices(listInputs(access))
    },
    [handleMessage],
  )

  /** Re-enumerate without reloading, for when a device is plugged in late. */
  const rescan = useCallback(() => {
    if (accessRef.current) attach(accessRef.current)
  }, [attach])

  const connect = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    setError(null)
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false })
      accessRef.current = access
      attach(access)
      // Fires when a device is plugged in or unplugged while the page is open.
      access.onstatechange = () => attach(access)
      setStatus('ready')
    } catch (err) {
      setStatus('denied')
      setError(err instanceof Error ? err.message : 'MIDI access refused')
    }
  }, [attach])

  useEffect(() => {
    return () => {
      accessRef.current?.inputs.forEach((input) => {
        input.onmidimessage = null
      })
    }
  }, [])

  return { status, error, devices, connect, rescan }
}
