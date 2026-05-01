'use client'

import { useState } from 'react'
import { X, Banknote, CreditCard, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { recordOrderPayment, recordClientGlobalPayment } from '@/app/actions/credit'
import { toast } from 'sonner'

type Order = { id: string; total: number; due: number; daysOld: number; createdAt: string }

type PaymentMode = 'cash' | 'card' | 'transfer'

const PAYMENT_MODES: { value: PaymentMode; label: string; icon: React.ElementType }[] = [
  { value: 'cash',     label: 'Espèces',  icon: Banknote },
  { value: 'card',     label: 'Carte',    icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: ArrowRight },
]

interface Props {
  clientId: string
  clientName: string
  orders: Order[]
  onClose: () => void
}

export default function PaymentModal({ clientId, clientName, orders, onClose }: Props) {
  const totalDue = orders.reduce((s, o) => s + o.due, 0)
  const isSingleOrder = orders.length === 1

  const [mode, setMode] = useState<'order' | 'global'>(isSingleOrder ? 'order' : 'global')
  const [selectedOrderId, setSelectedOrderId] = useState(isSingleOrder ? orders[0].id : '')
  const [amount, setAmount] = useState(isSingleOrder ? orders[0].due : totalDue)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedOrder = orders.find(o => o.id === selectedOrderId)
  const maxAmount = mode === 'order' ? (selectedOrder?.due ?? totalDue) : totalDue

  const handleSubmit = async () => {
    if (amount <= 0) { toast.error('Montant invalide'); return }
    if (amount > maxAmount + 0.01) { toast.error(`Montant supérieur au dû (${formatCurrency(maxAmount)})`); return }
    if (mode === 'order' && !selectedOrderId) { toast.error('Sélectionnez une commande'); return }

    setLoading(true)
    try {
      if (mode === 'order' && selectedOrderId) {
        await recordOrderPayment({ orderId: selectedOrderId, clientId, amount, method: paymentMode, notes })
      } else {
        await recordClientGlobalPayment({ clientId, amount, method: paymentMode, notes })
      }
      toast.success(`Paiement de ${formatCurrency(amount)} enregistré`)
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Encaisser un paiement</h2>
            <p className="text-sm text-gray-400">{clientName} · dû : <span className="font-semibold text-orange-600">{formatCurrency(totalDue)}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Payment scope toggle */}
          {!isSingleOrder && (
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button onClick={() => { setMode('global'); setAmount(totalDue); setSelectedOrderId('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'global' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Paiement global
              </button>
              <button onClick={() => { setMode('order'); setSelectedOrderId(orders[0].id); setAmount(orders[0].due) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'order' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Par commande
              </button>
            </div>
          )}

          {/* Order selector */}
          {mode === 'order' && !isSingleOrder && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Commande</label>
              <div className="space-y-1">
                {orders.map(o => (
                  <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setAmount(o.due) }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                      selectedOrderId === o.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}>
                    <span className="text-gray-600">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${o.daysOld > 60 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {o.daysOld}j
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(o.due)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant encaissé</label>
            <div className="relative">
              <input
                type="number" min="0" step="0.01"
                value={amount || ''}
                onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-12 px-4 text-xl font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 text-gray-900"
              />
              <button onClick={() => setAmount(maxAmount)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium">
                Max
              </button>
            </div>
            {amount < maxAmount && amount > 0 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle size={11} /> Paiement partiel — reste {formatCurrency(maxAmount - amount)}
              </p>
            )}
          </div>

          {/* Payment mode */}
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_MODES.map(m => {
              const Icon = m.icon
              return (
                <button key={m.value} onClick={() => setPaymentMode(m.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    paymentMode === m.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}>
                  <Icon size={18} />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Notes */}
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Note (optionnel)"
            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-300"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || amount <= 0}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Check size={16} /> Valider {formatCurrency(amount)}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
