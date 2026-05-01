'use client'

import { useState } from 'react'
import { Star, Plus, Minus, Loader2 } from 'lucide-react'
import { adjustLoyaltyPoints } from '@/app/actions/loyalty'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  type: string
  points: number
  note?: string
  created_at: string
  order_id?: string
}

interface Props {
  clientId: string
  loyaltyPoints: number
  pointsValueDh: number
  redemptionMin: number
  transactions: Transaction[]
}

export default function LoyaltyWidget({
  clientId,
  loyaltyPoints,
  pointsValueDh,
  redemptionMin,
  transactions,
}: Props) {
  const [showAdj, setShowAdj] = useState(false)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const cashValue = (loyaltyPoints * pointsValueDh).toFixed(2)

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    const pts = parseInt(delta)
    if (!pts || !note.trim()) return
    setLoading(true)
    await adjustLoyaltyPoints(clientId, pts, note.trim())
    toast.success(pts > 0 ? `+${pts} points ajoutés` : `${pts} points déduits`)
    setShowAdj(false)
    setDelta('')
    setNote('')
    setLoading(false)
    router.refresh()
  }

  const typeColor = (t: string) =>
    t === 'earned' ? 'text-green-600' : t === 'redeemed' ? 'text-red-500' : 'text-blue-600'
  const typeLabel = (t: string) =>
    t === 'earned' ? 'Gagné' : t === 'redeemed' ? 'Utilisé' : 'Ajustement'

  return (
    <div className="space-y-3">
      {/* Balance card */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl">
            <Star size={18} className="text-yellow-600 fill-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{loyaltyPoints.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-500">points · valeur {cashValue} DH</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setDelta('+'); setShowAdj(true) }}
            className="p-2 bg-white rounded-lg border border-yellow-200 hover:bg-yellow-50 transition-colors text-yellow-700"
            title="Ajouter des points"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => { setDelta('-'); setShowAdj(true) }}
            className="p-2 bg-white rounded-lg border border-yellow-200 hover:bg-yellow-50 transition-colors text-yellow-700"
            title="Déduire des points"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      {loyaltyPoints < redemptionMin && (
        <p className="text-xs text-gray-400 px-1">
          {redemptionMin - loyaltyPoints} points de plus pour pouvoir échanger
        </p>
      )}

      {/* Adjustment form */}
      {showAdj && (
        <form onSubmit={handleAdjust} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-gray-600">Ajustement manuel</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder="ex : 50 ou -50"
              className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
              required
            />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Motif…"
              className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
              Appliquer
            </button>
            <button type="button" onClick={() => setShowAdj(false)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Historique</p>
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Star size={11} className={typeColor(tx.type)} />
                <div>
                  <span className={`text-xs font-medium ${typeColor(tx.type)}`}>{typeLabel(tx.type)}</span>
                  {tx.note && <span className="text-xs text-gray-400 ml-1.5">{tx.note}</span>}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${typeColor(tx.type)}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </span>
                <p className="text-[10px] text-gray-400">
                  {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
