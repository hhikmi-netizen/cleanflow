'use client'

import { useState, useTransition } from 'react'
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { seedDemoData } from '@/app/actions/seed-demo'

interface DemoBannerProps {
  hasData: boolean
}

export default function DemoBanner({ hasData }: DemoBannerProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSeed = () => {
    startTransition(async () => {
      const res = await seedDemoData(hasData)
      setResult(res)
      if (res.ok) {
        setTimeout(() => window.location.reload(), 1200)
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
        <CheckCircle size={16} className="shrink-0" />
        Données démo chargées — rechargement en cours…
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-start gap-3">
        <Sparkles size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            {hasData ? 'Recharger les données démo' : 'Tester avec données démo'}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            {hasData
              ? 'Écrasera les données actuelles et recréera 8 clients, 17 services, 10 commandes.'
              : 'Crée 8 clients, 17 services pressing, 10 commandes, 1 impayé, données caisse.'}
          </p>
          {result && !result.ok && (
            <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertTriangle size={11} /> {result.message}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleSeed}
        disabled={isPending}
        className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
      >
        {isPending ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {isPending ? 'Chargement…' : hasData ? 'Recharger démo' : 'Charger démo'}
      </button>
    </div>
  )
}
