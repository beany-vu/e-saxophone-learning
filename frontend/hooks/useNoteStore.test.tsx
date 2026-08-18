import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNoteStore } from '@/hooks/useNoteStore'

describe('useNoteStore', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useNoteStore())
    expect(result.current.activeNotes).toEqual([])
    expect(result.current.totalNotes).toBe(0)
  })

  it('holds a note down until it is released', () => {
    const { result } = renderHook(() => useNoteStore())
    act(() => result.current.noteOn(69, 100))
    expect(result.current.activeNotes).toEqual([69])
    act(() => result.current.noteOff(69))
    expect(result.current.activeNotes).toEqual([])
  })

  it('counts every note on, and keeps a per-note tally', () => {
    const { result } = renderHook(() => useNoteStore())
    act(() => {
      result.current.noteOn(69, 100)
      result.current.noteOff(69)
      result.current.noteOn(69, 90)
      result.current.noteOn(71, 80)
    })
    expect(result.current.totalNotes).toBe(3)
    expect(result.current.noteCounts).toEqual({ 69: 2, 71: 1 })
  })

  it('does not list the same held note twice', () => {
    const { result } = renderHook(() => useNoteStore())
    act(() => {
      result.current.noteOn(69, 100)
      result.current.noteOn(69, 100)
    })
    expect(result.current.activeNotes).toEqual([69])
  })

  it('tells subscribers about note on, and stops after unsubscribe', () => {
    const { result } = renderHook(() => useNoteStore())
    const heard = vi.fn()
    let unsubscribe = () => {}
    act(() => {
      unsubscribe = result.current.onNoteOn(heard)
    })
    act(() => result.current.noteOn(69, 100))
    expect(heard).toHaveBeenCalledWith(69, 100)
    act(() => unsubscribe())
    act(() => result.current.noteOn(71, 100))
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('keeps the log newest first and bounded', () => {
    const { result } = renderHook(() => useNoteStore())
    act(() => {
      for (let i = 0; i < 60; i++) result.current.noteOn(60 + (i % 12), 100)
    })
    expect(result.current.log).toHaveLength(40)
    expect(result.current.log[0].note).toBe(60 + (59 % 12))
  })

  it('reset clears the counters and the keyboard', () => {
    const { result } = renderHook(() => useNoteStore())
    act(() => result.current.noteOn(69, 100))
    act(() => result.current.reset())
    expect(result.current.totalNotes).toBe(0)
    expect(result.current.noteCounts).toEqual({})
    expect(result.current.activeNotes).toEqual([])
    expect(result.current.log).toEqual([])
  })
})
