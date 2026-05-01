'use client'

import { usePOSMode } from '@/lib/use-pos-mode'
import { Layers, Zap } from 'lucide-react'

export default function ModeSwitch() {
  const [mode, setMode] = usePOSMode()

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => setMode('full')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'full'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Layers size={13} />
        Complet
      </button>
      <button
        onClick={() => setMode('quick')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'quick'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Zap size={13} />
        Rapide
      </button>
    </div>
  )
}
