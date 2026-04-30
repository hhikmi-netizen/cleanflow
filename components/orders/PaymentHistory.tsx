'use client'

import { useState, useTransition } from 'react'
import { addPayment, deletePayment } from '@/app/actions/payments'
import { Payment } from '@/lib/types'
import { formatCurrency, formatDateTime, getPaymentLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, CreditCard } from 'lucide-react'

interface PaymentHistoryProps {
  orderId: string
  orderTotal: number
  orderDeposit: number
  payments: Payment[]
  isAdmin: boolean
}

export default function PaymentHistory({ orderId, orderTotal, orderDeposit, payments, isAdmin }: PaymentHistoryProps) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0) + Number(orderDeposit)
  const remaining = Math.max(0, Number(orderTotal) - totalPaid)

  const handleAdd = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Montant invalide'); return }
    startTransition(async () => {
      try {
        await addPayment({ orderId, amount: amt, method, notes })
        toast.success(`Paiement de ${formatCurrency(amt)} enregistré`)
        setAmount('')
        setNotes('')
        setShowForm(false)
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Erreur')
      }
    })
  }

  const handleDelete = (paymentId: string) => {
    startTransition(async () => {
      try {
        await deletePayment(paymentId, orderId)
        toast.success('Paiement supprimé')
      } catch (err: unknown) {
        toast.error((err as Error)?.message || 'Erreur')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Total commande</p>
          <p className="font-bold text-gray-900">{formatCurrency(orderTotal)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Encaissé</p>
          <p className="font-bold text-green-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`rounded-lg p-3 ${remaining > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
          <p className="text-xs text-gray-400 mb-1">Restant</p>
          <p className={`font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-700'}`}>
            {remaining > 0 ? formatCurrency(remaining) : '✓ Soldé'}
          </p>
        </div>
      </div>

      {/* Historique */}
      {(orderDeposit > 0 || payments.length > 0) && (
        <div className="space-y-1">
          {orderDeposit > 0 && (
            <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg text-sm">
              <div>
                <span className="font-medium text-gray-700">Acompte initial</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCurrency(orderDeposit)}</span>
            </div>
          )}
          {payments.map(p => (
            <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-blue-900">{getPaymentLabel(p.method)}</span>
                {p.notes && <span className="text-blue-600 ml-2 text-xs">· {p.notes}</span>}
                <p className="text-xs text-blue-400">{formatDateTime(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-blue-900">{formatCurrency(p.amount)}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={isPending}
                    className="text-red-300 hover:text-red-500 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire ajout paiement */}
      {remaining > 0 && (
        <>
          {showForm ? (
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
              <p className="text-sm font-semibold text-blue-800">Enregistrer un paiement</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Montant (DH)</label>
                  <Input
                    type="number" min="0.01" step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={formatCurrency(remaining)}
                    className="h-9 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mode</label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="transfer">Virement</option>
                    <option value="credit">Crédit client</option>
                  </select>
                </div>
              </div>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Note (optionnel)"
                className="h-9 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={isPending} className="h-8 flex-1">
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enregistrer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="h-8">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              className="w-full h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus size={14} className="mr-1" />
              <CreditCard size={14} className="mr-1" />
              Enregistrer un paiement · Reste {formatCurrency(remaining)}
            </Button>
          )}
        </>
      )}

      {remaining === 0 && payments.length === 0 && orderDeposit === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">Aucun paiement enregistré</p>
      )}
    </div>
  )
}
