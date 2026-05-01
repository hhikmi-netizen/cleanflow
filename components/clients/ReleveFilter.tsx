'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'

interface Props {
  clientId: string
  defaultFrom?: string
  defaultTo?: string
}

export default function ReleveFilter({ clientId, defaultFrom = '', defaultTo = '' }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const apply = () => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/clients/${clientId}/releve${params.toString() ? '?' + params.toString() : ''}`)
  }

  const reset = () => {
    setFrom(''); setTo('')
    router.push(`/clients/${clientId}/releve`)
  }

  return (
    <div className="print:hidden flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Filter size={13} className="text-gray-400" />
        <span className="text-xs text-gray-500">Période :</span>
      </div>
      <Input
        type="date"
        className="h-8 text-xs w-36"
        value={from}
        onChange={e => setFrom(e.target.value)}
        placeholder="Du"
      />
      <span className="text-xs text-gray-400">→</span>
      <Input
        type="date"
        className="h-8 text-xs w-36"
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder="Au"
      />
      <Button size="sm" className="h-8 text-xs px-3" onClick={apply}>Filtrer</Button>
      {(defaultFrom || defaultTo) && (
        <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-gray-500" onClick={reset}>
          <X size={12} className="mr-1" /> Réinitialiser
        </Button>
      )}
    </div>
  )
}
