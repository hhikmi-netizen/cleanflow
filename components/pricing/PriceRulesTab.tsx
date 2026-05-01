'use client'

import { useState, useTransition } from 'react'
import { PriceRule } from '@/lib/types'

type ServiceMin = { id: string; name: string; category?: string }
import { createPriceRule, togglePriceRule, deletePriceRule } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const RULE_TYPES = [
  { value: 'individual',         label: 'Particulier' },
  { value: 'business',           label: 'Professionnel' },
  { value: 'express',            label: 'Express' },
  { value: 'delivery_included',  label: 'Livraison incluse' },
  { value: 'pickup_included',    label: 'Collecte incluse' },
  { value: 'subscription',       label: 'Abonné' },
  { value: 'promo',              label: 'Promotionnel' },
  { value: 'kilo',               label: 'Au kilo' },
  { value: 'lot',                label: 'Par lot' },
]

const PRICE_TYPES = [
  { value: 'fixed',              label: 'Prix fixe (DH)' },
  { value: 'per_kilo',           label: 'Prix au kilo (DH/kg)' },
  { value: 'per_lot',            label: 'Prix par lot' },
  { value: 'surcharge_fixed',    label: 'Supplément fixe (+DH)' },
  { value: 'surcharge_percent',  label: 'Supplément % (+%)' },
]

function getRuleTypeLabel(v: string) {
  return RULE_TYPES.find(r => r.value === v)?.label || v
}
function getPriceTypeLabel(v: string) {
  return PRICE_TYPES.find(p => p.value === v)?.label || v
}

interface Props {
  rules: PriceRule[]
  services: ServiceMin[]
}

export default function PriceRulesTab({ rules, services }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [ruleType, setRuleType] = useState('express')
  const [priceType, setPriceType] = useState('fixed')
  const [price, setPrice] = useState('')
  const [minQty, setMinQty] = useState('1')
  const [priority, setPriority] = useState('0')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const resetForm = () => {
    setName(''); setServiceId(''); setRuleType('express'); setPriceType('fixed')
    setPrice(''); setMinQty('1'); setPriority('0'); setValidFrom(''); setValidUntil('')
    setShowForm(false)
  }

  const handleCreate = () => {
    if (!name.trim() || !price) { toast.error('Nom et prix requis'); return }
    startTransition(async () => {
      try {
        await createPriceRule({
          name: name.trim(),
          service_id: serviceId || undefined,
          rule_type: ruleType,
          price_type: priceType,
          price: parseFloat(price),
          min_quantity: parseInt(minQty) || 1,
          priority: parseInt(priority) || 0,
          valid_from: validFrom || undefined,
          valid_until: validUntil || undefined,
        })
        toast.success('Règle créée')
        resetForm()
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="mr-1" /> Ajouter une règle
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-4 border-blue-200 bg-blue-50 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nouvelle règle tarifaire</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Ex: Prix express chemise" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Service (optionnel)</label>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">— Tous les services —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de règle *</label>
              <select value={ruleType} onChange={e => setRuleType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {RULE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de prix *</label>
              <select value={priceType} onChange={e => setPriceType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {PRICE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prix *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Qté min.</label>
              <input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valide du</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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

      {/* List */}
      {rules.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucune règle tarifaire configurée</p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <Card key={rule.id} className={`p-4 ${!rule.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{getRuleTypeLabel(rule.rule_type)}</span>
                    {rule.services && (
                      <span className="text-xs text-blue-600">{rule.services.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getPriceTypeLabel(rule.price_type)} · {formatCurrency(rule.price)}
                    {rule.min_quantity > 1 && ` · min. ${rule.min_quantity}`}
                    {rule.valid_from && ` · du ${rule.valid_from}`}
                    {rule.valid_until && ` au ${rule.valid_until}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startTransition(async () => {
                    await togglePriceRule(rule.id, !rule.active)
                    toast.success(rule.active ? 'Désactivée' : 'Activée')
                  })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                    {rule.active ? <ToggleRight size={16} className="text-blue-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => startTransition(async () => {
                    await deletePriceRule(rule.id)
                    toast.success('Règle supprimée')
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
