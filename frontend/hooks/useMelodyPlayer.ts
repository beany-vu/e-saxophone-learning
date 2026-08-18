'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { midiToFreq, scheduleMelody, type ScheduleOptions } from '@/lib/tone'

/**
 * Plays a melody through the speakers so you can hear it before playing it.
 *
 * Synthesised rather than recorded: a triangle wave with a soft envelope. It
 * will not be mistaken for a saxophone, and it does not need to be. The job is
 * to put the tune and its rhythm in your ear.
 */
export function useMelodyPlayer() {
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState<number | null>(null)

  const contextRef = useRef<AudioContext | null>(null)
  const stopsRef = useRef<(() => void)[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const stop = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    stopsRef.current.forEach((fn) => fn())
    stopsRef.current = []
    setPlaying(false)
    setIndex(null)
  }, [])

  const play = useCallback(
    async (notes: number[], beats: number[] | undefined, options: ScheduleOptions = {}) => {
      stop()
      if (notes.length === 0) return

      const context = contextRef.current ?? new AudioContext()
      contextRef.current = context
      if (context.state === 'suspended') await context.resume()

      const plan = scheduleMelody(notes, beats, options)
      const t0 = context.currentTime + 0.08 // a beat of headroom before note one

      plan.forEach((note, i) => {
        const osc = context.createOscillator()
        const gain = context.createGain()
        osc.type = 'triangle'
        osc.frequency.value = midiToFreq(note.midi)

        const start = t0 + note.start
        const end = start + note.duration
        // A short attack and release: a square envelope clicks audibly.
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.22, start + 0.02)
        gain.gain.setValueAtTime(0.22, Math.max(start + 0.02, end - 0.05))
        gain.gain.linearRampToValueAtTime(0, end)

        osc.connect(gain).connect(context.destination)
        osc.start(start)
        osc.stop(end + 0.02)
        stopsRef.current.push(() => {
          try {
            osc.stop()
          } catch {
            // Already stopped, which is not a problem.
          }
        })

        // Highlighting runs on timers rather than audio time, which is close
        // enough for following along and costs nothing.
        timersRef.current.push(setTimeout(() => setIndex(i), note.start * 1000))
      })

      const last = plan[plan.length - 1]
      timersRef.current.push(
        setTimeout(
          () => {
            setPlaying(false)
            setIndex(null)
          },
          (last.start + last.duration) * 1000 + 120,
        ),
      )

      setPlaying(true)
    },
    [stop],
  )

  const stopRef = useRef(stop)
  stopRef.current = stop
  useEffect(
    () => () => {
      stopRef.current()
      contextRef.current?.close().catch(() => {})
    },
    [],
  )

  return { playing, index, play, stop }
}
