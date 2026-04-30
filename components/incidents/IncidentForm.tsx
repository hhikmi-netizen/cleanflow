'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createIncident } from '@/app/actions/incidents'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const INCIDENT_TYPES = [
  { value: 'damage',     label: 'Détérioration' },
  { value: 'loss',       label: 'Perte d\'article' },
  { value: 'delay',      label: 'Retard' },
  { value: 'quality',    label: 'Qualité insuffisante' },
  { value: 'wrong_item', label: 'Erreur d\'article' },
  { value: 'other',      label: 'Autre' },
]

interface IncidentFormProps {
  clients: { id: string; name: string; phone: string }[]
  orders: { id: string; order_number: string; client_id?: string }[]
  preOrderId?: string
  preClientId?: string
  preOrderNumber?: string
}

export default function IncidentForm({ clients, orders, preOrderId, preClientId, preOrderNumber }: IncidentFormProps) {
  const [orderId, setOrderId] = useState(preOrderId || '')
  const [clientId, setClientId] = useState(preClientId || '')
  const [type, setType] = useState('quality')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleOrderChange = (oid: string) => {
    setOrderId(oid)
    if (oid) {
      const order = orders.find(o => o.id === oid)
      if (order?.client_id) setClientId(order.client_id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !description.trim()) {
      toast.error('Type et description requis')
      return
    }
    setLoading(true)
    try {
      const id = await createIncident({
        orderId: orderId || undefined,
        clientId: clientId || undefined,
        type,
        description: description.trim(),
      })
      toast.success('Incident créé')
      router.push(`/incidents/${id}`)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-5 space-y-4">
        {/* Commande liée */}
        <div className="space-y-2">
          <Label>Commande concernée</Label>
          {preOrderId && preOrderNumber ? (
            <div className="h-10 px-3 flex items-center bg-blue-50 border border-blue-200 rounded-md text-sm font-mono text-blue-800">
              {preOrderNumber}
            </div>
          ) : (
            <select
              value={orderId}
              onChange={e => handleOrderChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Aucune commande spécifique —</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_number}</option>
              ))}
            </select>
          )}
        </div>

        {/* Client lié */}
        <div className="space-y-2">
          <Label>Client concerné</Label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label>Type d&apos;incident *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INCIDENT_TYPES.map(t => (
              <label key={t.value} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                type === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez le problème en détail : article concerné, état constaté, attente du client..."
            rows={4}
            required
          />
        </div>
      </Card>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer l\'incident'}
      </Button>
    </form>
  )
}
