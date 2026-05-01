'use client'

import { useState, useEffect } from 'react'

export type POSMode = 'full' | 'quick'

export function usePOSMode(): [POSMode, (m: POSMode) => void] {
  const [mode, setModeState] = useState<POSMode>('full')

  useEffect(() => {
    const stored = localStorage.getItem('cleanflow_pos_mode') as POSMode | null
    if (stored === 'quick' || stored === 'full') setModeState(stored)
  }, [])

  const setMode = (m: POSMode) => {
    localStorage.setItem('cleanflow_pos_mode', m)
    setModeState(m)
  }

  return [mode, setMode]
}
