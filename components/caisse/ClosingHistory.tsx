'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { History, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'

interface Closing {
  id: string
  closing_date: string
  cash: number
  card: number
  transfer: number
  total: number
  orders_count: number
  notes?: string | null
  users?: { full_name: string } | null
}

export default function ClosingHistory({ closings }: { closings: Closing[] }) {
  if (closings.length === 0) {
    return (
      <Card className="p-5 text-center">
        <History size={24} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucune clôture enregistrée</p>
      </Card>
    )
  }

  const periodTotal = closings.reduce((s, c) => s + Number(c.total), 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <History size={14} /> Historique des clôtures
        </h3>
        <span className="text-xs text-gray-400">{closings.length} journée{closings.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {closings.map(c => (
          <div key={c.id} className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">{formatDate(c.closing_date)}</p>
                <p className="text-xs text-gray-400">
                  {c.orders_count} cmd
                  {c.users?.full_name ? ` · par ${c.users.full_name}` : ''}
                </p>
              </div>
              <p className="text-base font-bold text-gray-900">{formatCurrency(c.total)}</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 text-center text-xs">
              <div className="py-2">
                <Banknote size={10} className="text-green-500 mx-auto mb-0.5" />
                <p className="font-medium text-gray-700">{formatCurrency(c.cash)}</p>
                <p className="text-gray-400">Espèces</p>
              </div>
              <div className="py-2">
                <CreditCard size={10} className="text-blue-500 mx-auto mb-0.5" />
                <p className="font-medium text-gray-700">{formatCurrency(c.card)}</p>
                <p className="text-gray-400">Carte</p>
              </div>
              <div className="py-2">
                <ArrowLeftRight size={10} className="text-purple-500 mx-auto mb-0.5" />
                <p className="font-medium text-gray-700">{formatCurrency(c.transfer)}</p>
                <p className="text-gray-400">Virement</p>
              </div>
            </div>
            {c.notes && (
              <div className="px-3 py-2 border-t border-gray-100 bg-yellow-50">
                <p className="text-xs text-gray-600 italic">{c.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-700">
        <span>Total période ({closings.length}j)</span>
        <span className="text-gray-900">{formatCurrency(periodTotal)}</span>
      </div>
    </Card>
  )
}
