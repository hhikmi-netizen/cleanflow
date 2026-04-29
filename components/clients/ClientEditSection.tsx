'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import ClientForm from './ClientForm'
import { Client } from '@/lib/types'
import { Edit2 } from 'lucide-react'

interface ClientEditSectionProps {
  client: Client
  pressingId: string
}

export default function ClientEditSection({ client, pressingId }: ClientEditSectionProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="font-medium text-gray-700 mb-3">Modifier le client</h4>
        <ClientForm client={client} pressingId={pressingId} onSuccess={() => setEditing(false)} />
        <button onClick={() => setEditing(false)} className="mt-2 text-sm text-gray-400 hover:text-gray-600">
          Annuler
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Edit2 size={14} className="mr-2" /> Modifier
      </Button>
    </div>
  )
}
