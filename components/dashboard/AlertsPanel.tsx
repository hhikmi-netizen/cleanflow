'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, CreditCard, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { buildWhatsAppUrl } from '@/lib/utils'

interface AlertOrder {
  id: string
  order_number: string
  created_at: string
  status: string
  total: number
  deposit: number
  client_name: string
  client_phone: string
  days_ago: number
}

interface Props {
  readyOverdue: AlertOrder[]   // ready > 3 days
  processingLate: AlertOrder[] // in_progress > 5 days
  unpaidTotal: number
  unpaidCount: number
}

function days(n: number) { return `${n}j` }

export default function AlertsPanel({ readyOverdue, processingLate, unpaidTotal, unpaidCount }: Props) {
  const [open, setOpen] = useState(true)
  const total = readyOverdue.length + processingLate.length + (unpaidTotal > 0 ? 1 : 0)
  if (total === 0) return null

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" />
          <span className="text-sm font-semibold text-orange-800">
            {total} alerte{total > 1 ? 's' : ''} opérationnelle{total > 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-orange-400" /> : <ChevronDown size={16} className="text-orange-400" />}
      </button>

      {open && (
        <div className="border-t border-orange-200 divide-y divide-orange-100">
          {/* Unpaid summary */}
          {unpaidTotal > 0 && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Impayés ce mois</p>
                  <p className="text-xs text-gray-500">{unpaidCount} commande{unpaidCount > 1 ? 's' : ''} non soldées</p>
                </div>
              </div>
              <Link href="/orders" className="text-sm font-bold text-red-600 hover:underline">
                {unpaidTotal.toFixed(2)} DH
              </Link>
            </div>
          )}

          {/* Ready overdue */}
          {readyOverdue.map(o => (
            <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Clock size={13} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    <Link href={`/orders/${o.id}`} className="hover:text-blue-600">{o.order_number}</Link>
                    {' '}<span className="font-normal text-gray-500">— {o.client_name}</span>
                  </p>
                  <p className="text-xs text-amber-700">Prêt depuis {days(o.days_ago)} · pas encore retiré</p>
                </div>
              </div>
              <a
                href={buildWhatsAppUrl(o.client_phone, `Bonjour ${o.client_name}, votre commande ${o.order_number} est prête et vous attend. N'hésitez pas à passer la récupérer 🙏`)}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                title="Envoyer rappel WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            </div>
          ))}

          {/* Processing late */}
          {processingLate.map(o => (
            <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={13} className="text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    <Link href={`/orders/${o.id}`} className="hover:text-blue-600">{o.order_number}</Link>
                    {' '}<span className="font-normal text-gray-500">— {o.client_name}</span>
                  </p>
                  <p className="text-xs text-orange-700">En traitement depuis {days(o.days_ago)} · en retard</p>
                </div>
              </div>
              <Link href={`/orders/${o.id}`}
                className="shrink-0 text-xs text-orange-600 hover:underline font-medium">
                Voir →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
