'use client'

import { useState, useTransition } from 'react'
import { DiscountRule } from '@/lib/types'

type ServiceMin = { id: string; name: string; category?: string }

type ClientMin = { id: string; name: string; phone: string }
import { createDiscountRule, toggleDiscountRule, deleteDiscountRule } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const SCOPES = [
  { value: 'order',   label: 'Sur commande' },
  { value: 'service', label: 'Sur un service' },
  { value: 'client',  label: 'Par client' },
]

interface Props {
  discounts: DiscountRule[]
  clients: ClientMin[]
  services: ServiceMin[]
}

export default function DiscountsTab({ discounts, clients, services }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [discType, setDiscType] = useState<'percentage' | 'fixed_amount'>('percentage')
  const [value, setValue] = useState('')
  const [scope, setScope] = useState('order')
  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const resetForm = () => {
    setName(''); setDiscType('percentage'); setValue(''); setScope('order')
    setClientId(''); setServiceId(''); setMinOrder(''); setMaxUses('')
    setValidFrom(''); setValidUntil(''); setShowForm(false)
  }

  const handleCreate = () => {
    if (!name.trim() || !value) { toast.error('Nom et valeur requis'); return }
    startTransition(async () => {
      try {
        await createDiscountRule({
          name: name.trim(),
          discount_type: discType,
          value: parseFloat(value),
          scope,
          client_id: scope === 'client' ? clientId || undefined : undefined,
          service_id: scope === 'service' ? serviceId || undefined : undefined,
          min_order_amount: minOrder ? parseFloat(minOrder) : undefined,
          max_uses: maxUses ? parseInt(maxUses) : undefined,
          valid_from: validFrom || undefined,
          valid_until: validUntil || undefined,
        })
        toast.success('Remise créée')
        resetForm()
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="mr-1" /> Nouvelle remise
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 border-green-200 bg-green-50 space-y-3">
          <p className="text-sm font-semibold text-green-800">Nouvelle règle de remise</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ex: Remise fidélité client" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de remise *</label>
              <div className="flex gap-2">
                {(['percentage', 'fixed_amount'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setDiscType(t)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      discType === t ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                    }`}>
                    {t === 'percentage' ? 'Pourcentage (%)' : 'Montant fixe (DH)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {discType === 'percentage' ? 'Valeur (%)' : 'Montant (DH)'} *
              </label>
              <input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder={discType === 'percentage' ? '10' : '50'} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Portée *</label>
              <select value={scope} onChange={e => setScope(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {scope === 'client' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">— Tous les clients —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                </select>
              </div>
            )}
            {scope === 'service' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Service</label>
                <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">— Tous les services —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Commande min. (DH)</label>
              <input type="number" min="0" step="0.01" value={minOrder} onChange={e => setMinOrder(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nb. utilisations max</label>
              <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Illimité" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valide du</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={isPending} className="flex-1">
              {isPending ? <Loader2 size={13} className="animate-spin" /> : 'Créer'}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>Annuler</Button>
          </div>
        </Card>
      )}

      {discounts.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucune remise configurée</p>
      ) : (
        <div className="space-y-2">
          {discounts.map(d => (
            <Card key={d.id} className={`p-4 ${!d.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{d.name}</span>
                    <span className="text-sm font-bold text-green-600">
                      {d.discount_type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {SCOPES.find(s => s.value === d.scope)?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {d.clients && `Client: ${d.clients.name} · `}
                    {d.services && `Service: ${d.services.name} · `}
                    {d.min_order_amount && `Min. ${formatCurrency(d.min_order_amount)} · `}
                    {d.max_uses && `Max ${d.max_uses} utilisations (${d.uses_count} utilisées) · `}
                    {d.valid_from && `Du ${d.valid_from}`}
                    {d.valid_until && ` au ${d.valid_until}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startTransition(async () => {
                    await toggleDiscountRule(d.id, !d.active)
                    toast.success(d.active ? 'Désactivée' : 'Activée')
                  })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                    {d.active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => startTransition(async () => {
                    await deleteDiscountRule(d.id); toast.success('Remise supprimée')
                  })} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
