'use client'

import { useState, useTransition } from 'react'
import { PriceRule } from '@/lib/types'

type ServiceMin = { id: string; name: string; category?: string }
import { createPriceRule, togglePriceRule, deletePriceRule } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react'
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

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
]

function getRuleTypeLabel(v: string) {
  return RULE_TYPES.find(r => r.value === v)?.label || v
}
function getPriceTypeLabel(v: string) {
  return PRICE_TYPES.find(p => p.value === v)?.label || v
}
function formatDays(days: number[] | null | undefined) {
  if (!days?.length) return null
  if (days.length === 7) return 'Tous les jours'
  if (JSON.stringify([...days].sort()) === JSON.stringify([1,2,3,4,5])) return 'Lun–Ven'
  if (JSON.stringify([...days].sort()) === JSON.stringify([6,7])) return 'Week-end'
  return days.map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean).join(', ')
}

interface Props {
  rules: PriceRule[]
  services: ServiceMin[]
}

export default function PriceRulesTab({ rules, services }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
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
  // Zone + créneau
  const [zoneName, setZoneName] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [timeFrom, setTimeFrom] = useState('')
  const [timeUntil, setTimeUntil] = useState('')

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const resetForm = () => {
    setName(''); setServiceId(''); setRuleType('express'); setPriceType('fixed')
    setPrice(''); setMinQty('1'); setPriority('0'); setValidFrom(''); setValidUntil('')
    setZoneName(''); setSelectedDays([]); setTimeFrom(''); setTimeUntil('')
    setShowAdvanced(false); setShowForm(false)
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
          zone_name: zoneName.trim() || undefined,
          days_of_week: selectedDays.length ? selectedDays : undefined,
          time_from: timeFrom || undefined,
          time_until: timeUntil || undefined,
        })
        toast.success('Règle créée')
        resetForm()
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  const inputCls = 'w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

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
                className={inputCls} placeholder="Ex: Prix express chemise" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Service (optionnel)</label>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} className={inputCls}>
                <option value="">— Tous les services —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de règle *</label>
              <select value={ruleType} onChange={e => setRuleType(e.target.value)} className={inputCls}>
                {RULE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type de prix *</label>
              <select value={priceType} onChange={e => setPriceType(e.target.value)} className={inputCls}>
                {PRICE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prix *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Qté min.</label>
              <input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priorité</label>
              <input type="number" min="0" value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valide du</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Advanced: Zone + Créneau */}
          <button type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-blue-700 font-medium hover:text-blue-900 mt-1"
          >
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Options avancées — zone & créneau horaire
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                  <MapPin size={11} /> Zone géographique
                </label>
                <input value={zoneName} onChange={e => setZoneName(e.target.value)}
                  className={inputCls} placeholder="Ex: Casablanca centre, Banlieue, Zone industrielle…" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                  <Clock size={11} /> Jours applicables
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d.value} type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        selectedDays.includes(d.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                  {selectedDays.length > 0 && (
                    <button type="button" onClick={() => setSelectedDays([])}
                      className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600">
                      Effacer
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Heure de début</label>
                <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Heure de fin</label>
                <input type="time" value={timeUntil} onChange={e => setTimeUntil(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

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
          {rules.map(rule => {
            const daysLabel = formatDays(rule.days_of_week)
            const hasConditions = rule.zone_name || daysLabel || rule.time_from
            return (
              <Card key={rule.id} className={`p-4 ${!rule.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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
                    {hasConditions && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {rule.zone_name && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            <MapPin size={10} /> {rule.zone_name}
                          </span>
                        )}
                        {daysLabel && (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> {daysLabel}
                          </span>
                        )}
                        {rule.time_from && (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                            {rule.time_from}{rule.time_until ? `–${rule.time_until}` : ''}
                          </span>
                        )}
                      </div>
                    )}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
