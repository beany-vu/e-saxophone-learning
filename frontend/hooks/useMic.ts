'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { centsOff, detectPitch, freqToMidi, levelToVelocity, rms } from '@/lib/pitch'
import { initialGate, stepGate, type GateState } from '@/lib/noteGate'
import { fromConcert } from '@/lib/notes'
import type { SourceStatus } from '@/hooks/useMidi'
import type { useNoteStore } from '@/hooks/useNoteStore'

type Store = ReturnType<typeof useNoteStore>

// 2048 samples is about 46 ms at 44.1 kHz. Long enough to see two full cycles
// of the lowest note we care about, short enough that a note does not feel
// late. Bigger windows detect lower notes but blur fast playing.
const WINDOW = 2048

// The UI does not need 60 updates a second, and re-rendering the keyboard that
// often for a moving meter is waste. Analysis still runs every frame.
const UI_EVERY = 3

/**
 * Hears the instrument through the computer's microphone instead of a cable.
 *
 * The chain is: microphone -> AnalyserNode -> a window of raw samples every
 * animation frame -> `detectPitch` -> `stepGate` -> the shared note store.
 * Everything interesting happens in those two pure functions, which are
 * tested directly. What lives here is only the Web Audio plumbing.
 */
export function useMic(
  store: Store,
  {
    enabled = false,
    semitones = -9,
    offset = 0,
  }: { enabled?: boolean; semitones?: number; offset?: number } = {},
) {
  const [status, setStatus] = useState<SourceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [pitchHz, setPitchHz] = useState<number | null>(null)
  const [cents, setCents] = useState<number | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)
  const gateRef = useRef<GateState>(initialGate())

  // Read inside the animation loop, so changing the voice does not tear down
  // and rebuild the audio graph.
  const semitonesRef = useRef(semitones)
  semitonesRef.current = semitones
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  const { noteOn, noteOff, setBreath } = store

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
    }
  }, [])

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null

    // Release whatever the gate thought was sounding, or that key stays down
    // on the piano forever.
    if (gateRef.current.note !== null) noteOff(gateRef.current.note)
    gateRef.current = initialGate()

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    contextRef.current?.close().catch(() => {})
    contextRef.current = null

    setLevel(0)
    setPitchHz(null)
    setCents(null)
    setBreath(0)
    setDeviceName(null)
    setStatus((s) => (s === 'ready' ? 'idle' : s))
  }, [noteOff, setBreath])

  const connect = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // All three of these are tuned for speech and actively harm pitch
        // detection: they duck steady tones and rewrite the waveform.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream
      setDeviceName(stream.getAudioTracks()[0]?.label || 'microphone')

      const context = new AudioContext()
      contextRef.current = context
      // Autoplay policy can hand back a suspended context even after a click.
      if (context.state === 'suspended') await context.resume()

      const analyser = context.createAnalyser()
      analyser.fftSize = WINDOW
      // No smoothing: this is a time-domain read and smoothing would average
      // away the waveform we are trying to measure.
      analyser.smoothingTimeConstant = 0
      context.createMediaStreamSource(stream).connect(analyser)
      // Deliberately not connected to context.destination. Playing the
      // microphone back through the speakers is a feedback loop.

      const buffer = new Float32Array(WINDOW)
      gateRef.current = initialGate()
      let frames = 0

      const tick = () => {
        frameRef.current = requestAnimationFrame(tick)
        analyser.getFloatTimeDomainData(buffer)

        const loudness = rms(buffer)
        const freq = detectPitch(buffer, context.sampleRate)
        const heard = freq === null ? null : freqToMidi(freq)
        // The microphone hears the note that sounds; the rest of the app
        // speaks in the note you finger.
        const played =
          heard === null ? null : fromConcert(heard, semitonesRef.current) + offsetRef.current

        const out = stepGate(gateRef.current, { note: played, level: loudness })
        gateRef.current = out.state
        out.events.forEach((e) => {
          if (e.kind === 'on') noteOn(e.note, levelToVelocity(e.level))
          else noteOff(e.note)
        })

        if (frames++ % UI_EVERY === 0) {
          setLevel(loudness)
          setBreath(levelToVelocity(loudness))
          setPitchHz(freq)
          setCents(freq === null || heard === null ? null : centsOff(freq, heard))
        }
      }
      tick()
      setStatus('ready')
    } catch (err) {
      setStatus('denied')
      setError(err instanceof Error ? err.message : 'microphone access refused')
    }
  }, [noteOn, noteOff, setBreath])

  // Switching away from microphone mode releases the device, so the browser
  // stops showing the recording indicator.
  useEffect(() => {
    if (!enabled && streamRef.current) stop()
  }, [enabled, stop])

  // Unmount cleanup goes through a ref so that a change in `stop`'s identity
  // can never tear down a running session by accident.
  const stopRef = useRef(stop)
  stopRef.current = stop
  useEffect(() => () => stopRef.current(), [])

  return { status, error, deviceName, level, pitchHz, cents, connect, stop }
}
