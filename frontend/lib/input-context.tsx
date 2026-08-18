'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useInput } from '@/hooks/useInput'

// One input for the whole app.
//
// This used to be a hook each page called for itself, which meant every page
// had its own MIDI access and its own microphone. Connecting on the monitor
// page then left the learn page deaf, with no way to tell from looking at it.
// Now the provider owns the connection and the pages share it.

type InputValue = ReturnType<typeof useInput>

const InputContext = createContext<InputValue | null>(null)

export function InputProvider({ children }: { children: ReactNode }) {
  const value = useInput()
  return <InputContext.Provider value={value}>{children}</InputContext.Provider>
}

export function useInputContext(): InputValue {
  const value = useContext(InputContext)
  if (!value) throw new Error('useInputContext must be used inside an InputProvider')
  return value
}
