'use client'

import { useState, useTransition } from 'react'
import { Subscription, CustomerSubscription } from '@/lib/types'

type ClientMin = { id: string; name: string; phone: string }
import { createSubscription, deleteSubscription, assignSubscription, updateCustomerSubStatus, updateCustomerSubBalance, renewSubscription } from '@/app/actions/pricing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, UserPlus, RefreshCw, History } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

const SUB_TYPES = [
  { value: 'monthly',    label: 'Forfait mensuel' },
  { value: 'shirts',     label: 'Forfait chemises' },
  { value: 'kilo',       label: 'Forfait au kilo' },
  { value: 'enterprise', label: 'Forfait entreprise' },
  { value: 'prepaid',    label: 'Solde prépayé' },
]

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  paused:    'bg-yellow-100 text-yellow-800',
  expired:   'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

interface Props {
  subscriptions: Subscription[]
  customerSubs: CustomerSubscription[]
  clients: ClientMin[]
}

export default function SubscriptionsTab({ subscriptions, customerSubs, clients }: Props) {
  const [activeSection, setActiveSection] = useState<'plans' | 'clients'>('plans')
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Plan form
  const [planName, setPlanName] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [planType, setPlanType] = useState('monthly')
  const [planPrice, setPlanPrice] = useState('')
  const [planCredits, setPlanCredits] = useState('')
  const [planQty, setPlanQty] = useState('')
  const [planKilo, setPlanKilo] = useState('')
  const [planDays, setPlanDays] = useState('30')

  // Assign form
  const [assignClientId, setAssignClientId] = useState('')
  const [assignSubId, setAssignSubId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')

  // Balance edit
  const [editBalanceId, setEditBalanceId] = useState<string | null>(null)
  const [editBalanceVal, setEditBalanceVal] = useState('')

  const resetPlanForm = () => {
    setPlanName(''); setPlanDesc(''); setPlanType('monthly'); setPlanPrice('')
    setPlanCredits(''); setPlanQty(''); setPlanKilo(''); setPlanDays('30')
    setShowPlanForm(false)
  }

  const handleCreatePlan = () => {
    if (!planName.trim() || !planPrice) { toast.error('Nom et prix requis'); return }
    startTransition(async () => {
      try {
        await createSubscription({
          name: planName.trim(), description: planDesc || undefined,
          sub_type: planType, price: parseFloat(planPrice),
          credits: planCredits ? parseFloat(planCredits) : undefined,
          quota_quantity: planQty ? parseInt(planQty) : undefined,
          quota_kilo: planKilo ? parseFloat(planKilo) : undefined,
          duration_days: parseInt(planDays) || 30,
        })
        toast.success('Forfait créé')
        resetPlanForm()
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  const handleAssign = () => {
    if (!assignClientId || !assignSubId) { toast.error('Client et forfait requis'); return }
    startTransition(async () => {
      try {
        await assignSubscription({ client_id: assignClientId, subscription_id: assignSubId, notes: assignNotes || undefined })
        toast.success('Forfait attribué')
        setAssignClientId(''); setAssignSubId(''); setAssignNotes(''); setShowAssignForm(false)
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  const handleUpdateBalance = (id: string) => {
    startTransition(async () => {
      try {
        await updateCustomerSubBalance(id, parseFloat(editBalanceVal) || 0)
        toast.success('Solde mis à jour')
        setEditBalanceId(null)
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveSection('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'plans' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Forfaits ({subscriptions.length})
        </button>
        <button onClick={() => setActiveSection('clients')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'clients' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Clients abonnés ({customerSubs.length})
        </button>
      </div>

      {activeSection === 'plans' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowPlanForm(!showPlanForm)}>
              <Plus size={14} className="mr-1" /> Nouveau forfait
            </Button>
          </div>

          {showPlanForm && (
            <Card className="p-4 border-blue-200 bg-blue-50 space-y-3">
              <p className="text-sm font-semibold text-blue-800">Nouveau forfait</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Nom *</label>
                  <input value={planName} onChange={e => setPlanName(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Forfait mensuel chemises" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type *</label>
                  <select value={planType} onChange={e => setPlanType(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {SUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prix (DH) *</label>
                  <input type="number" min="0" step="0.01" value={planPrice} onChange={e => setPlanPrice(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="500" />
                </div>
                {planType === 'prepaid' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Crédit accordé (DH)</label>
                    <input type="number" min="0" step="0.01" value={planCredits} onChange={e => setPlanCredits(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="550" />
                  </div>
                )}
                {planType === 'shirts' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Quota pièces</label>
                    <input type="number" min="1" value={planQty} onChange={e => setPlanQty(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="20" />
                  </div>
                )}
                {planType === 'kilo' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Quota kg</label>
                    <input type="number" min="0" step="0.1" value={planKilo} onChange={e => setPlanKilo(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="10" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Durée (jours)</label>
                  <input type="number" min="1" value={planDays} onChange={e => setPlanDays(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Description</label>
                  <input value={planDesc} onChange={e => setPlanDesc(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Description du forfait…" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreatePlan} disabled={isPending} className="flex-1">
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : 'Créer'}
                </Button>
                <Button size="sm" variant="outline" onClick={resetPlanForm}>Annuler</Button>
              </div>
            </Card>
          )}

          {subscriptions.length === 0 && !showPlanForm ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun forfait configuré</p>
          ) : (
            <div className="space-y-2">
              {subscriptions.map(sub => (
                <Card key={sub.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {SUB_TYPES.find(t => t.value === sub.sub_type)?.label || sub.sub_type}
                        </span>
                      </div>
                      {sub.description && <p className="text-xs text-gray-500 mt-0.5">{sub.description}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(sub.price)} · {sub.duration_days} jours
                        {sub.credits && ` · ${formatCurrency(sub.credits)} crédit`}
                        {sub.quota_quantity && ` · ${sub.quota_quantity} pièces`}
                        {sub.quota_kilo && ` · ${sub.quota_kilo} kg`}
                      </p>
                    </div>
                    <button onClick={() => startTransition(async () => {
                      await deleteSubscription(sub.id); toast.success('Forfait supprimé')
                    })} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'clients' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAssignForm(!showAssignForm)} disabled={subscriptions.length === 0}>
              <UserPlus size={14} className="mr-1" /> Attribuer un forfait
            </Button>
          </div>

          {showAssignForm && (
            <Card className="p-4 border-blue-200 bg-blue-50 space-y-3">
              <p className="text-sm font-semibold text-blue-800">Attribuer un forfait</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Client *</label>
                  <select value={assignClientId} onChange={e => setAssignClientId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Forfait *</label>
                  <select value={assignSubId} onChange={e => setAssignSubId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— Sélectionner —</option>
                    {subscriptions.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} · {formatCurrency(s.price)}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <input value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Notes optionnelles…" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAssign} disabled={isPending} className="flex-1">
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : 'Attribuer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAssignForm(false)}>Annuler</Button>
              </div>
            </Card>
          )}

          {customerSubs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun client abonné</p>
          ) : (
            <div className="space-y-2">
              {customerSubs.map(cs => {
                const sub = cs.subscriptions
                return (
                  <Card key={cs.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{cs.clients?.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[cs.status] || 'bg-gray-100 text-gray-600'}`}>
                            {cs.status === 'active' ? 'Actif' : cs.status === 'paused' ? 'Pausé' : cs.status === 'expired' ? 'Expiré' : 'Annulé'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{sub?.name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {cs.expires_at && (
                            <span className="text-xs text-gray-400">Expire le {formatDate(cs.expires_at)}</span>
                          )}
                          {/* Solde prépayé */}
                          {sub?.sub_type === 'prepaid' && (
                            <span className={`text-xs font-semibold ${cs.balance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              Solde: {formatCurrency(cs.balance)}
                            </span>
                          )}
                          {/* Quota chemises */}
                          {sub?.sub_type === 'shirts' && sub.quota_quantity && (
                            <span className="text-xs text-blue-600">
                              {cs.quota_used}/{sub.quota_quantity} pièces
                            </span>
                          )}
                          {/* Quota kilo */}
                          {sub?.sub_type === 'kilo' && sub.quota_kilo && (
                            <span className="text-xs text-blue-600">
                              {Number(cs.kilo_used).toFixed(2)}/{sub.quota_kilo} kg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {sub?.sub_type === 'prepaid' && (
                          editBalanceId === cs.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" step="0.01" value={editBalanceVal}
                                onChange={e => setEditBalanceVal(e.target.value)}
                                className="w-20 h-7 px-2 rounded border border-gray-200 text-xs"
                                autoFocus />
                              <button onClick={() => handleUpdateBalance(cs.id)}
                                className="p-1 hover:bg-green-50 rounded text-green-600">
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditBalanceId(cs.id); setEditBalanceVal(String(cs.balance)) }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-xs text-gray-500">
                              Éditer solde
                            </button>
                          )
                        )}
                        {/* Bouton renouveler */}
                        <button
                          onClick={() => startTransition(async () => {
                            try {
                              await renewSubscription(cs.id)
                              toast.success('Forfait renouvelé')
                            } catch (e: unknown) { toast.error((e as Error).message) }
                          })}
                          title="Renouveler"
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <RefreshCw size={13} />
                        </button>
                        {/* Lien historique */}
                        {cs.clients && (cs.clients as any).id && (
                          <Link
                            href={`/clients/${(cs.clients as any).id}/subscription/${cs.id}`}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                            title="Historique utilisation"
                          >
                            <History size={13} />
                          </Link>
                        )}
                        <select value={cs.status}
                          onChange={e => startTransition(async () => {
                            await updateCustomerSubStatus(cs.id, e.target.value)
                            toast.success('Statut mis à jour')
                          })}
                          className="h-7 px-2 rounded border border-gray-200 bg-white text-xs focus:outline-none">
                          <option value="active">Actif</option>
                          <option value="paused">Pausé</option>
                          <option value="expired">Expiré</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
