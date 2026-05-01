'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle, AlertCircle, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'
import { closeDay } from '@/app/actions/caisse'
import { formatCurrency } from '@/lib/utils'

interface Props {
  today: string
  suggestedCash: number
  suggestedCard: number
  suggestedTransfer: number
  ordersCount: number
  alreadyClosed: boolean
  isAdmin: boolean
}

export default function DayClosingForm({
  today, suggestedCash, suggestedCard, suggestedTransfer, ordersCount, alreadyClosed, isAdmin
}: Props) {
  const [cash, setCash] = useState(suggestedCash.toFixed(2))
  const [card, setCard] = useState(suggestedCard.toFixed(2))
  const [transfer, setTransfer] = useState(suggestedTransfer.toFixed(2))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [closed, setClosed] = useState(alreadyClosed)

  const cashVal = parseFloat(cash) || 0
  const cardVal = parseFloat(card) || 0
  const transferVal = parseFloat(transfer) || 0
  const total = cashVal + cardVal + transferVal

  const systemTotal = suggestedCash + suggestedCard + suggestedTransfer
  const diff = total - systemTotal

  const handleClose = async () => {
    if (closed && !isAdmin) {
      toast.error('Cette journée est déjà clôturée')
      return
    }
    setLoading(true)
    try {
      await closeDay({
        closing_date: today,
        cash: cashVal,
        card: cardVal,
        transfer: transferVal,
        notes: notes || undefined,
      })
      toast.success('Clôture enregistrée !')
      setClosed(true)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erreur lors de la clôture')
    } finally {
      setLoading(false)
    }
  }

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Clôture du jour</h2>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{ordersCount} commande{ordersCount > 1 ? 's' : ''} aujourd'hui</p>
          {closed && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium mt-1">
              <CheckCircle size={11} /> Clôturée
            </span>
          )}
        </div>
      </div>

      {/* System-computed amounts */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-blue-700 mb-2">Encaissements calculés par le système</p>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-blue-900 font-bold">{formatCurrency(suggestedCash)}</p>
            <p className="text-xs text-blue-500">Espèces</p>
          </div>
          <div>
            <p className="text-blue-900 font-bold">{formatCurrency(suggestedCard)}</p>
            <p className="text-xs text-blue-500">Carte</p>
          </div>
          <div>
            <p className="text-blue-900 font-bold">{formatCurrency(suggestedTransfer)}</p>
            <p className="text-xs text-blue-500">Virement</p>
          </div>
        </div>
      </div>

      {/* Manual count */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><Banknote size={12} className="text-green-600" /> Espèces réelles</Label>
          <Input
            type="number" min="0" step="0.01" value={cash}
            onChange={e => setCash(e.target.value)}
            className="h-10 text-center font-mono"
            disabled={closed && !isAdmin}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><CreditCard size={12} className="text-blue-600" /> Carte réelle</Label>
          <Input
            type="number" min="0" step="0.01" value={card}
            onChange={e => setCard(e.target.value)}
            className="h-10 text-center font-mono"
            disabled={closed && !isAdmin}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><ArrowLeftRight size={12} className="text-purple-600" /> Virement réel</Label>
          <Input
            type="number" min="0" step="0.01" value={transfer}
            onChange={e => setTransfer(e.target.value)}
            className="h-10 text-center font-mono"
            disabled={closed && !isAdmin}
          />
        </div>
      </div>

      {/* Total + diff */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
        <span className="text-sm font-semibold text-gray-700">Total encaissé</span>
        <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
      </div>

      {Math.abs(diff) > 0.01 && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-3 text-sm ${
          Math.abs(diff) < 1 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'
        }`}>
          <AlertCircle size={14} />
          <span>
            {diff > 0
              ? `Excédent de ${formatCurrency(diff)} vs système`
              : `Manque de ${formatCurrency(Math.abs(diff))} vs système`}
          </span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <Label className="text-xs">Notes de clôture (optionnel)</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anomalies, remises exceptionnelles, commentaires..."
          rows={2}
          disabled={closed && !isAdmin}
        />
      </div>

      <Button
        className="w-full h-11"
        onClick={handleClose}
        disabled={loading || (closed && !isAdmin)}
        variant={closed ? 'outline' : 'default'}
      >
        {loading
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
          : closed
            ? isAdmin ? 'Mettre à jour la clôture' : 'Journée clôturée ✓'
            : 'Clôturer la journée'
        }
      </Button>
    </Card>
  )
}
